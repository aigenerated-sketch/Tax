import type { TaxYearRules } from '../rules/types';
import { nonNeg } from './money';
import type { AnnualAllowanceResult, Pence, PensionAllowanceInputs, ResolvedPension } from './types';

export interface AnnualAllowanceInput {
  rules: TaxYearRules;
  allowance: PensionAllowanceInputs;
  pension: ResolvedPension;
  /** RAS contributions entitled to relief (deducted in threshold income, FA 2004 s228ZA(5)). */
  rasRelievedGross: Pence;
  /** ALL RAS contributions paid, gross, including any above the relief limit (pension input, FA 2004 s233(1)(a)). */
  rasGross: Pence;
  /** Net income (after salary sacrifice and net-pay deductions, before RAS/Gift Aid). */
  netIncome: Pence;
  /** Estimates the Income Tax due on a given excess (taxed as the top slice of income). */
  chargeFor: (excess: Pence) => Pence;
}

/**
 * Annual allowance test for the year (estimate).
 *
 * - Threshold income ≈ net income − gross relief-at-source contributions + salary sacrificed for pension.
 * - Adjusted income ≈ net income + net-pay contributions + all employer contributions (incl. salary sacrifice) + DB pension input.
 * - Taper: if threshold income > £200k AND adjusted income > £260k, allowance falls £1 per £2, to a £10k minimum.
 * - MPAA: if triggered and DC inputs exceed £10k, the DC excess is charged and DB input is tested against the alternative allowance.
 * Gift Aid, lump-sum death benefits and DB employee-contribution adjustments are not modelled; results are labelled unverified.
 */
export function annualAllowanceCheck(input: AnnualAllowanceInput): AnnualAllowanceResult {
  const { rules, allowance, pension } = input;
  const p = rules.pensions;

  const employerTotal = pension.salarySacrifice + pension.employerOther;
  // FA 2004 s233(1): relievable pension contributions (s188 — not capped by the s190 earnings limit)
  // + contributions paid by an employer. Salary sacrifice is an employer contribution.
  const pensionInputDc = pension.salarySacrifice + pension.netPay + input.rasGross + pension.employerOther;
  const pensionInputDb = allowance.definedBenefitMember ? nonNeg(allowance.definedBenefitPensionInput) : 0;
  const pensionInputTotal = pensionInputDc + pensionInputDb;

  // FA 2004 s228ZA(5): net income + salary sacrifice for pension − RAS contributions entitled to relief.
  const thresholdIncome = nonNeg(input.netIncome - input.rasRelievedGross + pension.salarySacrifice);
  // FA 2004 s228ZA(4): net income + net-pay deductions + total pension input − contributions paid by the
  // individual. For DC this is net income + net pay + employer contributions; for DB the member's own
  // contributions are not separately known, so the whole DB input is added (overstates; flagged unverified).
  const adjustedIncome = nonNeg(input.netIncome + pension.netPay + employerTotal + pensionInputDb);

  const taperApplies = thresholdIncome > p.taperThresholdIncome && adjustedIncome > p.taperAdjustedIncome;
  let allowanceAfterTaper = p.annualAllowance;
  if (taperApplies) {
    const reductionPounds = Math.floor(Math.floor((adjustedIncome - p.taperAdjustedIncome) / 100) / 2);
    allowanceAfterTaper = Math.max(p.minimumTaperedAllowance, p.annualAllowance - reductionPounds * 100);
  }

  const cf = allowance.carryForward;
  const cfAmount = cf === null ? 0 : nonNeg(cf);
  const mpaaApplies = allowance.mpaaTriggered === 'yes';

  let excess: Pence;
  let totalAvailable: Pence;
  if (mpaaApplies && pensionInputDc > p.moneyPurchaseAnnualAllowance) {
    const alternative = nonNeg(allowanceAfterTaper - p.moneyPurchaseAnnualAllowance);
    excess = pensionInputDc - p.moneyPurchaseAnnualAllowance + nonNeg(pensionInputDb - alternative - cfAmount);
    totalAvailable = p.moneyPurchaseAnnualAllowance + alternative + cfAmount;
  } else {
    totalAvailable = allowanceAfterTaper + cfAmount;
    excess = nonNeg(pensionInputTotal - totalAvailable);
  }

  return {
    standardAllowance: p.annualAllowance,
    thresholdIncome,
    adjustedIncome,
    taperApplies,
    allowanceAfterTaper,
    mpaaApplies,
    carryForwardUsed: cf === null ? null : Math.min(cfAmount, nonNeg(pensionInputTotal - allowanceAfterTaper)),
    totalAvailable,
    pensionInputDc,
    pensionInputDb,
    pensionInputTotal,
    excess,
    estimatedCharge: excess > 0 ? input.chargeFor(excess) : 0,
    verified: cf !== null && allowance.mpaaTriggered !== 'unsure' && !allowance.definedBenefitMember,
  };
}
