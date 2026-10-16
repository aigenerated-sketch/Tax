import type { Jurisdiction, TaxYearRules } from '../rules/types';
import { extendBands, sliceAgainst } from './incomeTax';
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
  /** Annual allowance charge on a given excess — see annualAllowanceChargeTax (PTM056110). */
  chargeFor: (excess: Pence) => Pence;
}

/**
 * Annual allowance test for the year (estimate). Conventions: docs/CALCULATION_CONVENTIONS.md §6.
 *
 * - Pension input (DC) = all relievable personal contributions (incl. any above the relief limit) +
 *   employer contributions (FA 2004 s233, s188). DB input is the user's scheme-statement figure.
 * - Threshold income = net income + salary sacrifice − RAS contributions entitled to relief (s228ZA(5)).
 *   Gift Aid is not deducted.
 * - Adjusted income = net income + DC net pay + salary sacrifice + employer contributions + DB input
 *   (s228ZA(4)); DB member contributions are an input of their own and are not added back.
 * - Taper: if threshold income > £200k AND adjusted income > £260k, the allowance falls £1 per complete £2,
 *   to a £10k minimum.
 * - MPAA: the alternative chargeable amount (s227B) is used only if it exceeds the default (s227ZA);
 *   carry-forward only reaches DB savings (PTM055100).
 * Lump-sum death benefits, contributions after age 75 and the DB input calculation itself are not
 * modelled; results are labelled unverified where inputs are incomplete.
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
  // individual = net income + DC net pay + employer contributions (incl. sacrifice) + DB input. DB member
  // contributions are deducted in net income, then added back and subtracted again, so they net to nil
  // (they are passed separately and are not in pension.netPay).
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

  const mpaa = p.moneyPurchaseAnnualAllowance;
  // FA 2004 s227ZA(2): default chargeable amount = total pension input − annual allowance (incl. s228A carry-forward).
  const defaultChargeable = nonNeg(pensionInputTotal - (allowanceAfterTaper + cfAmount));
  // s227B: with the MPAA in force and money purchase input above £10,000, the alternative chargeable amount =
  // (money purchase input − £10,000) + (DB input − alternative annual allowance), where the alternative
  // allowance = annual allowance incl. carry-forward − £10,000. Carry-forward therefore only reaches DB
  // savings (PTM055100).
  let alternativeChargeable: Pence | null = null;
  let alternativeAllowance = 0;
  if (mpaaApplies && pensionInputDc > mpaa) {
    alternativeAllowance = nonNeg(allowanceAfterTaper + cfAmount - mpaa);
    alternativeChargeable = pensionInputDc - mpaa + nonNeg(pensionInputDb - alternativeAllowance);
  }
  // s227ZA(3)-(4): the alternative amount applies only if it EXCEEDS the default amount.
  const useAlternative = alternativeChargeable !== null && alternativeChargeable > defaultChargeable;
  const excess: Pence = useAlternative ? (alternativeChargeable as Pence) : defaultChargeable;
  const totalAvailable: Pence = useAlternative ? mpaa + alternativeAllowance : allowanceAfterTaper + cfAmount;
  const cfUsed: Pence = useAlternative
    ? Math.min(cfAmount, nonNeg(pensionInputDb - nonNeg(allowanceAfterTaper - mpaa)))
    : Math.min(cfAmount, nonNeg(pensionInputTotal - allowanceAfterTaper));

  return {
    standardAllowance: p.annualAllowance,
    thresholdIncome,
    adjustedIncome,
    taperApplies,
    allowanceAfterTaper,
    mpaaApplies,
    carryForwardUsed: cf === null ? null : cfUsed,
    defaultChargeable,
    alternativeChargeable,
    alternativeUsed: useAlternative,
    totalAvailable,
    pensionInputDc,
    pensionInputDb,
    pensionInputTotal,
    excess,
    estimatedCharge: excess > 0 ? input.chargeFor(excess) : 0,
    verified: cf !== null && allowance.mpaaTriggered !== 'unsure' && !allowance.definedBenefitMember,
  };
}

/**
 * Annual allowance charge on an excess (HMRC PTM056110 / PTM056120).
 *
 * The excess is added on top of "reduced net income" — taxable income after the personal allowance
 * (ITA 2007 s23 Step 3, so savings and dividends included) — and charged at the MAIN rates of the
 * band it falls in: 20% / 40% / 45% (rUK), or the Scottish rates for Scottish taxpayers from 2018-19,
 * where "the Scottish starter rate does not apply" (the lowest rate is the Scottish basic rate).
 * The personal allowance never shelters the excess. Band limits are extended by relief-at-source and
 * Gift Aid gross amounts, as for income.
 * Note: PTM056110's Scottish table pre-dates the advanced rate; current Scottish bands are used above
 * the basic band (U7).
 */
export function annualAllowanceChargeTax(
  excess: Pence,
  reducedNetIncome: Pence,
  jurisdiction: Jurisdiction,
  rules: TaxYearRules,
  bandExtension: Pence,
): Pence {
  if (excess <= 0) return 0;
  const set = jurisdiction === 'scotland' ? rules.incomeTax.scotland : rules.incomeTax.rUK;
  const segments = extendBands(set.bands, set.extensionStartIndex, nonNeg(bandExtension));
  if (jurisdiction === 'scotland' && segments.length > 1) {
    // Starter rate does not apply: the starter slice is charged at the Scottish basic rate.
    const basic = segments[1];
    const starter = segments[0];
    if (basic && starter) segments[0] = { ...starter, rate: basic.rate, label: basic.label };
  }
  return sliceAgainst(nonNeg(reducedNetIncome), excess, segments, 'non-savings').reduce((a, x) => a + x.tax, 0);
}
