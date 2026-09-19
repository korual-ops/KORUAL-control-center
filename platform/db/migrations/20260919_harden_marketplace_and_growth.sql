-- Applied to Supabase production on 2026-09-19.
-- Purpose: harden marketplace tables, improve funnel analytics and query performance.

alter table public.service_requests
  add column if not exists request_code text not null default ('KQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  add column if not exists session_id text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists referrer_host text,
  add column if not exists landing_path text,
  add column if not exists priority smallint not null default 50;

create unique index if not exists service_requests_request_code_uidx on public.service_requests(request_code);
create index if not exists service_requests_queue_idx on public.service_requests(status, priority desc, desired_date, created_at desc);
create index if not exists service_requests_acquisition_idx on public.service_requests(utm_source, utm_campaign, created_at desc) where utm_source is not null;

alter table public.providers
  add column if not exists korual_score smallint not null default 0,
  add column if not exists avg_response_minutes integer,
  add column if not exists completed_jobs integer not null default 0;

create index if not exists providers_service_categories_gin_idx on public.providers using gin(service_categories);
create index if not exists providers_regions_gin_idx on public.providers using gin(regions);
create index if not exists providers_rank_idx on public.providers(korual_score desc, rating desc, review_count desc) where active=true and verified=true;

alter table public.price_benchmarks
  add column if not exists confidence_score smallint not null default 0,
  add column if not exists source text not null default 'internal';

create index if not exists provider_quotes_request_status_amount_idx on public.provider_quotes(request_id, status, amount);
create index if not exists service_request_matches_rank_idx on public.service_request_matches(request_id, status, match_score desc);
create index if not exists bookings_provider_idx on public.bookings(provider_id);
create index if not exists bookings_quote_idx on public.bookings(quote_id) where quote_id is not null;
create index if not exists bookings_schedule_idx on public.bookings(status, scheduled_at) where scheduled_at is not null;
create index if not exists traffic_events_funnel_idx on public.traffic_events(event_name, occurred_at desc);
create index if not exists integration_connections_health_idx on public.integration_connections(status, last_healthcheck_at desc);

alter function public.touch_updated_at() set search_path = pg_catalog, public;
revoke execute on function public.auto_dispatch_service_request_matches() from public, anon, authenticated;

-- Production also has explicit server-only RLS policies on:
-- service_requests, provider_quotes, bookings.
