import type { Pence } from './types';

/** Round a (possibly fractional) pence value to the nearest whole penny. */
export const roundPence = (p: number): Pence => Math.round(p);

/** Round down to the whole penny (used where payroll/statute rounds down). */
export const floorPence = (p: number): Pence => Math.floor(p + 1e-9);

export const toPence = (pounds: number): Pence => Math.round(pounds * 100);

export const toPounds = (pence: Pence): number => pence / 100;

export const nonNeg = (n: number): number => (n > 0 ? n : 0);

export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Plain-text money for warning messages: whole pounds when exact, otherwise two decimals. */
export function moneyText(pence: Pence): string {
  const d = pence % 100 === 0 ? 0 : 2;
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

/**
 * Exact `amount × rate` in pence, rounded half-up to the penny, using integer basis points so a
 * half-penny tie can never be mis-rounded by floating-point error (e.g. £30,848.90 × 45%).
 * Rates must be whole basis points (0.01%), which every UK rate in the rule files is.
 */
export function applyRate(amount: Pence, rate: number): Pence {
  const bp = Math.round(rate * 10_000);
  if (Math.abs(rate * 10_000 - bp) > 1e-6) throw new RangeError(`Rate ${rate} is not a whole number of basis points.`);
  const n = amount * bp; // exact: amount < 2^40, bp ≤ 10,000
  return Math.floor((n + 5_000) / 10_000);
}

/** Exact `amount × rate`, rounded DOWN to the penny (student loans, HICBC). */
export function applyRateDown(amount: Pence, rate: number): Pence {
  const bp = Math.round(rate * 10_000);
  if (Math.abs(rate * 10_000 - bp) > 1e-6) throw new RangeError(`Rate ${rate} is not a whole number of basis points.`);
  return Math.floor((amount * bp) / 10_000);
}
