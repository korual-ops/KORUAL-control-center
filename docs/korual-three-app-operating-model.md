# KORUAL Three-App Operating Model — 2026-10-13

> Status: architecture proposal on a feature branch. This document does **not** mean that a Partner app, payments, settlement, or new auth/RLS policy is live.

## Executive decision

Separate **three user experiences**, retain **one transactional system of record**:

| Surface | Primary actor | Core job | Access |
|---|---|---|---|
| KORUAL Customer | Consumer | Search → criteria → comparison → request → booking → review | Open discovery; verified identity/contact at booking |
| KORUAL Partner | Merchant/service provider | Apply → manage supply → respond to matched requests → fulfill → reconcile | Authenticated, approved provider membership only |
| KORUAL Admin | KORUAL operations | Verify merchants, govern marketplace, resolve disputes, configure commissions, audit money & system | Server-validated admin access + stronger verification for money/account changes |

Suggested future entrypoints (NOT provisioned): `app.korual.com`, `partner.korual.com`, `admin.korual.com`.
Publish each as its own PWA / app package and its own manifest, install identity and analytics context. Use the same design system, API version contracts and transaction IDs. An admin screen must never be unlocked through a hidden client-side button.

## Repository reality check (read-only inspection, 2026-10-13)

- The current customer UI is a static/PWA surface under `platform/index.html` and `platform/site.js` with Supabase public API integration.
- Root `server.js` and existing admin routes handle operator identity and user administration.
- A complete Partner tenant membership / independent merchant console is not yet present.
- The active KORUAL Supabase schema has `providers`, `service_request_matches`, `provider_quotes`, `service_requests`, `bookings`; but the checked database has no tenant-to-provider membership table.
- Observed counts at inspection: providers = 3; recommendation_runs = 196; recommendation_events = 413; service_requests = 0; bookings = 0. These are not proof of conversion, revenue or real supplier activation.
- The existing `profiles.role` CHECK allows ADMIN/MANAGER/GUEST, not partner tenancy. **Do not** simply add PARTNER to global roles as a replacement for per-provider ownership checks.

## Primary bottleneck and success hypothesis

A split app without a closed order lifecycle adds cost without revenue. The product bottleneck is a measured funnel from recommendation to qualified request and provider response.

Hypothesis H1: reducing friction from results to request raises qualified request creation.
Hypothesis H2: a Partner inbox and fast quote submission increase first-response coverage and booked jobs.
Hypothesis H3: verified scope, upfront fees and on-time fulfillment lead to trust and repeat bookings.

**Do not mistake recommendation events for unique customers or completed transactions.** Instrument distinct visits, qualified requests, eligible suppliers, quotes, confirmed bookings and completed jobs.

## Core transaction state machine

```text
CUSTOMER: discover -> AI shortlist -> qualified request -> compare real quotes -> book -> review -> repeat
PARTNER: apply -> verified -> eligible lead -> accept invitation -> submit itemized quote -> confirm slot -> deliver -> reconcile
ADMIN: verification -> provider eligibility -> request/quote oversight -> booking recovery -> dispute/refund -> settled ledger -> quality policy
```

Single system of record: `request_id`, `quote_id`, `booking_id`, `payment_transaction_id`, `settlement_id` and append-only business event IDs.

Non-negotiable invariants:
- A Partner cannot see other providers' quotes, appointments, payout details or customer PII.
- A Partner sees only leads explicitly matched to their verified provider/tenant.
- Customer name and phone do not appear in the broad leads list. Disclose only after valid booking/consent under documented purpose.
- The server must validate user identity, active membership, permission and object ownership on **every** read/write. UI visibility is never authorization.
- Quote submission is idempotent; existing quote cannot be overwritten after acceptance. Amount, fees, inclusions, exclusions and expiry are explicit.
- Payment, refund, payout and fee changes use dedicated transaction APIs with idempotency and audit logging; never perform them from a browser with a service-role key.
- A disputed or cancelled transaction follows a defined reconciliation workflow, not direct edits to a settled balance.
- Keep immutable price and policy snapshots for the selected booking.
- An autonomous AI assistant may **draft** a quote, response or refund recommendation, but must not finalize money movement, account access or external publication without authorized approval.

## App information architecture

### Customer: five-tab navigation
1. Home — AI intent capture, transparent service discovery.
2. Compare — real supplier quotes, inclusions, verified status, timestamp and availability (clearly mark demos).
3. Bookings — confirmation status, changes, cancellation, support.
4. Benefits — review/rebook/coupons only when economically supported.
5. My — receipts, addresses/consent, account and privacy controls.

Fastest path: `intent -> region/date/budget -> match -> price/scope -> request -> quote -> booking`. Do not require full registration for discovery. Identity/contact only when required for completing a transaction.

### Partner: five-tab navigation
1. Inbox — assigned leads with deadline, response SLA and eligibility.
2. Calendar — hold/confirm capacity, schedule, no-show/recovery.
3. Services — categories, coverage, hours, lead time, transparent rates and exclusions.
4. Revenue — completed jobs, platform fees, settlement status and downloadable supporting documents.
5. Business — verification, staff/permissions, documents, quality, dispute inbox.

