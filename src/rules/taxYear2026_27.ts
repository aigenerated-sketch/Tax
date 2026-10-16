import { SOURCES } from './sources';
import { gbp, type TaxYearRules } from './types';

/**
 * 2026/27 tax year (6 April 2026 – 5 April 2027).
 * Figures checked against the GOV.UK pages listed in `sources` on the date shown.
 */
export const TAX_YEAR_2026_27: TaxYearRules = {
  id: '2026-27',
  label: '2026/27',
  startDate: '2026-04-06',
  endDate: '2027-04-05',
  verificationStatus: 'verified',
  dateVerified: '2026-10-16',
  notes: [
    'Scottish band limits are taken from the GOV.UK employer rates page (taxable income after the personal allowance). The build brief described the intermediate band as "the next £12,570"; the published band is £16,957–£31,092 of taxable income (£29,527–£43,662 of total income with a full personal allowance), and the published figure is used.',
    'Personal savings allowance (£1,000 / £500 / £0) and savings rates (20% / 40% / 45%) are unchanged statutory amounts for 2026/27.',
    'England universal 15 hours for 3- and 4-year-olds is not income-tested and is used only to explain what remains if working-parent eligibility is lost.',
  ],

  personalAllowance: {
    standard: gbp(12_570),
    taperThreshold: gbp(100_000),
    taperDivisor: 2,
  },

  incomeTax: {
    rUK: {
      extensionStartIndex: 0,
      bands: [
        { id: 'basic', label: 'Basic rate', rate: 0.2, upTo: gbp(37_700) },
        { id: 'higher', label: 'Higher rate', rate: 0.4, upTo: gbp(125_140) },
        { id: 'additional', label: 'Additional rate', rate: 0.45, upTo: null },
      ],
    },
    scotland: {
      extensionStartIndex: 1,
      bands: [
        { id: 'starter', label: 'Starter rate', rate: 0.19, upTo: gbp(3_967) },
        { id: 'basic', label: 'Basic rate', rate: 0.2, upTo: gbp(16_956) },
        { id: 'intermediate', label: 'Intermediate rate', rate: 0.21, upTo: gbp(31_092) },
        { id: 'higher', label: 'Higher rate', rate: 0.42, upTo: gbp(62_430) },
        { id: 'advanced', label: 'Advanced rate', rate: 0.45, upTo: gbp(125_140) },
        { id: 'top', label: 'Top rate', rate: 0.48, upTo: null },
      ],
    },
    savings: {
      startingRateBand: gbp(5_000),
      startingRate: 0,
      personalSavingsAllowance: { basic: gbp(1_000), higher: gbp(500), additional: 0 },
      basicRate: 0.2,
      higherRate: 0.4,
      additionalRate: 0.45,
    },
    dividends: {
      allowance: gbp(500),
      basicRate: 0.1075,
      higherRate: 0.3575,
      additionalRate: 0.3935,
    },
    ukBasicRateLimit: gbp(37_700),
    ukHigherRateLimit: gbp(125_140),
  },

  nationalInsurance: {
    primaryThreshold: gbp(12_570),
    upperEarningsLimit: gbp(50_270),
    mainRate: 0.08,
    upperRate: 0.02,
    secondaryThreshold: gbp(5_000),
    employerRate: 0.15,
  },

  pensions: {
    reliefAtSourceBasicRate: 0.2,
    basicAmount: gbp(3_600),
    annualAllowance: gbp(60_000),
    taperThresholdIncome: gbp(200_000),
    taperAdjustedIncome: gbp(260_000),
    minimumTaperedAllowance: gbp(10_000),
    moneyPurchaseAnnualAllowance: gbp(10_000),
    qualifyingEarningsLower: gbp(6_240),
    qualifyingEarningsUpper: gbp(50_270),
  },

  giftAid: { basicRate: 0.2 },

  studentLoans: {
    plans: {
      plan1: { threshold: gbp(26_900), rate: 0.09 },
      plan2: { threshold: gbp(29_385), rate: 0.09 },
      plan4: { threshold: gbp(33_795), rate: 0.09 },
      plan5: { threshold: gbp(25_000), rate: 0.09 },
    },
    postgraduate: { threshold: gbp(21_000), rate: 0.06 },
  },

  childBenefit: {
    hicbcThreshold: gbp(60_000),
    hicbcStep: gbp(200),
  },

  childcare: {
    aniLimit: gbp(100_000),
    minimumIncomeQuarterly21Plus: gbp(2_643.68),
    minimumIncomeQuarterly18to20: gbp(2_256.8),
    minimumIncomeQuarterlyUnder18OrApprentice: gbp(1_664),
    taxFreeChildcare: {
      topUpRateOfTotal: 0.2,
      annualCapPerChild: gbp(2_000),
      annualCapPerDisabledChild: gbp(4_000),
    },
    englandWorkingParentHours: { hoursPerWeek: 30, weeksPerYear: 38 },
    englandUniversalHours3to4: { hoursPerWeek: 15, weeksPerYear: 38 },
  },

  sources: [
    SOURCES.incomeTaxRates,
    SOURCES.employers2026,
    SOURCES.scottishIncomeTax,
    SOURCES.niRates,
    SOURCES.pensionRates,
    SOURCES.aeThresholds,
    SOURCES.ani,
    SOURCES.taxFreeChildcareEligibility,
    SOURCES.freeChildcareEligibility,
    SOURCES.hicbc,
    SOURCES.giftAid,
    SOURCES.studentLoans,
  ],
};
