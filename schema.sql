-- KORUAL Supabase schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'GUEST' check (role in ('ADMIN','MANAGER','GUEST')),
  active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.login_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  success boolean not null,
  ip inet,
  user_agent text,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  ip inet,
  created_at timestamptz not null default now()
);

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  status text not null default 'planned' check (status in ('planned','connected','degraded','disabled')),
  external_account_ref text,
  secret_ref text,
  capabilities text[] not null default '{}',
  last_healthcheck_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, external_account_ref)
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_key text not null,
  provider text,
  status text not null check (status in ('queued','running','succeeded','failed','cancelled')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists integrations_set_updated_at on public.integration_connections;
create trigger integrations_set_updated_at before update on public.integration_connections
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.login_audit_logs enable row level security;
alter table public.admin_actions enable row level security;
alter table public.integration_connections enable row level security;
alter table public.automation_runs enable row level security;

revoke all on public.login_audit_logs from anon, authenticated;
revoke all on public.admin_actions from anon, authenticated;
revoke all on public.integration_connections from anon, authenticated;
revoke all on public.automation_runs from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create index if not exists login_audit_logs_created_at_idx on public.login_audit_logs(created_at desc);
create index if not exists admin_actions_created_at_idx on public.admin_actions(created_at desc);
create index if not exists automation_runs_created_at_idx on public.automation_runs(created_at desc);
create index if not exists automation_runs_key_status_idx on public.automation_runs(automation_key, status);
