import type { Jurisdiction, TaxBand, TaxYearRules } from '../rules/types';
import { applyRate, nonNeg } from './money';
import { personalAllowance } from './personalAllowance';
import type { IncomeTaxResult, Pence, TaxSlice } from './types';

export interface IncomeTaxInput {
  rules: TaxYearRules;
  jurisdiction: Jurisdiction;
  /** Non-savings income (employment, benefits, property, other) after net-pay deductions. */
  nonSavingsIncome: Pence;
  savingsIncome: Pence;
  dividendIncome: Pence;
  /** ANI determines the personal allowance taper. */
  adjustedNetIncome: Pence;
  /**
   * Gross relief-at-source pension contributions + grossed-up Gift Aid. Extends the
   * basic rate limit and higher rate limit (ITA 2007 s.10, s.12A etc.).
   */
  bandExtension: Pence;
}

export interface Segment {
  /** Upper limit of this segment in taxable-income terms; null = unlimited. */
  upTo: Pence | null;
  rate: number;
  label: string;
}

/** Tax `amount` of income sitting on top of `start` against an ordered list of segments. */
export function sliceAgainst(
  start: Pence,
  amount: Pence,
  segments: Segment[],
  incomeType: TaxSlice['incomeType'],
): TaxSlice[] {
  const out: TaxSlice[] = [];
  let pos = start;
  let remaining = amount;
  let lower = 0;
  for (const seg of segments) {
    if (remaining <= 0) break;
    const upper = seg.upTo ?? Number.POSITIVE_INFINITY;
    if (pos < upper) {
      const from = Math.max(pos, lower);
      const take = Math.min(remaining, upper - from);
      if (take > 0) {
        out.push({ incomeType, label: seg.label, rate: seg.rate, amount: take, tax: applyRate(take, seg.rate) });
        pos = from + take;
        remaining -= take;
      }
    }
    lower = upper;
  }
  return out;
}

export function extendBands(bands: TaxBand[], startIndex: number, extension: Pence): Segment[] {
  return bands.map((b, i) => ({
    label: b.label,
    rate: b.rate,
    upTo: b.upTo === null ? null : i >= startIndex ? b.upTo + extension : b.upTo,
  }));
}

/**
 * Income Tax for one individual for one tax year.
 *
 * Ordering: non-savings, then savings, then dividends. The personal allowance is applied
 * exactly once, allocated across components per `rules.allowanceAllocation` (ITA 2007 s25 —
 * see calculateIncomeTax below). Non-savings income uses the jurisdiction's bands; savings and
 * dividends always use UK-wide bands and rates, with non-savings income occupying the UK bands first.
 */
export type IncomeComponent = 'non-savings' | 'savings' | 'dividends';

const ALL_ORDERS: IncomeComponent[][] = [
  ['non-savings', 'savings', 'dividends'],
  ['non-savings', 'dividends', 'savings'],
  ['savings', 'non-savings', 'dividends'],
  ['savings', 'dividends', 'non-savings'],
  ['dividends', 'non-savings', 'savings'],
  ['dividends', 'savings', 'non-savings'],
];

/**
 * Personal allowance allocation (ITA 2007 s25).
 * - 'most-favourable' (to 2026-27, s25(2)): allowances are deducted "in the way which will result in
 *   the greatest reduction" in liability. Every priority order is evaluated and the lowest total wins;
 *   ties go to non-savings first. Only priority-order ("corner") splits are evaluated; a brute-force
 *   test over fractional splits on a grid of mixed incomes found no cheaper split (U13).
 * - 'non-savings-first' (from 2027-28, s25(3A)): non-savings, then savings, then dividends.
 */
export function calculateIncomeTax(input: IncomeTaxInput): IncomeTaxResult {
  if (input.rules.allowanceAllocation === 'non-savings-first') return calculateWithOrder(input, ALL_ORDERS[0] as IncomeComponent[]);
  let best: IncomeTaxResult | null = null;
  for (const order of ALL_ORDERS) {
    const r = calculateWithOrder(input, order);
    if (best === null || r.total < best.total) best = r;
  }
  return best as IncomeTaxResult;
}

/** Income Tax with the personal allowance set against components in the given priority order. */
export function calculateWithOrder(input: IncomeTaxInput, order: IncomeComponent[]): IncomeTaxResult {
  const pa = personalAllowance(input.adjustedNetIncome, input.rules);
  const amounts: Record<IncomeComponent, number> = {
    'non-savings': nonNeg(input.nonSavingsIncome),
    savings: nonNeg(input.savingsIncome),
    dividends: nonNeg(input.dividendIncome),
  };
  const used: Record<IncomeComponent, number> = { 'non-savings': 0, savings: 0, dividends: 0 };
  let left = pa;
  for (const c of order) {
    used[c] = Math.min(left, amounts[c]);
    left -= used[c];
  }
  return calculateWithAllocation(input, used, order);
}

