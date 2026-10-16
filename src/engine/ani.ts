import { nonNeg } from './money';
import type { IncomeInputs, Pence, ResolvedPension } from './types';

/**
 * Income components, defined once (docs/CALCULATION_CONVENTIONS.md §1).
 * Every other module consumes these values; none recomputes them.
 */
export interface IncomeComponents {
  /** Salary + bonus before salary sacrifice. */
  contractualPay: Pence;
  /** §1.1 Class 1 earnings = salary + bonus − salary sacrifice. Basis for NI and student loans. Net pay is NOT deducted. */
  classOneEarnings: Pence;
  /**
   * §1.2 Employment income = Class 1 earnings − all net-pay deductions + taxable benefits. The caller
   * passes DC net pay plus DB member contributions as `netPay` (both are deducted before tax).
   */
  employmentIncome: Pence;
  /** §1.3 Non-savings income = employment income + property + other non-savings income. */
  nonSavingsIncome: Pence;
  /**
   * §1.4 Net income: income before the personal allowance, after salary sacrifice and net-pay
   * deductions, before relief-at-source gross contributions and Gift Aid. Excludes all
   * employer pension contributions.
   */
  netIncome: Pence;
  /** §1.6 UK taxable earnings used for the pension relief limit. */
  taxableEarnings: Pence;
}

function assertMoney(name: string, v: number): void {
  if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
    throw new RangeError(`${name} must be a non-negative whole number of pence (got ${v}).`);
  }
}

/**
 * Derive the income components from income inputs and resolved pension arrangements.
 * `salarySacrifice` and `netPay` must already be capped to the pay available.
 */
export function computeIncomeComponents(
  income: IncomeInputs,
  pension: Pick<ResolvedPension, 'salarySacrifice' | 'netPay'>,
  extraEarnings: Pence = 0,
): IncomeComponents {
  for (const [k, v] of Object.entries(income)) assertMoney(`income.${k}`, v);
  assertMoney('salarySacrifice', pension.salarySacrifice);
  assertMoney('netPay', pension.netPay);
  assertMoney('extraEarnings', extraEarnings);

  const contractualPay = income.salary + income.bonus + extraEarnings;
  if (pension.salarySacrifice > contractualPay) throw new RangeError('Salary sacrifice exceeds contractual pay.');
  const classOneEarnings = contractualPay - pension.salarySacrifice;
  if (pension.netPay > classOneEarnings) throw new RangeError('Net-pay contributions exceed pay after salary sacrifice.');
  const employmentIncome = classOneEarnings - pension.netPay + income.taxableBenefits;
  const nonSavingsIncome = employmentIncome + income.propertyIncome + income.otherNonSavingsIncome;
  const netIncome = nonSavingsIncome + income.savingsInterest + income.dividends;
  return {
    contractualPay,
    classOneEarnings,
    employmentIncome,
    nonSavingsIncome,
    netIncome,
    taxableEarnings: classOneEarnings + income.taxableBenefits,
  };
}

export interface AniInput {
  /** Net income as defined in IncomeComponents.netIncome (§1.4). */
  netIncome: Pence;
  /** Relieved relief-at-source contributions, GROSS (net paid + basic-rate top-up). */
  reliefAtSourceGross: Pence;
  /** Gift Aid donations grossed up at the basic rate. */
  giftAidGross: Pence;
}

/**
 * Adjusted net income (§1.5; ITA 2007 s.58; GOV.UK "Adjusted net income"):
 * ANI = max(0, net income − gross relief-at-source contributions − grossed-up Gift Aid).
 * Salary sacrifice and net-pay contributions are already reflected in net income and must
 * not be passed here again. Employer contributions are never deducted.
 */
export function adjustedNetIncome(input: AniInput): Pence {
  assertMoney('netIncome', input.netIncome);
  assertMoney('reliefAtSourceGross', input.reliefAtSourceGross);
  assertMoney('giftAidGross', input.giftAidGross);
  return nonNeg(input.netIncome - input.reliefAtSourceGross - input.giftAidGross);
}

/** Gross up a net payment at the basic rate (Gift Aid and relief at source): net / (1 − rate). */
export function grossUpAtBasicRate(net: Pence, basicRate: number): Pence {
  assertMoney('net', net);
  if (!(basicRate > 0 && basicRate < 1)) throw new RangeError(`Basic rate for gross-up must be between 0 and 1 (got ${basicRate}).`);
  return Math.round(net / (1 - basicRate));
}
