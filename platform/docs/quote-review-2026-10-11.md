# KORUAL: comparable quote review — 2026-10-11

## 1. Context
KORUAL's current Railway production frontend serves service discovery, matching and beta quote/booking screens. Its configured source is `platform/` on `feat/category-hub-v1-20261009`. Separate Sites prototypes also exist; this change targets Railway only. No production booking or customer data is mutated by the new component.

## 2. Problem definition
A low displayed base price cannot establish a low final cost when extras, taxes or scope are unknown. Existing comparisons emphasize price and trust scores; consumers still need an explicit method to record missing cost and contract information.

## 3. Bottleneck hypothesis
Comparable provider information, rather than additional categories, is a likely constraint on confident selection. This is a hypothesis, not a measured conversion finding. No funnel or transaction dataset was available in this change.

## 4. Competing hypotheses and evidence
- Incomplete price/scope: inspect how often customers must ask providers about extras; compare completion with and without structured costs.
- Insufficient supply: measure requests receiving at least two relevant, available provider replies.
- Reliability: measure request/quote API success and save success separately from frontend health.
- Excessive form friction: measure request-start to valid request completion by device.

Primary-source desk research:
- https://www.miso.kr/deepclean — service scope and situation-dependent cleaning surcharges.
- https://www.miso.kr/appclean — exclusions and additional costs such as paid parking.
- https://help.soomgo.com/hc/ko/articles/360045382411 — customer request, provider quote, comparison and consultation flow.
These are product observations, not independent evidence of KORUAL's conversion or demand.

## 5. Implemented solution
Three fixed quote slots (A/B/C) with base, extras, separate tax/fee, total budget, same-scope confirmation and cancellation/refund confirmation. Blank costs remain unknown; an incomplete known subtotal does not imply budget fit. Known subtotal already exceeding the budget can correctly show an overrun. No automatic cheapest-provider recommendation is produced.

Save, edit, restore and deletion operate only in current-tab sessionStorage. No free-text provider/customer fields, external transmissions, AI calls, payment actions or server booking changes. Storage failures must remain visible. This component is Korean-language; existing multilingual surfaces are unchanged. Values are integer KRW from 0 to 100 million per input.

## 6. Priority
P0: validate cost semantics and honest persistence status (this release).
P1: unify primary production entry and collect real provider quotes in one initial service/region. Proposed first experiment: household/air-conditioner cleaning in Yeongjong; confirm supply before promising availability.
P2: authenticated provider editing, server-backed quote revisions and request ownership, then booking/payment integration after end-to-end validation.

## 7. Systemization / business impact
Cash flow: test whether complete quotes improve confirmed job conversion; no revenue uplift claimed.
Automation: later map provider quote fields to the same cost schema, retaining provenance and expiry.
Asset building: accumulate consented, normalized scope/cost/outcome data rather than unverified scores.
Risk control: never replace unknowns with zeros, never turn personal notes into confirmed prices.

## 8. Validation and KPIs
Automated tests cover missing versus zero, malformed amounts, complete totals, budget status, scope conditions and storage normalization. Browser interaction targets: save -> modify -> save -> reload -> individual clear -> reload -> full delete -> reload, plus invalid amount and storage-denied paths.
Proposed pilot: 30 valid requests, tracking two-quote coverage, median first-response time, complete-price rate, selection rate, completed-job rate and repeat-request rate. Define denominators before collecting events. These are experiment design targets, not observed results or forecasts.
