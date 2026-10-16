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
} satisfies Record<string, SourceRef>;
