/**
 * Review follow-up (after 622f63c). Expected values hand-worked from:
 *  - PTM056110 / PTM056120: the annual allowance charge is found by adding the excess to "reduced net
 *    income" — taxable income AFTER the personal allowance (ITA 2007 s23 Step 3, so including savings
 *    and dividends) — and charging it at the main rates by band; for Scottish taxpayers from 2018-19 at
 *    Scottish rates, and "the Scottish starter rate does not apply".
 *  - FA 2004 s227ZA / s227B: with the MPAA, the alternative chargeable amount applies only if it exceeds
 *    the default chargeable amount; the alternative annual allowance is the annual allowance (incl. s228A
 *    carry-forward) less £10,000.
 *  - FA 2004 s228ZA(4): adjusted income = net income + net-pay deductions + total pension input −
 *    contributions paid by the individual.
 */
import { annualAllowanceCheck, calculateScenario, emptyPension, requiredContribution, type CalculatorInputs } from '../../engine';
import { inputs, p, R26 } from '../helpers';

const employerOnly = (salary: number, employer: number, extra: Parameters<typeof inputs>[0] = {}) =>
  inputs({ ...extra, income: { salary: p(salary), ...(extra?.income ?? {}) }, existingPension: { employerMode: 'fixed', employerAmount: p(employer) } });
const aa = (i: CalculatorInputs) => calculateScenario(i, { label: 't', method: null, additionalGross: 0 }).annualAllowance;

describe('F11 annual allowance charge follows PTM056110', () => {
  it('(a) personal allowance does not shelter the excess: £10,000 salary, employer £70,000 → excess £10,000 at 20% = £2,000', () => {
    // Reduced net income = max(0, 10,000 − 12,570) = 0. Excess 10,000 all in the basic band.
    const r = aa(employerOnly(10_000, 70_000));
    expect(r.excess).toBe(p(10_000));
    expect(r.estimatedCharge).toBe(p(2_000));
  });

  it('(b) Scotland, low income: lowest rate is the Scottish basic rate 20%, not the 19% starter rate → £2,000', () => {
    expect(aa(employerOnly(10_000, 70_000, { jurisdiction: 'scotland' })).estimatedCharge).toBe(p(2_000));
  });

  it('(b) Scotland, reduced net income inside the starter band: £14,000 salary, employer £61,000 → £1,000 × 20% = £200', () => {
    // Reduced net income 1,430 (starter band). Old code charged 19% here.
    expect(aa(employerOnly(14_000, 61_000, { jurisdiction: 'scotland' })).estimatedCharge).toBe(p(200));
  });

  it('Scotland, intermediate band (unchanged by the fix): £30,000 salary, employer £70,000 → £10,000 × 21% = £2,100', () => {
    // Reduced net income 17,430 → 27,430, all within the intermediate band (16,956–31,092).
    expect(aa(employerOnly(30_000, 70_000, { jurisdiction: 'scotland' })).estimatedCharge).toBe(p(2_100));
  });

  it('(c) excess sits on top of savings and dividends at main rates: £40,000 salary + £20,000 dividends, employer £70,000 → £4,000', () => {
    // Reduced net income = 60,000 − 12,570 = 47,430 > 37,700 → whole £10,000 excess at 40%.
    // Old code inserted the excess below the dividends and re-taxed £9,770 of dividends at the upper rate (£4,442.50).
    expect(aa(employerOnly(40_000, 70_000, { income: { dividends: p(20_000) } })).estimatedCharge).toBe(p(4_000));
  });

  it('band extension still applies: £45,000 salary, £5,000 SIPP gross, employer £60,000 → excess £5,000 at 20% = £1,000', () => {
    // Reduced net income 32,430; basic limit 37,700 + 5,000 = 42,700 → £5,000 excess all at 20%.
    const i = inputs({ income: { salary: p(45_000) }, existingPension: { method: 'ras-sipp', basis: 'gross', mode: 'fixed', amount: p(5_000), employerMode: 'fixed', employerAmount: p(60_000) } });
    const r = aa(i);
    expect(r.excess).toBe(p(5_000));
    expect(r.estimatedCharge).toBe(p(1_000));
  });
});

