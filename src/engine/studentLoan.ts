import type { TaxYearRules } from '../rules/types';
import { applyRateDown, nonNeg } from './money';
import type { Pence, StudentLoanInputs, StudentLoanResult } from './types';

/**
 * Annualised student and postgraduate loan deductions through payroll.
 * Payroll uses earnings for Class 1 NI purposes, so salary sacrifice reduces the
 * repayment but net-pay and relief-at-source pension contributions do not.
 * Repayments on unearned income via Self Assessment are not modelled.
 */
export function studentLoanRepayment(
  niEarnings: Pence,
  input: StudentLoanInputs,
  rules: TaxYearRules,
): StudentLoanResult {
  let plan = 0;
  if (input.plan !== 'none') {
    const rule = rules.studentLoans.plans[input.plan];
    if (rule) plan = applyRateDown(nonNeg(niEarnings - rule.threshold), rule.rate);
  }
  let postgraduate = 0;
  if (input.postgraduate) {
    const rule = rules.studentLoans.postgraduate;
    postgraduate = applyRateDown(nonNeg(niEarnings - rule.threshold), rule.rate);
  }
  return { earnings: niEarnings, plan, postgraduate, total: plan + postgraduate };
}
