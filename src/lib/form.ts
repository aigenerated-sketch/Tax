import { emptyInputs } from '../engine/defaults';
import type {
  AmountMode,
  CalculatorInputs,
  ChildAgeBand,
  ExistingAmountBasis,
  Jurisdiction,
  PensionablePayBasis,
  PensionMethod,
  StudentLoanPlan,
  TaxYearId,
  YesNoUnsure,
} from '../engine/types';
import { getRules } from '../rules';

/**
 * Raw form state: numbers are kept as the strings the user typed so that invalid
 * entries are preserved (never silently replaced) while errors are shown.
 */
export interface FormState {
  taxYear: TaxYearId;
  jurisdiction: Jurisdiction;

  salary: string;
  bonus: string;
  taxableBenefits: string;
  propertyIncome: string;
  otherNonSavingsIncome: string;
  savingsInterest: string;
  dividends: string;

  existingMethod: PensionMethod | '';
  existingBasis: ExistingAmountBasis;
  existingMode: AmountMode;
  existingAmount: string;
  existingPercent: string;
  pensionablePayBasis: PensionablePayBasis;
  customPensionablePay: string;
  employerMode: AmountMode;
  employerAmount: string;
  employerPercent: string;

  additionalMethod: PensionMethod;
  additionalGross: string;
  employerMatchPercent: string;
  employerMatchCap: string;
  employerNiPassThroughPercent: string;
  targetAni: string;

  giftAidNet: string;
  studentLoanPlan: StudentLoanPlan | 'none';
  postgraduateLoan: boolean;
  childBenefitAnnual: string;

  definedBenefitMember: boolean;
  definedBenefitPensionInput: string;
  otherPensionContributions: string;
  mpaaTriggered: YesNoUnsure;
  carryForwardKnown: boolean;
  carryForward: string;

  childcareAssess: boolean;
  hasChild: YesNoUnsure;
  childAge: ChildAgeBand;
  childDisabled: YesNoUnsure;
  usesTaxFreeChildcare: YesNoUnsure;
  childcareNation: Jurisdiction;
  hasPartner: YesNoUnsure;
  partnerAniKnown: boolean;
  partnerAni: string;
  userMeetsMinimumIncome: YesNoUnsure;
  partnerMeetsMinimumIncome: YesNoUnsure;
  taxFreeChildcareBars: YesNoUnsure;
  immigrationOrNiIssue: YesNoUnsure;
  annualChildcareCost: string;
  providerHourlyRate: string;
}

export type FieldErrors = Partial<Record<keyof FormState, string>>;

export const defaultFormState = (): FormState => ({
  taxYear: '2026-27',
  jurisdiction: 'england',
  salary: '',
  bonus: '',
  taxableBenefits: '',
  propertyIncome: '',
  otherNonSavingsIncome: '',
  savingsInterest: '',
  dividends: '',
  existingMethod: '',
  existingBasis: 'employee-before-relief',
  existingMode: 'percent',
  existingAmount: '',
  existingPercent: '',
  pensionablePayBasis: 'basic-salary',
  customPensionablePay: '',
  employerMode: 'percent',
  employerAmount: '',
  employerPercent: '',
  additionalMethod: 'salary-sacrifice',
  additionalGross: '0',
  employerMatchPercent: '',
  employerMatchCap: '',
  employerNiPassThroughPercent: '',
  targetAni: '100000',
  giftAidNet: '',
  studentLoanPlan: 'none',
  postgraduateLoan: false,
  childBenefitAnnual: '',
  definedBenefitMember: false,
  definedBenefitPensionInput: '',
  otherPensionContributions: '',
  mpaaTriggered: 'unsure',
  carryForwardKnown: false,
  carryForward: '',
  childcareAssess: false,
  hasChild: 'unsure',
  childAge: 'unsure',
  childDisabled: 'no',
  usesTaxFreeChildcare: 'unsure',
  childcareNation: 'england',
  hasPartner: 'unsure',
  partnerAniKnown: false,
  partnerAni: '',
  userMeetsMinimumIncome: 'unsure',
  partnerMeetsMinimumIncome: 'unsure',
  taxFreeChildcareBars: 'unsure',
  immigrationOrNiIssue: 'unsure',
  annualChildcareCost: '',
  providerHourlyRate: '',
});

