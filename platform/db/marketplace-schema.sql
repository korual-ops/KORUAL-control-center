-- KORUAL Life Service Marketplace v1
-- PostgreSQL / Supabase compatible
-- Transactional core: request -> quotes -> booking -> settlement -> review

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id uuid,
  name text,
  phone text,
  email text,
  region text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_name text,
  phone text,
  region text,
  service_category_ids uuid[] NOT NULL DEFAULT '{}',
  rating numeric(3,2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  completed_jobs integer NOT NULL DEFAULT 0 CHECK (completed_jobs >= 0),
  win_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (win_rate >= 0 AND win_rate <= 100),
  cancellation_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (cancellation_rate >= 0 AND cancellation_rate <= 100),
  revisit_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (revisit_rate >= 0 AND revisit_rate <= 100),
  warranty_days integer NOT NULL DEFAULT 0 CHECK (warranty_days >= 0),
  verified boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  service_category_id uuid NOT NULL REFERENCES service_categories(id),
  region text NOT NULL,
  address_text text,
  desired_date date,
  desired_time text,
  property_size numeric(10,2),
  property_type text,
  condition_grade text,
  options jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','QUOTING','QUOTED','BOOKED','COMPLETED','CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_category_id uuid NOT NULL REFERENCES service_categories(id),
  region text NOT NULL,
  property_type text,
  min_price numeric(12,2) NOT NULL CHECK (min_price >= 0),
  median_price numeric(12,2) NOT NULL CHECK (median_price >= 0),
  max_price numeric(12,2) NOT NULL CHECK (max_price >= median_price),
  sample_count integer NOT NULL DEFAULT 0 CHECK (sample_count >= 0),
  season_factor numeric(6,3) NOT NULL DEFAULT 1,
  effective_from date NOT NULL DEFAULT current_date,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES providers(id),
  quoted_price numeric(12,2) NOT NULL CHECK (quoted_price >= 0),
  travel_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (travel_fee >= 0),
  included_scope jsonb NOT NULL DEFAULT '{}',
  warranty_days integer NOT NULL DEFAULT 0 CHECK (warranty_days >= 0),
  estimated_duration_minutes integer,
  available_at text,
  note text,
  benchmark_deviation_pct numeric(8,2),
  quality_score numeric(6,2),
  final_score numeric(8,2),
  status text NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('INVITED','SUBMITTED','SHORTLISTED','ACCEPTED','REJECTED','EXPIRED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id, provider_id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES service_requests(id),
  quote_id uuid NOT NULL REFERENCES provider_quotes(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  provider_id uuid NOT NULL REFERENCES providers(id),
  scheduled_at timestamptz,
  agreed_price numeric(12,2) NOT NULL CHECK (agreed_price >= 0),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','REFUNDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id),
  gross_amount numeric(12,2) NOT NULL CHECK (gross_amount >= 0),
  platform_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  provider_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (provider_amount >= 0),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','READY','PAID','FAILED','REFUNDED')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  provider_id uuid NOT NULL REFERENCES providers(id),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requests_customer_created ON service_requests(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_status_created ON service_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_region_category ON service_requests(region, service_category_id);
CREATE INDEX IF NOT EXISTS idx_quotes_request_score ON provider_quotes(request_id, final_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_quotes_provider_created ON provider_quotes(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_benchmarks_lookup ON price_benchmarks(service_category_id, region, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_status ON bookings(provider_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reviews_provider_created ON reviews(provider_id, created_at DESC);

INSERT INTO service_categories (slug, name) VALUES
  ('move-in-cleaning', '입주청소'),
  ('moving', '이사'),
  ('water-purifier', '정수기 렌탈'),
  ('aircon-cleaning', '에어컨 청소'),
  ('internet-tv', '인터넷/TV'),
  ('grout-coating', '줄눈/코팅')
ON CONFLICT (slug) DO NOTHING;
