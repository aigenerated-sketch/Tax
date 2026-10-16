import type { ReactNode } from 'react';
import { href } from '../app/routes';
import { formatGBP, formatPercent } from '../lib/format';
import { SOURCES, SUPPORTED_TAX_YEARS, TAX_YEARS, UNCERTAINTIES_2026_27, VERIFICATION_2026_27, type IncomeTaxBandSet, type VerificationLevel } from '../rules';

const LEVEL_LABEL: Record<VerificationLevel, string> = {
  official: 'Official',
  'official-inferred': 'Official (inferred)',
  secondary: 'Secondary',
  convention: 'Convention',
};

const Ext = ({ to, children }: { to: string; children: ReactNode }) => (
  <a href={to} rel="noopener noreferrer" target="_blank">
    {children}
  </a>
);

function Article({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="prose card">
      <h1>{title}</h1>
      {children}
      <p className="back">
        <a href={href('/')}>← Back to the calculator</a>
      </p>
    </article>
  );
}

const r = TAX_YEARS['2026-27'];
const gb0 = (p: number) => formatGBP(p, { decimals: 0 });

export function HowItWorks() {
  return (
    <Article title="How the £100,000 tax trap works">
      <h2>Adjusted net income</h2>
      <p>
        Adjusted net income (ANI) is HMRC’s measure for several income tests. Broadly, it is your total taxable income (salary after any salary sacrifice, bonuses,
        taxable benefits, rental profit, savings, dividends and other taxable income) minus certain reliefs, including:
      </p>
      <ul>
        <li>pension contributions deducted from pay before tax under a net-pay arrangement (already excluded from taxable pay);</li>
        <li>the gross amount of relief-at-source pension contributions (what you pay plus the 20% basic-rate top-up);</li>
        <li>the grossed-up amount of Gift Aid donations (what you give × 1.25).</li>
      </ul>
      <p>
        Employer pension contributions are not part of your income, so they are not deducted. ANI is not the same as your gross salary, your taxable income or your take-home
        pay. See <Ext to={SOURCES.ani.url}>GOV.UK: adjusted net income</Ext>.
      </p>

      <h2>The personal allowance taper</h2>
      <p>
        For {r.label} the standard personal allowance is {gb0(r.personalAllowance.standard)}. When ANI is above {gb0(r.personalAllowance.taperThreshold)}, the allowance is reduced
        by £1 for every £2 of income above that level, reaching zero at {gb0(125_140_00)}.
      </p>
      <p className="formula">Personal allowance = max(0, £12,570 − ½ × (ANI − £100,000))</p>
      <p>
        Inside that band each extra £1 of income is taxed at the higher rate (40%) and also removes 50p of tax-free allowance, which is then taxed at 40% as well: 40% + 20% =
        an effective 60% Income Tax rate. Add 2% employee National Insurance on earnings and the combined rate on salary or bonus is 62%. In Scotland the advanced rate (45%)
        applies across most of this band, giving 67.5% Income Tax and 69.5% with NI. The calculator works these out from the rules rather than assuming them.
      </p>

      <h2>Why pension contributions help</h2>
      <p>
        Pension contributions made in the right way reduce ANI. If ANI falls back to £100,000, the full personal allowance returns. That is why a contribution in this range can
        cost much less than its face value in take-home pay. How much less depends on the method:
      </p>
      <ul>
        <li>
          <strong>Salary sacrifice</strong> — your salary is reduced and your employer pays the same amount into your pension. Income Tax and employee NI both fall.
        </li>
        <li>
          <strong>Net-pay workplace pension</strong> — your contribution is taken before Income Tax. NI is still charged on the full salary.
        </li>
        <li>
          <strong>Relief at source (workplace or SIPP)</strong> — you pay 80% and the provider claims 20% from HMRC. Higher-rate and taper relief must be claimed from HMRC,
          usually through Self Assessment.
        </li>
      </ul>
      <p>
        Other effects can matter as much as the tax: whether you stay within your pension <strong>annual allowance</strong>, eligibility for{' '}
        <a href={href('/childcare-threshold')}>Tax-Free Childcare and funded hours</a>, the High Income Child Benefit Charge and student loan repayments.
      </p>
      <h2>Marginal and average rates are different</h2>
      <ul>
        <li><strong>Marginal Income Tax rate</strong>: tax on the next £100 of earnings.</li>
        <li><strong>Combined marginal rate</strong>: Income Tax plus employee NI on that £100.</li>
        <li><strong>Average effective rate</strong>: total Income Tax and NI divided by total income.</li>
        <li><strong>Tax saved by a contribution</strong>: the actual difference between two full calculations.</li>
      </ul>
    </Article>
  );
}

