/**
 * Regression tests for defects confirmed in the October 2026 audit (docs/RULES_VERIFICATION.md,
 * "Audit findings"). Each test was run against the pre-fix code (commit 104f591) and failed there.
 * Expected values are hand-worked from statute/GOV.UK, not produced by the engine.
 */
import { annualAllowanceCheck, assessChildcare, calculateScenario, defaultChildcare, emptyPension, type CalculatorInputs, type ChildcareInputs, type PensionMethod } from '../../engine';
import { defaultFormState, parseForm } from '../../lib/form';
import { inputs, p, R26, salaryOnly } from '../helpers';

const run = (i: CalculatorInputs, method: PensionMethod | null = null, gross = 0) =>
  calculateScenario(i, { label: 't', method, additionalGross: p(gross) });

/**
 * F1 (High). Pension input amount for a money purchase arrangement is ALL relievable pension
 * contributions paid by or on behalf of the individual plus employer contributions
 * (FA 2004 s233(1)). "Relievable pension contributions" (s188(2)) has no earnings cap; the
 * s190 earnings limit restricts relief only. Old code counted only the relieved part.
 */
describe('F1 annual allowance counts unrelieved personal contributions', () => {
  // Salary £30,000, property £50,000, SIPP £70,000 gross. Relief limited to £30,000 earnings.
  // PIA = 70,000 (not 30,000). Threshold income = 80,000 − 30,000 relieved = 50,000 → no taper.
  // Allowance £60,000, carry-forward £0 → excess £10,000.
  const i = inputs({ income: { salary: p(30_000), propertyIncome: p(50_000) } });
  it('PIA £70,000 and excess £10,000', () => {
    const s = run(i, 'ras-sipp', 70_000);
    expect(s.rasRelievedGross).toBe(p(30_000));
    expect(s.annualAllowance.pensionInputDc).toBe(p(70_000));
    expect(s.annualAllowance.excess).toBe(p(10_000));
    expect(s.annualAllowance.thresholdIncome).toBe(p(50_000));
  });
  it('one penny above the relief limit still counts in full', () => {
    // Salary £50,000: relief limit £50,000. £50,000.01 gross → PIA £50,000.01.
    const s = run(salaryOnly(50_000), 'ras-sipp', 50_000.01);
    expect(s.rasRelievedGross).toBe(p(50_000));
    expect(s.annualAllowance.pensionInputDc).toBe(p(50_000.01));
  });
});

/**
 * F2 (Medium). Users with more than one scheme could not enter a second personal (relief-at-source)
 * contribution except as "other contributions … annual allowance only", which ignored its effect on
 * ANI, band extension and cash. Employer contributions to other schemes were not added to adjusted income.
 */
describe('F2 other schemes: personal RAS and employer contributions', () => {
  // Salary £110,000, workplace net pay £5,000 (existing), other SIPP £4,000 gross, other employer £2,000,
  // additional SIPP £3,000 gross.
  // ANI = 110,000 − 5,000 − 4,000 − 3,000 = 98,000.
  // PIA = 5,000 + 4,000 + 2,000 + 3,000 = 14,000.
  // Band extension = 7,000. RAS cash = 0.8 × 7,000 = 5,600.
  const i = salaryOnly(110_000, {
    existingPension: { method: 'net-pay', basis: 'gross', mode: 'fixed', amount: p(5_000) },
    pensionAllowance: { otherPersonalRasGross: p(4_000), otherEmployerContributions: p(2_000) },
  } as never);
  it('ANI, PIA, band extension and cash', () => {
    const s = run(i, 'ras-sipp', 3_000);
    expect(s.adjustedNetIncome).toBe(p(98_000));
    expect(s.annualAllowance.pensionInputDc).toBe(p(14_000));
    expect(s.incomeTax.bandExtension).toBe(p(7_000));
    expect(s.rasCashPaid).toBe(p(5_600));
  });
  it('employer contributions to other schemes raise adjusted income', () => {
    // net income 105,000 + net pay 5,000 + other employer 2,000 = 112,000
    expect(run(i).annualAllowance.adjustedIncome).toBe(p(112_000));
  });
});

/**
 * F3 (Medium). Minimum income for childcare depends on age (GOV.UK, 2026/27 per 3 months):
 * £2,643.68 aged 21+, £2,256.80 aged 18–20, £1,664 under 18 or apprentice. Old code always quoted
 * the 21+ amount and collected no age.
 */
