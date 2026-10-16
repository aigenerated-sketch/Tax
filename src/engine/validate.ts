import type { IncomeTaxBandSet, TaxYearRules } from '../rules/types';
import type { CalculatorInputs } from './types';

export class InvalidRulesError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Tax rules failed validation: ${problems.join('; ')}`);
    this.name = 'InvalidRulesError';
  }
}

export class InvalidInputsError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Inputs failed validation: ${problems.join('; ')}`);
    this.name = 'InvalidInputsError';
  }
}

const isRate = (r: number) => Number.isFinite(r) && r >= 0 && r <= 1;
const isPence = (v: number) => Number.isFinite(v) && Number.isInteger(v) && v >= 0;

function checkBands(name: string, set: IncomeTaxBandSet, out: string[]) {
  let prev = 0;
  set.bands.forEach((b, i) => {
    if (!isRate(b.rate)) out.push(`${name} ${b.id} rate ${b.rate} is not between 0 and 1`);
    const last = i === set.bands.length - 1;
    if (last && b.upTo !== null) out.push(`${name} last band must be unlimited`);
    if (!last) {
      if (b.upTo === null || !isPence(b.upTo) || b.upTo <= prev) out.push(`${name} ${b.id} limit must be a whole-pence amount above the previous limit`);
      else prev = b.upTo;
    }
  });
  if (set.extensionStartIndex < 0 || set.extensionStartIndex >= set.bands.length) out.push(`${name} extensionStartIndex out of range`);
}

/** Structural checks on a rule set. Guards against typos in a new tax-year file. */
export function validateRules(r: TaxYearRules): string[] {
  const out: string[] = [];
  checkBands('rUK', r.incomeTax.rUK, out);
  checkBands('Scotland', r.incomeTax.scotland, out);
  const rukBasic = r.incomeTax.rUK.bands[0]?.rate;
  const rate = r.pensions.reliefAtSourceBasicRate;
  if (!(rate > 0 && rate < 1)) out.push(`relief-at-source rate ${rate} must be between 0 and 1`);
  else if (rate !== rukBasic) out.push(`relief-at-source rate ${rate} must equal the UK basic rate ${rukBasic}`);
  if (r.giftAid.basicRate !== rukBasic) out.push(`Gift Aid gross-up rate ${r.giftAid.basicRate} must equal the UK basic rate ${rukBasic}`);
  if (r.incomeTax.ukBasicRateLimit !== r.incomeTax.rUK.bands[0]?.upTo) out.push('UK basic rate limit must match the rUK basic band');
  if (r.personalAllowance.taperDivisor <= 0) out.push('personal allowance taper divisor must be positive');
  const ni = r.nationalInsurance;
  for (const [k, v] of Object.entries({ mainRate: ni.mainRate, upperRate: ni.upperRate, employerRate: ni.employerRate })) if (!isRate(v)) out.push(`NI ${k} invalid`);
  if (!(ni.upperEarningsLimit > ni.primaryThreshold)) out.push('NI upper earnings limit must exceed the primary threshold');
  if (r.pensions.minimumTaperedAllowance > r.pensions.annualAllowance) out.push('minimum tapered allowance exceeds the annual allowance');
  return out;
}

/** Defence in depth: the form layer validates first, but the engine never computes on invalid inputs. */
export function validateInputs(i: CalculatorInputs): string[] {
  const out: string[] = [];
  const money = (name: string, v: number | null) => {
    if (v !== null && !isPence(v)) out.push(`${name} must be a non-negative whole number of pence`);
  };
  const pct = (name: string, v: number, max = 100) => {
    if (!Number.isFinite(v) || v < 0 || v > max) out.push(`${name} must be between 0 and ${max}`);
  };
  for (const [k, v] of Object.entries(i.income)) money(`income.${k}`, v);
  const e = i.existingPension;
  money('existingPension.amount', e.amount);
  money('existingPension.customPensionablePay', e.customPensionablePay);
  money('existingPension.employerAmount', e.employerAmount);
  pct('existingPension.percent', e.percent);
  pct('existingPension.employerPercent', e.employerPercent);
  money('additional.grossAmount', i.additional.grossAmount);
  money('additional.employerMatchCap', i.additional.employerMatchCap);
  pct('additional.employerMatchPercent', i.additional.employerMatchPercent, 1000);
  pct('additional.employerNiPassThroughPercent', i.additional.employerNiPassThroughPercent);
  money('targetAni', i.targetAni);
  if (i.targetAni === 0) out.push('targetAni must be more than zero');
  money('giftAidNet', i.giftAidNet);
  money('childBenefitAnnual', i.childBenefitAnnual);
  money('pensionAllowance.definedBenefitPensionInput', i.pensionAllowance.definedBenefitPensionInput);
  money('pensionAllowance.otherPensionContributions', i.pensionAllowance.otherPensionContributions);
  money('pensionAllowance.carryForward', i.pensionAllowance.carryForward);
  money('childcare.partnerAni', i.childcare.partnerAni);
  money('childcare.annualChildcareCost', i.childcare.annualChildcareCost);
  money('childcare.providerHourlyRate', i.childcare.providerHourlyRate);
  return out;
}
