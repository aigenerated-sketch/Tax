import { SOURCES } from './sources';
import { gbp, type TaxYearRules } from './types';

/**
 * 2025/26 tax year (6 April 2025 – 5 April 2026).
 * Included so users can compare against the previous year and so tests can prove the
 * engine responds to a tax-year change. Differences from 2026/27: Scottish starter and
 * basic band limits, dividend rates, student loan thresholds, minimum-income amounts.
 */
export const TAX_YEAR_2025_26: TaxYearRules = {
  id: '2025-26',
  label: '2025/26',
  startDate: '2025-04-06',
  endDate: '2026-04-05',
  verificationStatus: 'verified',
  dateVerified: '2026-10-16',
  notes: [
    'Plan 5 student loan repayments do not start until April 2026, so Plan 5 is not available for 2025/26.',
    'Minimum-income amounts for 18–20 year olds (£2,080) and under-18s/apprentices (£1,570.40) are derived from the April 2025 National Minimum Wage rates (£10.00 and £7.55) × 16 hours × 13 weeks.',
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
        { id: 'starter', label: 'Starter rate', rate: 0.19, upTo: gbp(2_827) },
        { id: 'basic', label: 'Basic rate', rate: 0.2, upTo: gbp(14_921) },
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
      basicRate: 0.0875,
      higherRate: 0.3375,
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
      plan1: { threshold: gbp(26_065), rate: 0.09 },
      plan2: { threshold: gbp(28_470), rate: 0.09 },
      plan4: { threshold: gbp(32_745), rate: 0.09 },
    },
    postgraduate: { threshold: gbp(21_000), rate: 0.06 },
  },

  childBenefit: {
    hicbcThreshold: gbp(60_000),
    hicbcStep: gbp(200),
  },

  childcare: {
    aniLimit: gbp(100_000),
    minimumIncomeQuarterly21Plus: gbp(2_539.68),
    minimumIncomeQuarterly18to20: gbp(2_080),
    minimumIncomeQuarterlyUnder18OrApprentice: gbp(1_570.4),
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
    SOURCES.employers2025,
    SOURCES.niRates,
    SOURCES.pensionRates,
    SOURCES.ani,
    SOURCES.taxFreeChildcareEligibility,
    SOURCES.freeChildcareEligibility,
    SOURCES.hicbc,
    SOURCES.giftAid,
    SOURCES.studentLoans,
  ],
};
