import { personalAllowance } from '../../engine';
import { R26, p } from '../helpers';

describe('personal allowance taper (2026/27)', () => {
  const cases: [number, number][] = [
    [0, 12_570],
    [99_999, 12_570],
    [100_000, 12_570],
    // £1 is lost for each complete £2 over £100,000, so £100,001 does not yet reduce the allowance.
    [100_001, 12_570],
    [100_002, 12_569],
    [110_000, 7_570],
    [125_139, 1],
    [125_140, 0],
    [125_141, 0],
    [200_000, 0],
  ];
  it.each(cases)('ANI £%d → PA £%d', (ani, pa) => {
    expect(personalAllowance(p(ani), R26)).toBe(p(pa));
  });

  it('ignores pence when testing the threshold', () => {
    expect(personalAllowance(p(100_001.99), R26)).toBe(p(12_570));
  });
});
