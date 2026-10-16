import type { TaxYearRules } from '../rules/types';
import { roundPence } from './money';
import type { ChildcareInputs, ParentAgeBand, Pence, YesNoUnsure } from './types';

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

/** Whole pounds when exact, otherwise always two decimals (never "£2,256.8"). */
const money = (p: Pence) => {
  const d = p % 100 === 0 ? 0 : 2;
  return `£${(p / 100).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
};

function finalise(a: Omit<SchemeAssessment, 'status'>): SchemeAssessment {
  const status: EligibilityStatus = a.failures.length > 0 ? 'not-eligible' : a.unknowns.length > 0 ? 'not-confirmed' : 'appears-eligible';
  return { ...a, status };
}

/** Minimum earnings over the next 3 months for an age band (GOV.UK: 16 hours a week at the NMW/NLW for that age). */
export function minimumIncomeFor(band: ParentAgeBand, rules: TaxYearRules): Pence | null {
  const c = rules.childcare;
  switch (band) {
    case '21-plus':
      return c.minimumIncomeQuarterly21Plus;
    case '18-20':
      return c.minimumIncomeQuarterly18to20;
    case 'under-18-or-apprentice':
      return c.minimumIncomeQuarterlyUnder18OrApprentice;
    case 'unsure':
      return null;
  }
}

function minimumIncomeText(band: ParentAgeBand, rules: TaxYearRules): string {
  const t = minimumIncomeFor(band, rules);
  if (t !== null) return `${money(t)} over the next 3 months for ${band === '21-plus' ? 'people aged 21 or over' : band === '18-20' ? 'people aged 18 to 20' : 'people under 18 or apprentices'}`;
  const c = rules.childcare;
  return `over the next 3 months: ${money(c.minimumIncomeQuarterly21Plus)} if aged 21+, ${money(c.minimumIncomeQuarterly18to20)} if 18–20, ${money(c.minimumIncomeQuarterlyUnder18OrApprentice)} if under 18 or an apprentice`;
}

/**
 * Minimum-income condition for one parent. The answer the user gives decides the status; an
 * earnings estimate (annual Class 1 earnings ÷ 4) is only ever shown as a hint, never used to
 * turn "Not sure" into "met", because the test is on expected earnings over the NEXT 3 months
 * (bonus timing, averaging and self-employment rules can differ).
 */
function checkMinimumIncome(
  who: string,
  whose: string,
  band: ParentAgeBand,
  answer: YesNoUnsure,
  annualEarnings: Pence | null,
  rules: TaxYearRules,
  acc: { failures: string[]; unknowns: string[]; met: string[] },
) {
  const text = minimumIncomeText(band, rules);
  const subject = who === 'You' ? 'you' : who.toLowerCase();
  if (answer === 'no') {
    acc.failures.push(
      `${who} ${who === 'You' ? 'do' : 'does'} not expect to meet the minimum income (${text}). Exceptions exist — e.g. some carers, people on certain benefits, and the self-employed in their first 12 months — check GOV.UK.`,
    );
    return;
  }
  if (answer === 'yes') {
    acc.met.push(`${who} ${who === 'You' ? 'expect' : 'expects'} to meet the minimum income (${text}).`);
    if (band === 'unsure') acc.met.push(`(${who === 'You' ? 'Your' : "Your partner's"} age band was not given; the threshold depends on age.)`);
    return;
  }
  let hint = '';
  const threshold = minimumIncomeFor(band, rules);
  if (annualEarnings !== null && threshold !== null) {
    const quarter = Math.floor(annualEarnings / 4);
    hint = ` ${who === 'You' ? 'Your' : 'Their'} pay after any salary sacrifice averages about ${money(quarter)} per 3 months, which is ${quarter >= threshold ? 'above' : 'below'} this amount — confirm by answering the question.`;
  }
  acc.unknowns.push(`Whether ${subject} meet${subject === 'you' ? '' : 's'} the minimum income (${text}) — ${whose} answer is "Not sure".${hint}`);
}

function parentChecks(
  input: ChildcareInputs,
  userAni: Pence,
  userEarnings: Pence | null,
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

  checkMinimumIncome('You', 'your', input.userAgeBand, input.userMeetsMinimumIncome, userEarnings, rules, acc);
  if (input.hasPartner === 'yes') {
    checkMinimumIncome('Your partner', "your partner's", input.partnerAgeBand, input.partnerMeetsMinimumIncome, null, rules, acc);
  }

  if (input.immigrationOrNiIssue === 'yes')
    acc.failures.push('You indicated a National Insurance number or immigration-status condition is not met.');
  else if (input.immigrationOrNiIssue === 'unsure') acc.unknowns.push('National Insurance number and immigration-status conditions.');
}

function notAssessed(scheme: SchemeAssessment['scheme'], name: string, note: string): SchemeAssessment {
  return { scheme, name, status: 'not-assessed', failures: [], unknowns: [], met: [], estimatedAnnualValue: null, valueExplanation: null, notes: [note] };
}

export function assessTaxFreeChildcare(input: ChildcareInputs, userAni: Pence, rules: TaxYearRules, userEarnings: Pence | null = null): SchemeAssessment {
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

  parentChecks(input, userAni, userEarnings, rules, acc);

  if (input.taxFreeChildcareBars === 'yes')
    acc.failures.push(
      'You indicated a bar applies (e.g. Universal Credit childcare, childcare vouchers, a childcare bursary or grant, fostering the child, or the child not usually living with you).',
    );
  else if (input.taxFreeChildcareBars === 'unsure')
    acc.unknowns.push('Whether you receive Universal Credit childcare, childcare vouchers, a bursary/grant, or another bar applies.');

  const disabled = input.childDisabled === 'yes';
  const cap = disabled ? rules.childcare.taxFreeChildcare.annualCapPerDisabledChild : rules.childcare.taxFreeChildcare.annualCapPerChild;
  if (input.childDisabled === 'unsure')
    notes.push(
      `The top-up cap shown is ${money(rules.childcare.taxFreeChildcare.annualCapPerChild)} a year; it is ${money(rules.childcare.taxFreeChildcare.annualCapPerDisabledChild)} if the child meets the disability conditions.`,
    );
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

export function assessEnglandFundedHours(input: ChildcareInputs, userAni: Pence, rules: TaxYearRules, userEarnings: Pence | null = null): SchemeAssessment {
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

  parentChecks(input, userAni, userEarnings, rules, acc);

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

/**
 * @param userEarnings the user's annual Class 1 earnings (after salary sacrifice), used only for a hint.
 */
export function assessChildcare(input: ChildcareInputs, userAni: Pence, rules: TaxYearRules, userEarnings: Pence | null = null): ChildcareAssessment {
  return {
    assessed: input.assess && input.hasChild !== 'no',
    userAni,
    taxFreeChildcare: assessTaxFreeChildcare(input, userAni, rules, userEarnings),
    fundedHours: assessEnglandFundedHours(input, userAni, rules, userEarnings),
  };
}
