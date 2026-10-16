import { annualAllowanceCheck, calculateScenario, highIncomeChildBenefitCharge, marginalRates, studentLoanRepayment, emptyPension, type PensionAllowanceInputs } from '../../engine';
import { R25, R26, inputs, p, salaryOnly } from '../helpers';

describe('marginal rates come from the rules, not hard-coded', () => {
  it.each([
    ['england', 40_000, 0.2, 0.08],
    ['england', 60_000, 0.4, 0.02],
    ['england', 110_000, 0.6, 0.02],
    ['england', 150_000, 0.45, 0.02],
    ['scotland', 40_000, 0.21, 0.08],
    ['scotland', 60_000, 0.42, 0.02],
    ['scotland', 110_000, 0.675, 0.02],
    ['scotland', 150_000, 0.48, 0.02],
  ] as const)('%s £%d → IT %d, NI %d', (jurisdiction, salary, it_, ni) => {
    const m = marginalRates(salaryOnly(salary, { jurisdiction }));
    expect(m.incomeTax).toBeCloseTo(it_, 10);
    expect(m.employeeNi).toBeCloseTo(ni, 10);
    expect(m.combined).toBeCloseTo(it_ + ni, 10);
  });
  it('includes student loan separately', () => {
    const m = marginalRates(salaryOnly(110_000, { studentLoan: { plan: 'plan2', postgraduate: true } }));
    expect(m.studentLoan).toBeCloseTo(0.15, 10);
    expect(m.combinedWithStudentLoan).toBeCloseTo(0.77, 10);
  });
});

describe('student loans (2026/27)', () => {
  it('Plan 2 on £60,000', () => {
    expect(studentLoanRepayment(p(60_000), { plan: 'plan2', postgraduate: false }, R26).total).toBe(p(2_755.35));
  });
  it('postgraduate loan 6% over £21,000', () => {
    expect(studentLoanRepayment(p(31_000), { plan: 'none', postgraduate: true }, R26).total).toBe(p(600));
  });
  it('salary sacrifice reduces repayments; net pay does not', () => {
    const i = salaryOnly(60_000, { studentLoan: { plan: 'plan2', postgraduate: false } });
    expect(calculateScenario(i, { label: 's', method: 'salary-sacrifice', additionalGross: p(10_000) }).studentLoan.total).toBe(p(1_855.35));
    expect(calculateScenario(i, { label: 'n', method: 'net-pay', additionalGross: p(10_000) }).studentLoan.total).toBe(p(2_755.35));
  });
  it('Plan 5 not available for 2025/26', () => {
    expect(studentLoanRepayment(p(60_000), { plan: 'plan5', postgraduate: false }, R25).total).toBe(0);
  });
});

describe('High Income Child Benefit Charge', () => {
  it.each([
    [60_000, 0, 0],
    [60_199, 0, 0],
    [60_200, 1, 20],
    [70_000, 50, 1_000],
    [80_000, 100, 2_000],
    [95_000, 100, 2_000],
  ])('ANI £%d → %d%%', (ani, pct, charge) => {
    const r = highIncomeChildBenefitCharge(p(2_000), p(ani), null, R26);
    expect(r.percentage).toBe(pct);
    expect(r.charge).toBe(p(charge));
  });
  it('falls on the partner with the higher ANI', () => {
    const r = highIncomeChildBenefitCharge(p(2_000), p(70_000), p(90_000), R26);
    expect(r.payer).toBe('partner');
    expect(r.charge).toBe(p(2_000));
  });
});

describe('annual allowance', () => {
  const allowance: PensionAllowanceInputs = { definedBenefitMember: false, definedBenefitPensionInput: 0, otherPensionContributions: 0, mpaaTriggered: 'no', carryForward: 0 };
  const run = (netIncome: number, employer: number, extra: Partial<typeof allowance> = {}) =>
    annualAllowanceCheck({
      rules: R26,
      allowance: { ...allowance, ...extra },
      pension: { ...emptyPension(), employerOther: p(employer) },
      rasRelievedGross: 0,
      netIncome: p(netIncome),
      chargeFor: (x) => Math.round(x * 0.45),
    });
  it('standard £60,000', () => {
    const r = run(150_000, 10_000);
    expect(r.allowanceAfterTaper).toBe(p(60_000));
    expect(r.excess).toBe(0);
  });
  it('tapered: adjusted income £310,000 → £35,000', () => {
    const r = run(300_000, 10_000);
    expect(r.taperApplies).toBe(true);
    expect(r.allowanceAfterTaper).toBe(p(35_000));
  });
  it('tapered to the £10,000 minimum', () => {
    expect(run(400_000, 10_000).allowanceAfterTaper).toBe(p(10_000));
  });
  it('no taper if threshold income ≤ £200,000', () => {
    expect(run(200_000, 70_000).taperApplies).toBe(false);
  });
  it('excess and carry-forward', () => {
    expect(run(150_000, 70_000).excess).toBe(p(10_000));
    expect(run(150_000, 70_000, { carryForward: p(15_000) }).excess).toBe(0);
  });
  it('MPAA limits DC inputs to £10,000', () => {
    const r = run(150_000, 15_000, { mpaaTriggered: 'yes' });
    expect(r.mpaaApplies).toBe(true);
    expect(r.excess).toBe(p(5_000));
  });
  it('unknown carry-forward is unverified', () => {
    expect(run(150_000, 1_000, { carryForward: null }).verified).toBe(false);
  });
  it('scenario: £70,000 salary sacrifice at £200,000 exceeds the allowance and warns', () => {
    const s = calculateScenario(inputs({ income: { salary: p(200_000) } }), { label: 's', method: 'salary-sacrifice', additionalGross: p(70_000) });
    expect(s.annualAllowance.excess).toBe(p(10_000));
    expect(s.annualAllowance.estimatedCharge).toBeGreaterThan(0);
  });
});
