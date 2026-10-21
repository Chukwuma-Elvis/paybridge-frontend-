---
name: money-and-units
description: Apply the money-handling rules. Use whenever parsing, storing, calculating, comparing or displaying an amount, a rate, a fee, a balance or a ledger line.
---

# Money and units

Policy owner: project owner. Source: plan invariant 6; PayBridge back end stores money as `long` minor units (cents, kobo).

1. **Integers only.** Amounts travel, are stored and compared as whole numbers of minor units. No floating-point arithmetic on money. Use integers or big integers; beware values above the safe integer range.
2. **Format at the edge.** Convert to a display string only when rendering, with the correct number of decimals for the currency (USD and NGN: 2). Use locale-aware formatting for grouping, never for arithmetic.
3. **Parse strictly.** Accept an optional thousands separator and one decimal point; reject more decimals than the currency allows, negative values where not allowed, empty input, exponent notation, and anything not a number. Show the field-level message.
4. **The server is the authority.** Do not recompute fees, spreads, rounded payouts or rates in the browser. Display what the API returns. (The API rounds the payout down and the fee up; the console must not "correct" this.)
5. **Rates** are decimal strings from the API; never convert them to floating point for display math. Show them as received.
6. **Ledger proof**: sum ledger lines per currency using integers; a balanced set sums to exactly zero; an unbalanced set is shown as an error, not rounded away.
7. **Tests**: include 0, 1 minor unit, the largest safe value, a value with a trailing zero, and bad input.

Before reporting done, search the diff for floating-point operations on amounts and include what you found.
