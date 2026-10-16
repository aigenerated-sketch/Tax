import { emptyInputs, type CalculatorInputs } from '../engine';
import { TAX_YEARS } from '../rules';

export const R26 = TAX_YEARS['2026-27'];
export const R25 = TAX_YEARS['2025-26'];

/** £ → pence */
export const p = (pounds: number) => Math.round(pounds * 100);

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object | null ? DeepPartial<T[K]> | T[K] : T[K] };

export function inputs(overrides: DeepPartial<CalculatorInputs> = {}): CalculatorInputs {
  const base = emptyInputs();
  const merge = (a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = { ...a };
    for (const [k, v] of Object.entries(b)) {
      const av = a[k];
      out[k] = v && typeof v === 'object' && !Array.isArray(v) && av && typeof av === 'object' ? merge(av as Record<string, unknown>, v as Record<string, unknown>) : v;
    }
    return out;
  };
  return merge(base as unknown as Record<string, unknown>, overrides as Record<string, unknown>) as unknown as CalculatorInputs;
}

export const salaryOnly = (salary: number, extra: DeepPartial<CalculatorInputs> = {}) =>
  inputs({ ...extra, income: { salary: p(salary), ...(extra.income ?? {}) } });
