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
