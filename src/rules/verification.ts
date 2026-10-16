import { SOURCES } from './sources';
import type { TaxYearRules } from './types';
import { TAX_YEAR_2026_27 as R } from './taxYear2026_27';

/**
 * Rule-by-rule verification register for 2026/27.
 *
 * Values are read from the live rule object so the register can never disagree with the
 * engine. Status meanings:
 *  - official:    figure or rule stated on the cited official page (checked 2026-10-16).
 *  - official-inferred: follows directly from official statements, but not stated in those words.
 *  - secondary:   only supported by non-government sources; treated as an assumption.
 *  - convention:  a modelling choice where the official rule is silent or ambiguous.
 */
export type VerificationLevel = 'official' | 'official-inferred' | 'secondary' | 'convention';

export interface RuleCheck {
  area: string;
  rule: string;
  value: string;
  level: VerificationLevel;
  sources: string[];
  note?: string;
}

const gbp = (p: number) => `£${(p / 100).toLocaleString('en-GB', { minimumFractionDigits: p % 100 === 0 ? 0 : 2 })}`;
const pc = (r: number) => `${+(r * 100).toFixed(2)}%`;
const src = (...xs: { url: string }[]) => xs.map((x) => x.url);

function bandRows(r: TaxYearRules, set: 'rUK' | 'scotland', area: string, sources: string[]): RuleCheck[] {
  let prev = 0;
  return r.incomeTax[set].bands.map((b) => {
    const from = prev;
    prev = b.upTo ?? prev;
    return {
      area,
      rule: `${b.label} (taxable income)`,
      value: `${b.upTo === null ? `over ${gbp(from)}` : `${gbp(from === 0 ? 0 : from + 100)}–${gbp(b.upTo)}`} at ${pc(b.rate)}`,
      level: 'official' as const,
      sources,
    };
  });
}

