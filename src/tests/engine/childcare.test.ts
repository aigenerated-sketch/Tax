import { assessChildcare, defaultChildcare, type ChildcareInputs } from '../../engine';
import { R26, p } from '../helpers';

const complete = (o: Partial<ChildcareInputs> = {}): ChildcareInputs => ({
  ...defaultChildcare(),
  assess: true,
  hasChild: 'yes',
  childAge: '3-to-4',
  childDisabled: 'no',
  nation: 'england',
  hasPartner: 'yes',
  partnerAni: p(60_000),
  userMeetsMinimumIncome: 'yes',
  partnerMeetsMinimumIncome: 'yes',
  taxFreeChildcareBars: 'no',
  immigrationOrNiIssue: 'no',
  ...o,
});

describe('childcare eligibility', () => {
  it('both parents ≤ £100,000 and all conditions answered → appears eligible', () => {
    const a = assessChildcare(complete(), p(100_000), R26);
    expect(a.taxFreeChildcare.status).toBe('appears-eligible');
    expect(a.fundedHours.status).toBe('appears-eligible');
  });

  it('one parent over £100,000 → not eligible', () => {
    expect(assessChildcare(complete(), p(100_000.01), R26).fundedHours.status).toBe('not-eligible');
    expect(assessChildcare(complete({ partnerAni: p(120_000) }), p(90_000), R26).taxFreeChildcare.status).toBe('not-eligible');
  });

  it('partner ANI unknown → not confirmed (never "eligible")', () => {
    const a = assessChildcare(complete({ partnerAni: null }), p(90_000), R26);
    expect(a.taxFreeChildcare.status).toBe('not-confirmed');
    expect(a.fundedHours.status).toBe('not-confirmed');
  });

  it('child outside age range', () => {
    expect(assessChildcare(complete({ childAge: '5-to-11' }), p(90_000), R26).fundedHours.status).toBe('not-eligible');
    expect(assessChildcare(complete({ childAge: '12-to-16' }), p(90_000), R26).taxFreeChildcare.status).toBe('not-eligible');
    expect(assessChildcare(complete({ childAge: '12-to-16', childDisabled: 'yes' }), p(90_000), R26).taxFreeChildcare.status).toBe('appears-eligible');
    expect(assessChildcare(complete({ childAge: 'under-9m' }), p(90_000), R26).fundedHours.status).toBe('not-eligible');
  });

  it('missing employment / minimum-income answer → not confirmed', () => {
    const a = assessChildcare(complete({ partnerMeetsMinimumIncome: 'unsure' }), p(90_000), R26);
    expect(a.taxFreeChildcare.status).toBe('not-confirmed');
    expect(a.fundedHours.status).toBe('not-confirmed');
  });

  it.each(['scotland', 'wales', 'northern-ireland'] as const)('%s: England hours not assessed; Tax-Free Childcare still assessed', (nation) => {
    const a = assessChildcare(complete({ nation }), p(90_000), R26);
    expect(a.fundedHours.status).toBe('not-assessed');
    expect(a.taxFreeChildcare.status).toBe('appears-eligible');
  });

  it('england assessed', () => {
    expect(assessChildcare(complete({ nation: 'england' }), p(90_000), R26).fundedHours.status).toBe('appears-eligible');
  });

  it('Tax-Free Childcare top-up is 20% of costs, capped at £2,000 (or £4,000 if disabled)', () => {
    expect(assessChildcare(complete({ annualChildcareCost: p(5_000) }), p(90_000), R26).taxFreeChildcare.estimatedAnnualValue).toBe(p(1_000));
    expect(assessChildcare(complete({ annualChildcareCost: p(15_000) }), p(90_000), R26).taxFreeChildcare.estimatedAnnualValue).toBe(p(2_000));
    expect(
      assessChildcare(complete({ annualChildcareCost: p(30_000), childDisabled: 'yes' }), p(90_000), R26).taxFreeChildcare.estimatedAnnualValue,
    ).toBe(p(4_000));
  });

  it('funded hours value only shown when the user gives a rate; 3–4s value only the extra 15 hours', () => {
    expect(assessChildcare(complete(), p(90_000), R26).fundedHours.estimatedAnnualValue).toBeNull();
    expect(assessChildcare(complete({ providerHourlyRate: p(10) }), p(90_000), R26).fundedHours.estimatedAnnualValue).toBe(p(15 * 38 * 10));
    expect(assessChildcare(complete({ childAge: '9m-to-2', providerHourlyRate: p(10) }), p(90_000), R26).fundedHours.estimatedAnnualValue).toBe(p(30 * 38 * 10));
  });

  it('a bar such as Universal Credit childcare stops Tax-Free Childcare only', () => {
    const a = assessChildcare(complete({ taxFreeChildcareBars: 'yes' }), p(90_000), R26);
    expect(a.taxFreeChildcare.status).toBe('not-eligible');
    expect(a.fundedHours.status).toBe('appears-eligible');
  });

  it('not assessed when the user has no child', () => {
    const a = assessChildcare(complete({ hasChild: 'no' }), p(90_000), R26);
    expect(a.assessed).toBe(false);
    expect(a.taxFreeChildcare.status).toBe('not-assessed');
  });
});
