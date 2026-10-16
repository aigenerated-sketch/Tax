import type { TaxYearRules } from '../rules/types';
import { nonNeg, roundPence } from './money';
import type { NationalInsuranceResult, Pence } from './types';

/**
 * Employee Class 1 NI, category A, calculated on an ANNUAL basis.
 * Payroll actually assesses NI per pay period (non-cumulatively), so a real payslip
 * can differ, especially where pay varies month to month (e.g. a bonus month).
 */
export function employeeNi(earnings: Pence, rules: TaxYearRules): NationalInsuranceResult {
  const { primaryThreshold, upperEarningsLimit, mainRate, upperRate } = rules.nationalInsurance;
  const e = nonNeg(earnings);
  const mainBandEarnings = nonNeg(Math.min(e, upperEarningsLimit) - primaryThreshold);
  const upperBandEarnings = nonNeg(e - upperEarningsLimit);
  const mainBandNi = roundPence(mainBandEarnings * mainRate);
  const upperBandNi = roundPence(upperBandEarnings * upperRate);
  return {
    earnings: e,
    mainBandEarnings,
    upperBandEarnings,
    mainBandNi,
    upperBandNi,
    total: mainBandNi + upperBandNi,
  };
}

/** Employer Class 1 secondary NI, category A, annualised. Used only to estimate salary-sacrifice savings. */
export function employerNi(earnings: Pence, rules: TaxYearRules): Pence {
  const { secondaryThreshold, employerRate } = rules.nationalInsurance;
  return roundPence(nonNeg(earnings - secondaryThreshold) * employerRate);
}
