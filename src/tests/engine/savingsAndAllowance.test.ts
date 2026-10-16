/**
 * Audit leads C (personal savings allowance), D (starting rate for savings) and A (annual allowance).
 * All expected values hand-worked from statute (ITA 2007 s12, s12B; FA 2004 s228ZA, s233); see
 * docs/REFERENCE_CASES.md "Audit cases".
 */
import { calculateScenario, type CalculatorInputs, type PensionMethod } from '../../engine';
import { inputs, p, salaryOnly } from '../helpers';

const run = (i: CalculatorInputs, method: PensionMethod | null = null, gross = 0) =>
  calculateScenario(i, { label: 't', method, additionalGross: p(gross) });
const withSavings = (salary: number, savings: number, extra: Parameters<typeof salaryOnly>[1] = {}) =>
  salaryOnly(salary, { ...extra, income: { savingsInterest: p(savings), ...(extra?.income ?? {}) } });

describe('C. personal savings allowance band (ITA 2007 s12B)', () => {
  it.each([
    // [label, inputs, method, gross, expected savings tax]
    ['£49,270 + £1,000 interest: all within basic band → PSA £1,000', withSavings(49_270, 1_000), null, 0, 0],
    ['£49,271 + £1,000: £1 above basic limit → PSA £500; 499 × 20% + 1 × 40%', withSavings(49_271, 1_000), null, 0, 100.2],
    ['£49,271 + £1,000 + £1,000 SIPP gross: basic limit extended → PSA £1,000', withSavings(49_271, 1_000), 'ras-sipp', 1_000, 0],
    ['£110,000 + £1,000 (tapered PA £7,070): PSA £500; 500 × 40%', withSavings(110_000, 1_000), null, 0, 200],
    ['£124,139 + £1,000: total taxable £125,138 → PSA £500; 500 × 40%', withSavings(124_139, 1_000), null, 0, 200],
    ['£124,141 + £1,000: £1 above additional threshold → PSA £0; 999 × 40% + 1 × 45%', withSavings(124_141, 1_000), null, 0, 400.05],
    ['£125,000 + £1,000: PSA £0; 140 × 40% + 860 × 45%', withSavings(125_000, 1_000), null, 0, 443],
  ] as [string, CalculatorInputs, PensionMethod | null, number, number][])('%s', (_l, i, m, g, expected) => {
    expect(run(i, m, g).incomeTax.savingsTax).toBe(p(expected));
  });

  it('Gift Aid extends the basic limit for the PSA test too (£800 paid = £1,000 gross)', () => {
    expect(run(withSavings(49_271, 1_000, { giftAidNet: p(800) })).incomeTax.savingsTax).toBe(0);
  });

  it('dividends inside the dividend allowance above the basic limit still make you "higher-rate" (s12B(8))', () => {
    // £49,000 salary → taxable NS 36,430; savings 1,000; dividends 300 → total 37,730 > 37,700.
    // The top £30 is dividend-nil-rate income that would otherwise be at the upper rate → PSA £500.
    // Savings: £500 nil, £500 × 20% = £100.
    const s = run(salaryOnly(49_000, { income: { savingsInterest: p(1_000), dividends: p(300) } }));
    expect(s.incomeTax.savingsTax).toBe(p(100));
    expect(s.incomeTax.dividendTax).toBe(0);
  });

  it('Scottish taxpayer: PSA set by UK bands, not Scottish (s12B(8)) — £45,000 + £1,000 → PSA £1,000', () => {
    // Taxable NS £32,430 is in the Scottish higher band but below the UK basic limit £37,700.
    expect(run(withSavings(45_000, 1_000, { jurisdiction: 'scotland' })).incomeTax.savingsTax).toBe(0);
  });

  it('Scottish taxpayer at the UK boundary behaves like rUK (£49,271 + £1,000 → £100.20)', () => {
    expect(run(withSavings(49_271, 1_000, { jurisdiction: 'scotland' })).incomeTax.savingsTax).toBe(p(100.2));
  });
});

describe('D. starting rate for savings (ITA 2007 s12)', () => {
  it.each([
    ['£17,569 + £2,000: £1 of starting band left; PSA £1,000; 999 × 20%', 17_569, 199.8],
    ['£17,570 + £2,000: taxable NS = £5,000 → no starting band; 1,000 × 20%', 17_570, 200],
    ['£17,571 + £2,000: no starting band', 17_571, 200],
  ])('%s', (_l, salary, expected) => {
    expect(run(withSavings(salary, 2_000)).incomeTax.savingsTax).toBe(p(expected));
  });

  it('dividends do not reduce the starting band (they are taxed after savings)', () => {
    // £14,000 salary: taxable NS 1,430 (tax £286); starting band 3,570 covers £3,000 savings;
    // dividends £10,000: £500 allowance, £9,500 × 10.75% = £1,021.25
    const s = run(salaryOnly(14_000, { income: { savingsInterest: p(3_000), dividends: p(10_000) } }));
    expect(s.incomeTax.nonSavingsTax).toBe(p(286));
    expect(s.incomeTax.savingsTax).toBe(0);
    expect(s.incomeTax.dividendTax).toBe(p(1_021.25));
  });

  it('band extension does not extend the starting rate limit', () => {
    // As S2 (£14,000 + £6,000 interest → £286) with a £1,000 gross SIPP: still £286.
    expect(run(withSavings(14_000, 6_000), 'ras-sipp', 1_000).incomeTax.savingsTax).toBe(p(286));
  });
});

