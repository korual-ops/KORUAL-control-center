create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_platform text not null check (source_platform in ('1688', 'Temu', 'CJdropshipping', 'Manual')),
  source_url text,
  supplier_memo text,
  product_cost numeric(12, 2) not null default 0,
  shipping_cost numeric(12, 2) not null default 0,
  pipeline_stage text not null default 'intake',
  created_at timestamptz not null default now()
);

create table if not exists margin_scenarios (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  purchase_cost numeric(12, 2) not null,
  shipping_cost numeric(12, 2) not null,
  customs_vat numeric(12, 2) not null default 0,
  platform_fee_rate numeric(6, 4) not null default 0,
  payment_fee_rate numeric(6, 4) not null default 0,
  ad_cost numeric(12, 2) not null default 0,
  target_margin_rate numeric(6, 4) not null,
  recommended_selling_price numeric(12, 2) not null,
  expected_net_profit numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  external_order_id text unique,
  product_id uuid references products(id),
  status text not null,
  gross_revenue numeric(12, 2) not null default 0,
  net_profit numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists ai_templates (
  id uuid primary key default gen_random_uuid(),
  template_type text not null check (template_type in ('listing', 'customer_support')),
  title text not null,
  prompt text not null,
  created_at timestamptz not null default now()
);
