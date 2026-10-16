import type { TaxYearRules } from '../rules/types';
import type { Pence } from './types';

/**
 * Standard personal allowance after the income-limit taper (ITA 2007 s.35).
 *
 * The allowance is reduced by £1 for every complete £2 of adjusted net income above
 * the threshold. ANI is first truncated to whole pounds. The result is never negative.
 *
 * PA = max(0, standard − floor(max(0, floor(ANI) − threshold) / 2))
 */
export function personalAllowance(adjustedNetIncome: Pence, rules: TaxYearRules): Pence {
  const { standard, taperThreshold, taperDivisor } = rules.personalAllowance;
  const aniWholePounds = Math.floor(adjustedNetIncome / 100);
  const excessPounds = Math.max(0, aniWholePounds - taperThreshold / 100);
  const reductionPounds = Math.floor(excessPounds / taperDivisor);
  return Math.max(0, standard - reductionPounds * 100);
}
