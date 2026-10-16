import { calculateAll, calculateScenario, PENSION_METHODS, type CalculatorInputs } from '../../engine';
import { inputs, p } from '../helpers';

const profiles: [string, CalculatorInputs][] = [
  ['£95k + £10k bonus', inputs({ income: { salary: p(95_000), bonus: p(10_000) } })],
  ['£110k England', inputs({ income: { salary: p(110_000) } })],
  ['£110k Scotland', inputs({ jurisdiction: 'scotland', income: { salary: p(110_000) } })],
  [
    'mixed income, existing pension, student loan, gift aid',
    inputs({
      jurisdiction: 'wales',
      income: { salary: p(98_000), bonus: p(7_500), taxableBenefits: p(1_200), propertyIncome: p(4_000), savingsInterest: p(1_500), dividends: p(3_000) },
      existingPension: { method: 'net-pay', basis: 'employee-before-relief', mode: 'percent', percent: 6, employerMode: 'percent', employerPercent: 8 },
      studentLoan: { plan: 'plan2', postgraduate: true },
      giftAidNet: p(400),
      childBenefitAnnual: p(1_400),
    }),
  ],
];

describe.each(profiles)('reconciliation: %s', (_label, i) => {
  for (const method of [null, ...PENSION_METHODS]) {
    it(`${method ?? 'baseline'}: take-home reconciles to deductions; taxable income reconciles`, () => {
      const s = calculateScenario(i, { label: 'x', method, additionalGross: p(7_777.77) });
      const inc = i.income;
      const cash = s.cashPayAfterSacrifice + inc.propertyIncome + inc.otherNonSavingsIncome + inc.savingsInterest + inc.dividends;
      expect(s.grossCashIncome).toBe(cash);
      expect(s.takeHome).toBe(cash - s.pension.netPay - s.rasCashPaid - s.incomeTax.total - s.employeeNi.total - s.studentLoan.total);
      expect(s.incomeTax.totalTaxableIncome + s.incomeTax.personalAllowanceUsed).toBe(s.totalIncome);
      expect(s.incomeTax.slices.reduce((a, x) => a + x.amount, 0)).toBe(s.incomeTax.totalTaxableIncome);
      expect(s.incomeTax.slices.reduce((a, x) => a + x.tax, 0)).toBe(s.incomeTax.total);
      expect(s.totalPensionInvestment).toBe(s.employeeFundedGross + s.employerContribution);
    });
  }

  it('before/after difference equals the difference of the scenarios', () => {
    const out = calculateAll({ ...i, additional: { ...i.additional, grossAmount: p(5_000) } });
    expect(out.change.takeHome).toBe(out.proposed.takeHome - out.baseline.takeHome);
    expect(out.change.incomeTax).toBe(out.proposed.incomeTax.total - out.baseline.incomeTax.total);
    expect(out.change.employeeNi).toBe(out.proposed.employeeNi.total - out.baseline.employeeNi.total);
  });

  it('is deterministic', () => {
    expect(calculateAll(i)).toEqual(calculateAll(structuredClone(i)));
  });

  it('does not mutate its inputs', () => {
    const copy = structuredClone(i);
    calculateAll({ ...i, additional: { ...i.additional, grossAmount: p(12_345) } });
    expect(i).toEqual(copy);
  });
});

describe('tax year and jurisdiction switches change results', () => {
  const i = inputs({ jurisdiction: 'scotland', income: { salary: p(30_000), dividends: p(2_000) } });
  it('Scottish result differs between 2025/26 and 2026/27', () => {
    const a = calculateAll(i).baseline.incomeTax.total;
    const b = calculateAll({ ...i, taxYear: '2025-26' }).baseline.incomeTax.total;
    expect(a).not.toBe(b);
  });
  it('Scotland differs from England at the same income', () => {
    const a = calculateAll(i).baseline.incomeTax.nonSavingsTax;
    const b = calculateAll({ ...i, jurisdiction: 'england' }).baseline.incomeTax.nonSavingsTax;
    expect(a).not.toBe(b);
  });
  it('unknown tax year throws a clear error', () => {
    expect(() => calculateAll({ ...i, taxYear: '2030-31' as never })).toThrow(/not available/);
  });
});
