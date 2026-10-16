import { employeeNi, employerNi } from '../../engine';
import { R26, p } from '../helpers';

describe('employee Class 1 NI, category A, annualised (2026/27)', () => {
  const cases: [string, number, number][] = [
    ['below primary threshold', 12_000, 0],
    ['at primary threshold', 12_570, 0],
    ['£1 above primary threshold', 12_571, 0.08],
    ['between PT and UEL', 30_000, 1_394.4], // 17,430 × 8%
    ['at UEL', 50_270, 3_016], // 37,700 × 8%
    ['£1 above UEL', 50_271, 3_016.02],
    ['above UEL', 60_000, 3_210.6], // 3,016 + 9,730 × 2%
    ['high earner', 110_000, 4_210.6], // 3,016 + 59,730 × 2%
  ];
  it.each(cases)('%s (£%d) → £%d', (_l, earnings, ni) => {
    expect(employeeNi(p(earnings), R26).total).toBe(p(ni));
  });

  it('splits main and upper bands', () => {
    const r = employeeNi(p(60_000), R26);
    expect(r.mainBandNi).toBe(p(3_016));
    expect(r.upperBandNi).toBe(p(194.6));
  });

  it('employer NI uses the secondary threshold and 15%', () => {
    expect(employerNi(p(5_000), R26)).toBe(0);
    expect(employerNi(p(105_000), R26)).toBe(p(15_000));
  });
});