export const VERIFICATION_2026_27: RuleCheck[] = [
  // Personal allowance
  { area: 'Personal allowance', rule: 'Standard personal allowance', value: gbp(R.personalAllowance.standard), level: 'official', sources: src(SOURCES.incomeTaxRates, SOURCES.employers2026, SOURCES.budgetAnnex) },
  { area: 'Personal allowance', rule: 'Income limit (taper starts above)', value: gbp(R.personalAllowance.taperThreshold), level: 'official', sources: src(SOURCES.incomeTaxRates) },
  { area: 'Personal allowance', rule: 'Taper: £1 lost per £2 over the limit; zero at £125,140', value: '£1 per £2', level: 'official', sources: src(SOURCES.incomeTaxRates, SOURCES.scotRates) },
  { area: 'Personal allowance', rule: 'Rounding: £1 lost per complete £2; ANI truncated to whole pounds', value: 'floor', level: 'convention', sources: [], note: 'U4. Statute reduces by one-half of the excess; maximum difference 50p of allowance.' },
  { area: 'Personal allowance', rule: 'Allocation across non-savings / savings / dividends: "the way which will result in the greatest reduction" (to 2026-27)', value: 'most favourable', level: 'official', sources: src(SOURCES.itaS25), note: 'Fixed order (non-property/savings/dividend first) only from 2027-28 (s25(3A)). Engine tries every priority order — U13.' },
  { area: 'Rounding', rule: 'Each band amount × rate rounded half-up to the penny (exact integer arithmetic); student loans and HICBC rounded down', value: 'half-up', level: 'convention', sources: [], note: 'No statutory per-band rounding rule found; affects at most 1p per band.' },

  // rUK
  ...bandRows(R, 'rUK', 'Income Tax — England, Wales, NI', src(SOURCES.incomeTaxRates, SOURCES.employers2026)),

  // Scotland
  ...bandRows(R, 'scotland', 'Income Tax — Scotland', src(SOURCES.employers2026, SOURCES.scottishIncomeTax, SOURCES.scotRates, SOURCES.scotRateResolution)),
  { area: 'Income Tax — Scotland', rule: 'Scottish rates apply to non-savings, non-dividend income only', value: 'yes', level: 'official', sources: src(SOURCES.scottishIncomeTax) },
  { area: 'Income Tax — Scotland', rule: 'Scottish Rate Resolution 2026-27 approved', value: '19 February 2026', level: 'secondary', sources: ['https://www.parliament.scot/chamber-and-committees/votes-and-motions/S6M-20844', 'https://www.tax.org.uk/msps-agree-income-tax-rates-for-2026-27'], note: 'Band figures themselves are official (HMRC employer page publishes them as in force).' },

  // Savings and dividends
  { area: 'Savings', rule: 'Starting rate for savings band', value: `${gbp(R.incomeTax.savings.startingRateBand)} at 0%, reduced £1 per £1 of other income over the PA`, level: 'official', sources: src(SOURCES.incomeTaxRates, SOURCES.savingsTaxFree, SOURCES.itaS12) },
  { area: 'Savings', rule: 'Starting rate applies to savings within the first £5,000 of taxable income; dividends (taxed last) do not reduce it; not extended by RAS/Gift Aid', value: 's12', level: 'official', sources: src(SOURCES.itaS12) },
  { area: 'Savings', rule: 'Personal savings allowance (basic / higher / additional)', value: `${gbp(R.incomeTax.savings.personalSavingsAllowance.basic)} / ${gbp(R.incomeTax.savings.personalSavingsAllowance.higher)} / ${gbp(R.incomeTax.savings.personalSavingsAllowance.additional)}`, level: 'official', sources: src(SOURCES.savingsTaxFree) },
  { area: 'Savings', rule: 'Savings rates (basic / higher / additional)', value: `${pc(R.incomeTax.savings.basicRate)} / ${pc(R.incomeTax.savings.higherRate)} / ${pc(R.incomeTax.savings.additionalRate)}`, level: 'official', sources: src(SOURCES.budgetAnnex), note: 'Rates rise to 22% / 42% / 47% from April 2027 (not relevant to 2026/27).' },
  { area: 'Savings', rule: 'PSA band: £500 if any "higher-rate income", £0 if any "additional-rate income" — including income that would be at those rates but for the savings or dividend nil rates', value: 's12B', level: 'official', sources: src(SOURCES.itaS12B) },
  { area: 'Savings', rule: 'Scottish taxpayers: PSA band tested as if not a Scottish taxpayer (UK thresholds)', value: 'UK thresholds', level: 'official', sources: src(SOURCES.itaS12B), note: 'Resolved (was U3). s12B(8) treats income of a Scottish taxpayer by reference to the rates that would apply if not Scottish.' },
  { area: 'Dividends', rule: 'Dividend allowance', value: gbp(R.incomeTax.dividends.allowance), level: 'official', sources: src(SOURCES.incomeTaxRates, SOURCES.dividends) },
  { area: 'Dividends', rule: 'Dividend rates (ordinary / upper / additional)', value: `${pc(R.incomeTax.dividends.basicRate)} / ${pc(R.incomeTax.dividends.higherRate)} / ${pc(R.incomeTax.dividends.additionalRate)}`, level: 'official', sources: src(SOURCES.incomeTaxRates, SOURCES.dividends) },
  { area: 'Dividends', rule: 'Savings and dividends taxed at UK rates for Scottish taxpayers', value: 'yes', level: 'official', sources: src(SOURCES.scottishIncomeTax) },

  // NI
  { area: 'National Insurance', rule: 'Employee primary threshold (annual)', value: gbp(R.nationalInsurance.primaryThreshold), level: 'official', sources: src(SOURCES.employers2026, SOURCES.niRates) },
  { area: 'National Insurance', rule: 'Upper earnings limit (annual)', value: gbp(R.nationalInsurance.upperEarningsLimit), level: 'official', sources: src(SOURCES.employers2026, SOURCES.niRates) },
  { area: 'National Insurance', rule: 'Employee rates, category A (main / above UEL)', value: `${pc(R.nationalInsurance.mainRate)} / ${pc(R.nationalInsurance.upperRate)}`, level: 'official', sources: src(SOURCES.employers2026, SOURCES.niRates) },
  { area: 'National Insurance', rule: 'Employer secondary threshold and rate', value: `${gbp(R.nationalInsurance.secondaryThreshold)} at ${pc(R.nationalInsurance.employerRate)}`, level: 'official', sources: src(SOURCES.employers2026, SOURCES.niRates) },
  { area: 'National Insurance', rule: 'Employee pension contributions (incl. net pay) do not reduce NI earnings', value: 'no NI relief', level: 'official', sources: src(SOURCES.nimPension) },
  { area: 'National Insurance', rule: 'Salary sacrifice reduces cash pay subject to Class 1 NI', value: 'yes', level: 'official-inferred', sources: src(SOURCES.salarySacrifice, SOURCES.nimPension), note: 'Employer pension contributions are not earnings; sacrificed salary is replaced by one.' },
  { area: 'National Insurance', rule: 'Annual (not per-period) calculation', value: 'annualised', level: 'convention', sources: [], note: 'Payroll differs where pay varies by period.' },

  // Pensions
  { area: 'Pensions', rule: 'Relief at source: provider claims basic rate', value: pc(R.pensions.reliefAtSourceBasicRate), level: 'official', sources: src(SOURCES.pensionTaxRelief) },
  { area: 'Pensions', rule: 'Higher/additional relief claimed via Self Assessment (or HMRC), not paid to the pension', value: 'claim', level: 'official', sources: src(SOURCES.pensionTaxRelief) },
  { area: 'Pensions', rule: 'Scottish extra relief: 0% at 19% (no claw-back), 1% at 21%, 22% at 42%, 25% at 45%, 28% at 48%', value: 'marginal', level: 'official', sources: src(SOURCES.pensionTaxRelief), note: 'U2. Reproduced by band extension from the Scottish basic band upwards.' },
  { area: 'Pensions', rule: 'Relief limit: higher of 100% of UK taxable earnings and the basic amount', value: gbp(R.pensions.basicAmount), level: 'official', sources: src(SOURCES.pensionRates, SOURCES.pensionTaxRelief) },
  { area: 'Pensions', rule: 'Net-pay contributions deducted before Income Tax', value: 'yes', level: 'official', sources: src(SOURCES.pensionTaxRelief) },
  { area: 'Pensions', rule: 'No tax on employer contributions to a registered scheme', value: 'yes', level: 'official', sources: src(SOURCES.salarySacrifice) },
  { area: 'Pensions', rule: 'Salary sacrifice must not take cash pay below NMW; needs contract change', value: 'warning only', level: 'official', sources: src(SOURCES.salarySacrifice), note: 'Not enforced numerically (hours unknown).' },
  { area: 'Pensions', rule: 'Annual allowance', value: gbp(R.pensions.annualAllowance), level: 'official', sources: src(SOURCES.pensionRates, SOURCES.annualAllowance) },
  { area: 'Pensions', rule: 'Taper: threshold income / adjusted income', value: `${gbp(R.pensions.taperThresholdIncome)} / ${gbp(R.pensions.taperAdjustedIncome)}`, level: 'official', sources: src(SOURCES.pensionRates, SOURCES.taperedAllowance) },
  { area: 'Pensions', rule: 'Minimum tapered allowance; £1 per £2', value: gbp(R.pensions.minimumTaperedAllowance), level: 'official', sources: src(SOURCES.pensionRates, SOURCES.taperedAllowance) },
  { area: 'Pensions', rule: 'Threshold income: net income (ITA s23 Step 2) + salary sacrifice for pension − RAS contributions entitled to relief − lump-sum death benefits; Gift Aid is not deducted', value: 's228ZA(5)', level: 'official', sources: src(SOURCES.faS228ZA, SOURCES.taperedAllowance), note: 'Lump-sum death benefits not modelled.' },
  { area: 'Pensions', rule: 'Adjusted income: net income + net-pay deductions + total pension input − contributions paid by the individual', value: 's228ZA(4)', level: 'official', sources: src(SOURCES.faS228ZA, SOURCES.taperedAllowance), note: 'DB member contributions not collected, so the whole DB input is added (U6).' },
  { area: 'Pensions', rule: 'Pension input (DC) = all relievable contributions paid by or for the individual (not capped by earnings) + employer contributions', value: 's233(1)', level: 'official', sources: src(SOURCES.faS233, SOURCES.faS188), note: 'Audit fix F1: contributions above the relief limit now count. Contributions after age 75 are not relievable — not modelled.' },
  { area: 'Pensions', rule: 'Money purchase annual allowance', value: gbp(R.pensions.moneyPurchaseAnnualAllowance), level: 'official', sources: src(SOURCES.pensionRates, SOURCES.ptmMpaa) },
  { area: 'Pensions', rule: 'Carry forward: previous 3 years, membership required; only adds to the alternative allowance when MPAA applies', value: '3 years', level: 'official', sources: src(SOURCES.ptmCarryForward, SOURCES.annualAllowance), note: 'Membership and year order are not checked — user must enter a verified figure.' },
  { area: 'Pensions', rule: 'Annual allowance charge: excess stacked on top of income at marginal rates', value: 'estimate', level: 'official-inferred', sources: src(SOURCES.ptmCharge), note: 'U7. Manual page shows older Scottish rates; Scottish starter rate excluded there but not here.' },
  { area: 'Pensions', rule: 'Automatic-enrolment qualifying earnings', value: `${gbp(R.pensions.qualifyingEarningsLower)}–${gbp(R.pensions.qualifyingEarningsUpper)}`, level: 'official', sources: src(SOURCES.aeThresholds) },

  // ANI and Gift Aid
  { area: 'Adjusted net income', rule: 'ANI = net income − grossed-up Gift Aid − grossed-up RAS contributions', value: '×1.25 gross-up', level: 'official', sources: src(SOURCES.ani) },
  { area: 'Adjusted net income', rule: 'Net-pay contributions already excluded from net income', value: 'not deducted again', level: 'official-inferred', sources: src(SOURCES.pensionTaxRelief, SOURCES.ani), note: 'GOV.UK ANI page does not mention net pay; follows from deduction before tax.' },
  { area: 'Gift Aid', rule: 'Gross-up 25p per £1; donations must not exceed 4× tax paid', value: pc(R.giftAid.basicRate), level: 'official', sources: src(SOURCES.giftAid) },
  { area: 'Gift Aid', rule: 'Higher-rate relief claimed through Self Assessment / tax code (also in Scotland)', value: 'claim', level: 'official', sources: src(SOURCES.giftAid) },

  // Student loans
  { area: 'Student loans', rule: 'Thresholds Plan 1 / 2 / 4 / 5', value: ['plan1', 'plan2', 'plan4', 'plan5'].map((k) => gbp(R.studentLoans.plans[k as 'plan1']?.threshold ?? 0)).join(' / '), level: 'official', sources: src(SOURCES.employers2026, SOURCES.studentLoanEmployers, SOURCES.studentLoans) },
  { area: 'Student loans', rule: 'Postgraduate loan threshold; rates 9% / 6%', value: gbp(R.studentLoans.postgraduate.threshold), level: 'official', sources: src(SOURCES.employers2026, SOURCES.studentLoanEmployers) },
  { area: 'Student loans', rule: 'Deductions use the pay used for employer secondary Class 1 NI', value: 'Class 1 earnings', level: 'official', sources: src(SOURCES.studentLoanEmployers), note: 'Hence salary sacrifice reduces them; net pay does not.' },
  { area: 'Student loans', rule: 'Multiple undergraduate plans; Self Assessment on unearned income', value: 'not modelled', level: 'convention', sources: src(SOURCES.studentLoans) },

  // Child Benefit
  { area: 'Child Benefit', rule: 'HICBC: 1% per £200 of ANI over the threshold; 100% at £80,000', value: gbp(R.childBenefit.hicbcThreshold), level: 'official', sources: src(SOURCES.hicbc) },

  // Childcare
  { area: 'Childcare', rule: 'Each parent’s ANI must not exceed', value: gbp(R.childcare.aniLimit), level: 'official', sources: src(SOURCES.freeChildcareEligibility, SOURCES.taxFreeChildcareEligibility) },
  { area: 'Childcare', rule: 'Minimum income per 3 months (21+ / 18–20 / under 18 or apprentice)', value: `${gbp(R.childcare.minimumIncomeQuarterly21Plus)} / ${gbp(R.childcare.minimumIncomeQuarterly18to20)} / ${gbp(R.childcare.minimumIncomeQuarterlyUnder18OrApprentice)}`, level: 'official', sources: src(SOURCES.freeChildcareEligibility, SOURCES.taxFreeChildcareEligibility, SOURCES.minimumWage) },
  { area: 'Childcare', rule: 'Tax-Free Childcare: £2 per £8; cap per child (disabled)', value: `${gbp(R.childcare.taxFreeChildcare.annualCapPerChild)} (${gbp(R.childcare.taxFreeChildcare.annualCapPerDisabledChild)})`, level: 'official', sources: src(SOURCES.taxFreeChildcare) },
  { area: 'Childcare', rule: 'Tax-Free Childcare age limit: to September after 11th (16th if disabled) birthday', value: '11 / 16', level: 'official', sources: src(SOURCES.taxFreeChildcareEligibility) },
  { area: 'Childcare', rule: 'Tax-Free Childcare bars: UC childcare, vouchers, bursary/grant, fostering, child not living with you', value: 'bars', level: 'official', sources: src(SOURCES.taxFreeChildcareEligibility) },
  { area: 'Childcare', rule: 'England working-parent hours: 9 months to school age', value: `${R.childcare.englandWorkingParentHours.hoursPerWeek} h/week, ${R.childcare.englandWorkingParentHours.weeksPerYear} weeks`, level: 'official', sources: src(SOURCES.freeChildcareEligibility, SOURCES.freeChildcareWorking) },
  { area: 'Childcare', rule: 'England universal hours for 3–4-year-olds (not income-tested)', value: `${R.childcare.englandUniversalHours3to4.hoursPerWeek} h/week, ${R.childcare.englandUniversalHours3to4.weeksPerYear} weeks (570 h/yr)`, level: 'official', sources: src(SOURCES.universalHours) },
  { area: 'Childcare', rule: 'Immigration status and NI number required', value: 'yes', level: 'official', sources: src(SOURCES.freeChildcareEligibility, SOURCES.taxFreeChildcareEligibility) },
  { area: 'Childcare', rule: 'Scotland, Wales and NI funded-hours schemes', value: 'not assessed', level: 'convention', sources: src(SOURCES.helpWithChildcare), note: 'U8. Different schemes; the app says so and does not guess.' },
];

