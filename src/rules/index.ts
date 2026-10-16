import { TAX_YEAR_2025_26 } from './taxYear2025_26';
import { TAX_YEAR_2026_27 } from './taxYear2026_27';
import type { TaxYearId, TaxYearRules } from './types';

export * from './types';
export { SOURCES } from './sources';

export const TAX_YEARS: Record<TaxYearId, TaxYearRules> = {
  '2025-26': TAX_YEAR_2025_26,
  '2026-27': TAX_YEAR_2026_27,
};

export const DEFAULT_TAX_YEAR: TaxYearId = '2026-27';

export const SUPPORTED_TAX_YEARS: TaxYearId[] = ['2026-27', '2025-26'];

export function getRules(id: string): TaxYearRules | undefined {
  return (TAX_YEARS as Record<string, TaxYearRules | undefined>)[id];
}