export function SacrificeVsSipp() {
  return (
    <Article title="Salary sacrifice vs net pay vs SIPP">
      <p>
        A £10,000 contribution can have a different cash cost depending on how it is made. Below is an illustration for an employee in England earning £110,000 with no
        other income in {r.label}; the calculator shows your own figures.
      </p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Illustration table">
        <table className="compare">
          <thead>
            <tr>
              <th scope="col">£10,000 gross contribution</th>
              <th scope="col">Salary sacrifice</th>
              <th scope="col">Net pay</th>
              <th scope="col">Relief at source / SIPP</th>
            </tr>
          </thead>
          <tbody>
            <tr><th scope="row">Paid from pay/bank</th><td>£10,000 salary given up</td><td>£10,000 from gross pay</td><td>£8,000 paid; provider adds £2,000</td></tr>
            <tr><th scope="row">Income Tax saved</th><td>£6,000</td><td>£6,000</td><td>£6,000 (£2,000 top-up + £4,000 claimed from HMRC)</td></tr>
            <tr><th scope="row">Employee NI saved</th><td>£200</td><td>£0</td><td>£0</td></tr>
            <tr><th scope="row">Fall in take-home pay</th><td>£3,800</td><td>£4,000</td><td>£4,000 (after the HMRC claim)</td></tr>
            <tr><th scope="row">Adjusted net income after</th><td>£100,000</td><td>£100,000</td><td>£100,000</td></tr>
          </tbody>
        </table>
      </div>
      <p className="hint">These numbers are produced by the same engine as the calculator and are covered by automated tests.</p>
      <h2>Salary sacrifice</h2>
      <ul>
        <li>Requires your employer to offer it and a contractual change to your pay.</li>
        <li>Saves employee NI (2% above {gb0(r.nationalInsurance.upperEarningsLimit)}, 8% below). Your employer also saves 15% NI — sharing it is optional for the employer.</li>
        <li>Can affect salary-linked benefits, life cover, statutory maternity/paternity pay, mortgage affordability and pensionable pay definitions. It cannot reduce pay below the National Minimum Wage.</li>
        <li>Reduces student loan repayments, because they are based on earnings for NI.</li>
      </ul>
      <h2>Net-pay arrangement</h2>
      <ul>
        <li>Contribution taken from gross pay before Income Tax; full relief at your marginal rate through payroll, no claim needed.</li>
        <li>No NI saving.</li>
      </ul>
      <h2>Relief at source (workplace or SIPP)</h2>
      <ul>
        <li>You pay net; the provider claims 20% basic-rate relief and adds it to the pension.</li>
        <li>Higher, additional and taper relief is <strong>not</strong> added automatically — claim it through Self Assessment or by contacting HMRC. It comes back to you, not into the pension.</li>
        <li>A SIPP gives you choice of provider and investments, but no employer contribution or NI saving.</li>
        <li>Tax-relievable personal contributions are limited to your relevant UK earnings (or {gb0(r.pensions.basicAmount)} gross if higher).</li>
      </ul>
      <p>No single method is always best. Check what your employer offers and what each option means for your wider benefits.</p>
    </Article>
  );
}

