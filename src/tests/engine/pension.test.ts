import { calculateScenario, compareMethods, requiredContribution, type PensionMethod } from '../../engine';
import { inputs, p, salaryOnly } from '../helpers';

const base = (i = salaryOnly(110_000)) => calculateScenario(i, { label: 'b', method: null, additionalGross: 0 });
const withM = (method: PensionMethod, gross: number, i = salaryOnly(110_000)) =>
  calculateScenario(i, { label: method, method, additionalGross: p(gross) });

describe('equivalent £10,000 gross contribution at £110,000 salary (England)', () => {
  it('baseline reference', () => {
    const b = base();
    expect(b.adjustedNetIncome).toBe(p(110_000));
    expect(b.incomeTax.total).toBe(p(33_432));
    expect(b.employeeNi.total).toBe(p(4_210.6));
    expect(b.takeHome).toBe(p(72_357.4));
  });

  it('salary sacrifice: tax and NI both fall, take-home falls by £3,800', () => {
    const s = withM('salary-sacrifice', 10_000);
    expect(s.cashPayAfterSacrifice).toBe(p(100_000));
    expect(s.adjustedNetIncome).toBe(p(100_000));
    expect(s.incomeTax.total).toBe(p(27_432));
    expect(s.employeeNi.total).toBe(p(4_010.6));
    expect(s.takeHome).toBe(p(68_557.4));
    expect(s.takeHome - base().takeHome).toBe(p(-3_800));
    expect(s.totalPensionInvestment).toBe(p(10_000));
    // employer NI saving 15% × 10,000 — reported, not passed on by default
    expect(base().employerNi - s.employerNi).toBe(p(1_500));
    expect(s.employerContribution).toBe(0);
  });

  it('net pay: tax falls, NI does not; take-home falls by £4,000', () => {
    const s = withM('net-pay', 10_000);
    expect(s.adjustedNetIncome).toBe(p(100_000));
    expect(s.incomeTax.total).toBe(p(27_432));
    expect(s.employeeNi.total).toBe(p(4_210.6));
    expect(s.takeHome - base().takeHome).toBe(p(-4_000));
    expect(s.reliefToClaim).toBe(0);
  });

  it.each(['ras-sipp', 'ras-workplace'] as const)('%s: £8,000 paid, £10,000 gross, £4,000 claimed from HMRC', (m) => {
    const s = withM(m, 10_000);
    expect(s.rasCashPaid).toBe(p(8_000));
    expect(s.rasRelievedGross).toBe(p(10_000));
    expect(s.adjustedNetIncome).toBe(p(100_000));
    expect(s.incomeTax.bandExtension).toBe(p(10_000));
    expect(s.incomeTax.total).toBe(p(29_432));
    expect(s.incomeTaxBeforeClaims).toBe(p(33_432));
    expect(s.reliefToClaim).toBe(p(4_000));
    expect(s.employeeNi.total).toBe(p(4_210.6));
    expect(s.takeHome - base().takeHome).toBe(p(-4_000));
    expect(s.totalPensionInvestment).toBe(p(10_000));
  });

  it('relief is not double counted: total relief equals the difference in liabilities', () => {
    for (const m of ['salary-sacrifice', 'net-pay', 'ras-sipp'] as const) {
      const s = withM(m, 10_000);
      const b = base();
      const cashCost = b.takeHome - s.takeHome;
      const relief = b.incomeTax.total - s.incomeTax.total + (b.employeeNi.total - s.employeeNi.total);
      // RAS: the provider's 20% top-up is part of the £10k gross, so cash cost = gross − top-up − HMRC relief
      const topUp = s.rasRelievedGross - (s.rasCashPaid);
      expect(cashCost).toBe(p(10_000) - relief - topUp);
    }
  });

  it('basic-rate taxpayer with SIPP gets only the 20% top-up', () => {
    const i = salaryOnly(40_000);
    const s = withM('ras-sipp', 1_000, i);
    expect(s.reliefToClaim).toBe(0);
    expect(base(i).takeHome - s.takeHome).toBe(p(800));
  });

  it('comparison uses the same baseline for all four methods', () => {
    const rows = compareMethods(salaryOnly(110_000), p(10_000));
    expect(rows.map((r) => r.change.takeHome)).toEqual([p(-3_800), p(-4_000), p(-4_000), p(-4_000)]);
    rows.forEach((r) => expect(r.change.totalPensionInvestment).toBe(p(10_000)));
  });
});

