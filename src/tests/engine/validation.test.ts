import { calculateScenario, validateInputs, validateRules } from '../../engine';
import { TAX_YEARS, VERIFICATION_2026_27 } from '../../rules';
import { R26, p, salaryOnly } from '../helpers';

const clone = <T,>(x: T): T => structuredClone(x);

describe('rule-set validation', () => {
  it('shipped rules are valid', () => {
    for (const r of Object.values(TAX_YEARS)) expect(validateRules(r)).toEqual([]);
  });
  it('rejects a relief-at-source rate outside (0,1) or different from the basic rate', () => {
    const r = clone(R26);
    r.pensions.reliefAtSourceBasicRate = 1.2;
    expect(validateRules(r).join()).toMatch(/relief-at-source rate/);
    r.pensions.reliefAtSourceBasicRate = 0.25;
    expect(validateRules(r).join()).toMatch(/must equal the UK basic rate/);
  });
  it('rejects a Gift Aid gross-up rate different from the basic rate', () => {
    const r = clone(R26);
    r.giftAid.basicRate = 0.25;
    expect(validateRules(r).join()).toMatch(/Gift Aid/);
  });
  it('rejects non-increasing band limits and rates above 100%', () => {
    const r = clone(R26);
    const b = r.incomeTax.scotland.bands;
    if (b[2]) b[2].upTo = p(1_000);
    if (b[5]) b[5].rate = 1.5;
    const problems = validateRules(r).join();
    expect(problems).toMatch(/intermediate limit/);
    expect(problems).toMatch(/top rate/);
  });
});

describe('input validation', () => {
  it('valid inputs pass', () => expect(validateInputs(salaryOnly(50_000))).toEqual([]));
  it.each([
    ['negative money', salaryOnly(50_000, { income: { bonus: -100 } })],
    ['fractional pence', salaryOnly(50_000, { giftAidNet: 10.5 })],
    ['percent > 100', salaryOnly(50_000, { existingPension: { percent: 101 } })],
    ['NI share > 100', salaryOnly(50_000, { additional: { employerNiPassThroughPercent: 150 } })],
    ['zero target', salaryOnly(50_000, { targetAni: 0 })],
    ['infinite', salaryOnly(50_000, { childBenefitAnnual: Number.POSITIVE_INFINITY })],
  ])('%s is rejected and the engine refuses to calculate', (_l, i) => {
    expect(validateInputs(i).length).toBeGreaterThan(0);
    expect(() => calculateScenario(i, { label: 'x', method: null, additionalGross: 0 })).toThrow(/Inputs failed validation/);
  });
});

describe('unsupported relief claims are flagged', () => {
  const warn = (i: Parameters<typeof calculateScenario>[0], m: Parameters<typeof calculateScenario>[1]['method'], g: number) =>
    calculateScenario(i, { label: 'x', method: m, additionalGross: p(g) }).warnings.map((w) => w.id);

  it('Gift Aid more than 4× Income Tax: £20,000 salary, tax £1,486', () => {
    // 25% of £5,944 = £1,486 = tax → no warning; £8,000 → £2,000 > £1,486 → warning
    expect(warn(salaryOnly(20_000, { giftAidNet: p(5_944) }), null, 0)).not.toContain('gift-aid-exceeds-tax');
    expect(warn(salaryOnly(20_000, { giftAidNet: p(5_944.04) }), null, 0)).toContain('gift-aid-exceeds-tax');
    expect(warn(salaryOnly(20_000, { giftAidNet: p(8_000) }), null, 0)).toContain('gift-aid-exceeds-tax');
  });
  it('relief at source above taxable earnings', () => expect(warn(salaryOnly(20_000), 'ras-sipp', 25_000)).toContain('ras-exceeds-relief-limit'));
  it('relief at source up to £3,600 gross with no earnings is allowed', () => expect(warn(salaryOnly(0), 'ras-sipp', 3_600)).not.toContain('ras-exceeds-relief-limit'));
  it('relief at source above £3,600 gross with no earnings is flagged', () => expect(warn(salaryOnly(0), 'ras-sipp', 3_601)).toContain('ras-exceeds-relief-limit'));
  it('salary sacrifice above pay', () => expect(warn(salaryOnly(20_000), 'salary-sacrifice', 25_000)).toContain('sacrifice-exceeds-pay'));
  it('net pay above pay', () => expect(warn(salaryOnly(20_000), 'net-pay', 25_000)).toContain('netpay-exceeds-pay'));
});

describe('verification register', () => {
  it('every official rule cites at least one gov.uk, gov.scot or legislation.gov.uk page', () => {
    for (const r of VERIFICATION_2026_27.filter((x) => x.level === 'official')) {
      expect(r.sources.length, r.rule).toBeGreaterThan(0);
      expect(r.sources.some((u) => /^https:\/\/www\.(gov\.uk|gov\.scot|legislation\.gov\.uk)\//.test(u)), r.rule).toBe(true);
    }
  });
  it('register values come from the live rules (Scottish bands)', () => {
    const scot = VERIFICATION_2026_27.filter((r) => r.area === 'Income Tax — Scotland' && r.rule.includes('(taxable income)')).map((r) => r.value);
    expect(scot).toEqual([
      '£0–£3,967 at 19%',
      '£3,968–£16,956 at 20%',
      '£16,957–£31,092 at 21%',
      '£31,093–£62,430 at 42%',
      '£62,431–£125,140 at 45%',
      'over £125,140 at 48%',
    ]);
  });
  it('non-official items carry a note or are conventions', () => {
    for (const r of VERIFICATION_2026_27.filter((x) => x.level !== 'official')) expect(r.note ?? r.level, r.rule).toBeTruthy();
  });
});
