/**
 * Independent reference calculator for salary-only cases, written separately from the engine.
 * Rates are typed in here from GOV.UK / gov.scot (2026/27) — NOT imported from src/rules — and the
 * algorithm is the plain textbook one: personal allowance taper, cumulative bands, NI bands.
 * The engine must agree to the penny across a sweep of incomes, with and without contributions.
 */
import { calculateIncomeTax, calculateScenario, calculateWithAllocation, type CalculatorInputs, type Jurisdiction, type PensionMethod } from '../../engine';
import { R26, inputs, p, salaryOnly } from '../helpers';

const RUK: [number, number][] = [
  [37_700, 0.2],
  [125_140, 0.4],
  [Infinity, 0.45],
];
const SCOT: [number, number][] = [
  [3_967, 0.19],
  [16_956, 0.2],
  [31_092, 0.21],
  [62_430, 0.42],
  [125_140, 0.45],
  [Infinity, 0.48],
];

/** Reference personal allowance, in pounds. £1 lost per complete £2 over £100,000 (convention U4). */
function refPa(aniPounds: number): number {
  const whole = Math.floor(aniPounds);
  if (whole <= 100_000) return 12_570;
  return Math.max(0, 12_570 - Math.floor((whole - 100_000) / 2));
}

/** Reference tax in pence on taxable pounds; `ext` extends limits from `fromIndex` upward; per-band rounding to the penny. */
function refTax(taxable: number, bands: [number, number][], ext = 0, fromIndex = 0): number {
  let pence = 0;
  let lower = 0;
  bands.forEach(([upTo, rate], i) => {
    const limit = upTo === Infinity ? Infinity : upTo + (i >= fromIndex ? ext : 0);
    const amt = Math.max(0, Math.min(taxable, limit) - lower);
    pence += halfUp(Math.round(amt * 100), rate);
    lower = limit;
  });
  return pence;
}

/** pence × rate, half-up, computed with integers so .5p ties are exact. */
function halfUp(pence: number, rate: number): number {
  const bp = Math.round(rate * 10_000);
  return Math.floor((pence * bp + 5_000) / 10_000);
}

function refNi(earnings: number): number {
  return halfUp(Math.round(Math.max(0, Math.min(earnings, 50_270) - 12_570) * 100), 0.08) + halfUp(Math.round(Math.max(0, earnings - 50_270) * 100), 0.02);
}

/** Reference for salary + one additional contribution method. Returns pence. */
function reference(salary: number, j: Jurisdiction, method: PensionMethod | null, gross: number) {
  const ss = method === 'salary-sacrifice' ? gross : 0;
  const np = method === 'net-pay' ? gross : 0;
  const rasPaid = method === 'ras-sipp' || method === 'ras-workplace' ? gross : 0;
  const ras = Math.min(rasPaid, Math.max(salary, 3_600)); // relieved part
  const pay = salary - ss;
  const taxablePay = pay - np;
  const ani = Math.max(0, taxablePay - ras);
  const taxable = Math.max(0, taxablePay - refPa(ani));
  const bands = j === 'scotland' ? SCOT : RUK;
  const tax = refTax(taxable, bands, ras, j === 'scotland' ? 1 : 0);
  const ni = refNi(pay);
  // 80% of the relieved part (provider adds 20%) + the unrelieved part in full
  const rasCash = Math.round(ras * 100) - halfUp(Math.round(ras * 100), 0.2) + Math.round((rasPaid - ras) * 100);
  const takeHome = Math.round(pay * 100) - Math.round(np * 100) - rasCash - tax - ni;
  return { ani: Math.round(ani * 100), tax, ni, takeHome };
}

const salaries: number[] = [];
for (let s = 0; s <= 300_000; s += 1_733.21) salaries.push(Math.round(s * 100) / 100);
salaries.push(12_570, 12_571, 50_270, 50_271, 100_000, 100_001, 100_002, 110_000, 125_139, 125_140, 125_141);

describe.each(['england', 'scotland'] as Jurisdiction[])('engine vs independent reference — %s, 2026/27', (j) => {
  for (const [method, gross] of [
    [null, 0],
    ['salary-sacrifice', 8_000],
    ['net-pay', 8_000],
    ['ras-sipp', 8_000],
  ] as [PensionMethod | null, number][]) {
    it(`${method ?? 'no contribution'}: ANI, Income Tax, NI and take-home agree to the penny at ${salaries.length} salaries`, () => {
      const mismatches: string[] = [];
      for (const s of salaries) {
        if (method === 'salary-sacrifice' || method === 'net-pay') if (s < gross) continue;
        const e = calculateScenario(salaryOnly(s, { jurisdiction: j }), { label: 'x', method, additionalGross: method ? p(gross) : 0 });
        const r = reference(s, j, method, gross);
        if (e.adjustedNetIncome !== r.ani || e.incomeTax.total !== r.tax || e.employeeNi.total !== r.ni || e.takeHome !== r.takeHome) {
          mismatches.push(`£${s}: engine ${e.adjustedNetIncome}/${e.incomeTax.total}/${e.employeeNi.total}/${e.takeHome} ref ${r.ani}/${r.tax}/${r.ni}/${r.takeHome}`);
        }
      }
      expect(mismatches).toEqual([]);
    });
  }
});