/** Upper bound on any single money input: guards against typos and float precision loss. */
export const MAX_MONEY_POUNDS = 100_000_000;

type MoneyResult = { ok: true; pence: number } | { ok: false; error: string };

/** Parse a money string ("£12,345.67", "12345", "") into pence. Empty = 0 unless required. */
export function parseMoney(raw: string, opts: { required?: boolean; label?: string; allowEmpty?: boolean } = {}): MoneyResult {
  const label = opts.label ?? 'This amount';
  const trimmed = raw.trim().replace(/^£/, '').replace(/,/g, '').trim();
  if (trimmed === '') {
    if (opts.required) return { ok: false, error: `${label} is required.` };
    return { ok: true, pence: 0 };
  }
  if (!/^-?\d+(\.\d{0,2})?$/.test(trimmed)) {
    return { ok: false, error: `${label} must be a number in pounds, with at most 2 decimal places (e.g. 12500 or 12,500.50).` };
  }
  const n = Number(trimmed);
  if (n < 0) return { ok: false, error: `${label} cannot be negative.` };
  if (n > MAX_MONEY_POUNDS) return { ok: false, error: `${label} is too large (maximum £${MAX_MONEY_POUNDS.toLocaleString('en-GB')}).` };
  return { ok: true, pence: Math.round(n * 100) };
}

export function parsePercent(raw: string, label: string, max = 100): { ok: true; value: number } | { ok: false; error: string } {
  const t = raw.trim().replace(/%$/, '').trim();
  if (t === '') return { ok: true, value: 0 };
  if (!/^-?\d+(\.\d+)?$/.test(t)) return { ok: false, error: `${label} must be a percentage number, e.g. 5 or 7.5.` };
  const n = Number(t);
  if (n < 0 || n > max) return { ok: false, error: `${label} must be between 0 and ${max}%.` };
  return { ok: true, value: n };
}

export interface ParseResult {
  inputs: CalculatorInputs | null;
  errors: FieldErrors;
}

