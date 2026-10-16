import { getRules } from '../rules';
import type { TaxYearRules } from '../rules/types';
import { adjustedNetIncome, computeIncomeComponents, grossUpAtBasicRate } from './ani';
import { annualAllowanceCheck } from './annualAllowance';
import { highIncomeChildBenefitCharge } from './hicbc';
import { calculateIncomeTax } from './incomeTax';
import { applyRate, moneyText, nonNeg, roundPence } from './money';
import { employeeNi, employerNi } from './nationalInsurance';
import { employerMatch, isReliefAtSource, resolveExistingPension, withAdditional } from './pension';
import { studentLoanRepayment } from './studentLoan';
import type { CalcWarning, CalculatorInputs, Pence, PensionMethod, ScenarioResult } from './types';
import { InvalidInputsError, InvalidRulesError, validateInputs, validateRules } from './validate';

export class RulesUnavailableError extends Error {
  constructor(id: string) {
    super(`Tax-year rules for "${id}" are not available.`);
    this.name = 'RulesUnavailableError';
  }
}

const validatedRules = new WeakSet<TaxYearRules>();

/** Look up and validate the rules for the inputs' tax year. Throws rather than calculate on bad rules. */
export function rulesFor(inputs: CalculatorInputs): TaxYearRules {
  const rules = getRules(inputs.taxYear);
  if (!rules) throw new RulesUnavailableError(inputs.taxYear);
  if (!validatedRules.has(rules)) {
    const problems = validateRules(rules);
    if (problems.length > 0) throw new InvalidRulesError(problems);
    validatedRules.add(rules);
  }
  return rules;
}

export interface ScenarioOptions {
  label: string;
  /** null = baseline (no additional contribution). */
  method: PensionMethod | null;
  additionalGross: Pence;
  /** Extra employment earnings used only for marginal-rate probing. */
  incomeProbe?: Pence;
}

/**
 * Calculate one complete scenario (a person's year) from the inputs plus an optional
 * additional pension contribution. Pure: the same inputs always give the same output.
 * Conventions: docs/CALCULATION_CONVENTIONS.md.
 */
