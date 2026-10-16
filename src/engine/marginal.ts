import { calculateScenario } from './scenario';
import type { CalculatorInputs, MarginalRates, Pence, PensionMethod } from './types';

/** Probe used for marginal rates: £100 of extra employment earnings (bonus-like). */
export const MARGINAL_PROBE: Pence = 10_000;

/**
 * Marginal rates measured by recalculating the whole scenario with £100 more employment
 * earnings. Nothing is hard-coded: the 60% / 62% (or Scottish equivalent) effect in the
 * taper zone emerges from the rules.
 */
export function marginalRates(
  inputs: CalculatorInputs,
  method: PensionMethod | null = null,
  additionalGross: Pence = 0,
): MarginalRates {
  const base = calculateScenario(inputs, { label: 'base', method, additionalGross });
  const up = calculateScenario(inputs, { label: 'probe', method, additionalGross, incomeProbe: MARGINAL_PROBE });
  const d = (a: number, b: number) => (b - a) / MARGINAL_PROBE;
  const incomeTax = d(base.incomeTax.total, up.incomeTax.total);
  const employeeNi = d(base.employeeNi.total, up.employeeNi.total);
  const studentLoan = d(base.studentLoan.total, up.studentLoan.total);
  const grossIncome =
    base.contractualPay +
    inputs.income.taxableBenefits +
    inputs.income.propertyIncome +
    inputs.income.otherNonSavingsIncome +
    inputs.income.savingsInterest +
    inputs.income.dividends;
  return {
    probe: MARGINAL_PROBE,
    incomeTax,
    employeeNi,
    combined: incomeTax + employeeNi,
    studentLoan,
    combinedWithStudentLoan: incomeTax + employeeNi + studentLoan,
    averageEffective: grossIncome > 0 ? (base.incomeTax.total + base.employeeNi.total) / grossIncome : 0,
  };
}
