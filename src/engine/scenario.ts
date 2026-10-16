import { getRules } from '../rules';
import type { TaxYearRules } from '../rules/types';
import { adjustedNetIncome, grossUpAtBasicRate } from './ani';
import { annualAllowanceCheck } from './annualAllowance';
import { highIncomeChildBenefitCharge } from './hicbc';
import { calculateIncomeTax } from './incomeTax';
import { nonNeg, roundPence } from './money';
import { employeeNi, employerNi } from './nationalInsurance';
import { employerMatch, isReliefAtSource, resolveExistingPension, withAdditional } from './pension';
import { studentLoanRepayment } from './studentLoan';
import type { CalcWarning, CalculatorInputs, Pence, PensionMethod, ScenarioResult } from './types';

export class RulesUnavailableError extends Error {
  constructor(id: string) {
    super(`Tax-year rules for "${id}" are not available.`);
    this.name = 'RulesUnavailableError';
  }
}

export function rulesFor(inputs: CalculatorInputs): TaxYearRules {
  const rules = getRules(inputs.taxYear);
  if (!rules) throw new RulesUnavailableError(inputs.taxYear);
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
 */
export function calculateScenario(inputs: CalculatorInputs, opts: ScenarioOptions): ScenarioResult {
  const rules = rulesFor(inputs);
  const warnings: CalcWarning[] = [];
  const inc = inputs.income;
  const probe = nonNeg(opts.incomeProbe ?? 0);

  // 1. Pension arrangements (existing figures are resolved against the original income, so a probe never changes them).
  const existing = resolveExistingPension(inputs.existingPension, inc, rules);
  warnings.push(...existing.warnings);
  const additionalGross = opts.method ? nonNeg(opts.additionalGross) : 0;
  let pension = opts.method ? withAdditional(existing.pension, opts.method, additionalGross) : { ...existing.pension };

  if (opts.method && additionalGross > 0) {
    const match = employerMatch({ ...inputs.additional, method: opts.method, grossAmount: additionalGross });
    pension = { ...pension, employerOther: pension.employerOther + match };
  }

  // 2. Employment pay.
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
  const cashPay = contractualPay - pension.salarySacrifice;

  // Employer NI and any share of the salary-sacrifice saving passed to the pension.
  const employerNiNow = employerNi(cashPay, rules);
  if (opts.method === 'salary-sacrifice' && additionalGross > 0 && inputs.additional.employerNiPassThroughPercent > 0) {
    const before = employerNi(cashPay + Math.min(additionalGross, pension.salarySacrifice), rules);
    const passThrough = roundPence(
      ((before - employerNiNow) * Math.min(100, Math.max(0, inputs.additional.employerNiPassThroughPercent))) / 100,
    );
    pension = { ...pension, employerOther: pension.employerOther + passThrough };
  }

  if (pension.netPay > cashPay) {
    warnings.push({
      id: 'netpay-exceeds-pay',
      severity: 'error',
      category: 'pension',
      message: 'Net-pay contributions cannot exceed your pay. They have been limited to your pay after any salary sacrifice.',
    });
    pension = { ...pension, netPay: cashPay };
  }

  // 3. Income for tax.
  const employmentIncome = cashPay - pension.netPay + inc.taxableBenefits;
  const nonSavingsIncome = employmentIncome + inc.propertyIncome + inc.otherNonSavingsIncome;
  const netIncome = nonSavingsIncome + inc.savingsInterest + inc.dividends;

  // 4. Relief-at-source relief limit: higher of relevant UK earnings and the basic amount.
  const relevantEarnings = cashPay + inc.taxableBenefits;
  const reliefLimit = Math.max(relevantEarnings, rules.pensions.basicAmount);
  const rasGross = pension.rasWorkplaceGross + pension.rasPersonalGross;
  const rasRelievedGross = Math.min(rasGross, nonNeg(reliefLimit - pension.netPay));
  const rasUnrelieved = rasGross - rasRelievedGross;
  if (rasUnrelieved > 0) {
    warnings.push({
      id: 'ras-exceeds-relief-limit',
      severity: 'warning',
      category: 'pension',
      message: `Personal contributions above your relevant UK earnings (or £3,600 if higher) do not get tax relief. £${(rasUnrelieved / 100).toLocaleString('en-GB', { maximumFractionDigits: 2 })} gross has been treated as unrelieved: it does not reduce adjusted net income and no basic-rate top-up is assumed on it.`,
    });
  }
  const rasRate = rules.pensions.reliefAtSourceBasicRate;
  const rasCashPaid = roundPence(rasRelievedGross * (1 - rasRate)) + rasUnrelieved;

  // 5. Adjusted net income.
  const giftAidGross = grossUpAtBasicRate(inputs.giftAidNet, rules.giftAid.basicRate);
  const ani = adjustedNetIncome({ netIncome, reliefAtSourceGross: rasRelievedGross, giftAidGross });

  // 6. Income Tax (final) and as collected before any claim.
  const taxBase = {
    rules,
    jurisdiction: inputs.jurisdiction,
    nonSavingsIncome,
    savingsIncome: inc.savingsInterest,
    dividendIncome: inc.dividends,
  };
  const incomeTax = calculateIncomeTax({ ...taxBase, adjustedNetIncome: ani, bandExtension: rasRelievedGross + giftAidGross });
  const beforeClaims = calculateIncomeTax({ ...taxBase, adjustedNetIncome: netIncome, bandExtension: 0 });
  const reliefToClaim = nonNeg(beforeClaims.total - incomeTax.total);

  // 7. NI and student loans (both on Class 1 earnings, i.e. after salary sacrifice).
  const ni = employeeNi(cashPay, rules);
  const studentLoan = studentLoanRepayment(cashPay, inputs.studentLoan, rules);

  // 8. Child Benefit charge.
  const cc = inputs.childcare;
  const partnerAni = cc.hasPartner === 'yes' ? cc.partnerAni : null;
  const hicbc = highIncomeChildBenefitCharge(inputs.childBenefitAnnual, ani, partnerAni, rules);

  // 9. Annual allowance.
  const annualAllowance = annualAllowanceCheck({
    rules,
    allowance: inputs.pensionAllowance,
    pension,
    rasRelievedGross,
    netIncome,
    chargeFor: (excess) =>
      calculateIncomeTax({
        ...taxBase,
        nonSavingsIncome: nonSavingsIncome + excess,
        adjustedNetIncome: ani,
        bandExtension: rasRelievedGross + giftAidGross,
      }).total - incomeTax.total,
  });

  // 10. Cash position.
  const otherCash = inc.propertyIncome + inc.otherNonSavingsIncome + inc.savingsInterest + inc.dividends;
  const grossCashIncome = cashPay + otherCash;
  const takeHome = grossCashIncome - pension.netPay - rasCashPaid - incomeTax.total - ni.total - studentLoan.total;

  const employeeFundedGross = pension.salarySacrifice + pension.netPay + rasGross;
  const employerContribution = pension.employerOther;

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
    contractualPay,
    cashPayAfterSacrifice: cashPay,
    totalIncome: netIncome,
    adjustedNetIncome: ani,
    incomeTax,
    incomeTaxBeforeClaims: beforeClaims.total,
    reliefToClaim,
    employeeNi: ni,
    employerNi: employerNiNow,
    studentLoan,
    pension,
    rasRelievedGross,
    rasCashPaid,
    employeeFundedGross,
    employerContribution,
    totalPensionInvestment: employeeFundedGross + employerContribution,
    takeHome,
    grossCashIncome,
    annualAllowance,
    hicbc,
    warnings,
  };
}