/**
 * Income Tax for an explicit split of the personal allowance between components. Exported so
 * tests can brute-force every split and check that the s25(2) search finds the lowest liability.
 * The split must not exceed the allowance or any component.
 */
export function calculateWithAllocation(
  input: IncomeTaxInput,
  used: Record<IncomeComponent, number>,
  order: IncomeComponent[] = ['non-savings', 'savings', 'dividends'],
): IncomeTaxResult {
  const { rules, jurisdiction } = input;
  const ns = nonNeg(input.nonSavingsIncome);
  const sav = nonNeg(input.savingsIncome);
  const div = nonNeg(input.dividendIncome);
  const ext = nonNeg(input.bandExtension);
  const pa = personalAllowance(input.adjustedNetIncome, rules);
  const paNs = used['non-savings'];
  const paSav = used.savings;
  const paDiv = used.dividends;
  if (paNs < 0 || paSav < 0 || paDiv < 0 || paNs > ns || paSav > sav || paDiv > div || paNs + paSav + paDiv > pa) {
    throw new RangeError('Invalid personal allowance split.');
  }

  const tNs = ns - paNs;
  const tSav = sav - paSav;
  const tDiv = div - paDiv;
  const totalTaxable = tNs + tSav + tDiv;

  const bandSet = jurisdiction === 'scotland' ? rules.incomeTax.scotland : rules.incomeTax.rUK;
  const nsSlices = sliceAgainst(0, tNs, extendBands(bandSet.bands, bandSet.extensionStartIndex, ext), 'non-savings');

  // UK-wide limits for savings and dividends.
  const ukBasic = rules.incomeTax.ukBasicRateLimit + ext;
  const ukHigher = rules.incomeTax.ukHigherRateLimit + ext;

  // Savings
  const s = rules.incomeTax.savings;
  const savSlices: TaxSlice[] = [];
  let pos = tNs;
  let remainingSav = tSav;
  if (remainingSav > 0) {
    const startingAvail = nonNeg(s.startingRateBand - tNs);
    const starting = Math.min(remainingSav, startingAvail);
    if (starting > 0) {
      savSlices.push({ incomeType: 'savings', label: 'Starting rate for savings', rate: s.startingRate, amount: starting, tax: applyRate(starting, s.startingRate) });
      pos += starting;
      remainingSav -= starting;
    }
    const psa =
      totalTaxable > ukHigher
        ? s.personalSavingsAllowance.additional
        : totalTaxable > ukBasic
          ? s.personalSavingsAllowance.higher
          : s.personalSavingsAllowance.basic;
    const nil = Math.min(remainingSav, psa);
    if (nil > 0) {
      savSlices.push({ incomeType: 'savings', label: 'Personal savings allowance', rate: 0, amount: nil, tax: 0 });
      pos += nil;
      remainingSav -= nil;
    }
    savSlices.push(
      ...sliceAgainst(
        pos,
        remainingSav,
        [
          { upTo: ukBasic, rate: s.basicRate, label: 'Savings basic rate' },
          { upTo: ukHigher, rate: s.higherRate, label: 'Savings higher rate' },
          { upTo: null, rate: s.additionalRate, label: 'Savings additional rate' },
        ],
        'savings',
      ),
    );
    pos += remainingSav;
  }

  // Dividends
  const d = rules.incomeTax.dividends;
  const divSlices: TaxSlice[] = [];
  let remainingDiv = tDiv;
  if (remainingDiv > 0) {
    const nil = Math.min(remainingDiv, d.allowance);
    if (nil > 0) {
      divSlices.push({ incomeType: 'dividends', label: 'Dividend allowance', rate: 0, amount: nil, tax: 0 });
      pos += nil;
      remainingDiv -= nil;
    }
    divSlices.push(
      ...sliceAgainst(
        pos,
        remainingDiv,
        [
          { upTo: ukBasic, rate: d.basicRate, label: 'Dividend ordinary rate' },
          { upTo: ukHigher, rate: d.higherRate, label: 'Dividend upper rate' },
          { upTo: null, rate: d.additionalRate, label: 'Dividend additional rate' },
        ],
        'dividends',
      ),
    );
  }

  const sum = (xs: TaxSlice[]) => xs.reduce((a, x) => a + x.tax, 0);
  const nonSavingsTax = sum(nsSlices);
  const savingsTax = sum(savSlices);
  const dividendTax = sum(divSlices);

  return {
    allowanceOrder: order,
    personalAllowance: pa,
    personalAllowanceUsed: paNs + paSav + paDiv,
    taxableNonSavings: tNs,
    taxableSavings: tSav,
    taxableDividends: tDiv,
    totalTaxableIncome: totalTaxable,
    bandExtension: ext,
    slices: [...nsSlices, ...savSlices, ...divSlices],
    nonSavingsTax,
    savingsTax,
    dividendTax,
    total: nonSavingsTax + savingsTax + dividendTax,
  };
}
