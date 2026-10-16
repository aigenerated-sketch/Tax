import { useId } from 'react';
import type { CalculationOutput } from '../engine/calculate';
import type { ScenarioDelta, ScenarioResult } from '../engine/types';
import { chartSegments } from '../lib/chartData';
import { formatGBP } from '../lib/format';

type Row = { label: string; get: (s: ScenarioResult, d: ScenarioDelta) => number; signed?: boolean; note?: string };

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: 'Income',
    rows: [
      { label: 'Gross pay & income (after sacrifice)', get: (s) => s.grossCashIncome },
      { label: 'Adjusted net income', get: (s) => s.adjustedNetIncome },
    ],
  },
  {
    title: 'Income Tax',
    rows: [
      { label: 'Taxable income', get: (s) => s.incomeTax.totalTaxableIncome },
      { label: 'Income Tax', get: (s) => s.incomeTax.total },
      { label: '…of which reclaimed from HMRC', get: (s) => s.reliefToClaim, note: 'Relief above basic rate on relief-at-source and Gift Aid' },
      { label: 'Income Tax saved', get: (_s, d) => -d.incomeTax },
    ],
  },
  {
    title: 'National Insurance',
    rows: [
      { label: 'Employee NI', get: (s) => s.employeeNi.total },
      { label: 'Employee NI saved', get: (_s, d) => -d.employeeNi },
      { label: 'Employer NI saving (not yours unless shared)', get: (_s, d) => -d.employerNi },
    ],
  },
  { title: 'Student loan', rows: [{ label: 'Student loan', get: (s) => s.studentLoan.total }] },
  {
    title: 'Pension',
    rows: [
      { label: 'Pay given up or paid in by you', get: (s) => s.employeePensionCash },
      { label: 'Your pension contribution (gross)', get: (s) => s.employeeFundedGross },
      { label: 'Employer pension contribution', get: (s) => s.employerContribution },
      { label: 'Total pension investment', get: (s) => s.totalPensionInvestment },
    ],
  },
  {
    title: 'Take-home pay',
    rows: [
      { label: 'Estimated take-home', get: (s) => s.takeHome },
      { label: 'Change in take-home', get: (_s, d) => d.takeHome, signed: true },
    ],
  },
];

export function MethodComparison({ out }: { out: CalculationOutput }) {
  const id = useId();
  const { comparison, baseline, proposed } = out;
  const gross = proposed.additionalGross;
  const zero: ScenarioDelta = { takeHome: 0, employeePensionCash: 0, incomeTax: 0, employeeNi: 0, studentLoan: 0, employerNi: 0, adjustedNetIncome: 0, totalPensionInvestment: 0, hicbc: 0 };
  return (
    <section className="card" aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`}>Compare contribution methods</h2>
      <p className="hint">
        Each column adds the same {formatGBP(gross, { decimals: 0 })} gross contribution to the same starting position, using that method’s own rules. Your selected method
        is highlighted.
      </p>
      {gross === 0 && <p className="callout">Set a contribution above £0 to see differences between methods.</p>}
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Method comparison table">
        <table className="compare">
          <thead>
            <tr>
              <th scope="col">Annual figure</th>
              <th scope="col">Current position</th>
              {comparison.map((c) => (
                <th scope="col" key={c.method} className={c.method === proposed.method ? 'selected' : undefined}>
                  {c.label}
                  {c.method === proposed.method && <span className="visually-hidden"> (selected)</span>}
                </th>
              ))}
            </tr>
          </thead>
          {GROUPS.map((g) => (
          <tbody key={g.title}>
            <tr className="group-row">
              <th scope="colgroup" colSpan={2 + comparison.length}>
                {g.title}
              </th>
            </tr>
            {g.rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">
                  {r.label}
                  {r.note && <span className="row-note">{r.note}</span>}
                </th>
                <td>{formatGBP(r.get(baseline, zero), { signed: r.signed })}</td>
                {comparison.map((c) => (
                  <td key={c.method} className={c.method === proposed.method ? 'selected' : undefined}>
                    {formatGBP(r.get(c.scenario, c.change), { signed: r.signed })}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          ))}
        </table>
      </div>
      <p className="hint">
        Relief-at-source workplace and SIPP columns differ only where an employer match applies (a SIPP never gets one). Salary sacrifice usually saves NI too but
        needs employer agreement and can affect salary-linked benefits. No method is always best.
      </p>
    </section>
  );
}

const COLORS: Record<string, string> = {
  takeHome: 'var(--series-1)',
  incomeTax: 'var(--series-2)',
  employeeNi: 'var(--series-3)',
  studentLoan: 'var(--series-4)',
  employeePension: 'var(--series-5)',
  reliefTopUp: 'var(--series-6)',
  employerPension: 'var(--series-7)',
};

export function BreakdownChart({ out }: { out: CalculationOutput }) {
  const id = useId();
  const bars = [
    { label: 'Current', scenario: out.baseline },
    { label: 'With contribution', scenario: out.proposed },
  ].map((b) => ({ ...b, segments: chartSegments(b.scenario) }));
  const totals = bars.map((b) => b.segments.reduce((a, s) => a + Math.max(0, s.value), 0));
  const maxTotal = Math.max(1, ...totals);
  const W = 640;
  const labelW = 130;
  const barH = 34;
  const gap = 26;
  const H = bars.length * (barH + gap);
  const usable = W - labelW - 10;
  const keys = bars[0]?.segments.filter((s, i) => s.value > 0 || (bars[1]?.segments[i]?.value ?? 0) > 0) ?? [];

  return (
    <section className="card viz-root" aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`}>Where the money goes</h2>
      <ul className="legend" aria-label="Chart legend">
        {keys.map((k) => (
          <li key={k.key}>
            <span className="swatch" style={{ background: COLORS[k.key] }} aria-hidden="true" />
            {k.label}
          </li>
        ))}
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t ${id}-desc`} className="chart" preserveAspectRatio="xMinYMin meet">
        <desc id={`${id}-desc`}>
          Stacked bars comparing the current position with the proposed contribution. The same figures are in the table below.
        </desc>
        {bars.map((b, bi) => {
          let x = labelW;
          const y = bi * (barH + gap) + 6;
          return (
            <g key={b.label}>
              <text x={0} y={y + barH / 2 + 5} className="chart-label">
                {b.label}
              </text>
              {b.segments.map((s) => {
                if (s.value <= 0) return null;
                const w = (s.value / maxTotal) * usable;
                const rect = (
                  <rect key={s.key} x={x} y={y} width={Math.max(0, w - 2)} height={barH} rx={2} fill={COLORS[s.key]} data-key={s.key} data-value={s.value}>
                    <title>{`${s.label}: ${formatGBP(s.value)}`}</title>
                  </rect>
                );
                x += w;
                return rect;
              })}
            </g>
          );
        })}
      </svg>
      <details>
        <summary>Show chart data as a table</summary>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Chart data">
          <table className="compare" data-testid="chart-table">
            <thead>
              <tr>
                <th scope="col">Component</th>
                {bars.map((b) => (
                  <th scope="col" key={b.label}>
                    {b.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bars[0]?.segments.map((s, i) => (
                <tr key={s.key}>
                  <th scope="row">{s.label}</th>
                  {bars.map((b) => (
                    <td key={b.label}>{formatGBP(b.segments[i]?.value ?? 0)}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row">Total</th>
                {totals.map((t, i) => (
                  <td key={i}>{formatGBP(t)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
