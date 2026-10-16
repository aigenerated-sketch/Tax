import type { SourceRef } from './types';

/** Official source register. Every rule file cites a subset of these. */
export const SOURCES = {
  incomeTaxRates: {
    id: 'income-tax-rates',
    title: 'Income Tax rates and allowances: current and past (GOV.UK)',
    url: 'https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past',
  },
  niRates: {
    id: 'ni-rates',
    title: 'Rates and allowances: National Insurance contributions (GOV.UK)',
    url: 'https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions',
  },
  employers2026: {
    id: 'employers-2026-27',
    title: 'Rates and thresholds for employers 2026 to 2027 (GOV.UK)',
    url: 'https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027',
  },
  employers2025: {
    id: 'employers-2025-26',
    title: 'Rates and thresholds for employers 2025 to 2026 (GOV.UK)',
    url: 'https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026',
  },
  scottishIncomeTax: {
    id: 'scottish-income-tax',
    title: 'Scottish Income Tax: how it works (GOV.UK)',
    url: 'https://www.gov.uk/scottish-income-tax/how-it-works',
  },
  pensionRates: {
    id: 'pension-rates',
    title: 'Pension schemes rates and allowances (GOV.UK)',
    url: 'https://www.gov.uk/government/publications/rates-and-allowances-pension-schemes/pension-schemes-rates',
  },
  ani: {
    id: 'adjusted-net-income',
    title: 'Adjusted net income (GOV.UK)',
    url: 'https://www.gov.uk/guidance/adjusted-net-income',
  },
  taxFreeChildcare: {
    id: 'tax-free-childcare',
    title: 'Tax-Free Childcare (GOV.UK)',
    url: 'https://www.gov.uk/tax-free-childcare',
  },
  taxFreeChildcareEligibility: {
    id: 'tax-free-childcare-eligibility',
    title: 'Tax-Free Childcare: check if you are eligible (GOV.UK)',
    url: 'https://www.gov.uk/tax-free-childcare/check-if-youre-eligible',
  },
  freeChildcareWorking: {
    id: 'free-childcare-if-working',
    title: '30 hours free childcare for working parents in England (GOV.UK)',
    url: 'https://www.gov.uk/free-childcare-if-working',
  },
  freeChildcareEligibility: {
    id: 'free-childcare-eligibility',
    title: 'Free childcare if you are working: check you are eligible (GOV.UK)',
    url: 'https://www.gov.uk/free-childcare-if-working/check-youre-eligible',
  },
  helpWithChildcare: {
    id: 'help-with-childcare-costs',
    title: 'Help paying for childcare (GOV.UK)',
    url: 'https://www.gov.uk/help-with-childcare-costs',
  },
  giftAid: {
    id: 'gift-aid',
    title: 'Tax relief when you donate to a charity: Gift Aid (GOV.UK)',
    url: 'https://www.gov.uk/donating-to-charity/gift-aid',
  },
  hicbc: {
    id: 'hicbc',
    title: 'High Income Child Benefit Charge (GOV.UK)',
    url: 'https://www.gov.uk/child-benefit-tax-charge',
  },
  studentLoans: {
    id: 'student-loans',
    title: 'Repaying your student loan (GOV.UK)',
    url: 'https://www.gov.uk/repaying-your-student-loan',
  },
  aeThresholds: {
    id: 'ae-thresholds-2026-27',
    title: 'Review of the automatic enrolment earnings trigger and qualifying earnings band for 2026/27 (GOV.UK)',
    url: 'https://www.gov.uk/government/publications/review-of-the-automatic-enrolment-earnings-trigger-and-qualifying-earnings-band-for-202627/review-of-the-automatic-enrolment-earnings-trigger-and-qualifying-earnings-band-for-202627',
  },
  budgetAnnex: {
    id: 'budget-2025-annex-a',
    title: 'Budget 2025 overview of tax legislation and rates, Annex A: rates and allowances (GOV.UK)',
    url: 'https://www.gov.uk/government/publications/budget-2025-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances',
  },
  scotRates: {
    id: 'gov-scot-rates-2026-27',
    title: 'Scottish Income Tax: rates and bands 2026 to 2027 (Scottish Government)',
    url: 'https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/pages/rates-and-bands-2026-to-2027/',
  },
  scotRateResolution: {
    id: 'scottish-rate-resolution-2026-27',
    title: 'Scottish Rate Resolution 2026 to 2027: draft motion and explanatory note (Scottish Government)',
    url: 'https://www.gov.scot/publications/scottish-rate-resolution-2026-2027-draft-motion-explanatory-note/',
  },
  pensionTaxRelief: {
    id: 'pension-tax-relief',
    title: 'Tax on your private pension: pension tax relief (GOV.UK)',
    url: 'https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief',
  },
  annualAllowance: {
    id: 'annual-allowance',
    title: 'Tax on your private pension: annual allowance (GOV.UK)',
    url: 'https://www.gov.uk/tax-on-your-private-pension/annual-allowance',
  },
  taperedAllowance: {
    id: 'tapered-annual-allowance',
    title: 'Pension schemes: work out your tapered annual allowance (GOV.UK)',
    url: 'https://www.gov.uk/guidance/pension-schemes-work-out-your-tapered-annual-allowance',
  },
  ptmCarryForward: {
    id: 'ptm055100',
    title: 'HMRC Pensions Tax Manual PTM055100: annual allowance carry forward',
    url: 'https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm055100',
  },
  ptmMpaa: {
    id: 'ptm056510',
    title: 'HMRC Pensions Tax Manual PTM056510: money purchase annual allowance',
    url: 'https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm056510',
  },
  ptmCharge: {
    id: 'ptm056110',
    title: 'HMRC Pensions Tax Manual PTM056110: annual allowance charge',
    url: 'https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm056110',
  },
  nimPension: {
    id: 'nim02365',
    title: 'HMRC National Insurance Manual NIM02365: superannuation contributions',
    url: 'https://www.gov.uk/hmrc-internal-manuals/national-insurance-manual/nim02365',
  },
  salarySacrifice: {
    id: 'salary-sacrifice-paye',
    title: 'Salary sacrifice and the effects on PAYE (GOV.UK)',
    url: 'https://www.gov.uk/guidance/salary-sacrifice-and-the-effects-on-paye',
  },
  studentLoanEmployers: {
    id: 'special-rules-for-student-loans',
    title: 'Student loan and postgraduate loan repayment guidance for employers (GOV.UK)',
    url: 'https://www.gov.uk/guidance/special-rules-for-student-loans',
  },
  savingsTaxFree: {
    id: 'savings-tax-free',
    title: 'Tax on savings interest: how much is tax free (GOV.UK)',
    url: 'https://www.gov.uk/apply-tax-free-interest-on-savings/how-much-is-tax-free',
  },
  dividends: {
    id: 'tax-on-dividends',
    title: 'Tax on dividends (GOV.UK)',
    url: 'https://www.gov.uk/tax-on-dividends',
  },
  minimumWage: {
    id: 'national-minimum-wage-rates',
    title: 'National Minimum Wage and National Living Wage rates (GOV.UK)',
    url: 'https://www.gov.uk/national-minimum-wage-rates',
  },
  universalHours: {
    id: '15-hours-3-4',
    title: '15 hours free childcare for 3 to 4-year-olds (GOV.UK)',
    url: 'https://www.gov.uk/help-with-childcare-costs/free-childcare-and-education-for-3-to-4-year-olds',
  },
} satisfies Record<string, SourceRef>;
