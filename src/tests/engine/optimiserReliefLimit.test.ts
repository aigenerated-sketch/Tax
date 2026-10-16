/**
 * Optimiser and the relief limit for personal contributions.
 *
 * Rule: relief on personal contributions (net pay + relief at source) is limited to the higher of
 * UK taxable earnings and £3,600 gross (GOV.UK pension schemes rates; FA 2004 s190). Existing
 * personal relief-at-source contributions — including those to other schemes — use up that limit,
 * so the most extra relief-at-source contribution that can still reduce ANI is
 *   max(taxable earnings, £3,600) − net pay − existing relief-at-source gross   (never below 0).
 * Taxable earnings = salary + bonus − salary sacrifice + taxable benefits.
 * Every expected value below is worked by hand from that rule.
 */
import { calculateScenario, maxFeasibleAdditional, requiredContribution, type CalculatorInputs, type PensionMethod } from '../../engine';
import { inputs, p } from '../helpers';

const withOtherSipp = (salary: number, otherSippGross: number, extra: Parameters<typeof inputs>[0] = {}) =>
  inputs({
    ...extra,
    income: { salary: p(salary), ...(extra?.income ?? {}) },
    pensionAllowance: { otherPersonalRasGross: p(otherSippGross), ...(extra?.pensionAllowance ?? {}) },
  });

const run = (i: CalculatorInputs, method: PensionMethod | null, gross: number) => calculateScenario(i, { label: 't', method, additionalGross: p(gross) });

describe('maximum extra relief-at-source contribution around the relief limit (salary £40,000 → limit £40,000)', () => {
  it.each([
    // [existing other-SIPP gross, expected maximum additional gross]
    [0, 40_000],
    [10_000, 30_000],
    [39_999.99, 0.01], // one penny of limit left
    [40_000, 0], // existing contributions use the whole limit
    [40_000.01, 0], // existing contributions exceed it; never negative
  ])('existing £%d → maximum additional £%d', (existing, max) => {
    expect(maxFeasibleAdditional(withOtherSipp(40_000, existing), 'ras-sipp')).toBe(p(max));
    expect(maxFeasibleAdditional(withOtherSipp(40_000, existing), 'ras-workplace')).toBe(p(max));
  });

  it('existing contributions above the limit: only £40,000 relieved, £0.01 flagged as unrelieved', () => {
    const s = run(withOtherSipp(40_000, 40_000.01), null, 0);
    expect(s.rasRelievedGross).toBe(p(40_000));
    expect(s.adjustedNetIncome).toBe(0); // net income 40,000 − 40,000 relieved
    expect(s.warnings.map((w) => w.id)).toContain('ras-exceeds-relief-limit');
  });

  it('net pay, workplace RAS and other-scheme RAS all share the limit', () => {
    // existing net pay 5,000 + other SIPP 30,000 → 40,000 − 35,000 = 5,000
    expect(maxFeasibleAdditional(withOtherSipp(40_000, 30_000, { existingPension: { method: 'net-pay', basis: 'gross', mode: 'fixed', amount: p(5_000) } }), 'ras-sipp')).toBe(p(5_000));
    // existing workplace RAS 20,000 gross + other SIPP 15,000 → 40,000 − 35,000 = 5,000
    expect(maxFeasibleAdditional(withOtherSipp(40_000, 15_000, { existingPension: { method: 'ras-workplace', basis: 'gross', mode: 'fixed', amount: p(20_000) } }), 'ras-sipp')).toBe(p(5_000));
  });

  it('existing salary sacrifice lowers the limit; taxable benefits raise it', () => {
    // salary 40,000 − sacrifice 10,000 = 30,000 limit; other SIPP 20,000 → 10,000
    expect(maxFeasibleAdditional(withOtherSipp(40_000, 20_000, { existingPension: { method: 'salary-sacrifice', basis: 'salary-sacrificed', mode: 'fixed', amount: p(10_000) } }), 'ras-sipp')).toBe(p(10_000));
    // salary 40,000 + benefits 2,000 = 42,000 limit; other SIPP 40,000 → 2,000
    expect(maxFeasibleAdditional(withOtherSipp(40_000, 40_000, { income: { taxableBenefits: p(2_000) } }), 'ras-sipp')).toBe(p(2_000));
  });

  it.each([
    // no earnings: the £3,600 basic amount applies
    [3_000, 600],
    [3_599.99, 0.01],
    [3_600, 0],
  ])('no earnings, existing other SIPP £%d → maximum additional £%d', (existing, max) => {
    expect(maxFeasibleAdditional(withOtherSipp(0, existing), 'ras-sipp')).toBe(p(max));
  });
});

