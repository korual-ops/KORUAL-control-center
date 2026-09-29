-- Applied to Supabase project dtmmjkikyfgkeimhevso on 2026-09-29.
-- Recommendation learning loop: exposure/selection/booking telemetry without public access.

create table if not exists public.recommendation_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid null references public.recommendation_runs(id) on delete set null,
  session_hash text not null,
  event_type text not null check (event_type in ('impression','select','booking_intent','booking_success','booking_failure','complete')),
  provider_key text null,
  position smallint null check (position is null or (position between 1 and 20)),
  policy_version text not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists recommendation_events_run_idx
  on public.recommendation_events(run_id, created_at desc);

create index if not exists recommendation_events_provider_idx
  on public.recommendation_events(provider_key, event_type, created_at desc);

alter table public.recommendation_events enable row level security;

revoke all on table public.recommendation_events from public, anon, authenticated;
grant select, insert on table public.recommendation_events to service_role;

drop policy if exists recommendation_events_deny_select on public.recommendation_events;
drop policy if exists recommendation_events_deny_insert on public.recommendation_events;
drop policy if exists recommendation_events_deny_update on public.recommendation_events;
drop policy if exists recommendation_events_deny_delete on public.recommendation_events;

create policy recommendation_events_deny_select
on public.recommendation_events for select
to anon, authenticated
using (false);

create policy recommendation_events_deny_insert
on public.recommendation_events for insert
to anon, authenticated
with check (false);

create policy recommendation_events_deny_update
on public.recommendation_events for update
to anon, authenticated
using (false)
with check (false);

create policy recommendation_events_deny_delete
on public.recommendation_events for delete
to anon, authenticated
using (false);
