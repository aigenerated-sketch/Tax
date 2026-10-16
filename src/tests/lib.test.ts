import { calculateAll, calculateScenario } from '../engine';
import { chartSegments } from '../lib/chartData';
import { formatGBP, formatPercent } from '../lib/format';
import { defaultFormState, parseForm, parseMoney } from '../lib/form';
import { p, salaryOnly } from './helpers';

describe('money parsing and validation', () => {
  it.each([
    ['110000', 11_000_000],
    ['£110,000', 11_000_000],
    ['12,345.67', 1_234_567],
    ['', 0],
  ])('%s → %d pence', (raw, pence) => {
    const r = parseMoney(raw);
    expect(r.ok && r.pence).toBe(pence);
  });
  it.each(['-5', 'abc', '1.234', '1e5', '200000000'])('rejects %s', (raw) => {
    expect(parseMoney(raw).ok).toBe(false);
  });
  it('requires a salary', () => {
    expect(parseForm(defaultFormState()).errors.salary).toMatch(/required/);
  });
  it('rejects invalid percentages', () => {
    const f = { ...defaultFormState(), salary: '50000', existingMethod: 'net-pay' as const, existingPercent: '150' };
    expect(parseForm(f).errors.existingPercent).toMatch(/between 0 and 100/);
  });
  it('requires a method when an existing contribution is entered', () => {
    const f = { ...defaultFormState(), salary: '50000', existingPercent: '5' };
    expect(parseForm(f).errors.existingMethod).toBeTruthy();
  });
  it('returns no inputs when anything is invalid', () => {
    expect(parseForm({ ...defaultFormState(), salary: '50000', bonus: '-1' }).inputs).toBeNull();
  });
  it('a valid form produces engine inputs in pence', () => {
    const r = parseForm({ ...defaultFormState(), salary: '110000', additionalGross: '10000' });
    expect(r.inputs?.income.salary).toBe(p(110_000));
    expect(r.inputs?.additional.grossAmount).toBe(p(10_000));
  });
});

describe('formatting', () => {
  it('formats currency', () => {
    expect(formatGBP(p(1234.5))).toBe('£1,234.50');
    expect(formatGBP(p(-3800), { decimals: 0 })).toBe('−£3,800');
    expect(formatGBP(p(5), { signed: true })).toBe('+£5.00');
  });
  it('formats percentages', () => {
    expect(formatPercent(0.62)).toBe('62%');
    expect(formatPercent(0.675)).toBe('67.5%');
  });
});

describe('chart data matches the scenario figures', () => {
  for (const method of [null, 'salary-sacrifice', 'net-pay', 'ras-sipp'] as const) {
    it(`${method ?? 'baseline'}`, () => {
      const i = salaryOnly(110_000, { existingPension: { employerMode: 'fixed', employerAmount: p(5_000) } });
      const s = calculateScenario(i, { label: 'x', method, additionalGross: p(10_000) });
      const seg = Object.fromEntries(chartSegments(s).map((x) => [x.key, x.value]));
      expect(seg.takeHome).toBe(s.takeHome);
      expect(seg.incomeTax).toBe(s.incomeTax.total);
      expect(seg.employeeNi).toBe(s.employeeNi.total);
      expect(seg.employerPension).toBe(s.employerContribution);
      const total = Object.values(seg).reduce((a, b) => a + b, 0);
      expect(total).toBe(s.contractualPay + s.pension.rasPersonalGross + s.pension.rasWorkplaceGross - s.rasCashPaid + s.employerContribution);
    });
  }
  it('uses the same scenario objects as calculateAll', () => {
    const out = calculateAll(salaryOnly(110_000));
    expect(chartSegments(out.proposed)[0]?.value).toBe(out.proposed.takeHome);
  });
});
