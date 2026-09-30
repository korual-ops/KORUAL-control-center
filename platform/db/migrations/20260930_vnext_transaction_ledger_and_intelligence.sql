-- KORUAL vNext: transaction ledger + normalized provider capability + price intelligence
-- PostgreSQL / Supabase compatible. Idempotent and additive.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Normalize provider <-> service relationships.
CREATE TABLE IF NOT EXISTS provider_services (
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_category_id uuid NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  base_price_min numeric(12,2) CHECK (base_price_min IS NULL OR base_price_min >= 0),
  base_price_max numeric(12,2) CHECK (base_price_max IS NULL OR base_price_max >= 0),
  default_warranty_days integer NOT NULL DEFAULT 0 CHECK (default_warranty_days >= 0),
  lead_time_minutes integer CHECK (lead_time_minutes IS NULL OR lead_time_minutes >= 0),
  daily_capacity integer CHECK (daily_capacity IS NULL OR daily_capacity >= 0),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, service_category_id)
);

CREATE TABLE IF NOT EXISTS provider_service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_category_id uuid REFERENCES service_categories(id) ON DELETE CASCADE,
  region_code text,
  region_name text NOT NULL,
  center_lat numeric(9,6),
  center_lng numeric(9,6),
  radius_km numeric(8,2) CHECK (radius_km IS NULL OR radius_km >= 0),
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_services_category_active
  ON provider_services(service_category_id, active);
CREATE INDEX IF NOT EXISTS idx_provider_service_areas_provider_active
  ON provider_service_areas(provider_id, active);
CREATE INDEX IF NOT EXISTS idx_provider_service_areas_region
  ON provider_service_areas(region_code, region_name);

-- 2) Explainable quote composition.
CREATE TABLE IF NOT EXISTS quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES provider_quotes(id) ON DELETE CASCADE,
  item_code text,
  item_name text NOT NULL,
  quantity numeric(12,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  total_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  included boolean NOT NULL DEFAULT true,
  required boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);

-- 3) AI Fair Price snapshots. Keep each model output versioned/auditable.
CREATE TABLE IF NOT EXISTS price_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  service_category_id uuid NOT NULL REFERENCES service_categories(id),
  region text,
  fair_price numeric(12,2) NOT NULL CHECK (fair_price >= 0),
  low_price numeric(12,2) NOT NULL CHECK (low_price >= 0),
  high_price numeric(12,2) NOT NULL CHECK (high_price >= low_price),
  confidence_score numeric(5,2) NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  sample_count integer NOT NULL DEFAULT 0 CHECK (sample_count >= 0),
  model_version text NOT NULL,
  feature_snapshot jsonb NOT NULL DEFAULT '{}',
  explanation jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_estimates_request_created
  ON price_estimates(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_estimates_market
  ON price_estimates(service_category_id, region, created_at DESC);

-- 4) Versioned KORUAL SCORE. Scores are explainable rather than a single opaque rank.
CREATE TABLE IF NOT EXISTS quote_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES provider_quotes(id) ON DELETE CASCADE,
  price_score numeric(5,2) NOT NULL CHECK (price_score BETWEEN 0 AND 100),
  quality_score numeric(5,2) NOT NULL CHECK (quality_score BETWEEN 0 AND 100),
  reliability_score numeric(5,2) NOT NULL CHECK (reliability_score BETWEEN 0 AND 100),
  fit_score numeric(5,2) NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  overall_score numeric(5,2) NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  model_version text NOT NULL,
  weights jsonb NOT NULL DEFAULT '{}',
  reasons jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_scorecards_quote_created
  ON quote_scorecards(quote_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_scorecards_overall
  ON quote_scorecards(overall_score DESC);

ALTER TABLE provider_quotes
  ADD COLUMN IF NOT EXISTS fair_price_estimate numeric(12,2),
  ADD COLUMN IF NOT EXISTS fair_price_deviation_pct numeric(8,2),
  ADD COLUMN IF NOT EXISTS score_model_version text;

-- 5) Payment state and immutable money ledger.
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id),
  transaction_type text NOT NULL CHECK (transaction_type IN ('AUTHORIZATION','CAPTURE','REFUND','VOID','PAYOUT','ADJUSTMENT')),
  status text NOT NULL CHECK (status IN ('PENDING','AUTHORIZED','SUCCEEDED','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency char(3) NOT NULL DEFAULT 'KRW',
  payment_provider text,
  external_transaction_id text,
  idempotency_key text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking_created
  ON payment_transactions(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_external
  ON payment_transactions(payment_provider, external_transaction_id);

CREATE TABLE IF NOT EXISTS transaction_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id),
  payment_transaction_id uuid REFERENCES payment_transactions(id),
  settlement_id uuid REFERENCES settlements(id),
  entry_type text NOT NULL CHECK (entry_type IN ('CUSTOMER_CHARGE','PLATFORM_FEE','PROVIDER_PAYABLE','PROVIDER_PAYOUT','CUSTOMER_REFUND','FEE_REFUND','ADJUSTMENT')),
  direction text NOT NULL CHECK (direction IN ('DEBIT','CREDIT')),
  account_code text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency char(3) NOT NULL DEFAULT 'KRW',
  idempotency_key text NOT NULL UNIQUE,
  external_reference text,
  metadata jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_ledger_booking_occurred
  ON transaction_ledger(booking_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_ledger_account_occurred
  ON transaction_ledger(account_code, occurred_at DESC);

-- 6) Refund/dispute lifecycle for consumer protection and operations.
CREATE TABLE IF NOT EXISTS refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id),
  payment_transaction_id uuid REFERENCES payment_transactions(id),
  requested_amount numeric(12,2) NOT NULL CHECK (requested_amount >= 0),
  approved_amount numeric(12,2) CHECK (approved_amount IS NULL OR approved_amount >= 0),
  reason_code text,
  reason_text text,
  status text NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED','REVIEWING','APPROVED','REJECTED','PROCESSING','COMPLETED','FAILED','CANCELLED')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id),
  customer_id uuid REFERENCES customers(id),
  provider_id uuid REFERENCES providers(id),
  dispute_type text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','INVESTIGATING','WAITING_CUSTOMER','WAITING_PROVIDER','RESOLVED','REJECTED','CLOSED')),
  summary text,
  resolution text,
  progress_due_at timestamptz,
  resolution_due_at timestamptz,
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_booking_status
  ON refund_requests(booking_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_booking_status
  ON disputes(booking_id, status, opened_at DESC);

-- 7) Consent and lifecycle audit. Store hashes/tokens, not raw sensitive browser identifiers.
CREATE TABLE IF NOT EXISTS customer_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  consent_type text NOT NULL,
  policy_version text NOT NULL,
  granted boolean NOT NULL,
  source text NOT NULL DEFAULT 'WEB',
  evidence_hash text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_customer_consents_lookup
  ON customer_consents(customer_id, consent_type, granted_at DESC);

CREATE TABLE IF NOT EXISTS service_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES service_requests(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id),
  event_type text NOT NULL,
  actor_type text,
  actor_id text,
  event_version text NOT NULL DEFAULT 'v1',
  payload jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_events_request
  ON service_events(request_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_events_booking
  ON service_events(booking_id, occurred_at DESC);
