create table if not exists public.traffic_events (
  id bigint generated always as identity primary key, occurred_at timestamptz not null default now(), user_id uuid references auth.users(id) on delete set null,
  session_id text not null, event_name text not null check (event_name in ('page_view','product_view','add_to_cart','checkout','purchase','refund')),
  source text, medium text, campaign text, content text, path text, product_id text, order_id text, revenue numeric(14,2) not null default 0, metadata jsonb not null default '{}'::jsonb
);
create index if not exists traffic_events_occurred_at_idx on public.traffic_events(occurred_at desc);
create index if not exists traffic_events_campaign_idx on public.traffic_events(campaign,occurred_at desc);
alter table public.traffic_events enable row level security;
create table if not exists public.content_opportunities (
  id bigint generated always as identity primary key, created_at timestamptz not null default now(), topic text not null, channel text not null,
  intent text not null check (intent in ('information','comparison','purchase','retention')), priority_score integer not null default 0 check (priority_score between 0 and 100),
  status text not null default 'idea' check (status in ('idea','draft','approved','published','archived')), target_url text, notes text
);
alter table public.content_opportunities enable row level security;
create policy "admin traffic read" on public.traffic_events for select to authenticated using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "admin traffic write" on public.traffic_events for all to authenticated using ((select auth.jwt()->'app_metadata'->>'role') = 'admin') with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "admin opportunities read" on public.content_opportunities for select to authenticated using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "admin opportunities write" on public.content_opportunities for all to authenticated using ((select auth.jwt()->'app_metadata'->>'role') = 'admin') with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
