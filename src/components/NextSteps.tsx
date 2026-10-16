import { SOURCES } from '../rules';
import { PROVIDERS } from '../lib/providers';

export function NextSteps({ onPrint, printError }: { onPrint: () => void; printError: string | null }) {
  return (
    <section className="card" aria-labelledby="next-title">
      <h2 id="next-title">Next steps</h2>
      <ol className="steps">
        <li>
          <strong>Check your workplace pension rules with payroll or HR</strong> — which methods are offered (salary sacrifice, net pay or relief at source), what counts as
          pensionable pay, and whether extra contributions are matched.
        </li>
        <li>
          <strong>Confirm your available annual allowance</strong> — including employer contributions, any carry-forward and whether the tapered or money purchase annual
          allowance applies. Your scheme can provide a pension savings statement.
        </li>
        <li>
          <strong>Review the official guidance</strong> — for example{' '}
          <a href={SOURCES.ani.url} rel="noopener noreferrer" target="_blank">
            adjusted net income
          </a>
          ,{' '}
          <a href={SOURCES.incomeTaxRates.url} rel="noopener noreferrer" target="_blank">
            Income Tax rates
          </a>{' '}
          and{' '}
          <a href={SOURCES.taxFreeChildcareEligibility.url} rel="noopener noreferrer" target="_blank">
            Tax-Free Childcare eligibility
          </a>
          .
        </li>
        <li>
          <strong>If a SIPP or personal pension is relevant, compare providers</strong> on charges, investment choice and service. A SIPP is not automatically better than
          salary sacrifice — salary sacrifice also saves NI where available.
        </li>
        <li>
          <strong>Print or save this summary</strong> to discuss with your employer or a regulated financial adviser.{' '}
          <button type="button" className="button" onClick={onPrint}>
            Print / save as PDF
          </button>
          {printError && (
            <span className="field-error" role="alert">
              {' '}
              {printError}
            </span>
          )}
        </li>
      </ol>
      {PROVIDERS.length > 0 && (
        <aside className="providers" aria-label="Pension providers">
          <h3>Pension providers</h3>
          <p className="hint">Listed in no particular order and not ranked by commission.</p>
          <ul>
            {PROVIDERS.map((p) => (
              <li key={p.name}>
                <a href={p.url} rel="noopener noreferrer sponsored" target="_blank">
                  {p.name}
                </a>{' '}
                — {p.fees} (checked {p.feesCheckedOn}). {p.affiliateDisclosure}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </section>
  );
}
