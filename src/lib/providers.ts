/**
 * Optional pension-provider directory.
 *
 * Intentionally EMPTY at launch: no provider URL, fee or feature has been verified.
 * Before adding an entry, verify every field against the provider's own website,
 * record the date checked, and obtain compliance review for any financial promotion.
 * Providers must never be ranked by commission. Display order = order in this array.
 */
export interface ProviderEntry {
  name: string;
  /** Verified destination URL (provider's own page). */
  url: string;
  /** Fees as published, with the date they were checked. */
  fees: string;
  feesCheckedOn: string;
  features: string[];
  eligibility: string;
  /** Required if the link earns commission; null if it does not. */
  affiliateDisclosure: string | null;
  lastVerified: string;
}

export const PROVIDERS: ProviderEntry[] = [];