First-screen focus: actionable leads + response timer + next service appointments, not vanity revenue projections. Mobile quick actions: submit quote, confirm schedule, contact support, mark completed.

### Admin: six operational modules
1. Command Center — real qualified requests, lead coverage, bookings, alerts.
2. Partners — KYC/KYB review, coverage, compliance, performance and suspension.
3. Transactions — quote anomalies, booking recovery, disputes, refund evidence.
4. Finance — commission policy, payout approval, ledger reconciliation, chargeback risk.
5. Growth — channel attribution, funnel conversion, repeat, cohort and unit economics.
6. Platform — RBAC/MFA, audit, integrations, feature flags, incident health.

## Suggested data and authorization evolution

Keep existing `providers`, `service_request_matches`, `provider_quotes`, `bookings`, `service_requests`.
Add later (after staging schema review):
- `partner_memberships(provider_id, user_id, role, active, created_at)` with unique(provider_id,user_id), FK to `providers` and `auth.users`/profiles. Roles: OWNER / OPERATOR / VIEWER.
- `provider_verifications(provider_id, review_status, reviewer_id, verified_at, expiry_at, evidence_private_ref)`.
- `quote_line_items(quote_id, label, quantity, unit_price, included, required)` if current quote items migrations are not applied; do not duplicate existing `quote_items`.
- `partner_notification_preferences`, `partner_response_events`, `audit_events`.
- Prefer existing payment and ledger migrations rather than recreating money tables; check actual deployed schema before rollout.

RLS: every exposed table RLS enabled; restrict partner membership reads to own identity, and require verified membership for provider-scoped reads. Current transactional tables already use restrictive server-only RLS, so implement partner reads through a narrow **authenticated server API** first, without blanket table grants. Backend service role must be kept secret. Add tests for cross-tenant reads, guessed booking IDs, role escalation, stale sessions and revoked provider membership.

Reference implementation spec: `shared/partner-access.js` is a pure permission helper and **not wired into live routes**. Trust only actors resolved by the server; never client-provided role/membership claims.

## Business model: sequence, not everything at once

Phase 1: success fee on **verified completed** jobs, with written fee disclosure and refund treatment. Never depend on raw-lead sales before proving lead quality.

Phase 2: optional Partner Pro subscription for genuinely useful workflow software (calendar, CRM, analytics, auto-draft); charge when partner ROI is observable. Separate SaaS value from marketplace ranking. Sponsored positions must be clearly identified and must not overrule suitability/safety requirements.

Phase 3: enterprise API/white-label demand and procurement integrations, once transactions, support and unit economics are reliable.

Sample contribution-margin equation (illustrative, **not observed performance**):
`CM/job = recognized platform revenue - payment processing - variable support - refunds/fraud allowance - lead acquisition cost - AI/API variable costs`.
Track money by payment and payout statuses; never equate GMV with KORUAL revenue.

## KPIs and acceptance gates

North star: monthly **completed, net-positive-contribution-margin jobs**, alongside repeat rate and dispute rate.
- Demand: `qualified requests / eligible visits`, matching confidence, service category & source.
- Supply: `requests with >=1 eligible verified partner / qualified requests`, median first quote latency, quotes per request.
- Transaction: `confirmed bookings / qualified requests`, completion, cancellations.
- Unit economics: margin per completed booking, refund/chargeback rate, CAC and cohort rebook rate.
- Quality: schedule confirmation SLA, 90th percentile response time, honest review and dispute closure time.
- Reliability: data sync failure rate, queue age, RLS/security findings, payment ledger parity.

Proposed gating experiment:
1. One repeatable vertical and two regions, with actually verified provider supply.
2. 20 **test** qualified request flows with seeded/staging data and 100% tenant isolation checks (not live revenue).
3. 10 pilot real qualified requests, all with traceable acceptance/decline, then evaluate quote coverage.
4. Gate expansion on proven completed bookings, positive contribution margin and manageable disputes — thresholds defined after baseline rather than invented.

## 2026 legal/product compliance check

For Korea intermediary commerce, the revised Electronic Commerce Consumer Protection Act effective 2026-07-21 requires intermediary-status notice and relevant seller identity information before consumers place orders. Review disclosure/deletion criteria need legal review before launch. Distinguish operator vs merchant of record and each party's refund, receipt, tax and personal-information obligations. This is an implementation checklist, not a determination of licensing or legal status.

## 30-day proposed development order (no deployment asserted)

Week 1: instrumentation and customer conversion trace; partner verified membership and security boundary design.
Week 2: staging Partner lead inbox and quote submission with eligibility/tenant checks, concurrency and idempotency.
Week 3: booking confirmation and SLA notifications, admin exceptions/recovery; staging tests.
Week 4: controlled pilot, attribution + unit economics dashboard, security review and rollout decision.

### Done means
- Three independent app entry points/install identities.
- Shared single source of transactional truth.
- Partner can **only** access provider-scoped data, verified by negative security tests.
- At least one complete staging request -> quote -> booking -> completion -> ledger lifecycle.
- Monitoring, failure recovery and auditable financial controls are exercised.
- Legal and privacy notices approved for launch.

### Scope of this feature branch
Architecture, a portable scope-guard helper, and automated tests only. **No** SQL migration, live admin changes, production app or permission change was performed.
