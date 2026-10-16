import { METHOD_LABELS } from '../engine/pension';
import type { Jurisdiction, ParentAgeBand, PensionMethod } from '../engine/types';
import type { FieldErrors, FormState } from '../lib/form';
import { SUPPORTED_TAX_YEARS, TAX_YEARS } from '../rules';
import { Checkbox, MoneyField, PercentField, RadioGroup, Section, SelectField, YES_NO_UNSURE } from './fields';

export const JURISDICTIONS: { value: Jurisdiction; label: string }[] = [
  { value: 'england', label: 'England' },
  { value: 'wales', label: 'Wales' },
  { value: 'northern-ireland', label: 'Northern Ireland' },
  { value: 'scotland', label: 'Scotland' },
];

export const METHOD_OPTIONS: { value: PensionMethod; label: string }[] = (Object.keys(METHOD_LABELS) as PensionMethod[]).map((m) => ({
  value: m,
  label: METHOD_LABELS[m],
}));

const AGE_BANDS: { value: ParentAgeBand; label: string }[] = [
  { value: '21-plus', label: '21 or over' },
  { value: '18-20', label: '18 to 20' },
  { value: 'under-18-or-apprentice', label: 'Under 18, or an apprentice' },
  { value: 'unsure', label: 'Not sure / prefer not to say' },
];

