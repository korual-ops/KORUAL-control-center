create extension if not exists pg_cron with schema pg_catalog;

alter table public.orders
  add column if not exists customer_phone text,
  add column if not exists shipping_due_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists tracking_number text,
  add column if not exists delay_notified_at timestamptz;

create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  channel text not null default 'kakao_alimtalk' check (channel = 'kakao_alimtalk'),
  event_type text not null default 'shipping_delay' check (event_type = 'shipping_delay'),
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  next_attempt_at timestamptz not null default now(),
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, event_type)
);

create index if not exists notification_jobs_dispatch_idx
  on public.notification_jobs(status, next_attempt_at, created_at)
  where status in ('queued','failed');

alter table public.notification_jobs enable row level security;
create policy "admin notification jobs" on public.notification_jobs for all to authenticated
using (((select auth.jwt())->'app_metadata'->>'role') = 'admin')
with check (((select auth.jwt())->'app_metadata'->>'role') = 'admin');

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.enqueue_shipping_delay_notifications()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare inserted_count integer;
begin
  insert into public.notification_jobs(order_id)
  select o.id from public.orders o
  where o.shipping_due_at is not null and o.shipping_due_at < now() and o.shipped_at is null
    and o.customer_phone is not null and btrim(o.customer_phone) <> ''
    and coalesce(o.status, '') not in ('배송 완료','배송완료','취소','주문 취소')
  on conflict (order_id, event_type) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end $$;

revoke all on function private.enqueue_shipping_delay_notifications() from public, anon, authenticated;
grant execute on function private.enqueue_shipping_delay_notifications() to service_role;

select cron.schedule(
  'korual-enqueue-shipping-delay-hourly',
  '7 * * * *',
  'select private.enqueue_shipping_delay_notifications();'
);
