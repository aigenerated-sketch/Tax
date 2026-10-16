/**
 * Each contribution must affect taxable income, ANI, NI and band extension exactly as in
 * docs/CALCULATION_CONVENTIONS.md §1.5 — never twice.
 */
import {
  adjustedNetIncome,
  calculateAll,
  calculateIncomeTax,
  calculateScenario,
  computeIncomeComponents,
  employeeNi,
  grossUpAtBasicRate,
  PENSION_METHODS,
  type CalculatorInputs,
  type PensionMethod,
} from '../../engine';
import { inputs, p, R26, salaryOnly } from '../helpers';

const run = (i: CalculatorInputs, method: PensionMethod | null, gross: number) => calculateScenario(i, { label: 't', method, additionalGross: p(gross) });

describe('each £10,000 gross contribution hits each measure the right number of times (salary £110,000)', () => {
  const base = run(salaryOnly(110_000), null, 0);
  const table: [PensionMethod, { ni: number; employmentIncome: number; ani: number; ext: number }][] = [
    ['salary-sacrifice', { ni: 100_000, employmentIncome: 100_000, ani: 100_000, ext: 0 }],
    ['net-pay', { ni: 110_000, employmentIncome: 100_000, ani: 100_000, ext: 0 }],
    ['ras-workplace', { ni: 110_000, employmentIncome: 110_000, ani: 100_000, ext: 10_000 }],
    ['ras-sipp', { ni: 110_000, employmentIncome: 110_000, ani: 100_000, ext: 10_000 }],
  ];
  it.each(table)('%s', (m, e) => {
    const s = run(salaryOnly(110_000), m, 10_000);
    expect(s.employeeNi.earnings).toBe(p(e.ni));
    expect(s.employmentIncome).toBe(p(e.employmentIncome));
    expect(s.adjustedNetIncome).toBe(p(e.ani));
    expect(s.incomeTax.bandExtension).toBe(p(e.ext));
    // ANI falls by exactly the gross contribution — not twice
    expect(base.adjustedNetIncome - s.adjustedNetIncome).toBe(p(10_000));
  });

  it('net pay does not reduce NI; salary sacrifice does (NIM02365)', () => {
    expect(run(salaryOnly(110_000), 'net-pay', 10_000).employeeNi.total).toBe(base.employeeNi.total);
    expect(run(salaryOnly(110_000), 'salary-sacrifice', 10_000).employeeNi.total).toBe(p(4_010.6));
  });

  it('employer contributions change nothing except pension investment', () => {
    const s = run(salaryOnly(110_000, { existingPension: { employerMode: 'fixed', employerAmount: p(10_000) } }), null, 0);
    expect(s.adjustedNetIncome).toBe(base.adjustedNetIncome);
    expect(s.incomeTax.total).toBe(base.incomeTax.total);
    expect(s.takeHome).toBe(base.takeHome);
    expect(s.totalPensionInvestment).toBe(p(10_000));
  });
});

describe('worked combination of all four: £110,000; £5,000 sacrifice; £3,000 net pay; £2,000 RAS gross; £800 Gift Aid paid', () => {
  // The UI models one existing + one additional method, so the four-way combination is checked by composing
  // the same engine functions the scenario uses (conventions §1–§5).
  // Hand working (England 2026/27):
  //  Class 1 earnings 105,000; employment income 102,000; net income 102,000
  //  ANI = 102,000 − 2,000 RAS − 1,000 Gift Aid = 99,000 → PA £12,570
  //  Taxable 102,000 − 12,570 = 89,430; basic band 37,700 + 3,000 = 40,700
  //  Tax = 40,700 × 20% + 48,730 × 40% = 8,140 + 19,492 = £27,632
  //  Before claims: PA from 102,000 = 11,570; taxable 90,430 → 7,540 + 52,730 × 40% = £28,632 → claim £1,000
  //  NI: 3,016 + (105,000 − 50,270) × 2% = £4,110.60
  //  RAS cash £1,600; take-home 105,000 − 3,000 − 1,600 − 27,632 − 4,110.60 = £68,657.40
  //  vs baseline £72,357.40 → change −£3,700 = −(5,000 + 3,000 + 1,600) + 5,800 tax + 100 NI
  const income = { salary: p(110_000), bonus: 0, taxableBenefits: 0, propertyIncome: 0, otherNonSavingsIncome: 0, savingsInterest: 0, dividends: 0 };
  const ic = computeIncomeComponents(income, { salarySacrifice: p(5_000), netPay: p(3_000) });
  const giftAidGross = grossUpAtBasicRate(p(800), 0.2);
  const ani = adjustedNetIncome({ netIncome: ic.netIncome, reliefAtSourceGross: p(2_000), giftAidGross });
  const base = { rules: R26, jurisdiction: 'england' as const, nonSavingsIncome: ic.nonSavingsIncome, savingsIncome: 0, dividendIncome: 0 };
  const tax = calculateIncomeTax({ ...base, adjustedNetIncome: ani, bandExtension: p(2_000) + giftAidGross });
  const before = calculateIncomeTax({ ...base, adjustedNetIncome: ic.netIncome, bandExtension: 0 });
  const ni = employeeNi(ic.classOneEarnings, R26);
  const takeHome = ic.classOneEarnings - p(3_000) - p(1_600) - tax.total - ni.total;

  it('components and ANI', () => {
    expect(ic.classOneEarnings).toBe(p(105_000));
    expect(ic.netIncome).toBe(p(102_000));
    expect(ani).toBe(p(99_000));
  });
  it('tax, claim, NI, take-home', () => {
    expect(tax.total).toBe(p(27_632));
    expect(before.total - tax.total).toBe(p(1_000));
    expect(ni.total).toBe(p(4_110.6));
    expect(takeHome).toBe(p(68_657.4));
  });
  it('pairs through the full scenario agree with the same rules', () => {
    // net pay 3,000 (existing) + sacrifice 5,000 (additional) + Gift Aid → ANI 101,000
    const i = salaryOnly(110_000, { giftAidNet: p(800), existingPension: { method: 'net-pay', basis: 'gross', mode: 'fixed', amount: p(3_000) } });
    expect(run(i, 'salary-sacrifice', 5_000).adjustedNetIncome).toBe(p(101_000));
  });
});

describe('Δ take-home = −Δ(pay given up or paid into pension) + Income Tax saved + NI saved + student loan saved', () => {
  const profiles: CalculatorInputs[] = [
    salaryOnly(110_000),
    salaryOnly(110_000, { jurisdiction: 'scotland' }),
    salaryOnly(60_000, { studentLoan: { plan: 'plan2', postgraduate: true }, giftAidNet: p(500) }),
    inputs({ income: { salary: p(98_000), bonus: p(9_000), dividends: p(4_000) }, existingPension: { method: 'ras-workplace', basis: 'net-ras', mode: 'percent', percent: 4 } }),
  ];
  for (const [n, i] of profiles.entries()) {
    for (const m of PENSION_METHODS) {
      it(`profile ${n + 1}, ${m}`, () => {
        const out = calculateAll({ ...i, additional: { ...i.additional, method: m, grossAmount: p(7_500) } });
        const d = out.change;
        expect(d.takeHome).toBe(-d.employeePensionCash - d.incomeTax - d.employeeNi - d.studentLoan);
      });
    }
  }
});
