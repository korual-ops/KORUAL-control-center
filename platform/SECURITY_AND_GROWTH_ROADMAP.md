# KORUAL — Marketplace Execution & Release Gates (2026-10-09)

## 1. Product position

KORUAL is a **trustworthy transaction and operations layer** for comparing local services, receiving quotes, and managing service appointments. The business outcome is **completed, correctly settled bookings**, not a count of category screens.

Core path:
`customer need → structured request → eligible providers → comparable quotes → explicit approval → confirmed booking → fulfillment → settlement → verified review → relevant next service`

**Present-state caution:** the repository contains production-oriented UI, seed/illustrative data, database migrations and API handlers. Their existence does not establish that every outside partner, payment processor, or booking flow is live. The frontend must label examples, stale quotes and unsupported services accurately.

## 2. The smallest monetizable vertical

Start with a geographically focused cohort and three high-frequency purchase missions:
- Move-in: moving, move-in cleaning, internet installation
- Home upkeep: AC cleaning, regular cleaning, minor repairs
- Connectivity: internet/TV/rental lead generation, subject to verified affiliate or provider agreements

Maintain broader category discovery but avoid booking promises until actual partner coverage and lawful fulfillment are verified. Air charter remains information-only until operator and quote integrations are complete.

## 3. Operational contracts

### Provider and quote truth
Store provider identity, verification status, coverage area, offered service IDs, available slots, last verified timestamp, cancellation and dispute rates, and consent/terms versions.

Every quote records:
- `request_id`, `provider_id`, `currency` (KRW), `base_amount`, `mandatory_fees`, `tax_included`, `total_amount`
- `included_scope`, `excluded_scope`, `warranty`, `availability_window`
- `valid_until`, `source_type` (`sample | estimate | provider_confirmed`), `last_confirmed_at`
- `ranking_explanation`, including price/quality/schedule factors

Unverified and expired offers must not be selectable for payment. Do not describe estimated prices as guaranteed final prices. Expose all mandatory fees before reservation confirmation.

### Booking and payments
Every state change must be server-authoritative and idempotent:
`requested → quoted → customer_approved → provider_confirmed → payment_pending → paid → in_progress → completed → settled`.
Support `rejected`, `expired`, `cancel_requested`, `cancelled`, `refund_pending`, `refunded`, `disputed`.

Never treat a browser success message as proof of payment or fulfillment. Verify provider confirmation and payment via server callbacks and event logs. Any customer charge/refund/settlement remains human-approved until auditably tested. Keep separate partner and platform ledgers, reconcile webhook events and lock duplicate settlements.

### Security and permissions
- Public client: service catalog, clearly marked price *ranges* where supported, privacy-safe request intake.
- Customer: only their authenticated requests and bookings.
- Partner: only authorized assignments and quote/availability writes.
- Operator: audit-trailed management actions through a server-side authenticated backend.
- Private automation: bearer-authorized server-to-server endpoint (`KORUAL_INTERNAL_API_TOKEN`, at least 32 random bytes), never sent from a public browser.

The automation gateway code now fails closed for all POST actions unless the private bearer is configured and supplied. This means the legacy browser administration UX cannot perform operational actions directly; it needs an authenticated BFF or a restricted server-side job runner before release. Do **not** solve this by adding a `VITE_` token.

## 4. Four release gates

| Gate | Requirement | Proof |
| --- | --- | --- |
| G0 — Reliability | deterministic build, passing tests, HTTPS, health checks, rollback | CI success; production 200/health and smoke paths |
| G1 — Quote truth | at least 3 genuine eligible providers per chosen local service, total price/scope/validity shown | signed provider onboarding and recorded quote responses |
| G2 — Booking completion | explicit customer approval, provider confirmation, conflict-safe slot hold, cancellations | end-to-end test including expiry and double booking |
| G3 — Money | executed partner agreements, payment reconciliation, refunds and commissions tracked | sandbox webhook test, finance reconciliation and dispute review |

Until G1/G2 are true, mark the feature `베타/견적문의` instead of `즉시 확정`.

## 5. KPI instrumentation

Track per cohort and category:
1. `request_submitted / qualified_session` — request conversion.
2. `quotes_within_24h / eligible_requests` — marketplace liquidity.
3. `provider_confirmed / booking_intents` — fulfilled intent.
4. `completed / provider_confirmed` — service completion rate.
5. `net_platform_revenue / completed_booking` — net revenue per fulfilled booking.
6. `gross_profit = platform_fee + affiliate_fee + subscription - refunds - payment_cost - variable_support_cost - incentives`.
7. `contribution_margin = gross_profit - attributable_acquisition_cost`.
8. Cancellation, dispute, repeat booking and median time-to-first-valid-quote.

Event records must use pseudonymous identifiers, idempotency keys, server timestamps and minimal retained personal data. Operational and marketing consent are separate.

## 6. Automation governance

Safe to automate: request classification, provider eligibility screening, dispatch drafts, quote change checks, inventory/service quality warnings, weekly KPI aggregates, and follow-up suggestions.

Require explicit human approval: partner agreement creation, bulk customer communications, claims about verified pricing, provider suspension, live charge/refund, payout, production deployment and policy changes.

A proposed AI recommendation must include a reason, evidence freshness, estimated financial impact and a reversible next action. If provenance is unknown, show `근거 부족` rather than inventing a confidence score.

## 7. Release order (highest value first)

1. Review and merge the security gateway PR; configure the private token on the relevant **server**. Test 401 unauthenticated, 200 authenticated, 405 GET mutation.
2. Verify which of Railway's KORUAL services is the canonical production entrypoint and eliminate duplicate public entrypoints after checking dependencies.
3. Add one end-to-end flow for a *real* move-in-cleaning request from submit to provider-confirmed booking, with data-source status displayed.
4. Build provider onboarding and availability correctness; include quote expiration, fees and warranty details.
5. Add a minimal event ledger and operations dashboard for quote latency, fulfillment and contribution margin.
6. Only after live payment contracts and verified sandbox callbacks, enable real payments, refunds and settlements.
7. Expand categories according to completion rate and contribution margin, not feature volume.

## 8. Operating philosophy

`현금흐름 → 레버리지 → 시스템화 → 자동화 → 자산화 → 네트워크 효과 → 장기 복리 → 리스크 차단`.

A unique dataset of verified provider fulfillment outcomes is the compounding asset. Avoid growth hacks based on fake quotes, hidden commissions, unverified ratings, over-collection of personal data, or unsupported availability claims.
