import type { Jurisdiction } from '../engine/types';

const NAMES: Record<Jurisdiction, string> = {
  england: 'England',
  wales: 'Wales',
  'northern-ireland': 'Northern Ireland',
  scotland: 'Scotland',
};

export const jurisdictionName = (j: Jurisdiction) => NAMES[j];

/** One-line description of which rules apply, shown wherever results appear. */
export function jurisdictionBasis(j: Jurisdiction): string {
  return j === 'scotland'
    ? 'Scottish Income Tax rates and bands apply to earnings and other non-savings income. Savings and dividends use UK-wide rates. National Insurance is UK-wide.'
    : `${NAMES[j]} uses the UK (England, Wales and Northern Ireland) Income Tax rates and bands. National Insurance is UK-wide.`;
}