export function calculateScenario(inputs: CalculatorInputs, opts: ScenarioOptions): ScenarioResult {
  const rules = rulesFor(inputs);
  const problems = validateInputs(inputs);
  if (!Number.isInteger(opts.additionalGross) || opts.additionalGross < 0) problems.push('additional gross contribution must be a non-negative whole number of pence');
  if (problems.length > 0) throw new InvalidInputsError(problems);

  const warnings: CalcWarning[] = [];
  const inc = inputs.income;
  const probe = nonNeg(opts.incomeProbe ?? 0);

  // Pension arrangements. Existing figures are resolved against the original income so a probe never changes them.
  const existing = resolveExistingPension(inputs.existingPension, inc, rules);
  warnings.push(...existing.warnings);
  // Other schemes (conventions §1.7): a second personal RAS contribution and employer contributions elsewhere.
  existing.pension.rasPersonalGross += inputs.pensionAllowance.otherPersonalRasGross;
  existing.pension.employerOther += inputs.pensionAllowance.otherEmployerContributions;
  const additionalGross = opts.method ? opts.additionalGross : 0;
  let pension = opts.method ? withAdditional(existing.pension, opts.method, additionalGross) : { ...existing.pension };
  if (opts.method && additionalGross > 0) {
    const match = employerMatch({ ...inputs.additional, method: opts.method, grossAmount: additionalGross });
    pension = { ...pension, employerOther: pension.employerOther + match };
  }

  // Cap sacrifice and net pay to the pay available (unsupported relief claims are flagged, not used).
  const contractualPay = inc.salary + inc.bonus + probe;
  if (pension.salarySacrifice > contractualPay) {
    warnings.push({
      id: 'sacrifice-exceeds-pay',
      severity: 'error',
      category: 'salary-sacrifice',
      message: 'Salary sacrifice cannot exceed your salary and bonus. The sacrifice has been limited to your pay.',
    });
    pension = { ...pension, salarySacrifice: contractualPay };
  }
  if (pension.netPay > contractualPay - pension.salarySacrifice) {
    warnings.push({
      id: 'netpay-exceeds-pay',
      severity: 'error',
      category: 'pension',
      message: 'Net-pay contributions cannot exceed your pay. They have been limited to your pay after any salary sacrifice.',
    });
    pension = { ...pension, netPay: contractualPay - pension.salarySacrifice };
  }

  // §1 Income components — the only place these figures are derived.
  const ic = computeIncomeComponents(inc, pension, probe);

  // Employer NI and any share of the salary-sacrifice saving passed to the pension.
  const employerNiNow = employerNi(ic.classOneEarnings, rules);
  if (opts.method === 'salary-sacrifice' && additionalGross > 0 && inputs.additional.employerNiPassThroughPercent > 0) {
    const before = employerNi(ic.classOneEarnings + Math.min(additionalGross, pension.salarySacrifice), rules);
    const passThrough = roundPence(((before - employerNiNow) * inputs.additional.employerNiPassThroughPercent) / 100);
    pension = { ...pension, employerOther: pension.employerOther + passThrough };
  }

  // §1.6 Relief-at-source relief limit: higher of UK taxable earnings and the basic amount, shared with net pay.
  const reliefLimit = Math.max(ic.taxableEarnings, rules.pensions.basicAmount);
  const rasGross = pension.rasWorkplaceGross + pension.rasPersonalGross;
  const rasRelievedGross = Math.min(rasGross, nonNeg(reliefLimit - pension.netPay));
  const rasUnrelieved = rasGross - rasRelievedGross;
  if (rasUnrelieved > 0) {
    warnings.push({
      id: 'ras-exceeds-relief-limit',
      severity: 'warning',
      category: 'pension',
      message: `Tax relief on personal contributions is limited to your UK taxable earnings (or £3,600 if higher). ${moneyText(rasUnrelieved)} gross has been treated as unrelieved: it does not reduce adjusted net income and no basic-rate top-up is assumed on it, but it still counts towards your annual allowance. Schemes often refund excess contributions — check with your provider.`,
    });
  }
  // Cash = gross − provider top-up (basic-rate relief on the relieved part only) + unrelieved part paid in full.
  const rasCashPaid = rasRelievedGross - applyRate(rasRelievedGross, rules.pensions.reliefAtSourceBasicRate) + rasUnrelieved;

  // §1.5 Adjusted net income.
  const giftAidGross = grossUpAtBasicRate(inputs.giftAidNet, rules.giftAid.basicRate);
  const ani = adjustedNetIncome({ netIncome: ic.netIncome, reliefAtSourceGross: rasRelievedGross, giftAidGross });

  // §3 Income Tax: final, and as collected before any claim for RAS / Gift Aid relief.
  const taxBase = {
    rules,
    jurisdiction: inputs.jurisdiction,
    nonSavingsIncome: ic.nonSavingsIncome,
    savingsIncome: inc.savingsInterest,
    dividendIncome: inc.dividends,
  };
  const bandExtension = rasRelievedGross + giftAidGross;
  const incomeTax = calculateIncomeTax({ ...taxBase, adjustedNetIncome: ani, bandExtension });
  const beforeClaims = calculateIncomeTax({ ...taxBase, adjustedNetIncome: ic.netIncome, bandExtension: 0 });
  const reliefToClaim = nonNeg(beforeClaims.total - incomeTax.total);

  // Gift Aid: donations must not exceed 4× the tax paid (GOV.UK Gift Aid). CGT is not modelled.
  if (inputs.giftAidNet > 0) {
    const basicRateTaxReclaimed = giftAidGross - inputs.giftAidNet;
    if (basicRateTaxReclaimed > incomeTax.total) {
      warnings.push({
        id: 'gift-aid-exceeds-tax',
        severity: 'warning',
        category: 'scope',
        message: `Gift Aid donations of ${moneyText(inputs.giftAidNet)} are more than 4 times the Income Tax calculated here. Unless you pay enough Capital Gains Tax to cover the difference, HMRC may ask you to pay the ${moneyText(basicRateTaxReclaimed - incomeTax.total)} shortfall. This is not included in the figures.`,
      });
    }
  }

  // §4 NI and student loans on Class 1 earnings.
  const ni = employeeNi(ic.classOneEarnings, rules);
  const studentLoan = studentLoanRepayment(ic.classOneEarnings, inputs.studentLoan, rules);

  // Child Benefit charge (separate from take-home).
  const cc = inputs.childcare;
  const partnerAni = cc.hasPartner === 'yes' ? cc.partnerAni : null;
  const hicbc = highIncomeChildBenefitCharge(inputs.childBenefitAnnual, ani, partnerAni, rules);

  // §6 Annual allowance.
  const annualAllowance = annualAllowanceCheck({
    rules,
    allowance: inputs.pensionAllowance,
    pension,
    rasRelievedGross,
    rasGross,
    netIncome: ic.netIncome,
    chargeFor: (excess) =>
      calculateIncomeTax({ ...taxBase, nonSavingsIncome: ic.nonSavingsIncome + excess, adjustedNetIncome: ani, bandExtension }).total - incomeTax.total,
  });

  // §5 Cash position.
  const grossCashIncome = ic.classOneEarnings + inc.propertyIncome + inc.otherNonSavingsIncome + inc.savingsInterest + inc.dividends;
  const takeHome = grossCashIncome - pension.netPay - rasCashPaid - incomeTax.total - ni.total - studentLoan.total;
  const employeeFundedGross = pension.salarySacrifice + pension.netPay + rasGross;

  if (opts.method && isReliefAtSource(opts.method) && reliefToClaim > 0 && additionalGross > 0) {
    warnings.push({
      id: 'ras-claim-needed',
      severity: 'info',
      category: 'pension',
      message:
        'Relief above the basic rate on relief-at-source contributions is not paid into the pension. You must claim it from HMRC (Self Assessment, or by contacting HMRC to adjust your tax code). The take-home figures assume you claim it.',
    });
  }

  return {
    label: opts.label,
    method: opts.method,
    additionalGross,
    contractualPay: ic.contractualPay,
    cashPayAfterSacrifice: ic.classOneEarnings,
    employmentIncome: ic.employmentIncome,
    totalIncome: ic.netIncome,
    adjustedNetIncome: ani,
    giftAidGross,
    incomeTax,
    incomeTaxBeforeClaims: beforeClaims.total,
    reliefToClaim,
    employeeNi: ni,
    employerNi: employerNiNow,
    studentLoan,
    pension,
    rasRelievedGross,
    rasCashPaid,
    employeePensionCash: pension.salarySacrifice + pension.netPay + rasCashPaid,
    employeeFundedGross,
    employerContribution: pension.employerOther,
    totalPensionInvestment: employeeFundedGross + pension.employerOther,
    takeHome,
    grossCashIncome,
    annualAllowance,
    hicbc,
    warnings,
  };
}
