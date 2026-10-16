# Calculation conventions

This document fixes the definitions every engine module uses. Where code and this document
disagree, the code is wrong. Section numbers are referenced from code comments.

All money is integer pence. Inputs are annual amounts for one tax year and one individual.

## 1. Income components (one definition each, computed once in `engine/ani.ts`)

| Symbol | Name | Definition |
|---|---|---|
| `S`, `B` | Salary, bonus | Contractual amounts **before** salary sacrifice |
| `SS` | Salary sacrificed | Existing + additional sacrifice (becomes an employer contribution) |
| `NP` | Net-pay contributions (DC) | Employee DC contributions deducted from pay before Income Tax |
| `DBm` | DB member contributions | Employee contributions to a DB scheme, deducted from pay before Income Tax (also net pay; kept separate — §1.2, §6) |
| `G_ras` | Relief-at-source gross | Net paid by the employee ÷ (1 − 20%) |
| `G_ras,rel` | Relieved RAS gross | `min(G_ras, max(0, L − NP))`, `L = max(taxable earnings, £3,600)` |
| `GA` | Gift Aid gross | Net donation ÷ (1 − 20%), i.e. × 1.25 |
| `BiK` | Taxable benefits | Income Tax only |
| `P, O, Sv, D` | Property profit, other non-savings, savings interest, dividends | |

