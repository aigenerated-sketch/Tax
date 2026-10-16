import type { TaxYearRules } from '../rules/types';
import { assessChildcare, type ChildcareAssessment } from './childcare';
import { baselineScenario, compareMethods, delta, type MethodComparisonRow } from './compare';
import { marginalRates } from './marginal';
import { requiredContribution } from './optimiser';
import { METHOD_LABELS } from './pension';
import { calculateScenario, rulesFor } from './scenario';
import type { CalcWarning, CalculatorInputs, MarginalRates, OptimiserResult, ScenarioDelta, ScenarioResult } from './types';

export interface CalculationOutput {
  rules: TaxYearRules;
  baseline: ScenarioResult;
  proposed: ScenarioResult;
  change: ScenarioDelta;
  marginalNow: MarginalRates;
  marginalAfter: MarginalRates;
  optimiser: OptimiserResult;
  comparison: MethodComparisonRow[];
  childcareBefore: ChildcareAssessment;
  childcareAfter: ChildcareAssessment;
  warnings: CalcWarning[];
}

const money = (p: number) => `£${(p / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Warnings that describe scope and assumptions rather than a specific scenario. */
export function scopeWarnings(inputs: CalculatorInputs, rules: TaxYearRules): CalcWarning[] {
  const w: CalcWarning[] = [];
  const inc = inputs.income;
  w.push({
    id: 'ni-annualised',
    severity: 'info',
    category: 'payroll',
    message:
      'Employee NI is calculated on an annual basis. Payroll assesses NI each pay period, so actual deductions can differ (for example in a bonus month).',
  });
  if (rules.verificationStatus !== 'verified') {
    w.push({
      id: 'rules-provisional',
      severity: 'warning',
      category: 'scope',
      message: `The ${rules.label} rules are provisional and have not been checked against final published figures.`,
    });
  }
  if (inc.savingsInterest > 0 || inc.dividends > 0) {
    w.push({
      id: 'savings-dividends',
      severity: 'info',
      category: 'scope',
      message:
        'Savings and dividend income are taxed using UK-wide rates, the starting rate for savings, the personal savings allowance and the dividend allowance. ISA income should not be entered.',
    });
    if (inputs.jurisdiction === 'scotland') {
      w.push({
        id: 'scotland-psa',
        severity: 'warning',
        category: 'scotland',
        message:
          'For Scottish taxpayers the personal savings allowance band is estimated using UK thresholds. Your actual allowance may differ.',
      });
    }
  }
  if (inc.propertyIncome > 0) {
    w.push({
      id: 'property-income',
      severity: 'info',
      category: 'scope',
      message:
        'Property income is treated as taxable profit (non-savings income). The property allowance, finance-cost tax credit and losses are not modelled — enter profit after allowable expenses.',
    });
  }
  if (inc.taxableBenefits > 0) {
    w.push({
      id: 'benefits-in-kind',
      severity: 'info',
      category: 'scope',
      message:
        'Taxable benefits are included for Income Tax and adjusted net income. They do not attract employee NI. Payrolled benefits and tax-code adjustments may change when tax is collected.',
    });
  }
  if (inputs.jurisdiction === 'scotland') {
    w.push({
      id: 'scotland-ras',
      severity: 'info',
      category: 'scotland',
      message:
        'Scottish rates apply to non-savings income only. Relief-at-source and Gift Aid relief above 20% is modelled by extending the Scottish basic and higher bands; the 20% top-up is not clawed back from starter-rate taxpayers. Treat Scottish relief figures as estimates.',
    });
  }
  if (inputs.studentLoan.plan !== 'none' || inputs.studentLoan.postgraduate) {
    w.push({
      id: 'student-loan-scope',
      severity: 'info',
      category: 'student-loan',
      message:
        'Student loan deductions are estimated on annual earnings for NI purposes (salary sacrifice lowers them; net-pay and relief-at-source contributions do not). Repayments on unearned income through Self Assessment are not modelled.',
    });
  }
  if (inputs.giftAidNet > 0) {
    w.push({
      id: 'gift-aid',
      severity: 'info',
      category: 'scope',
      message: 'Gift Aid donations are grossed up at 20%, deducted from adjusted net income and used to extend your tax bands. Donations are not deducted from take-home pay.',
    });
  }
  if (inputs.childBenefitAnnual > 0 && !(inputs.childcare.hasPartner === 'yes' && inputs.childcare.partnerAni !== null)) {
    w.push({
      id: 'hicbc-partner-unknown',
      severity: 'warning',
      category: 'child-benefit',
      message:
        "The High Income Child Benefit Charge is paid by the partner with the higher adjusted net income. Your partner's income was not entered, so the charge is estimated on your income.",
    });
  }
  const totalIncome = inc.salary + inc.bonus + inc.taxableBenefits + inc.propertyIncome + inc.otherNonSavingsIncome + inc.savingsInterest + inc.dividends;
  if (totalIncome > 1_000_000_00) {
    w.push({
      id: 'very-large-income',
      severity: 'warning',
      category: 'scope',
      message: 'Very large incomes often involve rules this calculator does not cover. Take professional advice.',
    });
  }
  w.push({
    id: 'marriage-allowance',
    severity: 'info',
    category: 'scope',
    message: 'Marriage Allowance, Blind Person’s Allowance, trading losses and other reliefs are not modelled.',
  });
  return w;
}

function proposedWarnings(inputs: CalculatorInputs, proposed: ScenarioResult): CalcWarning[] {
  const w: CalcWarning[] = [];
  const aa = proposed.annualAllowance;
  if (inputs.additional.method === 'salary-sacrifice' && proposed.additionalGross > 0) {
    w.push({
      id: 'salary-sacrifice-terms',
      severity: 'warning',
      category: 'salary-sacrifice',
      message:
        'Salary sacrifice needs your employer’s agreement and a change to your contract. It can affect salary-linked benefits, pensionable pay, life cover, statutory pay (e.g. maternity pay), mortgage affordability evidence, and cannot reduce cash pay below the National Minimum Wage. Your employer is not obliged to share its NI saving.',
    });
  }
  if (inputs.additional.method === 'net-pay' && proposed.additionalGross > 0) {
    w.push({
      id: 'net-pay-confirm',
      severity: 'info',
      category: 'pension',
      message: 'Net-pay contributions reduce Income Tax but not employee NI. Confirm with payroll that your scheme uses a net-pay arrangement and accepts extra contributions.',
    });
  }
  if (aa.excess > 0) {
    w.push({
      id: 'aa-excess',
      severity: 'warning',
      category: 'annual-allowance',
      message: `Pension inputs of ${money(aa.pensionInputTotal)} exceed the allowance available on your answers (${money(aa.totalAvailable)}) by ${money(aa.excess)}. An annual allowance charge of roughly ${money(aa.estimatedCharge)} may apply.`,
    });
  }
  if (!aa.verified) {
    w.push({
      id: 'aa-unverified',
      severity: 'warning',
      category: 'annual-allowance',
      message:
        'Your available annual allowance has not been verified: carry-forward, money purchase annual allowance status or defined benefit pension input is unknown or estimated. Check with your pension scheme(s) before making large contributions.',
    });
  }
  if (inputs.pensionAllowance.mpaaTriggered === 'unsure' && aa.pensionInputDc > 1_000_000) {
    w.push({
      id: 'mpaa-unknown',
      severity: 'warning',
      category: 'annual-allowance',
      message: 'If you have flexibly accessed a defined contribution pension, the £10,000 money purchase annual allowance may apply.',
    });
  }
  if (aa.taperApplies) {
    w.push({
      id: 'aa-taper',
      severity: 'warning',
      category: 'annual-allowance',
      message: `The tapered annual allowance appears to apply (estimated allowance ${money(aa.allowanceAfterTaper)}). Threshold and adjusted income here are estimates.`,
    });
  }
  return w;
}

function dedupe(ws: CalcWarning[]): CalcWarning[] {
  const seen = new Set<string>();
  return ws.filter((w) => (seen.has(w.id) ? false : (seen.add(w.id), true)));
}

/** Run every calculation the UI needs from a single set of inputs. */
export function calculateAll(inputs: CalculatorInputs): CalculationOutput {
  const rules = rulesFor(inputs);
  const method = inputs.additional.method;
  const baseline = baselineScenario(inputs);
  const proposed = calculateScenario(inputs, {
    label: METHOD_LABELS[method],
    method,
    additionalGross: inputs.additional.grossAmount,
  });
  const childcareBefore = assessChildcare(inputs.childcare, baseline.adjustedNetIncome, rules);
  const childcareAfter = assessChildcare(inputs.childcare, proposed.adjustedNetIncome, rules);
  return {
    rules,
    baseline,
    proposed,
    change: delta(baseline, proposed),
    marginalNow: marginalRates(inputs),
    marginalAfter: marginalRates(inputs, method, inputs.additional.grossAmount),
    optimiser: requiredContribution(inputs, method),
    comparison: compareMethods(inputs, inputs.additional.grossAmount),
    childcareBefore,
    childcareAfter,
    warnings: dedupe([
      ...baseline.warnings,
      ...proposed.warnings,
      ...proposedWarnings(inputs, proposed),
      ...scopeWarnings(inputs, rules),
    ]),
  };
}
