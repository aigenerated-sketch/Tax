import { calculateIncomeTax, calculateScenario, type Jurisdiction } from '../../engine';
import { R25, R26, p, salaryOnly } from '../helpers';

/**
 * Band-boundary tests. Income = full personal allowance (£12,570) + T of taxable income,
 * with ANI forced to £0 so the allowance is never tapered: this isolates the band limits.
 * Expected values are cumulative band totals worked by hand from the GOV.UK tables.
 */
function taxOnTaxable(T: number, jurisdiction: Jurisdiction, rules = R26) {
  return calculateIncomeTax({
    rules,
    jurisdiction,
    nonSavingsIncome: p(12_570 + T),
    savingsIncome: 0,
    dividendIncome: 0,
    adjustedNetIncome: 0,
    bandExtension: 0,
  });
}

describe('England, Wales and Northern Ireland band boundaries (2026/27)', () => {
  const cases: [number, number][] = [
    [0, 0],
    [1, 0.2],
    [37_699, 7_539.8],
    [37_700, 7_540],
    [37_701, 7_540.4],
    [125_139, 42_515.6],
    [125_140, 42_516],
    [125_141, 42_516.45],
  ];
  for (const j of ['england', 'wales', 'northern-ireland'] as const) {
    it.each(cases)(`${j}: taxable £%d → £%d`, (T, tax) => {
      expect(taxOnTaxable(T, j).total).toBe(p(tax));
    });
  }
});

describe('Scottish band boundaries (2026/27)', () => {
  // cumulative: starter 3,967→753.73; basic 16,956→3,351.53; intermediate 31,092→6,320.09;
  // higher 62,430→19,482.05; advanced 125,140→47,701.55
  const cases: [number, number][] = [
    [3_966, 753.54],
    [3_967, 753.73],
    [3_968, 753.93],
    [16_955, 3_351.33],
    [16_956, 3_351.53],
    [16_957, 3_351.74],
    [31_091, 6_319.88],
    [31_092, 6_320.09],
    [31_093, 6_320.51],
    [62_429, 19_481.63],
    [62_430, 19_482.05],
    [62_431, 19_482.5],
    [125_139, 47_701.1],
    [125_140, 47_701.55],
    [125_141, 47_702.03],
  ];
  it.each(cases)('taxable £%d → £%d', (T, tax) => {
    expect(taxOnTaxable(T, 'scotland').total).toBe(p(tax));
  });

  it('uses the 2025/26 Scottish starter/basic limits when that year is selected', () => {
    // 2025/26: starter to £2,827 (19%), basic to £14,921 (20%)
    expect(taxOnTaxable(2_827, 'scotland', R25).total).toBe(p(537.13));
    expect(taxOnTaxable(14_921, 'scotland', R25).total).toBe(p(537.13 + 2_418.8));
  });
});

describe('bands have no gaps or overlaps', () => {
  it.each(['england', 'scotland'] as const)('%s: every £1 of taxable income is taxed exactly once', (j) => {
    for (const T of [5_000, 40_000, 70_000, 130_000]) {
      const r = taxOnTaxable(T, j);
      const sliced = r.slices.reduce((a, s) => a + s.amount, 0);
      expect(sliced).toBe(p(T));
      expect(r.slices.reduce((a, s) => a + s.tax, 0)).toBe(r.total);
    }
  });
});

describe('full calculations with the taper (independent reference cases)', () => {
  // See docs/REFERENCE_CASES.md for the workings.
  const cases: [string, Jurisdiction, number, number][] = [
    ['A: England £60,000', 'england', 60_000, 11_432],
    ['B: England £110,000', 'england', 110_000, 33_432],
    ['C: Scotland £110,000', 'scotland', 110_000, 37_482.05],
    ['D: England £150,000', 'england', 150_000, 53_703],
    ['E: England £125,140', 'england', 125_140, 42_516],
    ['F: Scotland £50,000', 'scotland', 50_000, 8_982.05],
    ['G: Wales £100,000', 'wales', 100_000, 27_432],
  ];
  it.each(cases)('%s', (_l, jurisdiction, salary, tax) => {
    const s = calculateScenario(salaryOnly(salary, { jurisdiction }), { label: 't', method: null, additionalGross: 0 });
    expect(s.incomeTax.total).toBe(p(tax));
  });

  it('applies the personal allowance exactly once', () => {
    const s = calculateScenario(salaryOnly(110_000), { label: 't', method: null, additionalGross: 0 });
    expect(s.incomeTax.personalAllowance).toBe(p(7_570));
    expect(s.incomeTax.personalAllowanceUsed).toBe(p(7_570));
    expect(s.incomeTax.totalTaxableIncome).toBe(p(110_000 - 7_570));
  });
});

describe('savings and dividends', () => {
  it('higher-rate taxpayer gets £500 PSA, rest at 40%', () => {
    const s = calculateScenario(salaryOnly(60_000, { income: { savingsInterest: p(2_000) } }), { label: 't', method: null, additionalGross: 0 });
    expect(s.incomeTax.savingsTax).toBe(p(600));
    expect(s.incomeTax.total).toBe(p(12_032));
  });

  it('low earner uses starting rate for savings and £1,000 PSA', () => {
    // PA 12,570 against salary 14,000 → taxable NS 1,430 (tax 286). Starting band 5,000 − 1,430 = 3,570 at 0%,
    // PSA 1,000 at 0%, remaining 1,430 at 20% = 286.
    const s = calculateScenario(salaryOnly(14_000, { income: { savingsInterest: p(6_000) } }), { label: 't', method: null, additionalGross: 0 });
    expect(s.incomeTax.nonSavingsTax).toBe(p(286));
    expect(s.incomeTax.savingsTax).toBe(p(286));
  });

  it('dividends: £500 allowance then 35.75% for a higher-rate taxpayer (2026/27)', () => {
    const s = calculateScenario(salaryOnly(60_000, { income: { dividends: p(5_000) } }), { label: 't', method: null, additionalGross: 0 });
    expect(s.incomeTax.dividendTax).toBe(p(1_608.75));
  });

  it('Scottish taxpayer: dividends use UK bands, not Scottish bands', () => {
    // NS tax 8,982.05 (case F). UK position: taxable NS 37,430; allowance 500 → 37,930; remaining 9,500 above £37,700 at 35.75%.
    const s = calculateScenario(salaryOnly(50_000, { jurisdiction: 'scotland', income: { dividends: p(10_000) } }), { label: 't', method: null, additionalGross: 0 });
    expect(s.incomeTax.nonSavingsTax).toBe(p(8_982.05));
    expect(s.incomeTax.dividendTax).toBe(p(3_396.25));
  });

  it('2025/26 dividend rates differ', () => {
    const s = calculateScenario(salaryOnly(60_000, { taxYear: '2025-26', income: { dividends: p(5_000) } }), { label: 't', method: null, additionalGross: 0 });
    expect(s.incomeTax.dividendTax).toBe(p(4_500 * 0.3375));
  });
});
