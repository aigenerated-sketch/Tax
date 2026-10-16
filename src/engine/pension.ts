import type { TaxYearRules } from '../rules/types';
import { clamp, nonNeg, roundPence } from './money';
import { grossUpAtBasicRate } from './ani';
import type {
  AdditionalContributionInputs,
  CalcWarning,
  ExistingPensionInputs,
  IncomeInputs,
  Pence,
  PensionMethod,
  ResolvedPension,
} from './types';

export const METHOD_LABELS: Record<PensionMethod, string> = {
  'salary-sacrifice': 'Salary sacrifice',
  'net-pay': 'Net-pay workplace pension',
  'ras-workplace': 'Relief-at-source workplace pension',
  'ras-sipp': 'Relief-at-source SIPP / personal pension',
};

export const isWorkplaceMethod = (m: PensionMethod) => m !== 'ras-sipp';
export const isReliefAtSource = (m: PensionMethod) => m === 'ras-workplace' || m === 'ras-sipp';

/** The pay figure a percentage contribution is applied to. */
export function pensionablePay(existing: ExistingPensionInputs, income: IncomeInputs, rules: TaxYearRules): Pence {
  switch (existing.pensionablePayBasis) {
    case 'basic-salary':
      return income.salary;
    case 'salary-and-bonus':
      return income.salary + income.bonus;
    case 'qualifying-earnings': {
      const { qualifyingEarningsLower: lo, qualifyingEarningsUpper: hi } = rules.pensions;
      return nonNeg(clamp(income.salary + income.bonus, 0, hi) - lo);
    }
    case 'custom':
      return nonNeg(existing.customPensionablePay);
  }
}

export const emptyPension = (): ResolvedPension => ({
  salarySacrifice: 0,
  netPay: 0,
  rasWorkplaceGross: 0,
  rasPersonalGross: 0,
  employerOther: 0,
});

/**
 * Interpret the user's existing pension figures as gross amounts per method.
 * Never silently guesses: inconsistent or unknown descriptions produce warnings.
 */
export function resolveExistingPension(
  existing: ExistingPensionInputs,
  income: IncomeInputs,
  rules: TaxYearRules,
): { pension: ResolvedPension; warnings: CalcWarning[] } {
  const warnings: CalcWarning[] = [];
  const pension = emptyPension();
  const base = pensionablePay(existing, income, rules);

  const employer =
    existing.employerMode === 'percent'
      ? roundPence((base * clamp(existing.employerPercent, 0, 100)) / 100)
      : nonNeg(existing.employerAmount);
  pension.employerOther = employer;

  const entered =
    existing.mode === 'percent' ? roundPence((base * clamp(existing.percent, 0, 100)) / 100) : nonNeg(existing.amount);

  if (entered === 0) return { pension, warnings };

  if (!existing.method) {
    warnings.push({
      id: 'existing-method-missing',
      severity: 'error',
      category: 'input',
      message: 'Choose how your existing pension contribution is paid. It has not been included in the calculation.',
    });
    return { pension, warnings };
  }

  if (existing.basis === 'unknown') {
    warnings.push({
      id: 'existing-basis-unknown',
      severity: 'warning',
      category: 'pension',
      message:
        'You said you are not sure how your existing contribution figure is stated. It has been treated as a gross amount; check a payslip or pension statement — the result may be inaccurate.',
    });
  }

  switch (existing.method) {
    case 'salary-sacrifice':
      if (existing.basis === 'net-ras') {
        warnings.push({
          id: 'existing-basis-mismatch',
          severity: 'warning',
          category: 'pension',
          message:
            'A "net relief-at-source" amount does not apply to salary sacrifice. The figure has been treated as the amount of salary sacrificed.',
        });
      }
      pension.salarySacrifice = entered;
      break;
    case 'net-pay':
      if (existing.basis === 'net-ras' || existing.basis === 'salary-sacrificed') {
        warnings.push({
          id: 'existing-basis-mismatch',
          severity: 'warning',
          category: 'pension',
          message:
            'The way the existing amount is described does not match a net-pay scheme. It has been treated as the employee contribution deducted before tax.',
        });
      }
      pension.netPay = entered;
      break;
    case 'ras-workplace':
    case 'ras-sipp': {
      let gross = entered;
      if (existing.basis === 'net-ras') gross = grossUpAtBasicRate(entered, rules.pensions.reliefAtSourceBasicRate);
      if (existing.basis === 'salary-sacrificed') {
        warnings.push({
          id: 'existing-basis-mismatch',
          severity: 'warning',
          category: 'pension',
          message: '"Salary sacrificed" does not apply to a relief-at-source pension. The figure has been treated as gross.',
        });
      }
      if (existing.method === 'ras-workplace') pension.rasWorkplaceGross = gross;
      else pension.rasPersonalGross = gross;
      break;
    }
  }
  return { pension, warnings };
}

/** Employer match on the additional contribution (workplace methods only). */
export function employerMatch(add: AdditionalContributionInputs): Pence {
  if (!isWorkplaceMethod(add.method) || add.grossAmount <= 0 || add.employerMatchPercent <= 0) return 0;
  const match = roundPence((add.grossAmount * clamp(add.employerMatchPercent, 0, 1000)) / 100);
  return add.employerMatchCap === null ? match : Math.min(match, nonNeg(add.employerMatchCap));
}

/** Add an additional gross contribution under the chosen method. */
export function withAdditional(base: ResolvedPension, method: PensionMethod, gross: Pence): ResolvedPension {
  const p = { ...base };
  const g = nonNeg(gross);
  switch (method) {
    case 'salary-sacrifice':
      p.salarySacrifice += g;
      break;
    case 'net-pay':
      p.netPay += g;
      break;
    case 'ras-workplace':
      p.rasWorkplaceGross += g;
      break;
    case 'ras-sipp':
      p.rasPersonalGross += g;
      break;
  }
  return p;
}
