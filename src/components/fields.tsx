import { useId, type ReactNode } from 'react';

interface BaseProps {
  label: string;
  hint?: ReactNode;
  error?: string;
}

function Describe({ id, hint, error }: { id: string; hint?: ReactNode; error?: string }) {
  return (
    <>
      {hint && (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </>
  );
}

const describedBy = (id: string, hint?: ReactNode, error?: string) =>
  [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;

export function MoneyField({
  label,
  hint,
  error,
  value,
  onChange,
  name,
  required,
  placeholder,
}: BaseProps & { value: string; onChange: (v: string) => void; name: string; required?: boolean; placeholder?: string }) {
  const id = useId();
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="req"> (required)</span>}
      </label>
      <div className="input-affix">
        <span className="affix" aria-hidden="true">
          £
        </span>
        <input
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          aria-required={required || undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <Describe id={id} hint={hint} error={error} />
    </div>
  );
}

export function PercentField({
  label,
  hint,
  error,
  value,
  onChange,
  name,
}: BaseProps & { value: string; onChange: (v: string) => void; name: string }) {
  const id = useId();
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="input-affix suffix">
        <input
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="affix" aria-hidden="true">
          %
        </span>
      </div>
      <Describe id={id} hint={hint} error={error} />
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  hint,
  error,
  value,
  onChange,
  options,
  name,
}: BaseProps & { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; name: string }) {
  const id = useId();
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        name={name}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Describe id={id} hint={hint} error={error} />
    </div>
  );
}

export function RadioGroup<T extends string>({
  label,
  hint,
  error,
  value,
  onChange,
  options,
  name,
}: BaseProps & { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; name: string }) {
  const id = useId();
  return (
    <fieldset className={`field radio-group${error ? ' has-error' : ''}`} aria-describedby={describedBy(id, hint, error)}>
      <legend>{label}</legend>
      <div className="radio-options">
        {options.map((o) => (
          <label key={o.value} className="radio">
            <input type="radio" name={`${name}-${id}`} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      <Describe id={id} hint={hint} error={error} />
    </fieldset>
  );
}

export function Checkbox({ label, hint, checked, onChange, name }: BaseProps & { checked: boolean; onChange: (v: boolean) => void; name: string }) {
  const id = useId();
  return (
    <div className="field checkbox">
      <input id={id} name={name} type="checkbox" checked={checked} aria-describedby={hint ? `${id}-hint` : undefined} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{label}</label>
      {hint && (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

export const YES_NO_UNSURE = [
  { value: 'yes' as const, label: 'Yes' },
  { value: 'no' as const, label: 'No' },
  { value: 'unsure' as const, label: 'Not sure' },
];

export function Section({ id, title, children, intro }: { id: string; title: string; children: ReactNode; intro?: ReactNode }) {
  return (
    <section className="card input-section" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>{title}</h3>
      {intro && <p className="section-intro">{intro}</p>}
      {children}
    </section>
  );
}
