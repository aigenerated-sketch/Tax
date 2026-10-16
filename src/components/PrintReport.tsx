import { useId } from 'react';
import type { CalculationOutput } from '../engine/calculate';
import { METHOD_LABELS } from '../engine/pension';
import { STATUS_LABELS } from '../engine/childcare';
import type { CalculatorInputs } from '../engine/types';
import { formatDate, formatGBP, formatPercent } from '../lib/format';
import { JURISDICTIONS } from './InputPanel';
import { jurisdictionBasis } from '../lib/jurisdiction';

export const EMPLOYER_PROMPTS = [
  'Is salary sacrifice available for pension contributions?',
  'What earnings are pensionable (basic salary, bonus, qualifying earnings)?',
  'Will the employer pension contribution change if I contribute more?',
  'Are employer NI savings from salary sacrifice shared with employees?',
  'Could the arrangement affect salary-linked benefits (life cover, statutory pay, bonus, mortgage references)?',
  'When would a change take effect, and can it be changed or reversed later?',
];

export function EmployerDiscussion({ notes, setNote }: { notes: string[]; setNote: (i: number, v: string) => void }) {
  const id = useId();
  return (
    <section className="card employer-notes" aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`}>Questions for your employer</h2>
      <p className="hint">Optional notes for the printed report. They are not saved or sent anywhere.</p>
      {EMPLOYER_PROMPTS.map((q, i) => (
        <div className="field" key={q}>
          <label htmlFor={`${id}-${i}`}>{q}</label>
          <textarea id={`${id}-${i}`} rows={2} value={notes[i] ?? ''} onChange={(e) => setNote(i, e.target.value)} />
        </div>
      ))}
    </section>
  );
}

export function PrintReport({ out, inputs, notes, generatedAt }: { out: CalculationOutput; inputs: CalculatorInputs; notes: string[]; generatedAt: Date }) {
  const { baseline: b, proposed: p, change, rules } = out;
  const jurisdiction = JURISDICTIONS.find((j) => j.value === inputs.jurisdiction)?.label ?? inputs.jurisdiction;
  const inc = inputs.income;
  const rows: [string, number, number][] = [
    ['Adjusted net income', b.adjustedNetIncome, p.adjustedNetIncome],
    ['Personal allowance', b.incomeTax.personalAllowance, p.incomeTax.personalAllowance],
    ['Taxable income', b.incomeTax.totalTaxableIncome, p.incomeTax.totalTaxableIncome],
    ['Income Tax', b.incomeTax.total, p.incomeTax.total],
    ['Employee NI', b.employeeNi.total, p.employeeNi.total],
    ['Student loan', b.studentLoan.total, p.studentLoan.total],
    ['Your pension contributions (gross)', b.employeeFundedGross, p.employeeFundedGross],
    ['Employer pension contributions', b.employerContribution, p.employerContribution],
    ['Total pension investment', b.totalPensionInvestment, p.totalPensionInvestment],
    ['Estimated take-home', b.takeHome, p.takeHome],
  ];
  return (
    <article className="print-report" aria-hidden="true">
      <h1>Pension contribution summary — UK £100k Tax Trap Calculator</h1>
      <p>
        Generated {formatDate(generatedAt)} · Tax year {rules.label} · {jurisdiction} rules · Rates checked against official sources on {rules.dateVerified} · Not checked against HMRC or payroll software
      </p>
      <p>{jurisdictionBasis(inputs.jurisdiction)}</p>
      <p className="print-disclaimer">
        Educational estimate only. This is not an HMRC calculation, a payroll instruction or financial advice. Figures are annual estimates based on the inputs below.
      </p>

      <h2>Inputs and assumptions</h2>
      <ul>
        <li>Salary {formatGBP(inc.salary, { decimals: 0 })}; bonus {formatGBP(inc.bonus, { decimals: 0 })}</li>
        {inc.taxableBenefits + inc.propertyIncome + inc.otherNonSavingsIncome + inc.savingsInterest + inc.dividends > 0 && (
          <li>
            Other income: benefits {formatGBP(inc.taxableBenefits, { decimals: 0 })}, property {formatGBP(inc.propertyIncome, { decimals: 0 })}, other{' '}
            {formatGBP(inc.otherNonSavingsIncome, { decimals: 0 })}, savings {formatGBP(inc.savingsInterest, { decimals: 0 })}, dividends {formatGBP(inc.dividends, { decimals: 0 })}
          </li>
        )}
        <li>
          Existing pension: {inputs.existingPension.method ? METHOD_LABELS[inputs.existingPension.method] : 'none entered'}; your contribution resolved to{' '}
          {formatGBP(b.employeeFundedGross)} gross; employer {formatGBP(b.employerContribution)}
        </li>
        <li>Gift Aid (paid): {formatGBP(inputs.giftAidNet)}; student loan: {inputs.studentLoan.plan}{inputs.studentLoan.postgraduate ? ' + postgraduate' : ''}</li>
        <li>Target adjusted net income: {formatGBP(inputs.targetAni, { decimals: 0 })}</li>
      </ul>

      <h2>Proposal</h2>
      <ul>
        <li>Method: {p.method ? METHOD_LABELS[p.method] : '—'}</li>
        <li>Proposed gross contribution: {formatGBP(p.additionalGross)}</li>
        <li>Current adjusted net income: {formatGBP(b.adjustedNetIncome)} → {formatGBP(p.adjustedNetIncome)}</li>
        <li>Estimated change in take-home pay: {formatGBP(change.takeHome, { signed: true })} a year</li>
        <li>Income Tax saved: {formatGBP(-change.incomeTax)}</li>
        <li>Employee National Insurance saved: {formatGBP(-change.employeeNi)}</li>
        <li>Pay given up or paid into pension by you: {formatGBP(change.employeePensionCash)}</li>
        {p.reliefToClaim > 0 && <li>Relief to claim from HMRC (Self Assessment or tax code): {formatGBP(p.reliefToClaim)}</li>}
        <li>
          Marginal rates now: Income Tax {formatPercent(out.marginalNow.incomeTax)}, with employee NI {formatPercent(out.marginalNow.combined)}
        </li>
        {!out.optimiser.alreadyMet && (
          <li>
            Gross contribution needed to reach target with this method: {formatGBP(out.optimiser.requiredGross)}
            {!out.optimiser.feasible && ' (not reachable with this method alone)'}
          </li>
        )}
      </ul>

      <h2>Tax and NI breakdown</h2>
      <table className="compare">
        <thead>
          <tr>
            <th scope="col">Annual figure</th>
            <th scope="col">Current</th>
            <th scope="col">With contribution</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([l, x, y]) => (
            <tr key={l}>
              <th scope="row">{l}</th>
              <td>{formatGBP(x)}</td>
              <td>{formatGBP(y)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Pension annual allowance</h2>
      <p>
        Pension inputs {formatGBP(p.annualAllowance.pensionInputTotal)} against {formatGBP(p.annualAllowance.totalAvailable)} available on the answers given
        {p.annualAllowance.excess > 0 ? ` — excess ${formatGBP(p.annualAllowance.excess)}, possible charge about ${formatGBP(p.annualAllowance.estimatedCharge)}` : ''}.
        {!p.annualAllowance.verified && ' Not verified: confirm with your pension scheme.'}
      </p>

      {out.childcareBefore.assessed && (
        <>
          <h2>Childcare eligibility (separate from tax)</h2>
          <ul>
            {[
              [out.childcareBefore.taxFreeChildcare, out.childcareAfter.taxFreeChildcare],
              [out.childcareBefore.fundedHours, out.childcareAfter.fundedHours],
            ].map(([x, y]) =>
              x && y ? (
                <li key={x.scheme}>
                  {x.name}: now {STATUS_LABELS[x.status]}; with contribution {STATUS_LABELS[y.status]}
                  {y.unknowns.length > 0 && ` — unconfirmed: ${y.unknowns.join(' ')}`}
                </li>
              ) : null,
            )}
          </ul>
        </>
      )}

      <h2>Warnings and limitations</h2>
      <ul>
        {out.warnings.map((w) => (
          <li key={w.id}>{w.message}</li>
        ))}
      </ul>

      <h2>Questions for your employer</h2>
      <ol>
        {EMPLOYER_PROMPTS.map((q, i) => (
          <li key={q}>
            {q}
            <div className="print-answer">{notes[i] || ' '}</div>
          </li>
        ))}
      </ol>

      <h2>Official sources</h2>
      <ul>
        {rules.sources.map((s) => (
          <li key={s.id}>
            {s.title}: {s.url}
          </li>
        ))}
      </ul>
    </article>
  );
}
