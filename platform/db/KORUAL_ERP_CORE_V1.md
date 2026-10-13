# KORUAL ERP Core v1 — DB interface and rollout

**Status:** Both SQL migrations in this branch were applied to the existing KORUAL Supabase production database on 2026-10-13. This PR records the actual database DDL. Do not rerun in production without checking migration history.

## Architecture

Shared Supabase PostgreSQL for three frontends, with separate application permissions:

- **Consumer app**: published business/listing information, verified customer-owned order line/payment summaries through a trusted API.
- **Partner/business app**: own business, locations, listings, on-hand/reserved inventory, eligible order items, settlement statements and audit history.
- **Administrator app**: platform-wide operations via server-validated administrator claims and service APIs.

Existing tables are preserved: `profiles`, `providers`, `products`, `orders`, `bookings`, `provider_quotes`, `service_requests`, `categories`, `cloud_events`, `integration_connections`, and other marketplace tables. The ERP is an additive module, not a second conflicting ordering/booking engine.

## New tables

| Domain | Tables |
| --- | --- |
| Organization & IAM | `erp_businesses`, `erp_business_members` |
| Product & stock | `erp_locations`, `erp_product_listings`, `erp_inventory_balances`, `erp_inventory_movements` |
| Commerce & identity | `erp_customer_order_links`, `erp_order_items`, `erp_payments` |
| Payout accounting | `erp_settlements`, `erp_settlement_lines` |
| Integrations & control | `erp_external_records`, `erp_audit_events` |

## Access, correctness & trust boundary

1. All 13 tables have PostgreSQL RLS. Anonymous reads are restricted to active businesses and active product listings. Signed-in clients can only read their authorized rows. All table INSERT/UPDATE/DELETE operations are for trusted service-role backend code; the inventory RPC is the sole deliberate authenticated write path.
2. A business member cannot grant their own role. Membership provisioning must happen on the trusted server after identity/business verification. Never place Supabase `service_role` credentials in browser/mobile builds.
3. Administrator grants depend on server-signed `auth.jwt().app_metadata.role=admin` or `app_metadata.korual_role=platform_admin`, **not** the editable `profiles.role` column.
4. Use `erp_apply_inventory_movement` for manual inventory adjustments by **owner/manager**, signed in with Supabase Auth. It validates business/location/product linkage, checks inventory cannot go negative or reserved exceed on-hand, and records one audit entry. Stable `idempotency_key` prevents duplicate accounting for repeated requests.
5. Payments, settlements and external mappings are **data models**, not payment processing. All real charge, refund and payout transitions must be confirmed by a trusted provider webhook + transactional backend. Do not use client-side confirmation to mark money received.
6. The ERP balances are **not automatically synchronized** with legacy `products.stock`. A reconciliation/import step is required before claiming accurate omnichannel inventory. Existing marketplace booking state machines remain authoritative.

### Inventory RPC example (authenticated owner/manager)

```ts
await supabase.rpc('erp_apply_inventory_movement', {
  p_business_id: businessId,
  p_location_id: locationId,
  p_product_id: productId,
  p_movement_type: 'receipt',
  p_delta_on_hand: 5,
  p_delta_reserved: 0,
  p_idempotency_key: 'wms-receipt-' + receiptId,
  p_reference_type: 'receipt',
  p_reference_id: receiptId
});
```

API/backend must first provision an **active** business, an **active** location, a linked product listing (active/paused), and owner/manager membership.

## Next integration work

1. Implement authenticated admin onboarding and invite acceptance; map `providers.id` to `erp_businesses.provider_id`.
2. Implement product-listing synchronization from Cafe24/Shopify/Google Sheets with stable external IDs and webhook authentication.
3. Implement atomic checkout + order-item creation + inventory reservation/release on cancellation, with consistency checks and event deduplication.
4. Implement PG webhook verification, refunds and reconciliation, then derive settlement statements from verified financial events; ensure required payment regulations and contracts are satisfied.
5. Add warehouse adjustments, CSV imports, exports, customer order history and seller dashboards to frontend/backend endpoints. Perform permission tests with **two distinct businesses**, an authenticated customer, and anonymous access before launch.
6. Run Supabase security lint, verify production database backups, monitor migrations and performance, and address Auth leaked-password protection warning.

## Important status boundary

The **DB tables, policies, indexes and inventory RPC exist now**. The three app UIs, middleware workflows, warehouse-to-legacy stock reconciliation, real PG charges/payouts, and external provider connections are **not newly activated by this migration**. No seed customer or payment data were created.