const gbp = (p: number) => `£${(p / 100).toLocaleString('en-GB', { minimumFractionDigits: p % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;

/** Partner questions, used by both childcare and the Child Benefit charge. */
function PartnerFields({ form, errors, set }: Props) {
  return (
    <>
      <RadioGroup name="hasPartner" label="Do you have a partner who lives with you?" value={form.hasPartner} onChange={(v) => set('hasPartner', v)} options={YES_NO_UNSURE} />
      {form.hasPartner === 'yes' && (
        <>
          <Checkbox name="partnerAniKnown" label="I know my partner’s expected adjusted net income" checked={form.partnerAniKnown} onChange={(v) => set('partnerAniKnown', v)} />
          {form.partnerAniKnown && (
            <MoneyField name="partnerAni" label="Partner’s expected adjusted net income" required value={form.partnerAni} error={errors.partnerAni} onChange={(v) => set('partnerAni', v)} />
          )}
        </>
      )}
    </>
  );
}

interface Props {
  form: FormState;
  errors: FieldErrors;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}

export function InputPanel({ form, errors, set }: Props) {
  const rules = TAX_YEARS[form.taxYear];
  return (
    <div className="inputs" aria-label="Calculator inputs">
      <Section id="sec-jurisdiction" title="Tax year and where you pay tax">
        <div className="grid-2">
          <SelectField
            name="taxYear"
            label="Tax year"
            value={form.taxYear}
            error={errors.taxYear}
            onChange={(v) => set('taxYear', v)}
            options={SUPPORTED_TAX_YEARS.map((id) => ({ value: id, label: TAX_YEARS[id].label }))}
          />
          <SelectField
            name="jurisdiction"
            label="Income Tax jurisdiction"
            hint="Scotland has its own Income Tax bands on earned income."
            value={form.jurisdiction}
            onChange={(v) => set('jurisdiction', v)}
            options={JURISDICTIONS}
          />
        </div>
      </Section>

      <Section id="sec-income" title="Income" intro="Annual amounts for the tax year, before tax. Leave optional fields blank if they don’t apply.">
        <MoneyField
          name="salary"
          label="Annual gross salary"
          required
          hint="Contractual salary before any salary sacrifice."
          value={form.salary}
          error={errors.salary}
          onChange={(v) => set('salary', v)}
          placeholder="e.g. 110000"
        />
        <MoneyField
          name="bonus"
          label="Expected bonus"
          hint="Treated as taxable pay subject to employee NI."
          value={form.bonus}
          error={errors.bonus}
          onChange={(v) => set('bonus', v)}
        />
        <details className="more">
          <summary>Other income (benefits, property, savings, dividends)</summary>
          <MoneyField
            name="taxableBenefits"
            label="Taxable benefits in kind"
            hint="E.g. company car or medical insurance (P11D value). Income Tax only."
            value={form.taxableBenefits}
            error={errors.taxableBenefits}
            onChange={(v) => set('taxableBenefits', v)}
          />
          <MoneyField
            name="propertyIncome"
            label="Taxable property profit"
            hint="Rental profit after allowable expenses. Finance-cost credit not modelled."
            value={form.propertyIncome}
            error={errors.propertyIncome}
            onChange={(v) => set('propertyIncome', v)}
          />
          <MoneyField
            name="otherNonSavingsIncome"
            label="Other taxable non-savings income"
            hint="E.g. taxable pension income. No NI is applied. Do not include self-employment profit (Class 4 NI is not modelled)."
            value={form.otherNonSavingsIncome}
            error={errors.otherNonSavingsIncome}
            onChange={(v) => set('otherNonSavingsIncome', v)}
          />
          <MoneyField
            name="savingsInterest"
            label="Taxable savings interest"
            hint="Exclude ISA interest."
            value={form.savingsInterest}
            error={errors.savingsInterest}
            onChange={(v) => set('savingsInterest', v)}
          />
          <MoneyField
            name="dividends"
            label="Dividends"
            hint="Exclude ISA dividends."
            value={form.dividends}
            error={errors.dividends}
            onChange={(v) => set('dividends', v)}
          />
        </details>
      </Section>

      <Section id="sec-pension" title="Existing pension arrangements" intro="What you already pay. Check a payslip or pension statement if unsure.">
        <SelectField
          name="existingMethod"
          label="How is your existing contribution paid?"
          value={form.existingMethod}
          error={errors.existingMethod}
          onChange={(v) => set('existingMethod', v)}
          options={[{ value: '' as const, label: 'No existing contribution / not selected' }, ...METHOD_OPTIONS]}
        />
        {form.existingMethod !== '' && (
          <>
            <SelectField
              name="existingBasis"
              label="The amount you enter is…"
              value={form.existingBasis}
              onChange={(v) => set('existingBasis', v)}
              hint="For relief-at-source schemes, “before tax relief” is treated as the gross figure including the 20% top-up."
              options={[
                { value: 'employee-before-relief', label: 'Employee contribution before tax relief' },
                { value: 'net-ras', label: 'Net amount I pay into a relief-at-source pension' },
                { value: 'gross', label: 'Gross pension contribution' },
                { value: 'salary-sacrificed', label: 'Salary sacrificed' },
                { value: 'unknown', label: 'Not sure' },
              ]}
            />
            <RadioGroup
              name="existingMode"
              label="Enter as"
              value={form.existingMode}
              onChange={(v) => set('existingMode', v)}
              options={[
                { value: 'percent', label: 'Percentage of pay' },
                { value: 'fixed', label: 'Fixed annual amount' },
              ]}
            />
            {form.existingMode === 'percent' ? (
              <PercentField name="existingPercent" label="Your contribution" value={form.existingPercent} error={errors.existingPercent} onChange={(v) => set('existingPercent', v)} />
            ) : (
              <MoneyField name="existingAmount" label="Your annual contribution" value={form.existingAmount} error={errors.existingAmount} onChange={(v) => set('existingAmount', v)} />
            )}
          </>
        )}
        <RadioGroup
          name="employerMode"
          label="Existing employer contribution"
          value={form.employerMode}
          onChange={(v) => set('employerMode', v)}
          options={[
            { value: 'percent', label: 'Percentage of pay' },
            { value: 'fixed', label: 'Fixed annual amount' },
          ]}
        />
        {form.employerMode === 'percent' ? (
          <PercentField name="employerPercent" label="Employer contribution" hint="Leave blank if none or unknown." value={form.employerPercent} error={errors.employerPercent} onChange={(v) => set('employerPercent', v)} />
        ) : (
          <MoneyField name="employerAmount" label="Employer annual contribution" hint="Leave blank if none or unknown." value={form.employerAmount} error={errors.employerAmount} onChange={(v) => set('employerAmount', v)} />
        )}
        {(form.existingMode === 'percent' || form.employerMode === 'percent') && (
          <SelectField
            name="pensionablePayBasis"
            label="Percentages are calculated on"
            hint={`Schemes define pensionable pay differently — check your scheme rules. Qualifying earnings for ${rules.label}: £${(rules.pensions.qualifyingEarningsLower / 100).toLocaleString('en-GB')}–£${(rules.pensions.qualifyingEarningsUpper / 100).toLocaleString('en-GB')}.`}
            value={form.pensionablePayBasis}
            onChange={(v) => set('pensionablePayBasis', v)}
            options={[
              { value: 'basic-salary', label: 'Basic salary' },
              { value: 'salary-and-bonus', label: 'Salary and bonus' },
              { value: 'qualifying-earnings', label: 'Qualifying earnings band' },
              { value: 'custom', label: 'A pensionable pay figure I’ll enter' },
            ]}
          />
        )}
        {form.pensionablePayBasis === 'custom' && (form.existingMode === 'percent' || form.employerMode === 'percent') && (
          <MoneyField name="customPensionablePay" label="Pensionable pay" required value={form.customPensionablePay} error={errors.customPensionablePay} onChange={(v) => set('customPensionablePay', v)} />
        )}
      </Section>

      <Section id="sec-additional" title="Additional contribution to model">
        <SelectField
          name="additionalMethod"
          label="Method for the additional contribution"
          hint="Salary sacrifice, net-pay and workplace relief-at-source depend on what your employer offers."
          value={form.additionalMethod}
          onChange={(v) => set('additionalMethod', v)}
          options={METHOD_OPTIONS}
        />
        <MoneyField
          name="targetAni"
          label="Target adjusted net income"
          required
          hint="£100,000 is where the personal allowance taper and childcare limits start. You can choose a lower target."
          value={form.targetAni}
          error={errors.targetAni}
          onChange={(v) => set('targetAni', v)}
        />
        <details className="more">
          <summary>Employer matching and NI sharing (only if your employer offers it)</summary>
          <PercentField
            name="employerMatchPercent"
            label="Employer match on the additional contribution"
            hint="Enter only a match your employer has confirmed. Not applied to a SIPP."
            value={form.employerMatchPercent}
            error={errors.employerMatchPercent}
            onChange={(v) => set('employerMatchPercent', v)}
          />
          <MoneyField name="employerMatchCap" label="Annual cap on the match" hint="Leave blank if no cap." value={form.employerMatchCap} error={errors.employerMatchCap} onChange={(v) => set('employerMatchCap', v)} />
          <PercentField
            name="employerNiPassThroughPercent"
            label="Share of employer NI saving added to your pension (salary sacrifice)"
            hint="Many employers share none. Use 0 unless your employer has confirmed it."
            value={form.employerNiPassThroughPercent}
            error={errors.employerNiPassThroughPercent}
            onChange={(v) => set('employerNiPassThroughPercent', v)}
          />
        </details>
      </Section>

      <Section id="sec-childcare" title="Childcare">
        <Checkbox
          name="childcareAssess"
          label="Assess childcare eligibility"
          hint="Checks Tax-Free Childcare and the England working-parent funded hours. Shown separately from tax."
          checked={form.childcareAssess}
          onChange={(v) => set('childcareAssess', v)}
        />
        {form.childcareAssess && (
          <>
            <RadioGroup name="hasChild" label="Do you have a child you are considering funded hours or Tax-Free Childcare for?" value={form.hasChild} onChange={(v) => set('hasChild', v)} options={YES_NO_UNSURE} />
            <SelectField
              name="childAge"
              label="Child’s age"
              value={form.childAge}
              onChange={(v) => set('childAge', v)}
              options={[
                { value: 'under-9m', label: 'Under 9 months' },
                { value: '9m-to-2', label: '9 months to 2 years' },
                { value: '3-to-4', label: '3 or 4 (not yet at school)' },
                { value: '5-to-11', label: 'At school, up to 11' },
                { value: '12-to-16', label: '12 to 16' },
                { value: 'unsure', label: 'Not sure / prefer not to say' },
              ]}
            />
            <RadioGroup name="childDisabled" label="Is the child disabled (for Tax-Free Childcare purposes)?" value={form.childDisabled} onChange={(v) => set('childDisabled', v)} options={YES_NO_UNSURE} />
            <RadioGroup name="usesTaxFreeChildcare" label="Do you use or expect to use Tax-Free Childcare?" value={form.usesTaxFreeChildcare} onChange={(v) => set('usesTaxFreeChildcare', v)} options={YES_NO_UNSURE} />
            <SelectField name="childcareNation" label="Which UK nation’s childcare schemes apply?" value={form.childcareNation} onChange={(v) => set('childcareNation', v)} options={JURISDICTIONS} />
            <PartnerFields form={form} errors={errors} set={set} />
            <p className="hint">
              Minimum earnings over the next 3 months ({rules.label}): {gbp(rules.childcare.minimumIncomeQuarterly21Plus)} if aged 21 or over;{' '}
              {gbp(rules.childcare.minimumIncomeQuarterly18to20)} if 18–20; {gbp(rules.childcare.minimumIncomeQuarterlyUnder18OrApprentice)} if under 18 or an apprentice.
            </p>
            <SelectField name="userAgeBand" label="Your age band (sets your minimum-income amount)" value={form.userAgeBand} onChange={(v) => set('userAgeBand', v)} options={AGE_BANDS} />
            <RadioGroup
              name="userMeetsMinimumIncome"
              label="Do you expect to earn at least the minimum for your age over the next 3 months?"
              hint="Earnings from employment or self-employment before tax. Dividends, interest, property and pension income do not count."
              value={form.userMeetsMinimumIncome}
              onChange={(v) => set('userMeetsMinimumIncome', v)}
              options={YES_NO_UNSURE}
            />
            {form.hasPartner === 'yes' && (
              <>
                <SelectField name="partnerAgeBand" label="Partner’s age band" value={form.partnerAgeBand} onChange={(v) => set('partnerAgeBand', v)} options={AGE_BANDS} />
                <RadioGroup
                  name="partnerMeetsMinimumIncome"
                  label="Does your partner expect to earn at least the minimum for their age over the next 3 months?"
                  value={form.partnerMeetsMinimumIncome}
                  onChange={(v) => set('partnerMeetsMinimumIncome', v)}
                  options={YES_NO_UNSURE}
                />
              </>
            )}
            <RadioGroup
              name="taxFreeChildcareBars"
              label="Do you get Universal Credit childcare, childcare vouchers, or a childcare bursary/grant — or foster the child, or does the child not usually live with you?"
              value={form.taxFreeChildcareBars}
              onChange={(v) => set('taxFreeChildcareBars', v)}
              options={YES_NO_UNSURE}
            />
            <RadioGroup
              name="immigrationOrNiIssue"
              label="Does either parent lack a National Insurance number or the required immigration status?"
              value={form.immigrationOrNiIssue}
              onChange={(v) => set('immigrationOrNiIssue', v)}
              options={YES_NO_UNSURE}
            />
            <MoneyField name="annualChildcareCost" label="Annual childcare costs (optional)" hint="Used only to estimate the Tax-Free Childcare top-up." value={form.annualChildcareCost} error={errors.annualChildcareCost} onChange={(v) => set('annualChildcareCost', v)} />
            <MoneyField name="providerHourlyRate" label="Provider’s hourly rate (optional)" hint="Used only to illustrate the value of funded hours." value={form.providerHourlyRate} error={errors.providerHourlyRate} onChange={(v) => set('providerHourlyRate', v)} />
          </>
        )}
      </Section>

      <Section id="sec-other" title="Optional adjustments">
        <MoneyField name="giftAidNet" label="Gift Aid donations (amount you paid)" hint="Grossed up by 25% and deducted from adjusted net income." value={form.giftAidNet} error={errors.giftAidNet} onChange={(v) => set('giftAidNet', v)} />
        <div className="grid-2">
          <SelectField
            name="studentLoanPlan"
            label="Student loan plan"
            value={form.studentLoanPlan}
            error={errors.studentLoanPlan}
            onChange={(v) => set('studentLoanPlan', v)}
            options={[
              { value: 'none', label: 'None' },
              { value: 'plan1', label: 'Plan 1' },
              { value: 'plan2', label: 'Plan 2' },
              { value: 'plan4', label: 'Plan 4 (Scotland)' },
              { value: 'plan5', label: rules.studentLoans.plans.plan5 ? 'Plan 5' : `Plan 5 (not available in ${rules.label})` },
            ]}
          />
          <Checkbox name="postgraduateLoan" label="Postgraduate loan" checked={form.postgraduateLoan} onChange={(v) => set('postgraduateLoan', v)} />
        </div>
        <MoneyField
          name="childBenefitAnnual"
          label="Child Benefit received per year"
          hint="Used to estimate the High Income Child Benefit Charge. Separate from childcare schemes."
          value={form.childBenefitAnnual}
          error={errors.childBenefitAnnual}
          onChange={(v) => set('childBenefitAnnual', v)}
        />
        {!form.childcareAssess && form.childBenefitAnnual.trim() !== '' && (
          <>
            <p className="hint">The charge is paid by the partner with the higher adjusted net income, so your partner’s income matters.</p>
            <PartnerFields form={form} errors={errors} set={set} />
          </>
        )}
        <details className="more">
          <summary>Pension annual allowance details</summary>
          <RadioGroup
            name="mpaaTriggered"
            label="Have you flexibly accessed a defined contribution pension (triggering the money purchase annual allowance)?"
            value={form.mpaaTriggered}
            onChange={(v) => set('mpaaTriggered', v)}
            options={YES_NO_UNSURE}
          />
          <Checkbox name="carryForwardKnown" label="I have verified my unused allowance from the previous three years" checked={form.carryForwardKnown} onChange={(v) => set('carryForwardKnown', v)} />
          {form.carryForwardKnown && (
            <MoneyField name="carryForward" label="Verified carry-forward available" required value={form.carryForward} error={errors.carryForward} onChange={(v) => set('carryForward', v)} />
          )}
          <Checkbox name="definedBenefitMember" label="I am in a defined benefit (final salary / career average) scheme" checked={form.definedBenefitMember} onChange={(v) => set('definedBenefitMember', v)} />
          {form.definedBenefitMember && (
            <MoneyField
              name="definedBenefitPensionInput"
              label="DB pension input amount for the year"
              hint="From your scheme’s pension savings statement. This is not your contribution."
              value={form.definedBenefitPensionInput}
              error={errors.definedBenefitPensionInput}
              onChange={(v) => set('definedBenefitPensionInput', v)}
            />
          )}
          {form.definedBenefitMember && (
            <MoneyField
              name="definedBenefitMemberContributions"
              label="Your own contributions to the defined benefit scheme this year"
              hint="Deducted from pay before tax. Enter them here, not as an existing contribution above, so they are not counted twice."
              value={form.definedBenefitMemberContributions}
              error={errors.definedBenefitMemberContributions}
              onChange={(v) => set('definedBenefitMemberContributions', v)}
            />
          )}
          <MoneyField
            name="otherPersonalRasGross"
            label="Other personal pension contributions you already make (gross)"
            hint="E.g. an existing SIPP alongside your workplace scheme: what you pay plus the 20% top-up. Treated as relief at source — it reduces adjusted net income and counts towards the annual allowance."
            value={form.otherPersonalRasGross}
            error={errors.otherPersonalRasGross}
            onChange={(v) => set('otherPersonalRasGross', v)}
          />
          <MoneyField
            name="otherEmployerContributions"
            label="Employer contributions to other pension schemes"
            hint="Counted towards the annual allowance and the taper’s adjusted income. Does not affect your tax."
            value={form.otherEmployerContributions}
            error={errors.otherEmployerContributions}
            onChange={(v) => set('otherEmployerContributions', v)}
          />
        </details>
      </Section>
    </div>
  );
}