describe('optimiser outcome when existing contributions use the limit', () => {
  // Salary £40,000, property profit £100,000, target £100,000.
  it('limit partly used: existing £10,000 → needs exactly the remaining £30,000; ANI lands on £100,000', () => {
    const i = withOtherSipp(40_000, 10_000, { income: { propertyIncome: p(100_000) } });
    // ANI now 140,000 − 10,000 = 130,000; need 30,000 more; limit left 30,000 → feasible exactly at the limit
    const o = requiredContribution(i, 'ras-sipp');
    expect(o.currentAni).toBe(p(130_000));
    expect(o.maxFeasibleGross).toBe(p(30_000));
    expect(o.feasible).toBe(true);
    expect(o.requiredGross).toBe(p(30_000));
    expect(run(i, 'ras-sipp', 30_000).adjustedNetIncome).toBe(p(100_000));
  });

  it('one penny more income: same limit, target now unreachable by relief at source', () => {
    const i = withOtherSipp(40_000, 10_000, { income: { propertyIncome: p(100_000.01) } });
    const o = requiredContribution(i, 'ras-sipp');
    expect(o.maxFeasibleGross).toBe(p(30_000));
    expect(o.feasible).toBe(false);
    expect(o.reason).toMatch(/relevant UK earnings/);
    expect(run(i, 'ras-sipp', 30_000).adjustedNetIncome).toBe(p(100_000.01));
  });

  it('limit fully used: maximum £0, infeasible; an extra £1,000 does not reduce ANI but still counts for the annual allowance', () => {
    const i = withOtherSipp(40_000, 40_000, { income: { propertyIncome: p(110_000) } });
    const o = requiredContribution(i, 'ras-sipp');
    expect(o.currentAni).toBe(p(110_000)); // 150,000 − 40,000
    expect(o.maxFeasibleGross).toBe(0);
    expect(o.feasible).toBe(false);
    const s = run(i, 'ras-sipp', 1_000);
    expect(s.adjustedNetIncome).toBe(p(110_000));
    expect(s.rasCashPaid).toBe(p(32_000 + 1_000)); // 80% of 40,000 relieved + 1,000 unrelieved in full
    expect(s.annualAllowance.pensionInputDc).toBe(p(41_000)); // F1: unrelieved still counts
  });

  it('salary sacrifice cannot help either: each £1 sacrificed removes £1 of relief from the existing SIPP', () => {
    // Sacrifice x ≤ 36,400: net income 150,000 − x; relieved min(40,000, 40,000 − x) → ANI stays 110,000.
    // At the £40,000 maximum: earnings 0 → relief limit £3,600 → ANI = 110,000 − 3,600 = 106,400.
    const i = withOtherSipp(40_000, 40_000, { income: { propertyIncome: p(110_000) } });
    expect(run(i, 'salary-sacrifice', 10_000).adjustedNetIncome).toBe(p(110_000));
    expect(run(i, 'salary-sacrifice', 40_000).adjustedNetIncome).toBe(p(106_400));
    const o = requiredContribution(i, 'salary-sacrifice');
    expect(o.feasible).toBe(false);
    expect(o.reason).toMatch(/existing relief-at-source contributions/);
  });
});