/** Validate and convert form state to engine inputs. Returns null inputs if any error exists. */
export function parseForm(f: FormState): ParseResult {
  const errors: FieldErrors = {};
  const money = (key: keyof FormState, label: string, required = false): number => {
    const r = parseMoney(String(f[key]), { required, label });
    if (!r.ok) {
      errors[key] = r.error;
      return 0;
    }
    return r.pence;
  };
  const pct = (key: keyof FormState, label: string, max = 100): number => {
    const r = parsePercent(String(f[key]), label, max);
    if (!r.ok) {
      errors[key] = r.error;
      return 0;
    }
    return r.value;
  };

  if (!getRules(f.taxYear)) errors.taxYear = 'Rules for this tax year are not available.';

  const base = emptyInputs();
  const salary = money('salary', 'Annual salary', true);
  const bonus = money('bonus', 'Bonus');
  const taxableBenefits = money('taxableBenefits', 'Taxable benefits');
  const propertyIncome = money('propertyIncome', 'Property income');
  const otherNonSavingsIncome = money('otherNonSavingsIncome', 'Other taxable income');
  const savingsInterest = money('savingsInterest', 'Savings interest');
  const dividends = money('dividends', 'Dividends');

  const existingAmount = f.existingMode === 'fixed' ? money('existingAmount', 'Existing contribution') : 0;
  const existingPercent = f.existingMode === 'percent' ? pct('existingPercent', 'Existing contribution') : 0;
  const customPensionablePay = f.pensionablePayBasis === 'custom' ? money('customPensionablePay', 'Pensionable pay', true) : 0;
  const employerAmount = f.employerMode === 'fixed' ? money('employerAmount', 'Employer contribution') : 0;
  const employerPercent = f.employerMode === 'percent' ? pct('employerPercent', 'Employer contribution') : 0;
  if ((existingAmount > 0 || existingPercent > 0) && f.existingMethod === '') {
    errors.existingMethod = 'Choose how your existing pension contribution is paid.';
  }

  const additionalGross = money('additionalGross', 'Additional contribution');
  const employerMatchPercent = pct('employerMatchPercent', 'Employer match', 1000);
  const employerMatchCapRaw = f.employerMatchCap.trim();
  const employerMatchCap = employerMatchCapRaw === '' ? null : money('employerMatchCap', 'Employer match cap');
  const employerNiPassThroughPercent = pct('employerNiPassThroughPercent', 'Employer NI shared');
  const targetAni = money('targetAni', 'Target adjusted net income', true);
  if (!errors.targetAni && targetAni === 0) errors.targetAni = 'Target adjusted net income must be more than £0.';

  const giftAidNet = money('giftAidNet', 'Gift Aid donations');
  const childBenefitAnnual = money('childBenefitAnnual', 'Child Benefit');
  const definedBenefitPensionInput = f.definedBenefitMember ? money('definedBenefitPensionInput', 'Defined benefit pension input') : 0;
  const otherPensionContributions = money('otherPensionContributions', 'Other pension contributions');
  const carryForward = f.carryForwardKnown ? money('carryForward', 'Carry-forward', true) : null;

  const partnerAni = f.childcareAssess && f.hasPartner === 'yes' && f.partnerAniKnown ? money('partnerAni', "Partner's adjusted net income", true) : null;
  const annualChildcareCost = f.annualChildcareCost.trim() === '' ? null : money('annualChildcareCost', 'Annual childcare cost');
  const providerHourlyRate = f.providerHourlyRate.trim() === '' ? null : money('providerHourlyRate', 'Hourly rate');

  if (Object.keys(errors).length > 0) return { inputs: null, errors };

  const inputs: CalculatorInputs = {
    ...base,
    taxYear: f.taxYear,
    jurisdiction: f.jurisdiction,
    income: { salary, bonus, taxableBenefits, propertyIncome, otherNonSavingsIncome, savingsInterest, dividends },
    existingPension: {
      method: f.existingMethod === '' ? null : f.existingMethod,
      basis: f.existingBasis,
      mode: f.existingMode,
      amount: existingAmount,
      percent: existingPercent,
      pensionablePayBasis: f.pensionablePayBasis,
      customPensionablePay,
      employerMode: f.employerMode,
      employerAmount,
      employerPercent,
    },
    additional: {
      method: f.additionalMethod,
      grossAmount: additionalGross,
      employerMatchPercent,
      employerMatchCap,
      employerNiPassThroughPercent,
    },
    targetAni,
    giftAidNet,
    studentLoan: { plan: f.studentLoanPlan, postgraduate: f.postgraduateLoan },
    childBenefitAnnual,
    pensionAllowance: {
      definedBenefitMember: f.definedBenefitMember,
      definedBenefitPensionInput,
      otherPensionContributions,
      mpaaTriggered: f.mpaaTriggered,
      carryForward,
    },
    childcare: {
      assess: f.childcareAssess,
      hasChild: f.hasChild,
      childAge: f.childAge,
      childDisabled: f.childDisabled,
      usesTaxFreeChildcare: f.usesTaxFreeChildcare,
      nation: f.childcareNation,
      hasPartner: f.hasPartner,
      partnerAni,
      userMeetsMinimumIncome: f.userMeetsMinimumIncome,
      partnerMeetsMinimumIncome: f.partnerMeetsMinimumIncome,
      taxFreeChildcareBars: f.taxFreeChildcareBars,
      immigrationOrNiIssue: f.immigrationOrNiIssue,
      annualChildcareCost,
      providerHourlyRate,
    },
  };
  return { inputs, errors };
}

/** Clearly labelled illustrative examples. These are not real people. */
export const EXAMPLES: { id: string; label: string; apply: (f: FormState) => FormState }[] = [
  {
    id: 'ex-110k',
    label: 'Example: £110,000 salary, England',
    apply: (f) => ({ ...defaultFormState(), taxYear: f.taxYear, salary: '110000', jurisdiction: 'england' }),
  },
  {
    id: 'ex-95k-bonus',
    label: 'Example: £95,000 + £12,000 bonus, 5% net-pay pension',
    apply: (f) => ({
      ...defaultFormState(),
      taxYear: f.taxYear,
      salary: '95000',
      bonus: '12000',
      existingMethod: 'net-pay',
      existingMode: 'percent',
      existingPercent: '5',
      employerMode: 'percent',
      employerPercent: '5',
    }),
  },
  {
    id: 'ex-scot',
    label: 'Example: £115,000 salary, Scotland',
    apply: (f) => ({ ...defaultFormState(), taxYear: f.taxYear, salary: '115000', jurisdiction: 'scotland' }),
  },
];
