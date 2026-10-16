# Adding or updating a tax year

All thresholds live in `src/rules/`. Nothing else in the code base should contain a rate or
threshold.

1. **Review official sources.** Start from the URLs in `src/rules/sources.ts` (GOV.UK rates and
   allowances, employer rates and thresholds for the year, Scottish Income Tax, pension
   schemes rates, Tax-Free Childcare and free-childcare eligibility, HICBC, student loans,
   automatic-enrolment thresholds review).
2. **Create the configuration.** Copy the latest `src/rules/taxYearYYYY_YY.ts`, update every
   figure, set `startDate`/`endDate`, `dateVerified`, and `verificationStatus`
   (`provisional` until every figure is checked against a published table — the UI then shows
   a warning). Record anything unusual in `notes`.
3. **Register it** in `src/rules/index.ts` (`TAX_YEARS`, `SUPPORTED_TAX_YEARS`, and
   `DEFAULT_TAX_YEAR` when it becomes current) and add the id to `TaxYearId` in
   `src/rules/types.ts`.
4. **Boundary tests.** Add band boundary tests (below / at / above each limit) for rUK and
   Scotland, NI thresholds, student loan thresholds and any changed allowance in
   `src/tests/engine/`.
5. **Reference cases.** Work at least cases A–C from `docs/REFERENCE_CASES.md` by hand for the
   new year, add them to the doc, then to the tests. Never derive expected values from the
   engine itself.
6. **Methodology page.** `src/content/pages.tsx` reads the rules automatically; update the
   version history and any narrative that names a year or figure.
7. **Changelog.** Add an entry to `CHANGELOG.md`.
8. Run `npm test` and `npm run build`.
