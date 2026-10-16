# Changelog

## 1.2.0 — 2026-10-16 (independent audit)

- F1: annual allowance pension input now includes relief-at-source contributions above the relief limit (FA 2004 s233, s188).
- F2: separate inputs for other personal (relief-at-source) contributions and employer contributions to other schemes.
- F3: childcare minimum income by each parent's age band; pay-based hint never resolves "Not sure"; pence formatting fix.
- F4: Plan 5 in 2025/26 is a visible error. F5: partner ANI used for the HICBC without a childcare assessment.
- F6: child disability defaults to "Not sure". F7: verification reported in four separate dimensions; wording tightened.
- F8: personal allowance allocated by ITA s25(2) "greatest reduction" (no numeric change found for 2026/27).
- Exact integer basis-point rounding; independent reference calculator, sweeps, optimiser validity and boundary tests (463 tests).
- PSA for Scottish taxpayers and Gift Aid in the annual allowance taper confirmed from legislation.
- F9 (review follow-up): carry-forward used is reported correctly when the MPAA applies (PTM055100).

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
