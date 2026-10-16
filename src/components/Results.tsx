import type { CalculationOutput } from '../engine/calculate';
import { METHOD_LABELS } from '../engine/pension';
import { STATUS_LABELS, type EligibilityStatus, type SchemeAssessment } from '../engine/childcare';
import type { CalcWarning } from '../engine/types';
import { formatGBP, formatPercent } from '../lib/format';

export function KeyResults({ out }: { out: CalculationOutput }) {
  const { baseline, marginalNow, optimiser, atTargetChange, childcareBefore } = out;
  const method = METHOD_LABELS[optimiser.method];
  const childcareStatus = childcareBefore.assessed
    ? worstStatus([childcareBefore.taxFreeChildcare.status, childcareBefore.fundedHours.status])
    : null;
  return (
    <section className="card key-results" aria-labelledby="key-title">
      <h2 id="key-title">Key results</h2>
      <dl className="stat-grid">
        <div className="stat">
          <dt>Current adjusted net income</dt>
          <dd className="stat-value" data-testid="current-ani">
            {formatGBP(baseline.adjustedNetIncome, { decimals: 0 })}
          </dd>
          <dd className="stat-note">Personal allowance: {formatGBP(baseline.incomeTax.personalAllowance, { decimals: 0 })}</dd>
        </div>
        <div className="stat">
          <dt>Marginal Income Tax rate</dt>
          <dd className="stat-value" data-testid="marginal-it">
            {formatPercent(marginalNow.incomeTax)}
          </dd>
          <dd className="stat-note">On the next £100 of earnings</dd>
        </div>
        <div className="stat">
          <dt>Marginal Income Tax + employee NI</dt>
          <dd className="stat-value" data-testid="marginal-combined">
            {formatPercent(marginalNow.combined)}
          </dd>
          <dd className="stat-note">
            Average rate (tax + NI): {formatPercent(marginalNow.averageEffective)}
            {marginalNow.studentLoan > 0 && <> · with student loan: {formatPercent(marginalNow.combinedWithStudentLoan)}</>}
          </dd>
        </div>
        <div className="stat">
          <dt>Gross additional contribution to reach {formatGBP(optimiser.target, { decimals: 0 })}</dt>
          <dd className="stat-value" data-testid="required-gross">
            {optimiser.alreadyMet ? 'None needed' : formatGBP(optimiser.requiredGross, { decimals: 0 })}
          </dd>
          <dd className="stat-note">
            {optimiser.alreadyMet
              ? 'Your adjusted net income is already at or below the target.'
              : optimiser.feasible
                ? `Using ${method.toLowerCase()}.`
                : `Not reachable with ${method.toLowerCase()} alone. ${optimiser.reason ?? ''}`}
          </dd>
        </div>
        <div className="stat">
          <dt>Take-home pay impact at that contribution</dt>
          <dd className="stat-value" data-testid="target-takehome">
            {atTargetChange ? formatGBP(atTargetChange.takeHome, { decimals: 0, signed: true }) : '—'}
          </dd>
          <dd className="stat-note">
            {atTargetChange
              ? `Change in annual take-home after tax and NI effects${out.atTarget && out.atTarget.reliefToClaim > 0 ? ', assuming you claim higher-rate relief' : ''}.`
              : 'No contribution needed.'}
          </dd>
        </div>
        {childcareStatus && (
          <div className="stat">
            <dt>Childcare eligibility (now)</dt>
            <dd className={`stat-value status status-${childcareStatus}`}>{STATUS_LABELS[childcareStatus]}</dd>
            <dd className="stat-note">See the childcare section. Not included in tax figures.</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

const STATUS_ORDER: EligibilityStatus[] = ['not-eligible', 'not-confirmed', 'appears-eligible', 'not-assessed'];
function worstStatus(ss: EligibilityStatus[]): EligibilityStatus {
  const assessed: EligibilityStatus[] = ss.filter((s) => s !== 'not-assessed');
  if (assessed.length === 0) return 'not-assessed';
  return STATUS_ORDER.find((o) => assessed.includes(o)) ?? 'not-assessed';
}

export function StatusBadge({ status }: { status: EligibilityStatus }) {
  const icon = status === 'appears-eligible' ? '✓' : status === 'not-eligible' ? '✕' : status === 'not-confirmed' ? '?' : '–';
  return (
    <span className={`badge status-${status}`}>
      <span aria-hidden="true">{icon}</span> {STATUS_LABELS[status]}
    </span>
  );
}

function SchemeCard({ before, after, showAfter }: { before: SchemeAssessment; after: SchemeAssessment; showAfter: boolean }) {
  return (
    <div className="scheme">
      <h4>{before.name}</h4>
      <p>
        Now: <StatusBadge status={before.status} />
        {showAfter && before.status !== after.status && (
          <>
            {' '}
            → with proposed contribution: <StatusBadge status={after.status} />
          </>
        )}
      </p>
      {after.failures.length > 0 && (
        <>
          <p className="list-title">Conditions not met{showAfter ? ' (with proposed contribution)' : ''}:</p>
          <ul>{after.failures.map((f) => <li key={f}>{f}</li>)}</ul>
        </>
      )}
      {after.unknowns.length > 0 && (
        <>
          <p className="list-title">Not confirmed — answer or check:</p>
          <ul>{after.unknowns.map((f) => <li key={f}>{f}</li>)}</ul>
        </>
      )}
      {after.met.length > 0 && (
        <details>
          <summary>Conditions that appear to be met</summary>
          <ul>{after.met.map((f) => <li key={f}>{f}</li>)}</ul>
        </details>
      )}
      {after.valueExplanation && (
        <p>
          {after.estimatedAnnualValue !== null && (
            <strong>Estimated household value: {formatGBP(after.estimatedAnnualValue, { decimals: 0 })} a year. </strong>
          )}
          {after.valueExplanation}
        </p>
      )}
      {after.notes.map((n) => (
        <p key={n} className="hint">
          {n}
        </p>
      ))}
    </div>
  );
}

export function ChildcareResults({ out }: { out: CalculationOutput }) {
  const { childcareBefore: b, childcareAfter: a, proposed } = out;
  if (!b.assessed) return null;
  const showAfter = proposed.additionalGross > 0;
  return (
    <section className="card" aria-labelledby="cc-title">
      <h2 id="cc-title">Childcare eligibility</h2>
      <p className="callout">
        This is a separate household benefit, not tax relief. It is never added to “tax saved”. “Appears eligible” means only that the answers you gave
        meet the conditions modelled here — HMRC decides eligibility when you apply and every 3 months.
      </p>
      <SchemeCard before={b.taxFreeChildcare} after={a.taxFreeChildcare} showAfter={showAfter} />
      <SchemeCard before={b.fundedHours} after={a.fundedHours} showAfter={showAfter} />
    </section>
  );
}

export function Warnings({ warnings }: { warnings: CalcWarning[] }) {
  const order = { error: 0, warning: 1, info: 2 } as const;
  const sorted = [...warnings].sort((x, y) => order[x.severity] - order[y.severity]);
  const important = sorted.filter((w) => w.severity !== 'info');
  const info = sorted.filter((w) => w.severity === 'info');
  return (
    <section className="card" aria-labelledby="warn-title">
      <h2 id="warn-title">Warnings and assumptions</h2>
      {important.length > 0 && (
        <ul className="warnings">
          {important.map((w) => (
            <li key={w.id} className={`warning sev-${w.severity}`}>
              <strong>{w.severity === 'error' ? 'Error: ' : 'Check: '}</strong>
              {w.message}
            </li>
          ))}
        </ul>
      )}
      <details open={important.length === 0}>
        <summary>Assumptions used ({info.length})</summary>
        <ul className="warnings">
          {info.map((w) => (
            <li key={w.id} className="warning sev-info">
              {w.message}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
