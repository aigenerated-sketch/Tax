import type { Jurisdiction, Pence, Rate, StudentLoanPlan, TaxYearId } from '../rules/types';

export type { Jurisdiction, Pence, Rate, StudentLoanPlan, TaxYearId };

export type PensionMethod = 'salary-sacrifice' | 'net-pay' | 'ras-workplace' | 'ras-sipp';

export const PENSION_METHODS: PensionMethod[] = ['salary-sacrifice', 'net-pay', 'ras-workplace', 'ras-sipp'];

/** How the user has described the figure they entered for their existing contribution. */
export type ExistingAmountBasis =
  | 'employee-before-relief'
  | 'net-ras'
  | 'gross'
  | 'salary-sacrificed'
  | 'unknown';

export type AmountMode = 'fixed' | 'percent';

export type PensionablePayBasis = 'basic-salary' | 'salary-and-bonus' | 'qualifying-earnings' | 'custom';

export type YesNoUnsure = 'yes' | 'no' | 'unsure';

export interface IncomeInputs {
  /** Contractual annual gross salary BEFORE any salary sacrifice. */
  salary: Pence;
  /** Expected taxable bonus (treated as employment earnings subject to Class 1 NI). */
  bonus: Pence;
  /** Taxable benefits in kind (Income Tax only; no employee Class 1 NI). */
  taxableBenefits: Pence;
  /** Taxable property profit (non-savings income, no Class 1 NI). */
  propertyIncome: Pence;
  /** Other taxable non-savings income with no Class 1 NI (e.g. taxable pension income). */
  otherNonSavingsIncome: Pence;
  /** Taxable savings interest. */
  savingsInterest: Pence;
  /** Dividends. */
  dividends: Pence;
}

export interface ExistingPensionInputs {
  /** null = no existing contribution or method not given. */
  method: PensionMethod | null;
  basis: ExistingAmountBasis;
  mode: AmountMode;
  /** Used when mode === 'fixed'. Annual amount. */
  amount: Pence;
  /** Used when mode === 'percent'. 0–100. */
  percent: number;
  pensionablePayBasis: PensionablePayBasis;
  /** Used when pensionablePayBasis === 'custom'. */
  customPensionablePay: Pence;
  employerMode: AmountMode;
  employerAmount: Pence;
  employerPercent: number;
}

export interface AdditionalContributionInputs {
  method: PensionMethod;
  /** Gross pension contribution (the amount that goes into the pension before any employer extras). */
  grossAmount: Pence;
  /** Employer match as % of the additional employee contribution (workplace methods only). 0 if none. */
  employerMatchPercent: number;
  /** Annual cap on the employer match; null = no cap entered. */
  employerMatchCap: Pence | null;
  /** % of the employer's NI saving under salary sacrifice that the employer adds to the pension. 0 by default. */
  employerNiPassThroughPercent: number;
}

export interface PensionAllowanceInputs {
  definedBenefitMember: boolean;
  /** Pension input amount for a DB scheme for the year, if known (from scheme statement). */
  definedBenefitPensionInput: Pence;
  /** Other pension contributions not entered elsewhere (e.g. another scheme), gross. Counted only for AA. */
  otherPensionContributions: Pence;
  mpaaTriggered: YesNoUnsure;
  /** Verified unused allowance carried forward from the previous three years. null = not known. */
  carryForward: Pence | null;
}

export interface StudentLoanInputs {
  plan: StudentLoanPlan | 'none';
  postgraduate: boolean;
}

export interface CalculatorInputs {
  taxYear: TaxYearId;
  jurisdiction: Jurisdiction;
  income: IncomeInputs;
  existingPension: ExistingPensionInputs;
  additional: AdditionalContributionInputs;
  targetAni: Pence;
  /** Net (cash) qualifying Gift Aid donations in the year. */
  giftAidNet: Pence;
  studentLoan: StudentLoanInputs;
  /** Annual Child Benefit received by the household (0 if none). */
  childBenefitAnnual: Pence;
  pensionAllowance: PensionAllowanceInputs;
  childcare: ChildcareInputs;
}

export type ChildAgeBand = 'under-9m' | '9m-to-2' | '3-to-4' | '5-to-11' | '12-to-16' | 'unsure';

export interface ChildcareInputs {
  assess: boolean;
  hasChild: YesNoUnsure;
  childAge: ChildAgeBand;
  childDisabled: YesNoUnsure;
  usesTaxFreeChildcare: YesNoUnsure;
  nation: Jurisdiction;
  hasPartner: YesNoUnsure;
  /** Partner's expected ANI; null = not known. */
  partnerAni: Pence | null;
  /** Does each parent expect to earn at least the minimum income over the next 3 months? */
  userMeetsMinimumIncome: YesNoUnsure;
  partnerMeetsMinimumIncome: YesNoUnsure;
  /**
   * Tax-Free Childcare bars: Universal Credit childcare element, childcare vouchers, a childcare
   * bursary or grant, fostering the child, or the child not usually living with you.
   */
  taxFreeChildcareBars: YesNoUnsure;
  /** Either parent lacks a National Insurance number or the required immigration status. */
  immigrationOrNiIssue: YesNoUnsure;
  /** Total annual childcare costs that would be paid through a Tax-Free Childcare account. */
  annualChildcareCost: Pence | null;
  /** Provider's hourly rate, used only to illustrate the value of funded hours. */
  providerHourlyRate: Pence | null;
}

export type WarningSeverity = 'info' | 'warning' | 'error';

export type WarningCategory =
  | 'input'
  | 'scope'
  | 'pension'
  | 'annual-allowance'
  | 'payroll'
  | 'scotland'
  | 'childcare'
  | 'student-loan'
  | 'child-benefit'
  | 'salary-sacrifice';

