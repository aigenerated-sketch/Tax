# Independently worked reference cases (2026/27)

Each case was worked by hand from the GOV.UK rates (see the source register in the README)
**before** being written into the tests. Tests compare engine output to these figures to the
penny. Rates used: personal allowance £12,570 tapered £1 per £2 over £100,000; rUK bands
20% to £37,700 taxable, 40% to £125,140, 45% above; Scottish bands (taxable) 19% to £3,967,
20% to £16,956, 21% to £31,092, 42% to £62,430, 45% to £125,140, 48% above; employee NI 8%
£12,570–£50,270, 2% above.

| Case | Inputs | Working | Expected | Test |
|---|---|---|---|---|
| A | England, salary £60,000 | PA 12,570; taxable 47,430; 37,700×20% = 7,540; 9,730×40% = 3,892 | Tax £11,432; NI £3,210.60 (37,700×8% + 9,730×2%); take-home £45,357.40 | incomeTax, nationalInsurance |
| B | England, salary £110,000 | PA 12,570 − 5,000 = 7,570; taxable 102,430; 7,540 + 64,730×40% | Tax £33,432; NI £4,210.60; take-home £72,357.40 | incomeTax, pension |
| B-SS | B + £10,000 salary sacrifice | Pay 100,000; PA 12,570; taxable 87,430; 7,540 + 49,730×40% | Tax £27,432; NI £4,010.60; take-home £68,557.40 (−£3,800) | pension |
| B-NP | B + £10,000 net pay | Taxable pay 100,000 → tax £27,432; NI on £110,000 | Take-home £68,357.40 (−£4,000) | pension |
| B-RAS | B + £10,000 gross SIPP (£8,000 paid) | ANI 100,000 → PA 12,570; taxable 97,430; basic band 47,700: 9,540 + 49,730×40% | Tax £29,432; relief to claim £4,000; take-home −£4,000 | pension |
| C | Scotland, salary £110,000 | Taxable 102,430: 753.73 + 2,597.80 + 2,968.56 + 13,161.96 + 40,000×45% | Tax £37,482.05 | incomeTax |
| D | England, salary £150,000 | PA 0; 7,540 + 87,440×40% + 24,860×45% | Tax £53,703 | incomeTax |
| E | England, salary £125,140 | PA 0; 7,540 + 87,440×40% | Tax £42,516 | incomeTax |
| F | Scotland, salary £50,000 | Taxable 37,430: 6,320.09 + 6,338×42% | Tax £8,982.05 | incomeTax |
| G | Wales, salary £100,000 | Taxable 87,430; same as rUK | Tax £27,432 | incomeTax |
| S1 | England £60,000 + £2,000 interest | Higher-rate: PSA £500; 1,500×40% | Savings tax £600 | incomeTax |
| S2 | £14,000 + £6,000 interest | Taxable NS 1,430; starting band 3,570 at 0%; PSA 1,000; 1,430×20% | Savings tax £286 | incomeTax |
| D1 | England £60,000 + £5,000 dividends | £500 allowance; 4,500×35.75% | Dividend tax £1,608.75 | incomeTax |
| D2 | Scotland £50,000 + £10,000 dividends | UK position: 37,430 + 500 allowance; 9,500 above £37,700 at 35.75% | Dividend tax £3,396.25 | incomeTax |
| SL | Plan 2, £60,000 | (60,000 − 29,385)×9% | £2,755.35; with £10k sacrifice £1,855.35 | other |
| H | Child Benefit £2,000 (illustrative entry), ANI £70,000 | (70,000 − 60,000)/200 = 50% | Charge £1,000 | other |
| AA | Net income £300k, employer £10k | Adjusted income 310k; reduction 25,000 | Allowance £35,000 | other |
| M | England £110,000 marginal | 40% + 50p of PA × 40% | IT 60%, +NI 62% | other, UI |
| MS | Scotland £110,000 marginal | 45% × 1.5 | IT 67.5%, +NI 69.5% | other, UI |

Child Benefit and childcare costs in tests are illustrative inputs supplied by the user in
the app, not rates assumed by the engine.

## Adjusted net income (conventions §1)

All England 2026/27, salary £110,000 unless stated. `ANI = salary + bonus − sacrifice − net pay + other income − RAS gross − Gift Aid gross`.

| Test | Inputs | Working | Expected ANI |
|---|---|---|---|
| ANI-1 | No contribution | 110,000 | £110,000 |
| ANI-2 | £10,000 salary sacrifice | 110,000 − 10,000 (lower salary) | £100,000 |
| ANI-3 | £10,000 net pay | 110,000 − 10,000 (deducted before tax) | £100,000 |
| ANI-4 | £10,000 gross RAS workplace / SIPP (£8,000 paid) | 110,000 − 8,000 ÷ 0.8 | £100,000 |
| ANI-5 | £4,000 Gift Aid paid | 110,000 − 4,000 × 1.25 | £105,000 |
| ANI-6 | Employer contribution £20,000 | not deducted | £110,000 |
| ANI-7 | Existing net pay £3,000 + £5,000 sacrifice + £800 Gift Aid | 110,000 − 5,000 − 3,000 − 1,000 | £101,000 |
| ANI-8 | Existing SIPP £2,000 gross + £5,000 sacrifice + £800 Gift Aid | 110,000 − 5,000 − 2,000 − 1,000 | £102,000 |
| ANI-9 | Existing net pay £3,000 + £2,000 SIPP gross + £800 Gift Aid | 110,000 − 3,000 − 2,000 − 1,000 | £104,000 |
| ANI-10 | Benefits £2,000, property £3,000, savings £1,000, dividends £2,000, £4,000 sacrifice | 110,000 + 8,000 − 4,000 | £114,000 |
| ANI-11 | All income zero | — | £0 |
| ANI-12 | Zero income, £3,600 gross SIPP (£2,880 paid) | max(0, 0 − 3,600); within £3,600 basic amount | £0 |
| ANI-13 | Salary £30,000, property £110,000, £40,000 SIPP gross | relief limited to £30,000 earnings → 140,000 − 30,000 | £110,000 (+ warning) |
| ANI-14 | Negative, NaN, infinite or fractional-pence money; percentage > 100 | — | engine throws, no result |

