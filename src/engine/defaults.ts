import { DEFAULT_TAX_YEAR } from '../rules';
import type { CalculatorInputs, ChildcareInputs } from './types';

export const defaultChildcare = (): ChildcareInputs => ({
  assess: false,
  hasChild: 'unsure',
  childAge: 'unsure',
  childDisabled: 'no',
  usesTaxFreeChildcare: 'unsure',
  nation: 'england',
  hasPartner: 'unsure',
  partnerAni: null,
  userMeetsMinimumIncome: 'unsure',
  partnerMeetsMinimumIncome: 'unsure',
  taxFreeChildcareBars: 'unsure',
  immigrationOrNiIssue: 'unsure',
  annualChildcareCost: null,
  providerHourlyRate: null,
});

/**
 * Neutral, zero-valued inputs. These are NOT anyone's circumstances; tests and the
 * form layer override the fields they need.
 */
export const emptyInputs = (): CalculatorInputs => ({
  taxYear: DEFAULT_TAX_YEAR,
  jurisdiction: 'england',
  income: { salary: 0, bonus: 0, taxableBenefits: 0, propertyIncome: 0, otherNonSavingsIncome: 0, savingsInterest: 0, dividends: 0 },
  existingPension: {
    method: null,
    basis: 'gross',
    mode: 'fixed',
    amount: 0,
    percent: 0,
    pensionablePayBasis: 'basic-salary',
    customPensionablePay: 0,
    employerMode: 'fixed',
    employerAmount: 0,
    employerPercent: 0,
  },
  additional: { method: 'salary-sacrifice', grossAmount: 0, employerMatchPercent: 0, employerMatchCap: null, employerNiPassThroughPercent: 0 },
  targetAni: 100_000_00,
  giftAidNet: 0,
  studentLoan: { plan: 'none', postgraduate: false },
  childBenefitAnnual: 0,
  pensionAllowance: { definedBenefitMember: false, definedBenefitPensionInput: 0, otherPensionContributions: 0, mpaaTriggered: 'no', carryForward: 0 },
  childcare: defaultChildcare(),
});
