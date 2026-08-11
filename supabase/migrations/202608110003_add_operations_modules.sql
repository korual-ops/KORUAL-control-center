-- KORUAL extended operations modules (non-destructive)
create table if not exists public.bank_transfers (
  id uuid primary key default gen_random_uuid(),
  depositor_name text not null,
  order_no text not null,
  bank_name text not null default '확인 필요',
  amount numeric not null default 0 check (amount >= 0),
  match_score integer not null default 0 check (match_score between 0 and 100),
  status text not null default '입금대기' check (status in ('입금대기','자동일치','확인필요','처리완료','환불')),
  transferred_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists bank_transfers_order_no_idx on public.bank_transfers(lower(btrim(order_no)));
create index if not exists bank_transfers_queue_idx on public.bank_transfers(status, transferred_at desc);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  region text not null default '중국',
  lead_days integer not null default 7 check (lead_days >= 0),
  moq integer not null default 1 check (moq > 0),
  status text not null default '검토중' check (status in ('검토중','거래중','일시중지','종료')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_cases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  case_no text not null unique,
  case_type text not null default '문의',
  refund_amount numeric not null default 0 check (refund_amount >= 0),
  priority integer not null default 2 check (priority between 1 and 3),
  status text not null default '접수' check (status in ('접수','처리중','고객회신대기','완료','종료')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_cases_queue_idx on public.support_cases(status, priority desc, created_at);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  channel text not null default 'SEO',
  budget numeric not null default 0 check (budget >= 0),
  asset_count integer not null default 0 check (asset_count >= 0),
  status text not null default '기획' check (status in ('기획','제작중','예약','진행중','완료','중지')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);
create index if not exists campaigns_schedule_idx on public.campaigns(status, starts_at, ends_at);

alter table public.bank_transfers enable row level security;
alter table public.suppliers enable row level security;
alter table public.support_cases enable row level security;
alter table public.campaigns enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['bank_transfers','suppliers','support_cases','campaigns'] loop
    execute format('drop policy if exists "admin manage %1$s" on public.%1$I', table_name);
    execute format('create policy "admin manage %1$s" on public.%1$I for all to authenticated using (((select auth.jwt())->''app_metadata''->>''role'') = ''admin'') with check (((select auth.jwt())->''app_metadata''->>''role'') = ''admin'')', table_name);
  end loop;
end $$;
