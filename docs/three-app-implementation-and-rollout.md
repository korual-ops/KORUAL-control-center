# KORUAL — Three Independent Apps: Implementation & Rollout

**Build date:** 2026-10-13 · **Mode:** feature branch / draft PR (not production)
**Repository:** korual-ops/KORUAL-control-center

## What was implemented (code, not live deployment)

| App | Path on the root Express deployment | Scope |
|---|---|---|
| Existing customer | `platform/` (separate existing PWA/deployment) | Browse → compare → request → book |
| NEW KORUAL PARTNER | `/partner/` | Verified and tenant-scoped lead inbox, quote submission, quote history, booking status |
| NEW KORUAL ADMIN | `/operations/` | Authenticated read-only metric cockpit, qualified-request routing to verified supply |

Two distinct PWA manifests/icons/install scopes were added. Partner and Admin apps are served by the root Express deployment, while the existing Customer PWA remains separate. Domains and app-store releases are **not** provisioned.

## API contracts

- `GET /api/partner/me` — only verified real providers assigned to the authenticated user's active memberships
- `GET /api/partner/leads?provider_id=UUID` — assigned lead summaries only; no customer contact information
- `GET /api/partner/quotes?provider_id=UUID` — own previously submitted quotes
- `GET /api/partner/bookings?provider_id=UUID` — own booking states, no private consumer fields
- `POST /api/partner/quotes` — provider-scoped, non-demo, eligible lead, open request, validated amount/description; unique(provider_id,request_id) makes retries idempotent
- `GET /api/operations/overview` — privileged, actual count-only KPIs
- `GET /api/operations/requests` — non-sensitive summary of open requests
- `POST /api/operations/assign` — explicit admin approval to route up to three verified, active, non-demo providers with staff memberships and matching category/region

The routing engine is **conservative**, based on exact category labels and prefix-matched regions. It is not a precise geospatial availability/coverage engine and must be upgraded before broad commercial rollout. No AI model invents pricing or impersonates a provider.

## Security properties

- Existing JWT cookie auth from root `server.js`; identity is server-derived, not supplied by the UI.
- Account `profiles.active` rechecked on **every** partner API call.
- `partner_memberships` fetched fresh for every merchant-scoped operation.
- Provider must be `active=true`, `verified=true`, `is_demo=false`.
- UI never receives customer names, phone numbers or addresses via partner lead/booking responses.
- Only admin API with freshly checked admin role can approve lead assignments.
- API write endpoints require JSON, app-specific header and same-origin request. Use CSRF hardening/security review before release; headers are defense in depth, not sole authorization.
- Membership SQL enables RLS and revokes ordinary client grants; service-role access stays on backend.
- No refund, payout, payment capture, password handling, or auto-sent external messages are implemented.

## Deployment and data setup (not executed)

1. Prepare a separate Supabase staging branch/project. Run/validate `platform/db/migrations/20261013_partner_memberships.sql` there before deploying the app. Use the Supabase migration workflow; this branch does not mutate production data.
2. Review the deployed schema and existing migration history before applying new SQL.
3. Create staff accounts through the existing controlled auth onboarding. **Do not** set the global `profiles.role` to `ADMIN` for partners.
4. Verify a real business including business identity, eligibility, service category/region and truthful pricing. Mark `is_demo=false` and `verified=true` only after actual verification.
5. Bind the authenticated user to their verified real provider through an approved backoffice operation (never self-service role assignment). Example for approved DBA operations only:
   ```sql
   insert into public.partner_memberships(provider_id,user_id,role,active)
   values ('<approved-real-provider-uuid>','<auth-profile-user-uuid>','OWNER',true);
   ```
6. Configure the **server-only** `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `JWT_SECRET`, `ALLOWED_ORIGINS` and HTTPS. Never send secret/service-role keys to clients.
7. Deploy root API as a non-production preview; check `/partner/`, `/operations/`, and their scopes / install prompts. Existing customer `platform/` deployment stays intact.
8. Send a staging qualified request, approve a match from Admin, sign in as the right Partner and submit a quote. Check that a different Partner and a disabled staff account cannot read/alter it.
9. Confirm request→quote→booking end to end before turning on customer traffic. The current separate public Edge Function and Express root operate against the same DB but there is **no automatic routing hook**, so operator approval is required.
10. Complete mobile QA, privacy and consumer-law review, accessibility, secret rotation and vendor onboarding before production rollout.

## Explicit blockers (verified on 2026-10-13)

- Live KORUAL database currently has **3 providers and all three are demo**.
- `service_requests` and `bookings` each contain **0** records; no real booking conversion shown.
- New `partner_memberships` table is **not** deployed to the current database. Before migration, Partner API responds `PARTNER_SETUP_REQUIRED` rather than expose data.
- GitHub feature branch and draft PR are not merged; root API / two independent PWA entrypoints are not production deployed.
- Legacy customer PWA remains separate; cross-domain public app origin authorization and onboarding must be reviewed if moving Partner/Admin onto new hostnames.

## Validation

- Code is included in Node.js CI `npm test`, including helper tests, routing tests, partner authorization tests and root endpoint anonymous-access assertions.
- Separate smoke tests for customer/partner/admin flows, cross-tenant object IDs, revocation, race conditions, request-to-quote idempotency, and CSP on the deployed preview remain release gates.
- Supabase security advisors previously reported disabled leaked-password protection; enable before broad external login rollout.

## Next architecture ideas once conversion begins

- Intent-to-request recovery: measure completion of region/date/price inputs, alert the customer when information is missing, and offer precise next action rather than broad speculative AI.
- Partner lead-response SLA: a timed work queue (not synthetic speed metrics), honest schedule capacity, and alerts on 30/60 minute thresholds.
- Transparent quote breakdown: materials/labor/travel/inclusions/extra charges, estimate version and offer expiration.
- Confidence-aware ranking: separate evidence, scope, verified service coverage and price, with operational reliability only after sufficient completed samples.
- Contribution margin by booking, not GMV: fees earned net of payments, refunds, support and acquisition.
- Avoid pay-to-win ranking; paid tools and sponsored placements must remain explicitly distinct from organic fit ranking.