export function ChildcareThreshold() {
  const cc = r.childcare;
  return (
    <Article title="The £100,000 childcare threshold">
      <p>
        Two schemes use the £100,000 adjusted net income test for <strong>each</strong> parent. If either parent expects ANI above {gb0(cc.aniLimit)} for the tax year, the family
        is not eligible, regardless of the other parent’s income.
      </p>
      <h2>Tax-Free Childcare (UK-wide)</h2>
      <ul>
        <li>For every £8 you pay into the account, the government adds £2 — up to {gb0(cc.taxFreeChildcare.annualCapPerChild)} a year per child ({gb0(cc.taxFreeChildcare.annualCapPerDisabledChild)} if disabled).</li>
        <li>Children up to the September after they turn 11 (16 if disabled).</li>
        <li>Each parent must usually expect to earn at least {formatGBP(cc.minimumIncomeQuarterly21Plus)} over the next 3 months (aged 21+; lower amounts if younger or an apprentice).</li>
        <li>Cannot be used at the same time as Universal Credit childcare or childcare vouchers.</li>
      </ul>
      <p><Ext to={SOURCES.taxFreeChildcareEligibility.url}>GOV.UK: Tax-Free Childcare eligibility</Ext></p>
      <h2>Funded hours for working parents (England)</h2>
      <ul>
        <li>Up to {cc.englandWorkingParentHours.hoursPerWeek} hours a week, {cc.englandWorkingParentHours.weeksPerYear} weeks a year, for children aged 9 months to school age, from an approved provider.</li>
        <li>3- and 4-year-olds also get {cc.englandUniversalHours3to4.hoursPerWeek} universal hours that are not income-tested.</li>
        <li>Same £100,000 ANI and minimum-income tests per parent.</li>
      </ul>
      <p><Ext to={SOURCES.freeChildcareEligibility.url}>GOV.UK: free childcare if you’re working — eligibility</Ext></p>
      <h2>Scotland, Wales and Northern Ireland</h2>
      <p>
        Funded early-learning and childcare schemes in Scotland, Wales and Northern Ireland have different rules. This calculator does not assess them; it still assesses
        Tax-Free Childcare. See <Ext to={SOURCES.helpWithChildcare.url}>GOV.UK: help paying for childcare</Ext>.
      </p>
      <h2>What the calculator does</h2>
      <ul>
        <li>Checks each condition you answer and shows <strong>Eligibility not confirmed</strong> whenever a material answer is “Not sure” or missing.</li>
        <li>Shows the status before and after your proposed contribution.</li>
        <li>Estimates value only from figures you enter (your childcare costs or provider’s hourly rate) and keeps it separate from tax savings.</li>
        <li>Does not decide eligibility — HMRC does, when you apply and every 3 months.</li>
      </ul>
      <h2>Child Benefit is different</h2>
      <p>
        The High Income Child Benefit Charge starts at ANI of {gb0(r.childBenefit.hicbcThreshold)} and recovers 1% of Child Benefit for every £200 above it, so all of it is
        recovered at £80,000. It is shown separately in the calculator. <Ext to={SOURCES.hicbc.url}>GOV.UK: High Income Child Benefit Charge</Ext>
      </p>
    </Article>
  );
}