describe('A. annual allowance — pension input across every contribution type (FA 2004 s233)', () => {
  const employer = (amount: number) => ({ existingPension: { employerMode: 'fixed' as const, employerAmount: p(amount) } });
  it.each([
    ['relief at source £10,000 gross + employer £5,000', salaryOnly(100_000, employer(5_000)), 'ras-sipp', 10_000, 15_000],
    ['salary sacrifice £10,000 + employer £3,000', salaryOnly(100_000, employer(3_000)), 'salary-sacrifice', 10_000, 13_000],
    ['net pay £8,000 + employer £4,000', salaryOnly(100_000, employer(4_000)), 'net-pay', 8_000, 12_000],
    ['workplace RAS £6,000 gross', salaryOnly(100_000), 'ras-workplace', 6_000, 6_000],
  ] as [string, CalculatorInputs, PensionMethod, number, number][])('%s → PIA £%#', (_l, i, m, g, pia) => {
    expect(run(i, m, g).annualAllowance.pensionInputDc).toBe(p(pia));
  });

  it('DB input is added separately: DB £20,000 + sacrifice £45,000 → total £65,000, excess £5,000', () => {
    const i = salaryOnly(150_000, { pensionAllowance: { definedBenefitMember: true, definedBenefitPensionInput: p(20_000) } });
    const aa = run(i, 'salary-sacrifice', 45_000).annualAllowance;
    expect(aa.pensionInputTotal).toBe(p(65_000));
    expect(aa.excess).toBe(p(5_000));
    expect(aa.verified).toBe(false); // DB member contributions unknown
  });

  it('MPAA: DC £12,000 → excess £2,000; plus DB £52,000 against alternative £50,000 → £4,000', () => {
    const mpaa = { pensionAllowance: { mpaaTriggered: 'yes' as const } };
    expect(run(salaryOnly(100_000, { ...employer(12_000), ...mpaa })).annualAllowance.excess).toBe(p(2_000));
    const withDb = salaryOnly(100_000, { ...employer(12_000), pensionAllowance: { mpaaTriggered: 'yes', definedBenefitMember: true, definedBenefitPensionInput: p(52_000) } });
    expect(run(withDb).annualAllowance.excess).toBe(p(4_000));
  });

  it.each([
    [59_999.99, 0],
    [60_000, 0],
    [60_000.01, 0.01],
  ])('salary sacrifice £%d at £150,000 → excess £%d', (g, excess) => {
    expect(run(salaryOnly(150_000), 'salary-sacrifice', g).annualAllowance.excess).toBe(p(excess));
  });

  it.each([
    [10_000, 0],
    [9_999.99, 0.01],
  ])('£70,000 sacrifice with verified carry-forward £%d → excess £%d', (cf, excess) => {
    const i = salaryOnly(200_000, { pensionAllowance: { carryForward: p(cf) } });
    expect(run(i, 'salary-sacrifice', 70_000).annualAllowance.excess).toBe(p(excess));
  });

  it('charge estimate: £150,000, £70,000 sacrifice → £10,000 excess on £80,000 income at 40% = £4,000', () => {
    expect(run(salaryOnly(150_000), 'salary-sacrifice', 70_000).annualAllowance.estimatedCharge).toBe(p(4_000));
  });

  it('threshold and adjusted income follow FA 2004 s228ZA (Gift Aid not deducted)', () => {
    // Salary £300,000; £20,000 sacrifice; £10,000 SIPP gross; £5,000 Gift Aid paid; employer £10,000.
    // Net income = 280,000. Threshold = 280,000 + 20,000 − 10,000 = 290,000.
    // Adjusted = 280,000 + 0 net pay + 20,000 + 10,000 = 310,000 → allowance 60,000 − 25,000 = 35,000.
    const i = salaryOnly(300_000, { giftAidNet: p(5_000), existingPension: { method: 'ras-sipp', basis: 'gross', mode: 'fixed', amount: p(10_000), employerMode: 'fixed', employerAmount: p(10_000) } });
    const aa = run(i, 'salary-sacrifice', 20_000).annualAllowance;
    expect(aa.thresholdIncome).toBe(p(290_000));
    expect(aa.adjustedIncome).toBe(p(310_000));
    expect(aa.allowanceAfterTaper).toBe(p(35_000));
  });

  it('no contribution is counted twice: sacrifice + net pay + RAS + employer + other schemes', () => {
    const i = inputs({
      income: { salary: p(120_000) },
      existingPension: { method: 'net-pay', basis: 'gross', mode: 'fixed', amount: p(4_000), employerMode: 'fixed', employerAmount: p(6_000) },
      pensionAllowance: { otherPersonalRasGross: p(2_000), otherEmployerContributions: p(1_000) },
    });
    // 4,000 net pay + 6,000 employer + 2,000 other RAS + 1,000 other employer + 7,000 additional sacrifice
    expect(run(i, 'salary-sacrifice', 7_000).annualAllowance.pensionInputDc).toBe(p(20_000));
  });
});
