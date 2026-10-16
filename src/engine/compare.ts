import { METHOD_LABELS } from './pension';
import { calculateScenario } from './scenario';
import { PENSION_METHODS, type CalculatorInputs, type Pence, type PensionMethod, type ScenarioDelta, type ScenarioResult } from './types';

export function baselineScenario(inputs: CalculatorInputs): ScenarioResult {
  return calculateScenario(inputs, { label: 'Current position', method: null, additionalGross: 0 });
}

export function delta(before: ScenarioResult, after: ScenarioResult): ScenarioDelta {
  return {
    takeHome: after.takeHome - before.takeHome,
    employeePensionCash: after.employeePensionCash - before.employeePensionCash,
    incomeTax: after.incomeTax.total - before.incomeTax.total,
    employeeNi: after.employeeNi.total - before.employeeNi.total,
    studentLoan: after.studentLoan.total - before.studentLoan.total,
    employerNi: after.employerNi - before.employerNi,
    adjustedNetIncome: after.adjustedNetIncome - before.adjustedNetIncome,
    totalPensionInvestment: after.totalPensionInvestment - before.totalPensionInvestment,
    hicbc: after.hicbc.charge - before.hicbc.charge,
  };
}

export interface MethodComparisonRow {
  method: PensionMethod;
  label: string;
  scenario: ScenarioResult;
  change: ScenarioDelta;
}

/** Same baseline, same gross additional contribution, each method's own rules. */
export function compareMethods(inputs: CalculatorInputs, gross: Pence, methods: PensionMethod[] = PENSION_METHODS): MethodComparisonRow[] {
  const base = baselineScenario(inputs);
  return methods.map((method) => {
    const scenario = calculateScenario(inputs, { label: METHOD_LABELS[method], method, additionalGross: gross });
    return { method, label: METHOD_LABELS[method], scenario, change: delta(base, scenario) };
  });
}
