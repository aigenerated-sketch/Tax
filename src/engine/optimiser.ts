import { moneyText, nonNeg } from './money';
import { calculateScenario, rulesFor } from './scenario';
import type { CalculatorInputs, OptimiserResult, Pence, PensionMethod } from './types';

/**
 * Largest additional gross contribution that the chosen method can carry while still
 * reducing adjusted net income:
 *  - salary sacrifice: cannot exceed remaining cash pay (salary + bonus − existing sacrifice);
 *  - net pay: cannot exceed remaining pay after sacrifice and existing net-pay contributions;
 *  - relief at source: relief limited to the higher of relevant UK earnings and £3,600,
 *    less personal contributions already made.
 * National Minimum Wage limits on salary sacrifice and scheme-specific caps are NOT modelled.
 */
export function maxFeasibleAdditional(inputs: CalculatorInputs, method: PensionMethod): Pence {
  const rules = rulesFor(inputs);
  const base = calculateScenario(inputs, { label: 'base', method: null, additionalGross: 0 });
  const cashPay = base.cashPayAfterSacrifice;
  switch (method) {
    case 'salary-sacrifice':
      return nonNeg(cashPay);
    case 'net-pay':
      return nonNeg(cashPay - base.pension.netPay - base.dbMemberContributions);
    case 'ras-workplace':
    case 'ras-sipp': {
      const limit = Math.max(cashPay + inputs.income.taxableBenefits, rules.pensions.basicAmount);
      return nonNeg(limit - base.pension.netPay - base.dbMemberContributions - base.pension.rasWorkplaceGross - base.pension.rasPersonalGross);
    }
  }
}

/**
 * Smallest additional gross contribution (to the penny) that brings adjusted net income
 * down to the target, found by bisection on the full scenario calculation so existing
 * arrangements, Gift Aid and relief limits are all respected.
 */
export function requiredContribution(inputs: CalculatorInputs, method: PensionMethod, target: Pence = inputs.targetAni): OptimiserResult {
  const aniAt = (x: Pence) => calculateScenario(inputs, { label: 'opt', method, additionalGross: x }).adjustedNetIncome;
  const currentAni = aniAt(0);
  const maxFeasibleGross = maxFeasibleAdditional(inputs, method);
  const result: OptimiserResult = {
    method,
    target,
    currentAni,
    alreadyMet: currentAni <= target,
    feasible: true,
    requiredGross: 0,
    maxFeasibleGross,
    reason: null,
  };
  if (result.alreadyMet) return result;

  if (aniAt(maxFeasibleGross) > target) {
    result.feasible = false;
    result.requiredGross = maxFeasibleGross;
    if (method === 'salary-sacrifice' || method === 'net-pay') {
      // Sacrifice lowers relevant UK earnings and net pay uses up the same relief limit, so existing
      // relief-at-source contributions can lose relief as this method's contribution rises.
      const base = calculateScenario(inputs, { label: 'base', method: null, additionalGross: 0 });
      const atMax = calculateScenario(inputs, { label: 'max', method, additionalGross: maxFeasibleGross });
      const reliefLost = base.rasRelievedGross - atMax.rasRelievedGross;
      result.reason =
        reliefLost > 0
          ? `At the maximum ${moneyText(maxFeasibleGross)} for this method, your existing relief-at-source contributions lose ${moneyText(reliefLost)} of relief, because their relief is limited to your UK taxable earnings (or £3,600 if higher) and this method reduces those earnings or uses the same limit. Adjusted net income would fall by only ${moneyText(base.adjustedNetIncome - atMax.adjustedNetIncome)}, to ${moneyText(atMax.adjustedNetIncome)}, which is still above the target.`
          : `Your employment pay is not large enough for this method alone to reach the target: at the maximum ${moneyText(maxFeasibleGross)}, adjusted net income is still ${moneyText(atMax.adjustedNetIncome)} (other income still counts).`;
    } else {
      result.reason =
        'Tax-relievable personal contributions are limited to your relevant UK earnings (or £3,600 if higher), so this method alone cannot reach the target.';
    }
    return result;
  }

  let lo = 0;
  let hi = maxFeasibleGross;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (aniAt(mid) <= target) hi = mid;
    else lo = mid + 1;
  }
  result.requiredGross = lo;
  return result;
}
