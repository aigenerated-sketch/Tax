import type { TaxYearRules } from '../rules/types';
import { floorPence, nonNeg } from './money';
import type { HicbcResult, Pence } from './types';

/**
 * High Income Child Benefit Charge: 1% of Child Benefit for every £200 of ANI above
 * £60,000, capped at 100%. The charge falls on the partner with the higher ANI.
 * If the partner's ANI is unknown the charge is calculated on the user's ANI (flagged).
 */
export function highIncomeChildBenefitCharge(
  childBenefit: Pence,
  userAni: Pence,
  partnerAni: Pence | null,
  rules: TaxYearRules,
): HicbcResult {
  const cb = nonNeg(childBenefit);
  if (cb === 0) return { childBenefit: 0, aniUsed: userAni, payer: 'none', percentage: 0, charge: 0 };
  const partnerHigher = partnerAni !== null && partnerAni > userAni;
  const aniUsed = partnerHigher ? partnerAni : userAni;
  const { hicbcThreshold, hicbcStep } = rules.childBenefit;
  const percentage = Math.min(100, Math.floor(nonNeg(aniUsed - hicbcThreshold) / hicbcStep));
  return {
    childBenefit: cb,
    aniUsed,
    payer: percentage === 0 ? 'none' : partnerHigher ? 'partner' : 'you',
    percentage,
    charge: floorPence((cb * percentage) / 100),
  };
}
