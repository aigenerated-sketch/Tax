import { useId } from 'react';
import type { CalculationOutput } from '../engine/calculate';
import { METHOD_LABELS } from '../engine/pension';
import { formatGBP } from '../lib/format';
import { parseMoney } from '../lib/form';
import { jurisdictionName } from '../lib/jurisdiction';
import type { ReactNode } from 'react';

function ResultGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="result-group">
      <h3>{title}</h3>
      <dl className="result-list">{children}</dl>
    </div>
  );
}

function Row({ label, value, testId, strong }: { label: string; value: string; testId?: string; strong?: boolean }) {
  return (
    <div className={strong ? 'strong' : undefined}>
      <dt>{label}</dt>
      <dd data-testid={testId}>{value}</dd>
    </div>
  );
}

const STEP_POUNDS = 100;

/** Slider range: enough to reach the target (with headroom) but never beyond what the method allows. */
export function sliderRange(out: CalculationOutput): { max: number; explanation: string } {
  const { optimiser } = out;
  const cap = Math.floor(optimiser.maxFeasibleGross / 100);
  const method = METHOD_LABELS[optimiser.method].toLowerCase();
  if (!optimiser.feasible) {
    return {
      max: cap,
      explanation: `The slider stops at ${formatGBP(cap * 100, { decimals: 0 })}, the most that ${method} can carry on your earnings.`,
    };
  }
  const needed = Math.ceil(optimiser.requiredGross / 100);
  const headroom = Math.max(10_000, Math.ceil((needed * 1.25) / 1000) * 1000);
  const max = Math.min(cap, headroom);
  return {
    max,
    explanation:
      max === cap
        ? `The slider stops at ${formatGBP(cap * 100, { decimals: 0 })}, the most that ${method} can carry on your earnings.`
        : `The slider covers the amount needed to reach your target with some headroom. Type any amount up to ${formatGBP(cap * 100, { decimals: 0 })} in the box.`,
  };
}