describe('F12 MPAA: alternative chargeable amount used only if it exceeds the default (s227ZA)', () => {
  const check = (dc: number, db: number, cf: number) =>
    annualAllowanceCheck({
      rules: R26,
      allowance: { definedBenefitMember: db > 0, definedBenefitPensionInput: p(db), definedBenefitMemberContributions: 0, otherPersonalRasGross: 0, otherEmployerContributions: 0, mpaaTriggered: 'yes', carryForward: p(cf) },
      pension: { ...emptyPension(), employerOther: p(dc) },
      rasRelievedGross: 0,
      rasGross: 0,
      netIncome: p(100_000),
      chargeFor: () => 0,
    } as never);
  it.each([
    // [DC, DB, cf, default, alternative, chargeable]
    [15_000, 0, 0, 0, 5_000, 5_000], // default 15k − 60k → 0; alternative 5k
    [15_000, 60_000, 0, 15_000, 15_000, 15_000], // default 75k − 60k = 15k; alternative 5k + (60k − 50k) = 15k → equal, default kept
    [12_000, 30_000, 20_000, 0, 2_000, 2_000], // default 42k − 80k → 0; alt AA 50k + 20k cf = 70k → DB 0; DC 2k
  ])('DC £%d, DB £%d, cf £%d → default £%d, alternative £%d, chargeable £%d', (dc, db, cf, dflt, alt, charge) => {
    const r = check(dc, db, cf) as unknown as { excess: number; defaultChargeable: number; alternativeChargeable: number | null };
    expect(r.defaultChargeable).toBe(p(dflt));
    expect(r.alternativeChargeable).toBe(p(alt));
    expect(r.excess).toBe(p(charge));
  });
});

describe('F13 defined benefit member contributions are a separate input and not double counted', () => {
  // Salary £120,000; DB member contributions £9,600 deducted from pay (net pay); DB pension input £25,000.
  // Net income 110,400 → ANI 110,400 → PA 12,570 − 5,200 = 7,370 → taxable 103,030
  // Tax 7,540 + 65,330 × 40% = £33,672; NI (on £120,000) 3,016 + 69,730 × 2% = £4,410.60
  // Take-home 120,000 − 9,600 − 33,672 − 4,410.60 = £72,317.40
  // PIA = DB £25,000 only (member contributions are part of the DB input, not DC).
  // Adjusted income = 110,400 + 0 + PIA 25,000 − 0 (s228ZA(4): +9,600 net pay, −9,600 member contribution) = £135,400
  const i = inputs({
    income: { salary: p(120_000) },
    pensionAllowance: { definedBenefitMember: true, definedBenefitPensionInput: p(25_000), definedBenefitMemberContributions: p(9_600) },
  } as never);
  const s = calculateScenario(i, { label: 't', method: null, additionalGross: 0 });
  it('tax, NI and take-home treat DB contributions as net pay', () => {
    expect(s.adjustedNetIncome).toBe(p(110_400));
    expect(s.incomeTax.total).toBe(p(33_672));
    expect(s.employeeNi.total).toBe(p(4_410.6));
    expect(s.takeHome).toBe(p(72_317.4));
  });
  it('pension input and adjusted income are not double counted', () => {
    expect(s.annualAllowance.pensionInputDc).toBe(0);
    expect(s.annualAllowance.pensionInputTotal).toBe(p(25_000));
    expect(s.annualAllowance.adjustedIncome).toBe(p(135_400));
    expect(s.annualAllowance.thresholdIncome).toBe(p(110_400));
  });
  it('taper case: £300,000 salary, DB contributions £24,000, DB input £60,000 → allowance £22,000, excess £38,000', () => {
    // Net income 276,000; threshold 276,000; adjusted 276,000 + 60,000 = 336,000 → reduction 38,000 → £22,000.
    const t = calculateScenario(
      inputs({ income: { salary: p(300_000) }, pensionAllowance: { definedBenefitMember: true, definedBenefitPensionInput: p(60_000), definedBenefitMemberContributions: p(24_000) } } as never),
      { label: 't', method: null, additionalGross: 0 },
    ).annualAllowance;
    expect(t.adjustedIncome).toBe(p(336_000));
    expect(t.allowanceAfterTaper).toBe(p(22_000));
    expect(t.excess).toBe(p(38_000));
  });
});

describe('F10b infeasibility explanation states the actual figures', () => {
  it('salary sacrifice with the relief limit fully used by an existing SIPP', () => {
    // Salary 40,000, property 110,000, other SIPP 40,000. At the £40,000 maximum sacrifice the existing SIPP
    // keeps relief on only £3,600, so it loses £36,400 of relief and ANI falls by just £3,600 (110,000 → 106,400).
    const i = inputs({ income: { salary: p(40_000), propertyIncome: p(110_000) }, pensionAllowance: { otherPersonalRasGross: p(40_000) } });
    const o = requiredContribution(i, 'salary-sacrifice');
    expect(o.feasible).toBe(false);
    expect(o.reason).toContain('£36,400');
    expect(o.reason).toContain('£3,600');
    expect(o.reason).toContain('£106,400');
  });
});