export interface Uncertainty {
  id: string;
  title: string;
  detail: string;
  handling: string;
}

/** Open uncertainties and assumptions for 2026/27. Mirrored in docs/RULES_VERIFICATION.md. */
export const UNCERTAINTIES_2026_27: Uncertainty[] = [
  { id: 'U1', title: 'Annual, not per-period, payroll', detail: 'Income Tax and NI are calculated on annual totals. PAYE uses cumulative tax codes and NI is non-cumulative per pay period.', handling: 'Always shown as an assumption; bonus months can differ.' },
  { id: 'U2', title: 'Scottish relief-at-source and Gift Aid mechanics', detail: 'GOV.UK states the extra relief Scottish taxpayers receive (none at 19%, 1% at 21%, 22% at 42%, 25% at 45%, 28% at 48%) but not the exact mechanism. The engine extends the Scottish basic band and every band above it, which reproduces those rates.', handling: 'Labelled as an estimate for Scottish users; tested against the GOV.UK rates.' },
  { id: 'U3', title: 'Personal savings allowance for Scottish taxpayers (resolved)', detail: 'Resolved on audit: ITA 2007 s12B(8) determines the band as if the person were not a Scottish taxpayer, so UK thresholds are correct.', handling: 'Information note only.' },
  { id: 'U4', title: 'Personal allowance taper rounding', detail: 'Statute reduces the allowance by one-half of the excess; GOV.UK says £1 for every £2. The engine removes £1 per complete £2 after truncating ANI to whole pounds.', handling: 'Maximum difference 50p of allowance (≤ 22.5p of tax). Documented and tested at £100,001 / £100,002.' },
  { id: 'U5', title: 'Gift Aid 4× test', detail: 'GOV.UK: donations must not exceed 4 times the tax paid. Capital Gains Tax is not modelled, so the check uses Income Tax only.', handling: 'Warning only; the shortfall is not added to the figures.' },
  { id: 'U6', title: 'Annual allowance inputs', detail: 'Lump-sum death benefits are not modelled; DB pension input must be supplied by the user and the DB member’s own contributions are not collected, so adjusted income may be overstated for DB members; carry-forward eligibility (membership, year order) is not checked; contributions after age 75 and scheme refunds of excess contributions are not modelled. Gift Aid treatment resolved on audit: s228ZA does not deduct it.', handling: 'Annual allowance result labelled "not verified" unless carry-forward is entered, MPAA status is known, and no DB scheme is involved.' },
  { id: 'U7', title: 'Annual allowance charge rate', detail: 'PTM056110 stacks the excess on top of income; for Scottish taxpayers the starter rate does not apply. The engine stacks the excess on non-savings income and does not exclude the starter band.', handling: 'Charge shown as "roughly"; difference only arises if the excess falls in the starter band.' },
  { id: 'U8', title: 'Childcare outside England and edge cases', detail: 'Funded-hours schemes in Scotland, Wales and Northern Ireland are not assessed. Child age is a band, not a date. Minimum-income exceptions (carers, some benefits, new self-employed) are not modelled.', handling: 'Shown as "Not assessed" or "Eligibility not confirmed"; exceptions named in the failure text.' },
  { id: 'U9', title: 'Student loans', detail: 'One undergraduate plan plus optional postgraduate loan; Self Assessment repayments on unearned income are not modelled.', handling: 'Assumption shown when a loan is selected.' },
  { id: 'U10', title: 'Scottish Rate Resolution', detail: 'Band figures are official (Scottish Government and HMRC). Approval of the 2026-27 Scottish Rate Resolution on 19 February 2026 was confirmed from the Scottish Parliament motion page and CIOT, not from a Scottish Government page.', handling: 'No effect on figures; HMRC publishes the same bands as in force.' },
  { id: 'U11', title: 'Build-brief discrepancy (resolved)', detail: 'The brief described the Scottish intermediate band as "the next £12,570". The published band is £16,957–£31,092 of taxable income (£14,136 wide).', handling: 'Official figure used and tested.' },
  { id: 'U13', title: 'Personal allowance allocation search', detail: 'ITA s25(2) requires the allocation giving the greatest reduction. The engine evaluates every priority order of non-savings, savings and dividends. A brute-force test of fractional splits on a grid of mixed incomes found no cheaper split, but this is not a proof for every input.', handling: 'Documented; in every tested case the result equals non-savings first.' },
  { id: 'U12', title: '2025/26 rules', detail: 'The 2025/26 rule set (provided for comparison) was checked against the GOV.UK 2025-26 employer page and NMW rates, but has no rule-by-rule register.', handling: 'Default year is 2026/27.' },
];