function BandTable({ set, caption }: { set: IncomeTaxBandSet; caption: string }) {
  let prev = 0;
  return (
    <table className="compare">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Band</th>
          <th scope="col">Taxable income</th>
          <th scope="col">Rate</th>
        </tr>
      </thead>
      <tbody>
        {set.bands.map((b) => {
          const from = prev;
          prev = b.upTo ?? prev;
          return (
            <tr key={b.id}>
              <th scope="row">{b.label}</th>
              <td>{b.upTo === null ? `Over ${gb0(from)}` : `${gb0(from === 0 ? 0 : from + 100)} – ${gb0(b.upTo)}`}</td>
              <td>{formatPercent(b.rate, 2)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function Methodology() {
  return (
    <Article title="Methodology, sources and limitations">
      <p>
        All calculations run in your browser using pure, tested functions. Tax rules live in one versioned configuration per tax year; no rate or threshold is written into the
        interface code.
      </p>
      <h2>Supported tax years</h2>
      <ul>
        {SUPPORTED_TAX_YEARS.map((id) => {
          const t = TAX_YEARS[id];
          return (
            <li key={id}>
              {t.label} ({t.startDate} to {t.endDate}), sources checked {t.dateVerified}:
              <ul>
                <li>Rates and thresholds: {t.verification.ratesAndThresholds}</li>
                <li>Legal calculation rules: {t.verification.legalRules}</li>
                <li>Implementation tests: {t.verification.implementationTests}</li>
                <li>External validation against HMRC/payroll software: {t.verification.externalValidation}</li>
              </ul>
              {t.verification.summary}
              {t.notes.length > 0 && (
                <ul>
                  {t.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <h2>{r.label} rates used</h2>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Income tax bands">
        <BandTable set={r.incomeTax.rUK} caption="England, Wales and Northern Ireland (non-savings income, after allowances)" />
        <BandTable set={r.incomeTax.scotland} caption="Scotland (non-savings, non-dividend income, after allowances)" />
      </div>
      <ul>
        <li>Personal allowance {gb0(r.personalAllowance.standard)}, tapered by £1 per £2 of ANI above {gb0(r.personalAllowance.taperThreshold)}.</li>
        <li>Employee NI (category A): {formatPercent(r.nationalInsurance.mainRate)} between {gb0(r.nationalInsurance.primaryThreshold)} and {gb0(r.nationalInsurance.upperEarningsLimit)}, {formatPercent(r.nationalInsurance.upperRate)} above. Employer NI {formatPercent(r.nationalInsurance.employerRate)} above {gb0(r.nationalInsurance.secondaryThreshold)}.</li>
        <li>Dividends: {gb0(r.incomeTax.dividends.allowance)} allowance; {formatPercent(r.incomeTax.dividends.basicRate, 2)} / {formatPercent(r.incomeTax.dividends.higherRate, 2)} / {formatPercent(r.incomeTax.dividends.additionalRate, 2)}.</li>
        <li>Savings: {gb0(r.incomeTax.savings.startingRateBand)} starting rate band; personal savings allowance £1,000 / £500 / £0; 20% / 40% / 45%.</li>
        <li>Pensions: annual allowance {gb0(r.pensions.annualAllowance)}; taper above threshold income {gb0(r.pensions.taperThresholdIncome)} and adjusted income {gb0(r.pensions.taperAdjustedIncome)} to a minimum of {gb0(r.pensions.minimumTaperedAllowance)}; MPAA {gb0(r.pensions.moneyPurchaseAnnualAllowance)}.</li>
        <li>Student loans: Plan 1 {gb0(r.studentLoans.plans.plan1?.threshold ?? 0)}, Plan 2 {gb0(r.studentLoans.plans.plan2?.threshold ?? 0)}, Plan 4 {gb0(r.studentLoans.plans.plan4?.threshold ?? 0)}, Plan 5 {gb0(r.studentLoans.plans.plan5?.threshold ?? 0)} at 9%; postgraduate {gb0(r.studentLoans.postgraduate.threshold)} at 6%.</li>
      </ul>

      <h2>Calculation order</h2>
      <ol>
        <li>Existing pension figures are converted to gross amounts by method (net relief-at-source payments are grossed up by 100/80).</li>
        <li>Cash pay = salary + bonus − salary sacrifice. Employment income = cash pay − net-pay contributions (including defined benefit member contributions) + taxable benefits.</li>
        <li>Net income = employment income + property + other + savings + dividends.</li>
        <li>ANI = net income − relieved relief-at-source gross contributions − grossed-up Gift Aid.</li>
        <li>Personal allowance from ANI; set against income components in the way that gives the lowest tax (ITA 2007 s25(2) — every priority order is tried; in practice this is non-savings first). From 2027-28 a fixed order applies (s25(3A)).</li>
        <li>Non-savings income taxed using the jurisdiction’s bands; savings and dividends using UK bands sitting on top. Relief-at-source and Gift Aid gross amounts extend the basic and higher rate limits.</li>
        <li>Employee NI and student loans on Class 1 earnings (cash pay).</li>
        <li>Take-home = cash income − Income Tax − employee NI − student loan − net-pay contributions (including defined benefit member contributions) − relief-at-source payments.</li>
      </ol>
      <p>
        <strong>Scotland:</strong> relief-at-source and Gift Aid band extension is applied to the Scottish basic band and every band above it (not the starter band), so relief
        is given at your marginal Scottish rate and the 20% top-up is not clawed back from starter-rate taxpayers. HMRC gives this relief through its own mechanisms; treat
        Scottish relief figures as estimates.
      </p>
      <h2>Rounding</h2>
      <ul>
        <li>All money is held as integer pence. Percentages of pay are rounded to the nearest penny.</li>
        <li>ANI is truncated to whole pounds for the taper test, and the allowance falls by £1 for each complete £2 above £100,000 (so £100,001 keeps the full allowance).</li>
        <li>Income Tax is calculated per band and each band amount is rounded to the nearest penny; the total is the sum of bands.</li>
        <li>NI is rounded to the nearest penny per band; student loans and the Child Benefit charge are rounded down to the penny.</li>
        <li>Headline figures are displayed to the nearest pound; detailed tables to the penny.</li>
      </ul>
      <h2>Marginal rates and the optimiser</h2>
      <p>
        Marginal rates come from recalculating everything with £100 more employment earnings. The contribution needed to reach a target ANI is found by bisection to the
        penny on the full calculation, within the limits of each method (pay available for sacrifice or net-pay; relevant UK earnings for relief at source).
      </p>
      <h2>Rule-by-rule verification ({r.label})</h2>
      <p>
        Every rate, threshold and rule used, its value (read from the live configuration) and the official source checked on {r.dateVerified}.{' '}
        <strong>Official</strong> = stated on the cited page; <strong>official (inferred)</strong> = follows directly from official statements;{' '}
        <strong>secondary</strong> = non-government source only; <strong>convention</strong> = a modelling choice.
      </p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Verification register">
        <table className="compare register">
          <thead>
            <tr>
              <th scope="col">Area</th>
              <th scope="col">Rule</th>
              <th scope="col">Value</th>
              <th scope="col">Status</th>
              <th scope="col">Source</th>
            </tr>
          </thead>
          <tbody>
            {VERIFICATION_2026_27.map((v) => (
              <tr key={`${v.area}-${v.rule}`}>
                <td>{v.area}</td>
                <th scope="row">
                  {v.rule}
                  {v.note && <span className="row-note">{v.note}</span>}
                </th>
                <td>{v.value}</td>
                <td>{LEVEL_LABEL[v.level]}</td>
                <td>
                  {v.sources.length === 0
                    ? '—'
                    : v.sources.map((u, i) => (
                        <span key={u}>
                          {i > 0 && ', '}
                          <Ext to={u}>[{i + 1}]</Ext>
                        </span>
                      ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Open uncertainties and assumptions</h2>
      <dl className="uncertainties">
        {UNCERTAINTIES_2026_27.map((u) => (
          <div key={u.id}>
            <dt>
              {u.id}. {u.title}
            </dt>
            <dd>
              {u.detail} <em>Handling:</em> {u.handling}
            </dd>
          </div>
        ))}
      </dl>
      <h2>Known limitations (not modelled)</h2>
      <ul>
        <li>Per-period payroll NI and tax codes; emergency codes; in-year changes; bonus timing.</li>
        <li>Self-employment profits and Class 2/4 NI; trading and property losses; property finance-cost credit and property allowance.</li>
        <li>Marriage Allowance, Married Couple’s Allowance, Blind Person’s Allowance and other reliefs.</li>
        <li>Non-residence, remittance basis, foreign income and double taxation.</li>
        <li>The defined benefit pension input calculation itself (you must enter the figure from your scheme’s statement); lump-sum death benefits in the taper tests; contributions after age 75; scheme-specific caps; refunds of excess contributions.</li>
        <li>National Minimum Wage limits on salary sacrifice; employer-specific salary-sacrifice terms.</li>
        <li>Student loan repayments on unearned income through Self Assessment; multiple undergraduate plans.</li>
        <li>Childcare schemes in Scotland, Wales and Northern Ireland other than Tax-Free Childcare; the child’s exact start-of-term dates.</li>
      </ul>
      <h2>Official sources</h2>
      <ul>
        {Object.values(SOURCES).map((s) => (
          <li key={s.id}>
            <Ext to={s.url}>{s.title}</Ext>
          </li>
        ))}
      </ul>
      <h2>Version history</h2>
      <ul>
        <li>1.2.0 (16 October 2026) — independent audit: annual allowance now counts contributions above the relief limit; other-scheme contributions; childcare minimum income by age; verification reported in four dimensions; personal allowance allocated by ITA s25(2). Review follow-ups: carry-forward reporting under the MPAA; annual allowance charge stacked on income after the personal allowance with the Scottish starter rate excluded (PTM056110); separate input for defined benefit member contributions; explicit MPAA chargeable-amount comparison. See docs/AUDIT_2026-10.md.</li>
        <li>1.1.0 (16 October 2026) — full 2026/27 rule-by-rule verification against GOV.UK and Scottish Government sources; single definition of net income; engine-level input and rule validation; Gift Aid 4× warning; results grouped by Income Tax, NI, pension and take-home with a reconciliation line.</li>
        <li>1.0.0 (16 October 2026) — first release: {r.label} and 2025/26 rules, England/Wales/NI and Scotland, four contribution methods, childcare, annual allowance, student loans, Child Benefit charge.</li>
      </ul>
    </Article>
  );
}

export function Privacy() {
  return (
    <Article title="Privacy">
      <ul>
        <li>The calculator runs entirely in your web browser. Salary, pension, household and childcare figures are never sent to a server.</li>
        <li>No account, email address or connection to any financial account is needed.</li>
        <li>Your inputs are not put into the page address (URL), are not stored in cookies or local storage, and are cleared when you close or reload the page.</li>
        <li>The site uses no analytics, advertising or tracking scripts and sets no cookies. If that changes, it will be added here first, with consent where required, and financial inputs will never be included.</li>
        <li>The site’s hosting provider may keep standard server logs (such as IP address and pages requested) for security and operations. Those logs contain no calculator inputs.</li>
        <li>Links to GOV.UK and other sites open their own privacy policies.</li>
      </ul>
    </Article>
  );
}

export function Disclaimer() {
  return (
    <Article title="Disclaimer">
      <p>
        This calculator provides general information and educational estimates only. It is not financial, tax, investment or legal advice, and is not a recommendation to
        make any pension contribution or to use any product or provider.
      </p>
      <ul>
        <li>It is not approved by, affiliated with or endorsed by HMRC, any UK government, or any pension provider.</li>
        <li>Results depend on the information you enter and the assumptions and limitations described in the <a href={href('/methodology')}>methodology</a>. Actual payroll and HMRC calculations can differ.</li>
        <li>Tax rules can change. The rules used are dated and listed on the methodology page.</li>
        <li>The printable report is not an HMRC calculation and not a payroll instruction.</li>
        <li>Pension savings are usually inaccessible until minimum pension age, and investments can fall as well as rise.</li>
        <li>Consider speaking to a regulated financial adviser, and confirm arrangements with your employer and pension scheme before acting.</li>
      </ul>
      <p>The calculations have not been professionally certified and have not been compared with HMRC’s own calculations or payroll software. Rates and rules were checked against official sources, and the engine is tested against hand-worked examples and a separately written reference calculation.</p>
    </Article>
  );
}