1.1 **Class 1 earnings** `E_NI = S + B − SS`. Used for employee NI, employer NI and student
loans. Net-pay contributions are **not** deducted (HMRC NIM02365: "NICs must be assessed on
the gross earnings before deduction of any pension contributions"). Relief-at-source
contributions are paid from net pay and are not deducted either.

1.2 **Employment income** `EI = E_NI − NP − DBm + BiK`, where `DBm` is the member's own defined
benefit contributions (net pay; kept separate from `NP` so they are not DC pension input — §6).

1.3 **Non-savings income** `NSI = EI + P + O`.

1.4 **Net income** `NI_net = NSI + Sv + D`.
It is the income figure **before** the personal allowance, **after** salary sacrifice (via
`E_NI`) and net-pay deductions (via `EI`), and **before** deducting relief-at-source gross
contributions and Gift Aid. Employer pension contributions (including sacrificed salary) are
never part of it. Trading losses and other step-1 reliefs are out of scope.

1.5 **Adjusted net income** `ANI = max(0, NI_net − G_ras,rel − GA)`
(GOV.UK "Adjusted net income", steps 1–3). Each pension contribution therefore reduces ANI
exactly once:

| Method | Reduces `E_NI` (NI, SL) | Reduces `EI` (taxable pay) | Deducted again in ANI step | Band extension |
|---|---|---|---|---|
| Salary sacrifice | yes | yes (via `E_NI`) | no | no |
| Net pay | **no** | yes | no | no |
| Relief at source | no | no | yes (gross) | yes (gross) |
| Gift Aid | no | no | yes (gross) | yes (gross) |
| Employer contribution | no | no | no | no |

Relief at source and Gift Aid both reduce ANI **and** extend the bands. These are two
separate statutory mechanisms (ITA 2007 s.58 and the basic/higher rate limit extension), not
double counting: the band extension does not reduce taxable income.

1.6 **Taxable earnings for the relief limit** `TE = E_NI + BiK` (GOV.UK pension schemes rates:
relief limited to the higher of 100% of UK taxable earnings and £3,600). Net-pay, DB member and
RAS contributions together share this limit; RAS above it is treated as unrelieved: it does not
reduce ANI, but it still counts as pension input (§6).

1.7 **Other schemes.** `otherPersonalRasGross` (a second personal relief-at-source contribution,
e.g. an existing SIPP) is added to `G_ras` and behaves exactly like any other RAS contribution.
`otherEmployerContributions` (employer contributions to other schemes) is added to employer
contributions: pension input and adjusted income only. Neither changes between baseline and proposal.

## 2. Personal allowance

`PA = max(0, £12,570 − floor((floor(ANI to £) − £100,000) / 2))` when ANI > £100,000.
£1 is lost for each **complete** £2. This rounding is a convention (see uncertainty U4).
PA is set against income components "in the way which will result in the greatest reduction" in tax (ITA 2007
s25(2), 2026-27 and earlier): every priority order of non-savings / savings / dividends is evaluated and
the lowest liability kept (ties → non-savings first). The allowance is used once only (s25(6)). From
2027-28 s25(3A) fixes the order (non-property/savings/dividend income first); the rule file field
`allowanceAllocation` selects the behaviour per tax year.

## 3. Income Tax

3.1 Taxable non-savings `T_ns = NSI − PA_ns`. Savings and dividends follow, using any PA left.

3.2 Non-savings income is taxed on the **jurisdiction's** bands:
- England, Wales, Northern Ireland: rUK bands.
- Scotland: Scottish bands (separate rule set; never derived from rUK).

3.3 Savings and dividends are taxed on **UK-wide** bands and rates for everyone, with
non-savings taxable income occupying the UK bands first.

3.4 **Band extension** `X = G_ras,rel + GA` is added to every band limit from the basic band
upwards: rUK basic and higher limits; Scottish basic, intermediate, higher and advanced limits
(not the starter limit); UK limits used for savings/dividends. This reproduces the extra
relief GOV.UK lists for Scottish taxpayers (none at 19%, 1% at 21%, 22% at 42%, 25% at 45%,
28% at 48%) — see uncertainty U2.

3.5 **Tax before claims** is calculated with `ANI = NI_net` and `X = 0` (what PAYE collects
when it does not know about RAS or Gift Aid). **Relief to claim** = tax before claims − final
tax. It is shown separately and is assumed claimed in take-home figures.

3.6 Each band amount × rate is computed exactly in integer basis points and rounded half-up to the
penny (`money.applyRate`); total tax = sum of bands. NI uses the same rounding; student loans and the
HICBC round down. Every rate in a rule file must be a whole number of basis points (`validateRules`).

## 4. Employee National Insurance

Category A, annualised, on `E_NI`: 8% between £12,570 and £50,270, 2% above. Each band
rounded to the penny. Salary sacrifice changes NI; net pay and RAS do not.

## 5. Take-home and the change in take-home

`Take-home = (E_NI + P + O + Sv + D) − NP − DB member contributions − RAS cash − Income Tax (final) − employee NI − student loan`

where `RAS cash = round(0.8 × G_ras,rel) + (G_ras − G_ras,rel)`. Gift Aid donations, Child
Benefit and the HICBC are **excluded** from take-home and shown separately.

The change in take-home between two scenarios decomposes exactly as

`Δ take-home = − Δ(pay given up or paid into pension) + Income Tax saved + employee NI saved + student loan saved`

where pay given up or paid into pension = `SS + NP + DB member contributions + RAS cash`. The UI shows these
components separately; childcare value is never part of them.

## 6. Annual allowance (estimate)

Here `NP` is DC net pay only; `DBm` is the member's own DB contributions (§1.2), entered separately as
`definedBenefitMemberContributions`.

Pension input (DC) = `SS + NP + G_ras + employer contributions` (FA 2004 s233(1)) — **all** RAS
contributions paid, including any part above the relief limit, because "relievable pension
contributions" (s188) are not capped by earnings; the s190 limit restricts relief only. Plus the DB
pension input (from the scheme statement), which already includes the value of `DBm`, so `DBm` is
never added to DC input.

Threshold income = `NI_net + SS − G_ras,rel` (s228ZA(5): only RAS contributions *entitled to relief*
are deducted; Gift Aid is not deducted). `NI_net` is already after `DBm`, and threshold income does
not add net pay back.

Adjusted income (s228ZA(4)) = net income + net-pay deductions + total pension input − contributions
paid by the individual
= `NI_net + (NP + DBm) + (SS + NP + G_ras + employer + DB input) − (NP + G_ras + DBm)`
= `NI_net + NP + SS + employer + DB input`.
`DBm` is added back as a net-pay deduction and subtracted as a contribution paid by the individual,
so it nets to nil: adjusted income for a DB member is net income (after `DBm`) plus the DB input,
not the DB input plus `DBm` again.

Taper when threshold income > £200,000 **and** adjusted income > £260,000; £1 per complete £2,
minimum £10,000. With the MPAA, see "Chargeable amount (MPAA)" below; carry-forward only adds to the
alternative allowance (PTM055100).

**Chargeable amount (MPAA).** Default = total input − (allowance + carry-forward) (s227ZA). If the MPAA
applies and DC input > £10,000, alternative = (DC − £10,000) + (DB − (allowance + carry-forward −
£10,000)) (s227B); it is used only if it exceeds the default (s227ZA). Carry-forward used is reported
on the same basis.

**Charge** (PTM056110/PTM056120): the excess is stacked on *reduced net income* = total taxable income
after the personal allowance (savings and dividends included) and charged at the main rates of the
band it falls in (rUK 20/40/45; Scottish rates for Scottish taxpayers with the starter rate replaced by
the Scottish basic rate). The personal allowance never shelters the excess; band limits are extended
by RAS and Gift Aid as for income.

## 7. Childcare

Each scheme is assessed condition by condition. The minimum-income threshold depends on each
parent's age band (21+, 18–20, under 18 or apprentice); if the band is "Not sure" all three amounts
are shown. The user's own answer decides the condition; an estimate from annual pay after salary
sacrifice ÷ 4 is shown as a hint only and never turns "Not sure" into "met". Any failed condition → "Not eligible"; else any
"Not sure"/missing material answer → "Eligibility not confirmed"; else "Appears eligible on the
answers given". The user's ANI is taken from the scenario; the partner's ANI is entered.

## 8. Validation

- Form: money ≥ 0, ≤ £100m, ≤ 2 decimals; percentages 0–100 (match ≤ 1000%); salary and target
  required; method required for any existing contribution. Invalid → results hidden.
- Engine: `validateInputs` rejects negative, non-finite or fractional-pence money and
  out-of-range percentages; `validateRules` rejects rule sets with rates outside [0,1], a RAS or
  Gift Aid gross-up rate that differs from the rUK basic rate, or band limits that are not
  strictly increasing. Both throw rather than return a result.
- Warnings (calculation continues): RAS above the relief limit; net pay or sacrifice above pay;
  Gift Aid where 25% of the donation exceeds the Income Tax liability (GOV.UK: donations must not
  exceed 4× tax paid; Capital Gains Tax is not modelled); contradictory contribution
  descriptions; unknown contribution basis.

## Uncertainties carried by these conventions

See `docs/RULES_VERIFICATION.md` (U1–U13).
