/**
 * Versioned, effective-dated tax rules.
 *
 * ALL monetary values in rule files are integer pence. Use `gbp()` when writing
 * rule files so the source stays readable (e.g. gbp(12_570) === 1_257_000).
 */

export type Pence = number;

/** Rate expressed as a decimal fraction, e.g. 0.2 for 20%. */
export type Rate = number;

export type TaxYearId = '2025-26' | '2026-27';

export type Jurisdiction = 'england' | 'wales' | 'northern-ireland' | 'scotland';

export type VerificationStatus =
  /** Figures checked against the cited official source on `dateVerified`. */
  | 'verified'
  /** Figures announced but not yet checked against a published official table. */
  | 'provisional';

export interface TaxBand {
  /** Short machine name, e.g. "basic". */
  id: string;
  /** Human label, e.g. "Basic rate". */
  label: string;
  rate: Rate;
  /**
   * Upper limit of the band measured in TAXABLE income (income after allowances),
   * in pence. `null` means no upper limit.
   */
  upTo: Pence | null;
}

export interface IncomeTaxBandSet {
  bands: TaxBand[];
  /**
   * Index of the first band whose upper limit (and all later limits) is extended by
   * gross relief-at-source pension contributions and grossed-up Gift Aid.
   * For England/Wales/NI this is 0 (the basic rate band). For Scotland it is 1
   * (the Scottish basic rate band) — see the methodology page for the modelling note.
   */
  extensionStartIndex: number;
}

export interface SourceRef {
  id: string;
  title: string;
  url: string;
}

export interface StudentLoanPlanRule {
  threshold: Pence;
  rate: Rate;
}

export type StudentLoanPlan = 'plan1' | 'plan2' | 'plan4' | 'plan5';

export interface TaxYearRules {
  id: TaxYearId;
  label: string;
  startDate: string; // ISO date, inclusive
  endDate: string; // ISO date, inclusive
  verificationStatus: VerificationStatus;
  dateVerified: string;
  notes: string[];

  personalAllowance: {
    standard: Pence;
    taperThreshold: Pence;
    /** £1 of allowance lost for every `taperDivisor` pounds over the threshold. */
    taperDivisor: number;
  };

  incomeTax: {
    /** England, Wales and Northern Ireland non-savings bands (taxable income). */
    rUK: IncomeTaxBandSet;
    /** Scottish non-savings, non-dividend bands (taxable income). */
    scotland: IncomeTaxBandSet;
    savings: {
      startingRateBand: Pence;
      startingRate: Rate;
      personalSavingsAllowance: { basic: Pence; higher: Pence; additional: Pence };
      basicRate: Rate;
      higherRate: Rate;
      additionalRate: Rate;
    };
    dividends: {
      allowance: Pence;
      basicRate: Rate;
      higherRate: Rate;
      additionalRate: Rate;
    };
    /** UK (not Scottish) basic rate limit and higher rate limit, used for savings and dividends. */
    ukBasicRateLimit: Pence;
    ukHigherRateLimit: Pence;
  };

  nationalInsurance: {
    /** Employee Class 1, category A, annualised. */
    primaryThreshold: Pence;
    upperEarningsLimit: Pence;
    mainRate: Rate;
    upperRate: Rate;
    /** Employer Class 1 (secondary), category A, annualised. */
    secondaryThreshold: Pence;
    employerRate: Rate;
  };

  pensions: {
    reliefAtSourceBasicRate: Rate;
    /** Relief on personal contributions is limited to the higher of relevant UK earnings and this amount (gross). */
    basicAmount: Pence;
    annualAllowance: Pence;
    taperThresholdIncome: Pence;
    taperAdjustedIncome: Pence;
    minimumTaperedAllowance: Pence;
    moneyPurchaseAnnualAllowance: Pence;
    /** Automatic-enrolment qualifying earnings band (used only when the user picks that definition). */
    qualifyingEarningsLower: Pence;
    qualifyingEarningsUpper: Pence;
  };

  giftAid: {
    /** Basic rate used to gross up net donations. */
    basicRate: Rate;
  };

  studentLoans: {
    plans: Partial<Record<StudentLoanPlan, StudentLoanPlanRule>>;
    postgraduate: StudentLoanPlanRule;
  };

  childBenefit: {
    hicbcThreshold: Pence;
    /** 1% of Child Benefit charged for every `hicbcStep` of ANI over the threshold. */
    hicbcStep: Pence;
  };

  childcare: {
    /** Adjusted net income limit, per parent, for England working-parent hours and Tax-Free Childcare. */
    aniLimit: Pence;
    /** Minimum expected earnings over the next 3 months, aged 21 and over (16 hours at the NLW). */
    minimumIncomeQuarterly21Plus: Pence;
    minimumIncomeQuarterly18to20: Pence;
    minimumIncomeQuarterlyUnder18OrApprentice: Pence;
    taxFreeChildcare: {
      topUpRateOfTotal: Rate; // £2 for every £8 paid => 20% of the total
      annualCapPerChild: Pence;
      annualCapPerDisabledChild: Pence;
    };
    englandWorkingParentHours: {
      hoursPerWeek: number;
      weeksPerYear: number;
    };
    englandUniversalHours3to4: {
      hoursPerWeek: number;
      weeksPerYear: number;
    };
  };

  sources: SourceRef[];
}

export const gbp = (pounds: number): Pence => Math.round(pounds * 100);
