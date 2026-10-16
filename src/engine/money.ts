import type { Pence } from './types';

/** Round a (possibly fractional) pence value to the nearest whole penny. */
export const roundPence = (p: number): Pence => Math.round(p);

/** Round down to the whole penny (used where payroll/statute rounds down). */
export const floorPence = (p: number): Pence => Math.floor(p + 1e-9);

export const toPence = (pounds: number): Pence => Math.round(pounds * 100);

export const toPounds = (pence: Pence): number => pence / 100;

export const nonNeg = (n: number): number => (n > 0 ? n : 0);

export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
