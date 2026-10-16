/**
 * ANI tests. Expected values are worked by hand (docs/CALCULATION_CONVENTIONS.md §1):
 *   net income = salary + bonus − salary sacrifice − net pay + benefits + property + other + savings + dividends
 *   ANI        = max(0, net income − relieved RAS gross − Gift Aid gross)
 * Base case: England, salary £110,000, nothing else.
 */
import { adjustedNetIncome, calculateScenario, computeIncomeComponents, emptyPension, grossUpAtBasicRate, type CalculatorInputs, type PensionMethod } from '../../engine';
import { inputs, p, salaryOnly } from '../helpers';

const ani = (i: CalculatorInputs, method: PensionMethod | null = null, gross = 0) =>
  calculateScenario(i, { label: 't', method, additionalGross: p(gross) });

describe('computeIncomeComponents defines net income once', () => {
  const income = { salary: p(110_000), bonus: p(5_000), taxableBenefits: p(2_000), propertyIncome: p(3_000), otherNonSavingsIncome: p(500), savingsInterest: p(1_000), dividends: p(2_000) };
  it('applies salary sacrifice to Class 1 earnings and net pay only to employment income', () => {
    const c = computeIncomeComponents(income, { salarySacrifice: p(10_000), netPay: p(4_000) });
    expect(c.contractualPay).toBe(p(115_000));
    expect(c.classOneEarnings).toBe(p(105_000)); // 115,000 − 10,000 sacrifice; net pay NOT deducted
    expect(c.employmentIncome).toBe(p(103_000)); // 105,000 − 4,000 + 2,000 benefits
    expect(c.nonSavingsIncome).toBe(p(106_500)); // + 3,000 property + 500 other
    expect(c.netIncome).toBe(p(109_500)); // + 1,000 savings + 2,000 dividends
    expect(c.taxableEarnings).toBe(p(107_000)); // 105,000 + 2,000 benefits
  });
  it('all-zero income gives zero everywhere', () => {
    const zero = { salary: 0, bonus: 0, taxableBenefits: 0, propertyIncome: 0, otherNonSavingsIncome: 0, savingsInterest: 0, dividends: 0 };
    expect(computeIncomeComponents(zero, { salarySacrifice: 0, netPay: 0 }).netIncome).toBe(0);
  });
  it.each([
    ['negative salary', { ...income, salary: -1 }, emptyPension()],
    ['fractional pence', { ...income, bonus: 0.5 }, emptyPension()],
    ['NaN', { ...income, dividends: Number.NaN }, emptyPension()],
    ['sacrifice above pay', income, { ...emptyPension(), salarySacrifice: p(200_000) }],
    ['net pay above pay', income, { ...emptyPension(), netPay: p(200_000) }],
  ])('rejects %s', (_l, inc, pen) => {
    expect(() => computeIncomeComponents(inc, pen)).toThrow(RangeError);
  });
});

describe('adjustedNetIncome()', () => {
  it('deducts relief-at-source gross and Gift Aid gross', () => {
    expect(adjustedNetIncome({ netIncome: p(110_000), reliefAtSourceGross: p(10_000), giftAidGross: p(1_250) })).toBe(p(98_750));
  });
  it('never goes below zero', () => {
    expect(adjustedNetIncome({ netIncome: p(3_000), reliefAtSourceGross: p(3_600), giftAidGross: 0 })).toBe(0);
  });
  it('zero in, zero out', () => {
    expect(adjustedNetIncome({ netIncome: 0, reliefAtSourceGross: 0, giftAidGross: 0 })).toBe(0);
  });
  it.each([[-1], [Number.NaN], [Number.POSITIVE_INFINITY], [0.5]])('rejects invalid value %s', (v) => {
    expect(() => adjustedNetIncome({ netIncome: v, reliefAtSourceGross: 0, giftAidGross: 0 })).toThrow(RangeError);
    expect(() => adjustedNetIncome({ netIncome: p(1), reliefAtSourceGross: v, giftAidGross: 0 })).toThrow(RangeError);
  });
  it('gross-up: £8,000 net → £10,000; £800 Gift Aid → £1,000', () => {
    expect(grossUpAtBasicRate(p(8_000), 0.2)).toBe(p(10_000));
    expect(grossUpAtBasicRate(p(800), 0.2)).toBe(p(1_000));
  });
  it.each([[0], [1], [-0.2], [1.2]])('rejects basic rate %s for gross-up', (r) => {
    expect(() => grossUpAtBasicRate(p(100), r)).toThrow(RangeError);
  });
});

