# KORUAL Service Category Master v1

## Scope
The directory has 8 customer-facing domains, 31 service groups and 118 service entries. It replaces duplicated static front-end category cards through progressive enhancement but retains the original directory if JavaScript module load fails.

### Customer-facing roots
- home: 홈·리빙 — cleaning, repairs, interior, home care
- move: 이사·입주 — moving, move-in bundle, internet, storage
- mobility: 차량·모빌리티 — vehicle care, rental, transport
- wellness: 뷰티·웰니스 — beauty, fitness, relaxation
- travel: 여행·레저 — flights, accommodation, charter flights, activities
- commerce: 쇼핑·커머스 — own-brand goods, living goods, subscriptions
- now: KORUAL NOW — possible future seat/parking/queue availability
- business: 비즈니스·B2B — merchant OS, partner OS, sourcing, business services

## Status semantics
- `beta`: request-form preview only, **not** confirmed live bookings or payments. No verified provider availability is implied.
- `planned`: not open for transaction; display as coming soon.
- For KORUAL NOW, real-time claims are disabled until each source, freshness timestamp and provider authorization are verified.

Canonical definitions: `platform/category-catalog.js`.
Customer interface: `platform/category-hub.js`, `platform/category-hub.css`.
Built-in UI currently supports Korean and English names for all levels; Japanese, Chinese, Vietnamese titles are provided for eight top-level categories and interface controls, with English fallback for group/service labels.

## Request integration
Each active beta item pre-fills the existing Home request textarea. An optional **preferred** region is copied into the existing region field. Selecting a region never claims that a provider has inventory or covers that region. All booking and payment protections remain unchanged.

## Data model and migration
`platform/db/migrations/20261009_service_catalog_nodes.sql` is **not applied automatically**. It adds a normalized taxonomy tree with safe public read-only RLS policies. Existing `public.categories` legacy table is preserved.

After manual migration review, run:
```bash
cd platform
node scripts/generate-category-seed.mjs > category-seed.review.sql
```
Review the output before applying to a staging database. Seed generator never connects to DB or accesses credentials. Keep source data in catalog JS until the runtime DB-driven catalog has been tested; do not claim that database admin writes automatically update the website yet.

## Verification
```bash
cd platform
npm test
npm run build
npm run dev
```
Check both Home and Services directory, root navigation, Korean and English search, status filters, language switch, mobile width 320px, and beta request prefill. Test planned charter, NOW, and merchant SaaS entries to ensure no fake booking buttons appear.

## Remaining platform milestones
- Add QA for iOS Safari, Android Chrome, screen-reader navigation
- Fully translate group and leaf labels in Japanese, Chinese and Vietnamese
- Sync DB catalog with UI through a protected API and admin workflow
- Onboard real merchants/providers and test quote→booking→completion
- Payment and settlement only after contractual/legal/security review
