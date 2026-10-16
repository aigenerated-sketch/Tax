import { nonNeg } from './money';
import type { Pence } from './types';

export interface AniInput {
  /**
   * Net income for the year: total taxable income from all supported sources AFTER
   * salary sacrifice (which lowers contractual pay) and net-pay pension contributions
   * (which are deducted from employment income before tax). Employer contributions are
   * never deducted.
   */
  netIncome: Pence;
  /** Gross relief-at-source contributions that qualify for relief (net paid + basic-rate top-up). */
  reliefAtSourceGross: Pence;
  /** Gift Aid donations grossed up at the basic rate (net × 100/80). */
  giftAidGross: Pence;
}

/**
 * Adjusted net income (ITA 2007 s.58), as described in GOV.UK "Adjusted net income":
 * net income − grossed-up Gift Aid − grossed-up relief-at-source pension contributions.
 * Trading losses and trade-union/police add-backs are outside this calculator's scope.
 */
export function adjustedNetIncome(input: AniInput): Pence {
  return nonNeg(input.netIncome - nonNeg(input.reliefAtSourceGross) - nonNeg(input.giftAidGross));
}

/** Gross up a net Gift Aid donation at the basic rate. */
export function grossUpAtBasicRate(net: Pence, basicRate: number): Pence {
  return Math.round(nonNeg(net) / (1 - basicRate));
}