describe('ANI through the full scenario (salary £110,000)', () => {
  const cases: [string, CalculatorInputs, PensionMethod | null, number, number][] = [
    ['no contribution', salaryOnly(110_000), null, 0, 110_000],
    ['£10,000 salary sacrifice', salaryOnly(110_000), 'salary-sacrifice', 10_000, 100_000],
    ['£10,000 net pay', salaryOnly(110_000), 'net-pay', 10_000, 100_000],
    ['£10,000 gross RAS workplace (£8,000 paid)', salaryOnly(110_000), 'ras-workplace', 10_000, 100_000],
    ['£10,000 gross SIPP (£8,000 paid)', salaryOnly(110_000), 'ras-sipp', 10_000, 100_000],
    ['£4,000 Gift Aid paid (£5,000 gross)', salaryOnly(110_000, { giftAidNet: p(4_000) }), null, 0, 105_000],
    ['employer contribution £20,000 (no effect)', salaryOnly(110_000, { existingPension: { employerMode: 'fixed', employerAmount: p(20_000) } }), null, 0, 110_000],
    [
      'combination: existing net pay £3,000 + £5,000 sacrifice + £800 Gift Aid',
      salaryOnly(110_000, { giftAidNet: p(800), existingPension: { method: 'net-pay', basis: 'employee-before-relief', mode: 'fixed', amount: p(3_000) } }),
      'salary-sacrifice',
      5_000,
      110_000 - 5_000 - 3_000 - 1_000, // £101,000
    ],
    [
      'all income types + £4,000 sacrifice',
      inputs({ income: { salary: p(110_000), taxableBenefits: p(2_000), propertyIncome: p(3_000), savingsInterest: p(1_000), dividends: p(2_000) } }),
      'salary-sacrifice',
      4_000,
      114_000,
    ],
    ['zero income', inputs(), null, 0, 0],
    ['zero income, £2,880 paid into a SIPP (basic amount)', inputs(), 'ras-sipp', 3_600, 0],
  ];
  it.each(cases)('%s → ANI £%#', (_l, i, m, g, expected) => {
    expect(ani(i, m, g).adjustedNetIncome).toBe(p(expected));
  });

  // The model allows one existing method plus one additional method, so combinations are tested in pairs + Gift Aid.
  it('combination: existing SIPP £2,000 gross + £5,000 sacrifice + £800 Gift Aid → 110,000 − 5,000 − 2,000 − 1,000 = £102,000', () => {
    const i = salaryOnly(110_000, { giftAidNet: p(800), existingPension: { method: 'ras-sipp', basis: 'gross', mode: 'fixed', amount: p(2_000) } });
    expect(ani(i, 'salary-sacrifice', 5_000).adjustedNetIncome).toBe(p(102_000));
  });

  it('combination: existing net pay £3,000 + £2,000 SIPP gross + £800 Gift Aid → 110,000 − 3,000 − 2,000 − 1,000 = £104,000', () => {
    const i = salaryOnly(110_000, { giftAidNet: p(800), existingPension: { method: 'net-pay', basis: 'gross', mode: 'fixed', amount: p(3_000) } });
    expect(ani(i, 'ras-sipp', 2_000).adjustedNetIncome).toBe(p(104_000));
  });

  it('RAS above the relief limit is not deducted from ANI', () => {
    const s = ani(inputs({ income: { salary: p(30_000), propertyIncome: p(110_000) } }), 'ras-sipp', 40_000);
    expect(s.rasRelievedGross).toBe(p(30_000));
    expect(s.adjustedNetIncome).toBe(p(110_000)); // 140,000 − 30,000 relieved
  });

  it('negative or fractional inputs are rejected by the engine (no result returned)', () => {
    expect(() => ani(inputs({ income: { salary: p(-1) } }))).toThrow(/Inputs failed validation/);
    expect(() => ani(inputs({ giftAidNet: 0.5 }))).toThrow(/Inputs failed validation/);
    expect(() => ani(salaryOnly(50_000), 'ras-sipp', -1)).toThrow(/Inputs failed validation/);
    expect(() => ani(salaryOnly(50_000, { existingPension: { percent: 120 } }))).toThrow(/Inputs failed validation/);
  });
});