describe('F3 childcare minimum income uses each parent’s age band', () => {
  const base: ChildcareInputs = {
    ...defaultChildcare(),
    assess: true,
    hasChild: 'yes',
    childAge: '9m-to-2',
    hasPartner: 'yes',
    partnerAni: p(20_000),
    taxFreeChildcareBars: 'no',
    immigrationOrNiIssue: 'no',
    userMeetsMinimumIncome: 'unsure',
    partnerMeetsMinimumIncome: 'unsure',
  };
  it('quotes £2,256.80 for an 18–20 year old and £1,664 for an apprentice partner', () => {
    const a = assessChildcare({ ...base, userAgeBand: '18-20', partnerAgeBand: 'under-18-or-apprentice' } as ChildcareInputs, p(30_000), R26);
    const text = a.fundedHours.unknowns.join(' ');
    expect(text).toContain('£2,256.80');
    expect(text).toContain('£1,664');
    expect(text).not.toContain('£2,643.68');
  });
  it('age unknown: lists all three amounts rather than assuming 21+', () => {
    const a = assessChildcare({ ...base, userAgeBand: 'unsure' } as ChildcareInputs, p(30_000), R26);
    const u = a.fundedHours.unknowns.find((x) => x.startsWith('Whether you meet')) ?? '';
    expect(u).toContain('£2,643.68');
    expect(u).toContain('£2,256.80');
    expect(u).toContain('£1,664');
  });
});

/** F4 (Low). Plan 5 does not exist in 2025/26 rules; selecting it silently gave £0 repayments. */
describe('F4 student loan plan unavailable in the selected year is an error', () => {
  it('Plan 5 in 2025/26', () => {
    const r = parseForm({ ...defaultFormState(), taxYear: '2025-26', salary: '60000', studentLoanPlan: 'plan5' });
    expect(r.errors.studentLoanPlan).toMatch(/not available/);
  });
});

/** F5 (Medium). Partner ANI (needed for HICBC) was discarded unless childcare was being assessed. */
describe('F5 partner ANI reaches the Child Benefit charge without a childcare assessment', () => {
  it('charge falls on the partner', () => {
    const r = parseForm({
      ...defaultFormState(),
      salary: '70000',
      childBenefitAnnual: '2000',
      hasPartner: 'yes',
      partnerAniKnown: true,
      partnerAni: '90000',
      childcareAssess: false,
    });
    expect(r.inputs?.childcare.partnerAni).toBe(p(90_000));
    const s = run(r.inputs as CalculatorInputs);
    expect(s.hicbc.payer).toBe('partner');
    expect(s.hicbc.charge).toBe(p(2_000));
  });
});

/** F6 (Low). Child's disability defaulted to "No" — an assumed personal circumstance. */
describe('F6 no assumed disability answer', () => {
  it('defaults to "Not sure"', () => {
    expect(defaultChildcare().childDisabled).toBe('unsure');
    expect(defaultFormState().childDisabled).toBe('unsure');
  });
});

/** F7 (Medium). Year-level "verified" flag overstated the evidence; verification is now split. */
describe('F7 verification status is reported per dimension', () => {
  it('2026/27 separates source, legal-rule, test and external validation status', () => {
    const v = R26.verification as unknown as Record<string, string>;
    expect(v.ratesAndThresholds).toBe('verified-official');
    expect(v.externalValidation).toBe('not-done');
    expect(v.legalRules).not.toBe('verified-official');
  });
});

/**
 * F9 (Low — reporting). With the MPAA in force and DC savings above £10,000, unused allowance can be
 * carried forward only into the alternative annual allowance for DB savings (PTM055100). The excess
 * was already right; `carryForwardUsed` used a general formula and could report carry-forward as
 * used against DC savings. AA £60,000, MPAA £10,000 → alternative £50,000; verified carry-forward £20,000.
 */
describe('F9 carry-forward used is reported correctly when the MPAA applies', () => {
  const check = (dc: number, db: number) =>
    annualAllowanceCheck({
      rules: R26,
      allowance: { definedBenefitMember: db > 0, definedBenefitPensionInput: p(db), otherPersonalRasGross: 0, otherEmployerContributions: 0, mpaaTriggered: 'yes', carryForward: p(20_000) },
      pension: { ...emptyPension(), employerOther: p(dc) },
      rasRelievedGross: 0,
      rasGross: 0,
      netIncome: p(100_000),
      chargeFor: () => 0,
    });
  it.each([
    // [DC, DB, excess, carry-forward used]
    [70_000, 0, 60_000, 0], // all excess is DC above the MPAA; carry-forward cannot help
    [15_000, 55_000, 5_000, 5_000], // DB 55k − alternative 50k = 5k covered by carry-forward
    [15_000, 75_000, 10_000, 20_000], // DB over alternative by 25k; 20k carry-forward used; 5k DC + 5k DB excess
    [8_000, 60_000, 0, 8_000], // DC within MPAA → standard test: 68k − 60k = 8k carry-forward
  ])('DC £%d, DB £%d → excess £%d, carry-forward used £%d', (dc, db, excess, used) => {
    const r = check(dc, db);
    expect(r.excess).toBe(p(excess));
    expect(r.carryForwardUsed).toBe(p(used));
  });
});