describe('existing contributions', () => {
  it('existing net SIPP payment is grossed up for ANI', () => {
    const i = salaryOnly(110_000, { existingPension: { method: 'ras-sipp', basis: 'net-ras', amount: p(4_000) } });
    const b = base(i);
    expect(b.pension.rasPersonalGross).toBe(p(5_000));
    expect(b.adjustedNetIncome).toBe(p(105_000));
    expect(requiredContribution(i, 'ras-sipp').requiredGross).toBe(p(5_000));
  });

  it('existing 5% salary sacrifice of basic salary', () => {
    const i = salaryOnly(110_000, { existingPension: { method: 'salary-sacrifice', basis: 'salary-sacrificed', mode: 'percent', percent: 5 } });
    expect(base(i).cashPayAfterSacrifice).toBe(p(104_500));
    expect(requiredContribution(i, 'salary-sacrifice').requiredGross).toBe(p(4_500));
  });

  it('qualifying earnings basis uses the £6,240–£50,270 band', () => {
    const i = salaryOnly(110_000, {
      existingPension: { method: 'net-pay', basis: 'employee-before-relief', mode: 'percent', percent: 5, pensionablePayBasis: 'qualifying-earnings', employerMode: 'percent', employerPercent: 3 },
    });
    const b = base(i);
    expect(b.pension.netPay).toBe(p((50_270 - 6_240) * 0.05));
    expect(b.employerContribution).toBe(p((50_270 - 6_240) * 0.03));
  });

  it('employer contributions do not reduce ANI', () => {
    const i = salaryOnly(110_000, { existingPension: { employerMode: 'fixed', employerAmount: p(20_000) } });
    expect(base(i).adjustedNetIncome).toBe(p(110_000));
    expect(base(i).totalPensionInvestment).toBe(p(20_000));
  });

  it('missing method for an existing contribution is an error, not silently included', () => {
    const i = salaryOnly(110_000, { existingPension: { method: null, amount: p(5_000) } });
    const b = base(i);
    expect(b.adjustedNetIncome).toBe(p(110_000));
    expect(b.warnings.find((w) => w.id === 'existing-method-missing')?.severity).toBe('error');
  });

  it('unknown basis is flagged', () => {
    const i = salaryOnly(110_000, { existingPension: { method: 'net-pay', basis: 'unknown', amount: p(5_000) } });
    expect(base(i).warnings.some((w) => w.id === 'existing-basis-unknown')).toBe(true);
  });
});

describe('employer match and NI pass-through', () => {
  it('match applies to workplace methods, not to a SIPP', () => {
    const i = salaryOnly(110_000, { additional: { employerMatchPercent: 50, employerMatchCap: p(3_000) } });
    expect(withM('net-pay', 10_000, i).employerContribution).toBe(p(3_000));
    expect(withM('ras-sipp', 10_000, i).employerContribution).toBe(0);
  });

  it('50% of employer NI saving passed through on salary sacrifice', () => {
    const i = salaryOnly(110_000, { additional: { employerNiPassThroughPercent: 50 } });
    expect(withM('salary-sacrifice', 10_000, i).employerContribution).toBe(p(750));
  });
});

