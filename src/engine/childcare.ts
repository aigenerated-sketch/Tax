import type { TaxYearRules } from '../rules/types';
import { roundPence } from './money';
import type { ChildcareInputs, Pence } from './types';

export type EligibilityStatus = 'appears-eligible' | 'not-eligible' | 'not-confirmed' | 'not-assessed';

export const STATUS_LABELS: Record<EligibilityStatus, string> = {
  'appears-eligible': 'Appears eligible on the answers given',
  'not-eligible': 'Not eligible on the answers given',
  'not-confirmed': 'Eligibility not confirmed',
  'not-assessed': 'Not assessed',
};

export interface SchemeAssessment {
  scheme: 'tax-free-childcare' | 'england-working-parent-hours';
  name: string;
  status: EligibilityStatus;
  /** Conditions that fail. */
  failures: string[];
  /** Material conditions that are unknown. */
  unknowns: string[];
  /** Conditions that appear to be met. */
  met: string[];
  /** Estimated annual value (government top-up, or value of funded hours) — only when calculable from user inputs. */
  estimatedAnnualValue: Pence | null;
  valueExplanation: string | null;
  notes: string[];
}

export interface ChildcareAssessment {
  assessed: boolean;
  userAni: Pence;
  taxFreeChildcare: SchemeAssessment;
  fundedHours: SchemeAssessment;
}

const money = (p: Pence) => `£${(p / 100).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function finalise(a: Omit<SchemeAssessment, 'status'>): SchemeAssessment {
  const status: EligibilityStatus = a.failures.length > 0 ? 'not-eligible' : a.unknowns.length > 0 ? 'not-confirmed' : 'appears-eligible';
  return { ...a, status };
}

function parentChecks(
  input: ChildcareInputs,
  userAni: Pence,
  rules: TaxYearRules,
  acc: { failures: string[]; unknowns: string[]; met: string[] },
) {
  const limit = rules.childcare.aniLimit;
  if (userAni > limit) acc.failures.push(`Your adjusted net income (${money(userAni)}) is over ${money(limit)}.`);
  else acc.met.push(`Your adjusted net income (${money(userAni)}) is ${money(limit)} or less.`);

  if (input.hasPartner === 'unsure') acc.unknowns.push('Whether you have a partner who lives with you.');
  if (input.hasPartner === 'yes') {
    if (input.partnerAni === null) acc.unknowns.push("Your partner's expected adjusted net income.");
    else if (input.partnerAni > limit) acc.failures.push(`Your partner's adjusted net income (${money(input.partnerAni)}) is over ${money(limit)}.`);
    else acc.met.push(`Your partner's adjusted net income (${money(input.partnerAni)}) is ${money(limit)} or less.`);
  }

  const minIncome = `${money(rules.childcare.minimumIncomeQuarterly21Plus)} over the next 3 months if aged 21 or over`;
  if (input.userMeetsMinimumIncome === 'no') acc.failures.push(`You do not expect to meet the minimum income (${minIncome}).`);
  else if (input.userMeetsMinimumIncome === 'unsure') acc.unknowns.push(`Whether you meet the minimum income (${minIncome}).`);
  else acc.met.push('You expect to meet the minimum income requirement.');

  if (input.hasPartner === 'yes') {
    if (input.partnerMeetsMinimumIncome === 'no')
      acc.failures.push(
        'Your partner does not expect to meet the minimum income requirement (exceptions exist, e.g. some carers and people on certain benefits — check GOV.UK).',
      );
    else if (input.partnerMeetsMinimumIncome === 'unsure') acc.unknowns.push('Whether your partner meets the minimum income requirement.');
    else acc.met.push('Your partner expects to meet the minimum income requirement.');
  }

  if (input.immigrationOrNiIssue === 'yes')
    acc.failures.push('You indicated a National Insurance number or immigration-status condition is not met.');
  else if (input.immigrationOrNiIssue === 'unsure') acc.unknowns.push('National Insurance number and immigration-status conditions.');
}

function notAssessed(scheme: SchemeAssessment['scheme'], name: string, note: string): SchemeAssessment {
  return { scheme, name, status: 'not-assessed', failures: [], unknowns: [], met: [], estimatedAnnualValue: null, valueExplanation: null, notes: [note] };
}

