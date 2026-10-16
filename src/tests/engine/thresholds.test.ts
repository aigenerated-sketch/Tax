/**
 * Just below / at / above every important threshold, expressed as SALARY (total income),
 * matching how GOV.UK and the Scottish Government publish the bands. Expected values are
 * hand-worked; see docs/REFERENCE_CASES.md (section "Boundary table").
 */
import { assessChildcare, calculateScenario, defaultChildcare, type Jurisdiction } from '../../engine';
import { annualAllowanceCheck, emptyPension, highIncomeChildBenefitCharge } from '../../engine';
import { R26, p, salaryOnly } from '../helpers';

const tax = (salary: number, jurisdiction: Jurisdiction = 'england') =>
  calculateScenario(salaryOnly(salary, { jurisdiction }), { label: 't', method: null, additionalGross: 0 });

describe('England / Wales / NI — Income Tax by salary', () => {
  const cases: [number, number][] = [
    [12_570, 0],
    [12_571, 0.2],
    [50_269, 7_539.8],
    [50_270, 7_540], // top of basic band with full PA
    [50_271, 7_540.4],
    [99_999, 27_431.6],
    [100_000, 27_432],
    [100_001, 27_432.4], // PA unchanged (complete £2 rule)
    [100_002, 27_433.2], // PA 12,569: taxable 87,433 → 7,540 + 49,733 × 40%
    [125_139, 42_515.2], // PA £1
    [125_140, 42_516], // PA 0
    [125_141, 42_516.45],
  ];
  for (const j of ['england', 'wales', 'northern-ireland'] as const) {
    it.each(cases)(`${j}: £%d → £%d`, (s, t) => expect(tax(s, j).incomeTax.total).toBe(p(t)));
  }
});

describe('Scotland — Income Tax by salary (gov.scot published ranges, full PA)', () => {
  const cases: [number, number][] = [
    [12_570, 0],
    [12_571, 0.19], // starter 19% from £12,571
    [16_537, 753.73], // top of starter
    [16_538, 753.93], // basic 20% from £16,538
    [29_526, 3_351.53], // top of basic
    [29_527, 3_351.74], // intermediate 21% from £29,527
    [43_662, 6_320.09], // top of intermediate
    [43_663, 6_320.51], // higher 42% from £43,663
    [75_000, 19_482.05], // top of higher
    [75_001, 19_482.5], // advanced 45% from £75,001
    [100_000, 30_732.05],
    [100_002, 30_733.4], // PA 12,569 → taxable 87,433 → +3 × 45%
    [125_140, 47_701.55],
    [125_141, 47_702.03], // top 48%
  ];
  it.each(cases)('£%d → £%d', (s, t) => expect(tax(s, 'scotland').incomeTax.total).toBe(p(t)));

  it('Scotland is never computed with rUK bands', () => {
    expect(tax(43_663, 'scotland').incomeTax.total).not.toBe(tax(43_663, 'england').incomeTax.total);
    expect(tax(43_663, 'scotland').incomeTax.slices.map((x) => x.label)).toContain('Intermediate rate');
    expect(tax(43_663, 'england').incomeTax.slices.map((x) => x.label)).not.toContain('Intermediate rate');
  });
});

describe('employee NI by salary (same in all four nations)', () => {
  const cases: [number, number][] = [
    [12_569, 0],
    [12_570, 0],
    [12_571, 0.08],
    [50_269, 3_015.92],
    [50_270, 3_016],
    [50_271, 3_016.02],
  ];
  it.each(cases)('£%d → £%d', (s, n) => {
    expect(tax(s).employeeNi.total).toBe(p(n));
    expect(tax(s, 'scotland').employeeNi.total).toBe(p(n));
  });
});

describe('HICBC boundaries (£2,000 Child Benefit entered)', () => {
  it.each([
    [60_000, 0],
    [60_199, 0],
    [60_200, 20],
    [79_999, 1_980],
    [80_000, 2_000],
  ])('ANI £%d → charge £%d', (ani, c) => expect(highIncomeChildBenefitCharge(p(2_000), p(ani), null, R26).charge).toBe(p(c)));
});

describe('annual allowance taper boundaries', () => {
  const run = (netIncome: number, employer: number) =>
    annualAllowanceCheck({
      rules: R26,
      allowance: { definedBenefitMember: false, definedBenefitPensionInput: 0, otherPensionContributions: 0, mpaaTriggered: 'no', carryForward: 0 },
      pension: { ...emptyPension(), employerOther: p(employer) },
      rasRelievedGross: 0,
      netIncome: p(netIncome),
      chargeFor: () => 0,
    });
  it('adjusted income £260,000 → no taper', () => expect(run(250_000, 10_000).allowanceAfterTaper).toBe(p(60_000)));
  it('adjusted income £260,001 → no reduction (complete £2)', () => expect(run(250_001, 10_000).allowanceAfterTaper).toBe(p(60_000)));
  it('adjusted income £260,002 → £59,999', () => expect(run(250_002, 10_000).allowanceAfterTaper).toBe(p(59_999)));
  it('threshold income £200,000 → no taper even with high adjusted income', () => expect(run(200_000, 100_000).taperApplies).toBe(false));
  it('threshold income £200,001 → taper applies', () => expect(run(200_001, 100_000).taperApplies).toBe(true));
  it('adjusted income £360,000 → minimum £10,000', () => expect(run(350_000, 10_000).allowanceAfterTaper).toBe(p(10_000)));
});

describe('childcare ANI limit boundary', () => {
  const cc = { ...defaultChildcare(), assess: true, hasChild: 'yes' as const, childAge: '3-to-4' as const, hasPartner: 'no' as const, userMeetsMinimumIncome: 'yes' as const, taxFreeChildcareBars: 'no' as const, immigrationOrNiIssue: 'no' as const };
  it.each([
    [99_999.99, 'appears-eligible'],
    [100_000, 'appears-eligible'],
    [100_000.01, 'not-eligible'],
  ])('ANI £%d → %s', (ani, status) => {
    expect(assessChildcare(cc, p(ani), R26).fundedHours.status).toBe(status);
    expect(assessChildcare(cc, p(ani), R26).taxFreeChildcare.status).toBe(status);
  });
});
