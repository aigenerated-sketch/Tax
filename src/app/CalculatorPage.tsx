import { useCallback, useMemo, useState } from 'react';
import { ContributionSlider } from '../components/ContributionSlider';
import { BreakdownChart, MethodComparison } from '../components/Comparison';
import { InputPanel } from '../components/InputPanel';
import { NextSteps } from '../components/NextSteps';
import { EmployerDiscussion, PrintReport } from '../components/PrintReport';
import { ChildcareResults, KeyResults, Warnings } from '../components/Results';
import { calculateAll, type CalculationOutput } from '../engine/calculate';
import { defaultFormState, EXAMPLES, parseForm, type FormState } from '../lib/form';
import { TAX_YEARS } from '../rules';

export function CalculatorPage({ initial }: { initial?: FormState }) {
  const [form, setForm] = useState<FormState>(initial ?? defaultFormState());
  const [notes, setNotes] = useState<string[]>([]);
  const [printError, setPrintError] = useState<string | null>(null);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value })), []);

  const { inputs, errors } = useMemo(() => parseForm(form), [form]);
  const result = useMemo((): { out: CalculationOutput | null; error: string | null } => {
    if (!inputs) return { out: null, error: null };
    try {
      return { out: calculateAll(inputs), error: null };
    } catch (e) {
      return { out: null, error: e instanceof Error ? e.message : 'The calculation could not be completed.' };
    }
  }, [inputs]);

  const errorCount = Object.keys(errors).length;
  const rules = TAX_YEARS[form.taxYear];

  const print = () => {
    setPrintError(null);
    try {
      if (typeof window.print !== 'function') throw new Error('unsupported');
      window.print();
    } catch {
      setPrintError('Printing is not available in this browser. Use your browser’s menu to print or save as PDF.');
    }
  };

  return (
    <>
      <header className="calc-header">
        <p className="eyebrow">
          Tax year {rules.label} · 6 April {rules.startDate.slice(0, 4)} to 5 April {rules.endDate.slice(0, 4)}
        </p>
        <h1>UK £100k Tax Trap Calculator</h1>
        <p className="lede">See how pension contributions could affect your tax, take-home pay and childcare eligibility.</p>
        <p className="privacy-note">
          <span aria-hidden="true">🔒</span> Calculated entirely in your browser. Nothing you enter is sent or stored.
        </p>
        <p className="jump-link">
          <a href="#results">Jump to results</a>
        </p>
        <div className="examples" role="group" aria-label="Load an illustrative example">
          <span className="hint">Try an illustrative example:</span>
          {EXAMPLES.map((ex) => (
            <button key={ex.id} type="button" className="chip" onClick={() => setForm((f) => ex.apply(f))}>
              {ex.label}
            </button>
          ))}
          <button type="button" className="chip subtle" onClick={() => setForm((f) => ({ ...defaultFormState(), taxYear: f.taxYear }))}>
            Clear
          </button>
        </div>
      </header>

      <div className="calc-layout">
        <InputPanel form={form} errors={errors} set={set} />

        <div className="results" id="results" aria-live="polite" aria-atomic="false">
          {errorCount > 0 && (
            <section className="card error-summary" role="alert" aria-labelledby="err-title">
              <h2 id="err-title">{form.salary.trim() === '' && errorCount === 1 ? 'Enter your salary to see results' : 'Check your entries'}</h2>
              {!(form.salary.trim() === '' && errorCount === 1) && <p>Results are hidden until these are corrected. Your other entries are kept.</p>}
              <ul>
                {Object.entries(errors).map(([k, msg]) => (
                  <li key={k}>{msg}</li>
                ))}
              </ul>
            </section>
          )}
          {result.error && (
            <section className="card error-summary" role="alert">
              <h2>Calculation unavailable</h2>
              <p>{result.error}</p>
            </section>
          )}
          {result.out && inputs && (
            <>
              <KeyResults out={result.out} />
              <ContributionSlider out={result.out} value={form.additionalGross} onChange={(v) => set('additionalGross', v)} />
              <MethodComparison out={result.out} />
              <BreakdownChart out={result.out} />
              <ChildcareResults out={result.out} />
              <Warnings warnings={result.out.warnings} />
              <EmployerDiscussion notes={notes} setNote={(i, v) => setNotes((n) => Object.assign([...n], { [i]: v }))} />
              <NextSteps onPrint={print} printError={printError} />
              <PrintReport out={result.out} inputs={inputs} notes={notes} generatedAt={new Date()} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