export function assessTaxFreeChildcare(input: ChildcareInputs, userAni: Pence, rules: TaxYearRules): SchemeAssessment {
  const name = 'Tax-Free Childcare';
  if (!input.assess) return notAssessed('tax-free-childcare', name, 'Childcare questions not answered.');
  if (input.hasChild === 'no') return notAssessed('tax-free-childcare', name, 'You said you do not have a child to consider.');
  const acc = { failures: [] as string[], unknowns: [] as string[], met: [] as string[] };
  const notes = [
    'Tax-Free Childcare is run by HMRC across the UK. You must reconfirm eligibility every 3 months.',
    'Eligibility lasts until 1 September after the child turns 11 (16 if disabled).',
  ];

  if (input.hasChild === 'unsure') acc.unknowns.push('Whether you have an eligible child.');

  switch (input.childAge) {
    case 'unsure':
      acc.unknowns.push("Your child's age.");
      break;
    case '12-to-16':
      if (input.childDisabled === 'yes') acc.met.push('Child is 16 or under and disabled.');
      else if (input.childDisabled === 'unsure') acc.unknowns.push('Whether your child meets the disability conditions (needed for children over 11).');
      else acc.failures.push('Your child is over the age limit (11, or 16 if disabled).');
      break;
    default:
      acc.met.push('Child is within the age limit.');
  }

  parentChecks(input, userAni, rules, acc);

  if (input.taxFreeChildcareBars === 'yes')
    acc.failures.push(
      'You indicated a bar applies (e.g. Universal Credit childcare, childcare vouchers, a childcare bursary or grant, fostering the child, or the child not usually living with you).',
    );
  else if (input.taxFreeChildcareBars === 'unsure')
    acc.unknowns.push('Whether you receive Universal Credit childcare, childcare vouchers, a bursary/grant, or another bar applies.');

  const disabled = input.childDisabled === 'yes';
  const cap = disabled ? rules.childcare.taxFreeChildcare.annualCapPerDisabledChild : rules.childcare.taxFreeChildcare.annualCapPerChild;
  let estimatedAnnualValue: Pence | null = null;
  let valueExplanation: string | null = null;
  if (input.annualChildcareCost !== null && input.annualChildcareCost > 0) {
    const topUp = Math.min(cap, roundPence(input.annualChildcareCost * rules.childcare.taxFreeChildcare.topUpRateOfTotal));
    estimatedAnnualValue = topUp;
    valueExplanation = `Government adds £2 for every £8 you pay (20% of the total paid to the provider), up to ${money(cap)} a year for this child. Based on your entered annual childcare cost of ${money(input.annualChildcareCost)}.`;
  } else {
    valueExplanation = `Up to ${money(cap)} a year for this child. Enter your annual childcare cost to estimate the top-up.`;
  }

  return finalise({ scheme: 'tax-free-childcare', name, failures: acc.failures, unknowns: acc.unknowns, met: acc.met, estimatedAnnualValue, valueExplanation, notes });
}

export function assessEnglandFundedHours(input: ChildcareInputs, userAni: Pence, rules: TaxYearRules): SchemeAssessment {
  const name = '30 hours funded childcare for working parents (England)';
  if (!input.assess) return notAssessed('england-working-parent-hours', name, 'Childcare questions not answered.');
  if (input.hasChild === 'no') return notAssessed('england-working-parent-hours', name, 'You said you do not have a child to consider.');
  if (input.nation !== 'england')
    return notAssessed(
      'england-working-parent-hours',
      name,
      'This calculator only models the England working-parent offer. Scotland, Wales and Northern Ireland have different schemes and rules — check the official guidance for your nation. Tax-Free Childcare is assessed separately.',
    );

  const acc = { failures: [] as string[], unknowns: [] as string[], met: [] as string[] };
  const { hoursPerWeek, weeksPerYear } = rules.childcare.englandWorkingParentHours;
  const universal = rules.childcare.englandUniversalHours3to4;
  const notes = [
    `Up to ${hoursPerWeek} hours a week for ${weeksPerYear} weeks a year for children aged 9 months to school age, from an approved provider. Funding usually starts the term after the child reaches the eligible age.`,
    'You must reconfirm eligibility every 3 months. Providers may charge for meals, consumables or extra hours.',
  ];
  if (input.hasChild === 'unsure') acc.unknowns.push('Whether you have an eligible child.');

  switch (input.childAge) {
    case 'unsure':
      acc.unknowns.push("Your child's age.");
      break;
    case 'under-9m':
      acc.failures.push('Your child is under 9 months. You can apply from 23 weeks; hours start the term after the child turns 9 months.');
      break;
    case '5-to-11':
    case '12-to-16':
      acc.failures.push('Funded early-years hours stop when the child starts school.');
      break;
    default:
      acc.met.push('Child is aged 9 months to school age.');
  }

  parentChecks(input, userAni, rules, acc);

  let hoursAtRisk = hoursPerWeek * weeksPerYear;
  if (input.childAge === '3-to-4') {
    hoursAtRisk = (hoursPerWeek - universal.hoursPerWeek) * weeksPerYear;
    notes.push(
      `3- and 4-year-olds in England also get ${universal.hoursPerWeek} universal hours a week (${universal.weeksPerYear} weeks) that are not income-tested, so the working-parent element is the extra ${hoursPerWeek - universal.hoursPerWeek} hours.`,
    );
  }

  let estimatedAnnualValue: Pence | null = null;
  let valueExplanation: string | null;
  if (input.providerHourlyRate !== null && input.providerHourlyRate > 0) {
    estimatedAnnualValue = roundPence(input.providerHourlyRate * hoursAtRisk);
    valueExplanation = `Illustration only: ${hoursAtRisk.toLocaleString('en-GB')} income-tested hours a year × your entered provider rate of ${money(input.providerHourlyRate)} an hour. Actual value depends on hours used, provider charges and term dates.`;
  } else {
    valueExplanation = `${hoursAtRisk.toLocaleString('en-GB')} income-tested funded hours a year. Enter your provider's hourly rate to illustrate a monetary value.`;
  }

  return finalise({ scheme: 'england-working-parent-hours', name, failures: acc.failures, unknowns: acc.unknowns, met: acc.met, estimatedAnnualValue, valueExplanation, notes });
}

export function assessChildcare(input: ChildcareInputs, userAni: Pence, rules: TaxYearRules): ChildcareAssessment {
  return {
    assessed: input.assess && input.hasChild !== 'no',
    userAni,
    taxFreeChildcare: assessTaxFreeChildcare(input, userAni, rules),
    fundedHours: assessEnglandFundedHours(input, userAni, rules),
  };
}
