import type { Jurisdiction, TaxBand, TaxYearRules } from '../rules/types';
import { nonNeg, roundPence } from './money';
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

interface Segment {
  /** Upper limit of this segment in taxable-income terms; null = unlimited. */
  upTo: Pence | null;
  rate: number;
  label: string;
}

/** Tax `amount` of income sitting on top of `start` against an ordered list of segments. */
function sliceAgainst(
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
        out.push({ incomeType, label: seg.label, rate: seg.rate, amount: take, tax: roundPence(take * seg.rate) });
        pos = from + take;
        remaining -= take;
      }
    }
    lower = upper;
  }
  return out;
}

function extendBands(bands: TaxBand[], startIndex: number, extension: Pence): Segment[] {
  return bands.map((b, i) => ({
    label: b.label,
    rate: b.rate,
    upTo: b.upTo === null ? null : i >= startIndex ? b.upTo + extension : b.upTo,
  }));
}

/**
 * Income Tax for one individual for one tax year.
 *
 * Ordering: non-savings, then savings, then dividends. The personal allowance is set
 * against non-savings income first (applied exactly once). Non-savings income uses the
 * jurisdiction's bands; savings and dividends always use UK-wide bands and rates, with
 * non-savings income occupying the UK bands first.
 */
export function calculateIncomeTax(input: IncomeTaxInput): IncomeTaxResult {
  const { rules, jurisdiction } = input;
  const ns = nonNeg(input.nonSavingsIncome);
  const sav = nonNeg(input.savingsIncome);
  const div = nonNeg(input.dividendIncome);
  const ext = nonNeg(input.bandExtension);

  const pa = personalAllowance(input.adjustedNetIncome, rules);
  const paNs = Math.min(pa, ns);
  const paSav = Math.min(pa - paNs, sav);
  const paDiv = Math.min(pa - paNs - paSav, div);

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
      savSlices.push({ incomeType: 'savings', label: 'Starting rate for savings', rate: s.startingRate, amount: starting, tax: roundPence(starting * s.startingRate) });
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
