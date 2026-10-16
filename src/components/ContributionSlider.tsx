import { useId } from 'react';
import type { CalculationOutput } from '../engine/calculate';
import { METHOD_LABELS } from '../engine/pension';
import { formatGBP } from '../lib/format';
import { parseMoney } from '../lib/form';

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
        <dl className="result-list">
          <div>
            <dt>Gross pension contribution</dt>
            <dd data-testid="slider-gross">{formatGBP(proposed.additionalGross)}</dd>
          </div>
          <div>
            <dt>Change in take-home pay (your cash-flow impact)</dt>
            <dd data-testid="slider-takehome">{formatGBP(change.takeHome, { signed: true })}</dd>
          </div>
          {proposed.rasCashPaid - baseline.rasCashPaid > 0 && (
            <div>
              <dt>Paid by you into the pension (before reclaiming higher-rate relief)</dt>
              <dd>{formatGBP(proposed.rasCashPaid - baseline.rasCashPaid)}</dd>
            </div>
          )}
          <div>
            <dt>Revised adjusted net income</dt>
            <dd data-testid="slider-ani">{formatGBP(proposed.adjustedNetIncome)}</dd>
          </div>
          <div>
            <dt>Income Tax saved</dt>
            <dd>{formatGBP(-change.incomeTax)}</dd>
          </div>
          <div>
            <dt>Employee NI saved</dt>
            <dd>{formatGBP(-change.employeeNi)}</dd>
          </div>
          {change.studentLoan !== 0 && (
            <div>
              <dt>Student loan repayments reduced by</dt>
              <dd>{formatGBP(-change.studentLoan)}</dd>
            </div>
          )}
          {proposed.reliefToClaim - baseline.reliefToClaim > 0 && (
            <div>
              <dt>Of the tax saved, to claim from HMRC</dt>
              <dd>{formatGBP(proposed.reliefToClaim - baseline.reliefToClaim)}</dd>
            </div>
          )}
          <div>
            <dt>Employer pension contributions</dt>
            <dd>{formatGBP(proposed.employerContribution)}</dd>
          </div>
          {isSS && change.employerNi < 0 && (
            <div>
              <dt>Employer NI saving (kept by employer unless shared)</dt>
              <dd>{formatGBP(-change.employerNi)}</dd>
            </div>
          )}
          <div>
            <dt>Total pension investment this year</dt>
            <dd>{formatGBP(proposed.totalPensionInvestment)}</dd>
          </div>
          {change.hicbc !== 0 && (
            <div>
              <dt>Change in High Income Child Benefit Charge</dt>
              <dd>{formatGBP(change.hicbc, { signed: true })}</dd>
            </div>
          )}
        </dl>
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