describe('monotonicity over a salary sweep (both jurisdictions, both years)', () => {
  it.each([
    ['england', '2026-27'],
    ['scotland', '2026-27'],
    ['england', '2025-26'],
    ['scotland', '2025-26'],
  ] as const)('%s %s: tax and NI never fall, take-home always rises', (j, y) => {
    let prev: ReturnType<typeof calculateScenario> | null = null;
    for (let s = 0; s <= 260_000; s += 997) {
      const cur = calculateScenario(salaryOnly(s, { jurisdiction: j, taxYear: y }), { label: 'x', method: null, additionalGross: 0 });
      if (prev) {
        expect(cur.incomeTax.total).toBeGreaterThanOrEqual(prev.incomeTax.total);
        expect(cur.employeeNi.total).toBeGreaterThanOrEqual(prev.employeeNi.total);
        expect(cur.takeHome).toBeGreaterThan(prev.takeHome);
      }
      prev = cur;
    }
  });
});

describe('personal allowance allocation (ITA 2007 s25(2) "greatest reduction")', () => {
  // Brute force: every split of the allowance in £250 steps (plus the corners) must cost at least
  // as much as the engine's choice. Independent of the allocation logic under test.
  const cases: [string, Jurisdiction, number, number, number, number][] = [
    ['salary + savings in starting band', 'england', 15_000, 6_000, 0, 0],
    ['small salary, big dividends', 'england', 8_000, 0, 40_000, 0],
    ['mixed, higher rate', 'england', 30_000, 8_000, 20_000, 0],
    ['mixed with band extension', 'england', 40_000, 3_000, 9_000, 2_500],
    ['Scotland, starter band and savings', 'scotland', 14_000, 9_000, 3_000, 0],
    ['Scotland, intermediate + dividends', 'scotland', 35_000, 2_000, 15_000, 0],
    ['dividends only', 'england', 0, 0, 60_000, 0],
    ['savings only', 'scotland', 0, 30_000, 0, 0],
  ];
  it.each(cases)('%s', (_l, jurisdiction, ns, sav, div, ext) => {
    const input = {
      rules: R26,
      jurisdiction,
      nonSavingsIncome: p(ns),
      savingsIncome: p(sav),
      dividendIncome: p(div),
      adjustedNetIncome: p(ns + sav + div - ext),
      bandExtension: p(ext),
    };
    const chosen = calculateIncomeTax(input).total;
    const pa = 12_570;
    let best = Infinity;
    for (let a = 0; a <= Math.min(pa, ns); a += 250) {
      for (let b = 0; b <= Math.min(pa - a, sav); b += 250) {
        const c = Math.min(pa - a - b, div);
        const t = calculateWithAllocation(input, { 'non-savings': p(a), savings: p(b), dividends: p(c) }).total;
        best = Math.min(best, t);
      }
    }
    expect(chosen).toBeLessThanOrEqual(best);
  });
});

describe('optimiser: the recommended contribution really reaches the target, to the penny', () => {
  const profiles: [string, CalculatorInputs][] = [
    ['£100,000.01', salaryOnly(100_000.01)],
    ['£105,432.10 Scotland', salaryOnly(105_432.1, { jurisdiction: 'scotland' })],
    ['£125,140', salaryOnly(125_140)],
    ['£150,000 + £2,000 Gift Aid', salaryOnly(150_000, { giftAidNet: p(2_000) })],
    ['£98k + £20k bonus, 5% net pay', inputs({ income: { salary: p(98_000), bonus: p(20_000) }, existingPension: { method: 'net-pay', basis: 'gross', mode: 'percent', percent: 5 } })],
    ['£120k, existing SIPP £3,200 net, 2025/26', salaryOnly(120_000, { taxYear: '2025-26', existingPension: { method: 'ras-sipp', basis: 'net-ras', mode: 'fixed', amount: p(3_200) } })],
    ['£115k with £6k savings and £4k dividends', inputs({ income: { salary: p(115_000), savingsInterest: p(6_000), dividends: p(4_000) } })],
    ['£110k, target £90,000', salaryOnly(110_000, { targetAni: p(90_000) })],
  ];
  for (const [label, i] of profiles) {
    for (const m of ['salary-sacrifice', 'net-pay', 'ras-workplace', 'ras-sipp'] as PensionMethod[]) {
      it(`${label}: ${m}`, async () => {
        const { calculateAll } = await import('../../engine');
        const out = calculateAll({ ...i, additional: { ...i.additional, method: m } });
        const o = out.optimiser;
        const aniAt = (x: number) => calculateScenario(i, { label: 'x', method: m, additionalGross: x }).adjustedNetIncome;
        if (o.alreadyMet) {
          expect(out.baseline.adjustedNetIncome).toBeLessThanOrEqual(o.target);
          return;
        }
        expect(o.feasible).toBe(true);
        expect(aniAt(o.requiredGross)).toBeLessThanOrEqual(o.target);
        expect(aniAt(o.requiredGross - 1)).toBeGreaterThan(o.target);
        expect(out.atTarget?.adjustedNetIncome).toBeLessThanOrEqual(o.target);
        expect(out.atTargetChange?.takeHome).toBe((out.atTarget?.takeHome ?? 0) - out.baseline.takeHome);
      });
    }
  }
});