describe('optimiser', () => {
  it('£110,000 salary needs exactly £10,000 gross to reach £100,000 under every method', () => {
    for (const m of ['salary-sacrifice', 'net-pay', 'ras-workplace', 'ras-sipp'] as const) {
      const r = requiredContribution(salaryOnly(110_000), m);
      expect(r.feasible).toBe(true);
      expect(r.requiredGross).toBe(p(10_000));
    }
  });

  it('accounts for Gift Aid', () => {
    const r = requiredContribution(salaryOnly(110_000, { giftAidNet: p(800) }), 'salary-sacrifice');
    expect(r.requiredGross).toBe(p(9_000));
  });

  it('no further contribution when target already met', () => {
    const r = requiredContribution(salaryOnly(95_000), 'ras-sipp');
    expect(r.alreadyMet).toBe(true);
    expect(r.requiredGross).toBe(0);
  });

  it('respects a lower target', () => {
    expect(requiredContribution(salaryOnly(110_000, { targetAni: p(90_000) }), 'net-pay').requiredGross).toBe(p(20_000));
  });

  it('is infeasible when relief-at-source is limited by relevant earnings', () => {
    const i = inputs({ income: { salary: p(30_000), propertyIncome: p(110_000) } });
    const r = requiredContribution(i, 'ras-sipp');
    expect(r.feasible).toBe(false);
    expect(r.maxFeasibleGross).toBe(p(30_000));
    expect(r.reason).toMatch(/relevant UK earnings/);
  });

  it('flags relief-at-source above relevant earnings', () => {
    const i = inputs({ income: { salary: p(30_000), propertyIncome: p(110_000) } });
    const s = withM('ras-sipp', 40_000, i);
    expect(s.rasRelievedGross).toBe(p(30_000));
    expect(s.adjustedNetIncome).toBe(p(110_000));
    expect(s.warnings.some((w) => w.id === 'ras-exceeds-relief-limit')).toBe(true);
  });

  it('Scotland reaches the same ANI target with the same gross', () => {
    expect(requiredContribution(salaryOnly(110_000, { jurisdiction: 'scotland' }), 'salary-sacrifice').requiredGross).toBe(p(10_000));
  });
});

describe('Scottish relief-at-source modelling', () => {
  it('higher-rate Scottish taxpayer: claim = 22% (42% − 20%)', () => {
    const i = salaryOnly(60_000, { jurisdiction: 'scotland' });
    expect(withM('ras-sipp', 1_000, i).reliefToClaim).toBe(p(220));
  });
  it('intermediate-rate Scottish taxpayer: claim = 1%', () => {
    const i = salaryOnly(40_000, { jurisdiction: 'scotland' });
    expect(withM('ras-sipp', 1_000, i).reliefToClaim).toBe(p(10));
  });
  it('starter-rate Scottish taxpayer: no claw-back of the 20% top-up', () => {
    const i = salaryOnly(14_000, { jurisdiction: 'scotland' });
    const s = withM('ras-sipp', 1_000, i);
    expect(s.reliefToClaim).toBe(0);
    expect(s.incomeTax.total).toBe(base(i).incomeTax.total);
  });
  it('Scottish taper zone: £10,000 salary sacrifice saves 69.5% of tax+NI combined', () => {
    const i = salaryOnly(110_000, { jurisdiction: 'scotland' });
    const s = withM('salary-sacrifice', 10_000, i);
    const b = base(i);
    expect(b.incomeTax.total - s.incomeTax.total + (b.employeeNi.total - s.employeeNi.total)).toBe(p(6_950));
  });
});

describe('Scotland £110,000, £10,000 gross: Income Tax vs NI vs take-home (docs/REFERENCE_CASES.md)', () => {
  const i = salaryOnly(110_000, { jurisdiction: 'scotland' });
  const b = base(i);
  it('salary sacrifice: tax £30,732.05 (saves £6,750), NI saves £200, take-home −£3,050', () => {
    const s = withM('salary-sacrifice', 10_000, i);
    expect(s.incomeTax.total).toBe(p(30_732.05));
    expect(b.incomeTax.total - s.incomeTax.total).toBe(p(6_750));
    expect(b.employeeNi.total - s.employeeNi.total).toBe(p(200));
    expect(s.takeHome - b.takeHome).toBe(p(-3_050));
  });
  it('SIPP: tax £32,732.05, claim £4,750, NI unchanged, take-home −£3,250', () => {
    const s = withM('ras-sipp', 10_000, i);
    expect(s.incomeTax.total).toBe(p(32_732.05));
    expect(s.reliefToClaim).toBe(p(4_750));
    expect(s.employeeNi.total).toBe(b.employeeNi.total);
    expect(s.takeHome - b.takeHome).toBe(p(-3_250));
  });
});