export function ContributionSlider({ out, value, onChange }: { out: CalculationOutput; value: string; onChange: (v: string) => void }) {
  const id = useId();
  const { max, explanation } = sliderRange(out);
  const parsed = parseMoney(value);
  const pounds = parsed.ok ? parsed.pence / 100 : 0;
  const { proposed, change, optimiser, baseline } = out;
  const reached = proposed.adjustedNetIncome <= optimiser.target;
  const aa = proposed.annualAllowance;
  const isSS = proposed.method === 'salary-sacrifice';
  const jurisdictionLabel = jurisdictionName(out.jurisdiction);

  return (
    <section className="card slider-card" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Try a contribution</h2>
      <p className="hint">Method: {proposed.method ? METHOD_LABELS[proposed.method] : '—'}. Amounts are gross (what goes into the pension from you).</p>
      <div className="slider-row">
        <label htmlFor={`${id}-range`} className="visually-hidden">
          Additional gross pension contribution (slider)
        </label>
        <input
          id={`${id}-range`}
          type="range"
          min={0}
          max={Math.max(max, STEP_POUNDS)}
          step={STEP_POUNDS}
          value={Math.min(pounds, Math.max(max, STEP_POUNDS))}
          aria-valuetext={formatGBP(Math.round(pounds * 100), { decimals: 0 })}
          aria-describedby={`${id}-range-hint`}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="field compact">
          <label htmlFor={`${id}-num`}>Gross contribution</label>
          <div className="input-affix">
            <span className="affix" aria-hidden="true">
              £
            </span>
            <input id={`${id}-num`} type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
          </div>
        </div>
      </div>
      <p className="hint" id={`${id}-range-hint`}>
        {explanation}{' '}
        {!optimiser.alreadyMet && optimiser.feasible && (
          <button type="button" className="link-button" onClick={() => onChange(String(optimiser.requiredGross / 100))}>
            Set to the amount needed ({formatGBP(optimiser.requiredGross, { decimals: 0 })})
          </button>
        )}
      </p>

      <div aria-live="polite">
        <p className={`target-status ${reached ? 'ok' : 'not-ok'}`}>
          <span aria-hidden="true">{reached ? '✓' : '•'}</span>{' '}
          {reached
            ? `Adjusted net income is at or below your ${formatGBP(optimiser.target, { decimals: 0 })} target.`
            : `Adjusted net income is still ${formatGBP(proposed.adjustedNetIncome - optimiser.target, { decimals: 0 })} above your target.`}
        </p>
        <ResultGroup title="Pension">
          <Row label="Gross pension contribution (this change)" testId="slider-gross" value={formatGBP(proposed.additionalGross)} />
          <Row label="Pay given up or paid in by you (this change)" value={formatGBP(change.employeePensionCash)} />
          <Row label="Employer pension contributions (total)" value={formatGBP(proposed.employerContribution)} />
          <Row label="Total pension investment this year" value={formatGBP(proposed.totalPensionInvestment)} />
        </ResultGroup>
        <ResultGroup title={`Income Tax — ${jurisdictionLabel} rules`}>
          <Row label="Revised adjusted net income" testId="slider-ani" value={formatGBP(proposed.adjustedNetIncome)} />
          <Row label="Personal allowance" value={formatGBP(proposed.incomeTax.personalAllowance)} />
          <Row label="Income Tax saved" testId="slider-it-saved" value={formatGBP(-change.incomeTax)} />
          {proposed.reliefToClaim - baseline.reliefToClaim > 0 && (
            <Row label="…of which you must claim from HMRC" value={formatGBP(proposed.reliefToClaim - baseline.reliefToClaim)} />
          )}
        </ResultGroup>
        <ResultGroup title="National Insurance (UK-wide)">
          <Row label="Employee NI saved" testId="slider-ni-saved" value={formatGBP(-change.employeeNi)} />
          {isSS && change.employerNi < 0 && <Row label="Employer NI saving (kept by employer unless shared)" value={formatGBP(-change.employerNi)} />}
          {!isSS && proposed.additionalGross > 0 && <p className="hint">This method does not reduce National Insurance.</p>}
        </ResultGroup>
        {change.studentLoan !== 0 && (
          <ResultGroup title="Student loan">
            <Row label="Repayments reduced by" value={formatGBP(-change.studentLoan)} />
          </ResultGroup>
        )}
        <ResultGroup title="Take-home pay">
          <Row label="Change in take-home pay (your cash-flow impact)" testId="slider-takehome" value={formatGBP(change.takeHome, { signed: true })} strong />
          <p className="hint reconcile" data-testid="slider-reconcile">
            = −{formatGBP(change.employeePensionCash)} into pension + {formatGBP(-change.incomeTax)} Income Tax + {formatGBP(-change.employeeNi)} NI
            {change.studentLoan !== 0 && <> + {formatGBP(-change.studentLoan)} student loan</>}
          </p>
        </ResultGroup>
        {change.hicbc !== 0 && (
          <ResultGroup title="Child Benefit (separate from take-home)">
            <Row label="Change in High Income Child Benefit Charge" value={formatGBP(change.hicbc, { signed: true })} />
          </ResultGroup>
        )}
        {out.childcareBefore.assessed && (
          <p className="hint">Childcare eligibility is a separate household benefit — see “Childcare eligibility” below. It is not included in any figure above.</p>
        )}
        {aa.excess > 0 && (
          <p className="warning sev-warning" role="status">
            Annual allowance: inputs of {formatGBP(aa.pensionInputTotal, { decimals: 0 })} exceed {formatGBP(aa.totalAvailable, { decimals: 0 })} available on your
            answers. A tax charge of about {formatGBP(aa.estimatedCharge, { decimals: 0 })} may apply.
          </p>
        )}
        {!aa.verified && <p className="hint">Annual allowance available has not been verified — see warnings.</p>}
      </div>
    </section>
  );
}