### Four-way combination (composed from engine functions)

Salary £110,000; £5,000 sacrifice; £3,000 net pay; £2,000 RAS gross (£1,600 paid); £800 Gift Aid paid.

| Step | Working | Result |
|---|---|---|
| Class 1 earnings | 110,000 − 5,000 | £105,000 |
| Net income | 105,000 − 3,000 | £102,000 |
| ANI | 102,000 − 2,000 − 1,000 | £99,000 → PA £12,570 |
| Taxable income | 102,000 − 12,570 | £89,430 |
| Income Tax | basic band 37,700 + 3,000 = 40,700 → 8,140 + 48,730 × 40% | £27,632 |
| Tax before claims | PA 11,570, taxable 90,430 → 7,540 + 52,730 × 40% | £28,632 → claim £1,000 |
| Employee NI | 3,016 + 54,730 × 2% | £4,110.60 |
| Take-home | 105,000 − 3,000 − 1,600 − 27,632 − 4,110.60 | £68,657.40 |
| Change vs £72,357.40 | −(5,000 + 3,000 + 1,600) + 5,800 + 100 | −£3,700 |

The claim of £1,000 = 3,000 band extension × 20% (£600) + 1,000 of restored allowance × 40% (£400).

## Income Tax saved vs NI saved vs take-home (£10,000 gross, salary £110,000)

| Jurisdiction / method | Income Tax saved | of which claimed from HMRC | Employee NI saved | Pay given up / paid in | Δ take-home |
|---|---|---|---|---|---|
| England, salary sacrifice | £6,000 | £0 | £200 | £10,000 | −£3,800 |
| England, net pay | £6,000 | £0 | £0 | £10,000 | −£4,000 |
| England, SIPP / RAS | £4,000 (+ £2,000 top-up in the pension) | £4,000 | £0 | £8,000 | −£4,000 |
| Scotland, salary sacrifice | £6,750 (37,482.05 → 30,732.05) | £0 | £200 | £10,000 | −£3,050 |
| Scotland, SIPP / RAS | £4,750 (37,482.05 → 32,732.05) | £4,750 | £0 | £8,000 | −£3,250 |

Scotland SIPP working: taxable 97,430 with bands extended by 10,000 from the basic band upward: 753.73 + 22,989 × 20% + 14,136 × 21% + 31,338 × 42% + 25,000 × 45% = £32,732.05.

## Boundary table (salary only, full-year, 2026/27)

| Salary | England/Wales/NI tax | Scotland tax | Employee NI |
|---|---|---|---|
| £12,570 | £0 | £0 | £0 |
| £12,571 | £0.20 | £0.19 | £0.08 |
| £16,537 / £16,538 | — | £753.73 / £753.93 | — |
| £29,526 / £29,527 | — | £3,351.53 / £3,351.74 | — |
| £43,662 / £43,663 | — | £6,320.09 / £6,320.51 | — |
| £50,269 / £50,270 / £50,271 | £7,539.80 / £7,540 / £7,540.40 | — | £3,015.92 / £3,016 / £3,016.02 |
| £75,000 / £75,001 | — | £19,482.05 / £19,482.50 | — |
| £99,999 / £100,000 | £27,431.60 / £27,432 | — / £30,732.05 | — |
| £100,001 | £27,432.40 (PA unchanged, U4) | — | — |
| £100,002 | £27,433.20 (PA £12,569) | £30,733.40 | — |
| £125,139 | £42,515.20 (PA £1) | — | — |
| £125,140 / £125,141 | £42,516 / £42,516.45 | £47,701.55 / £47,702.03 | — |

Other boundaries: HICBC (£2,000 entered) £0 at ANI £60,199, £20 at £60,200, £1,980 at £79,999, £2,000 at £80,000. Annual allowance: £60,000 at adjusted income £260,000 and £260,001; £59,999 at £260,002; no taper at threshold income £200,000; taper at £200,001; £10,000 minimum at £360,000. Childcare: eligible at ANI £100,000, not eligible at £100,000.01.

## Gift Aid 4× check

Salary £20,000 → Income Tax (20,000 − 12,570) × 20% = £1,486. Donation £5,944 → reclaimed £1,486 = tax → no warning. £5,944.04 → £1,486.01 → warning. £8,000 → £2,000 → warning (shortfall £514).
