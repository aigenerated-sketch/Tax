import type { Pence } from '../engine/types';

const gbp2 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const gbp0 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Format pence as UK currency. Headline figures use whole pounds; detail tables use pence. */
export function formatGBP(pence: Pence, opts: { decimals?: 0 | 2; signed?: boolean } = {}): string {
  const f = opts.decimals === 0 ? gbp0 : gbp2;
  const value = opts.decimals === 0 ? Math.round(pence / 100) : pence / 100;
  const s = f.format(Math.abs(value));
  if (value < 0) return `−${s}`;
  if (opts.signed && value > 0) return `+${s}`;
  return s;
}

export function formatPercent(rate: number, decimals = 1): string {
  const v = rate * 100;
  const rounded = Number(v.toFixed(decimals));
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(decimals)}%`;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