export interface CalcWarning {
  id: string;
  severity: WarningSeverity;
  category: WarningCategory;
  message: string;
}

export interface TaxSlice {
  incomeType: 'non-savings' | 'savings' | 'dividends';
  label: string;
  rate: Rate;
  amount: Pence;
  tax: Pence;
}

export interface IncomeTaxResult {
  personalAllowance: Pence;
  personalAllowanceUsed: Pence;
  taxableNonSavings: Pence;
  taxableSavings: Pence;
  taxableDividends: Pence;
  totalTaxableIncome: Pence;
  bandExtension: Pence;
  slices: TaxSlice[];
  nonSavingsTax: Pence;
  savingsTax: Pence;
  dividendTax: Pence;
  total: Pence;
}

export interface NationalInsuranceResult {
  earnings: Pence;
  mainBandEarnings: Pence;
  upperBandEarnings: Pence;
  mainBandNi: Pence;
  upperBandNi: Pence;
  total: Pence;
}

export interface ResolvedPension {
  /** Salary sacrificed (becomes an employer contribution). */
  salarySacrifice: Pence;
  /** Employee net-pay contributions deducted from pay before tax. */
  netPay: Pence;
  /** Gross relief-at-source contributions paid through workplace payroll. */
  rasWorkplaceGross: Pence;
  /** Gross relief-at-source contributions paid personally (e.g. SIPP). */
  rasPersonalGross: Pence;
  /** Employer contributions other than salary sacrifice (existing + any match / NI pass-through). */
  employerOther: Pence;
}

export interface AnnualAllowanceResult {
  standardAllowance: Pence;
  thresholdIncome: Pence;
  adjustedIncome: Pence;
  taperApplies: boolean;
  allowanceAfterTaper: Pence;
  mpaaApplies: boolean;
  carryForwardUsed: Pence | null;
  totalAvailable: Pence;
  pensionInputDc: Pence;
  pensionInputDb: Pence;
  pensionInputTotal: Pence;
  excess: Pence;
  estimatedCharge: Pence;
  verified: boolean;
}

export interface StudentLoanResult {
  earnings: Pence;
  plan: Pence;
  postgraduate: Pence;
  total: Pence;
}

export interface HicbcResult {
  childBenefit: Pence;
  aniUsed: Pence;
  payer: 'you' | 'partner' | 'none';
  percentage: number;
  charge: Pence;
}

export interface ScenarioResult {
  label: string;
  method: PensionMethod | null;
  additionalGross: Pence;

  /** Salary + bonus before sacrifice. */
  contractualPay: Pence;
  /** Cash employment pay after salary sacrifice (before tax, NI and other deductions). */
  cashPayAfterSacrifice: Pence;
  /** Employment income: Class 1 earnings − net-pay contributions + taxable benefits (conventions §1.2). */
  employmentIncome: Pence;
  /** Net income (conventions §1.4): before PA, after salary sacrifice and net pay, before RAS and Gift Aid deductions. */
  totalIncome: Pence;
  /** Gift Aid donations grossed up at the basic rate. */
  giftAidGross: Pence;
  adjustedNetIncome: Pence;
  /** Income Tax as finally due for the year, after all relief modelled here (incl. any reclaim). */
  incomeTax: IncomeTaxResult;
  /** Income Tax collected through payroll/basic assessment, ignoring relief-at-source and Gift Aid band extension. */
  incomeTaxBeforeClaims: Pence;
  /** Higher-rate relief that must be claimed from HMRC (Self Assessment or contacting HMRC). */
  reliefToClaim: Pence;
  employeeNi: NationalInsuranceResult;
  employerNi: Pence;
  studentLoan: StudentLoanResult;
  pension: ResolvedPension;
  /** Relief-at-source gross that qualifies for relief (limited by relevant earnings). */
  rasRelievedGross: Pence;
  /** Cash paid by the employee into relief-at-source pensions (net of the basic-rate top-up). */
  rasCashPaid: Pence;
  /** Pay given up or cash paid into pensions by the employee: sacrifice + net pay + RAS cash (conventions §5). */
  employeePensionCash: Pence;
  /** Gross pension contribution funded by the employee (sacrifice + net pay + RAS gross). */
  employeeFundedGross: Pence;
  /** Employer contributions excluding salary sacrifice. */
  employerContribution: Pence;
  /** Everything going into pensions in the year (DC). */
  totalPensionInvestment: Pence;
  /** Cash in hand after tax, NI, student loan and pension deductions (excludes Child Benefit/HICBC and Gift Aid). */
  takeHome: Pence;
  /** Gross cash income (cash pay after sacrifice + other cash income). */
  grossCashIncome: Pence;
  annualAllowance: AnnualAllowanceResult;
  hicbc: HicbcResult;
  warnings: CalcWarning[];
}

export interface MarginalRates {
  /** Probe size used, pence. */
  probe: Pence;
  incomeTax: Rate;
  employeeNi: Rate;
  combined: Rate;
  studentLoan: Rate;
  combinedWithStudentLoan: Rate;
  /** (Income Tax + employee NI) / total income. */
  averageEffective: Rate;
}

export interface ScenarioDelta {
  takeHome: Pence;
  /** Change in pay given up / cash paid into pensions by the employee. */
  employeePensionCash: Pence;
  incomeTax: Pence;
  employeeNi: Pence;
  studentLoan: Pence;
  employerNi: Pence;
  adjustedNetIncome: Pence;
  totalPensionInvestment: Pence;
  hicbc: Pence;
}

export interface OptimiserResult {
  method: PensionMethod;
  target: Pence;
  currentAni: Pence;
  alreadyMet: boolean;
  feasible: boolean;
  requiredGross: Pence;
  maxFeasibleGross: Pence;
  reason: string | null;
}
