# Changelog

## 1.1.0 — 2026-10-16

- Validated every 2026/27 rate, threshold and rule against GOV.UK, HMRC manuals and the Scottish Government; register in `docs/RULES_VERIFICATION.md` (generated) and on `/methodology`.
- Confirmed savings rates from the Budget 2025 rates annex; confirmed Scottish bands against gov.scot and the Scottish Rate Resolution.
- `engine/ani.ts` now defines net income once (`computeIncomeComponents`); conventions in `docs/CALCULATION_CONVENTIONS.md`.
- Engine-level validation of inputs and rule sets (relief-at-source and Gift Aid rates must equal the UK basic rate; band limits increasing).
- Gift Aid 4× tax warning; relief-limit tests at £3,600 with no earnings.
- UI states the jurisdiction and tax year above results; slider results grouped into Pension, Income Tax, National Insurance, Student loan and Take-home, with a reconciliation line; comparison table grouped the same way.
- New tests: ANI combinations and invalid inputs, double counting, salary-level boundaries (rUK, Scotland, NI, HICBC, annual allowance, childcare), validation, verification register.

## 1.0.0 — 2026-10-16

- First release.
- 2026/27 rules (default) and 2025/26 rules, checked against GOV.UK on 2026-10-16.
- England, Wales, Northern Ireland and Scotland Income Tax; savings and dividend income.
- Employee Class 1 NI (category A); employer NI for salary-sacrifice estimates.
- Salary sacrifice, net-pay, relief-at-source workplace and SIPP methods; employer match and NI pass-through.
- ANI optimiser, marginal rates, method comparison, breakdown chart with table alternative.
- Annual allowance (taper, MPAA, carry-forward), student loans, Gift Aid, HICBC.
- Tax-Free Childcare and England working-parent funded hours eligibility.
- Printable report with employer discussion notes.
