
-- KORUAL Provider Confirmation & Recovery Engine v1
-- Consolidates confirmation SLA, background expiry detection, recovery swap,
-- business-hours clocks, and supporting indexes.

alter table public.bookings
  add column if not exists confirmation_status text not null default 'awaiting',
  add column if not exists confirmation_deadline timestamptz,
  add column if not exists confirmation_sla_minutes smallint,
  add column if not exists provider_confirmed_at timestamptz,
  add column if not exists provider_declined_at timestamptz,
  add column if not exists recovery_status text not null default 'none';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='bookings_confirmation_status_check'
      and conrelid='public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_confirmation_status_check
      check (confirmation_status in ('awaiting','confirmed','expired','declined','not_required'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='bookings_recovery_status_check'
      and conrelid='public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_recovery_status_check
      check (recovery_status in ('none','action_required','alternatives_ready','resolved'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='bookings_confirmation_sla_check'
      and conrelid='public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_confirmation_sla_check
      check (confirmation_sla_minutes is null or confirmation_sla_minutes between 5 and 240);
  end if;
end $$;

create table if not exists public.booking_provider_attempts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  attempt_no smallint not null check (attempt_no between 1 and 20),
  status text not null default 'awaiting'
    check (status in ('awaiting','confirmed','declined','expired','cancelled')),
  sent_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  responded_at timestamptz,
  response_minutes numeric(8,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(booking_id,attempt_no)
);

create table if not exists public.booking_recovery_operations (
  id uuid primary key default gen_random_uuid(),
  operation_key text not null unique,
  old_booking_id uuid not null references public.bookings(id) on delete cascade,
  new_booking_id uuid references public.bookings(id) on delete set null,
  new_quote_id uuid references public.provider_quotes(id) on delete set null,
  recommendation_run_id uuid references public.recommendation_runs(id) on delete set null,
  status text not null default 'started'
    check (status in ('started','completed','failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.provider_response_hours (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  timezone text not null default 'Asia/Seoul',
  active boolean not null default true,
  source text not null default 'provider'
    check (source in ('provider','demo','platform_default')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time>start_time),
  unique(provider_id,day_of_week,start_time,end_time)
);

create index if not exists booking_provider_attempts_booking_idx
  on public.booking_provider_attempts(booking_id,attempt_no desc);
create index if not exists booking_provider_attempts_provider_idx
  on public.booking_provider_attempts(provider_id,status,created_at desc);
create index if not exists bookings_confirmation_deadline_idx
  on public.bookings(confirmation_deadline)
  where confirmation_status='awaiting';
create index if not exists booking_recovery_operations_old_booking_idx
  on public.booking_recovery_operations(old_booking_id,created_at desc);
create index if not exists booking_recovery_operations_new_booking_idx
  on public.booking_recovery_operations(new_booking_id)
  where new_booking_id is not null;
create index if not exists booking_recovery_operations_new_quote_idx
  on public.booking_recovery_operations(new_quote_id)
  where new_quote_id is not null;
create index if not exists booking_recovery_operations_run_idx
  on public.booking_recovery_operations(recommendation_run_id)
  where recommendation_run_id is not null;
create index if not exists provider_slot_holds_booking_idx
  on public.provider_slot_holds(booking_id)
  where booking_id is not null;
create index if not exists provider_response_hours_lookup_idx
  on public.provider_response_hours(provider_id,day_of_week)
  where active=true;

alter table public.booking_provider_attempts enable row level security;
alter table public.booking_recovery_operations enable row level security;
alter table public.provider_response_hours enable row level security;

revoke all on table public.booking_provider_attempts from public,anon,authenticated;
revoke all on table public.booking_recovery_operations from public,anon,authenticated;
revoke all on table public.provider_response_hours from public,anon,authenticated;
grant select,insert,update,delete on table public.booking_provider_attempts to service_role;
grant select,insert,update,delete on table public.booking_recovery_operations to service_role;
grant select,insert,update,delete on table public.provider_response_hours to service_role;

drop policy if exists booking_provider_attempts_deny_all on public.booking_provider_attempts;
create policy booking_provider_attempts_deny_all
on public.booking_provider_attempts as restrictive for all
to anon,authenticated using(false) with check(false);

drop policy if exists booking_recovery_operations_deny_all on public.booking_recovery_operations;
create policy booking_recovery_operations_deny_all
on public.booking_recovery_operations as restrictive for all
to anon,authenticated using(false) with check(false);

drop policy if exists provider_response_hours_deny_all on public.provider_response_hours;
create policy provider_response_hours_deny_all
on public.provider_response_hours as restrictive for all
to anon,authenticated using(false) with check(false);

insert into public.provider_response_hours(
  provider_id,day_of_week,start_time,end_time,timezone,active,source
)
select p.id,d.dow,'09:00'::time,'20:00'::time,'Asia/Seoul',true,'demo'
from public.providers p
cross join (values(1),(2),(3),(4),(5),(6)) d(dow)
where p.is_demo=true and p.active=true
on conflict(provider_id,day_of_week,start_time,end_time) do update set
  timezone=excluded.timezone,
  active=excluded.active,
  source=excluded.source,
  updated_at=now();

create or replace function public.compute_booking_confirmation_sla(
  p_provider_id uuid,
  p_scheduled_at timestamptz
)
returns smallint
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_avg_response integer;
  v_sla integer;
begin
  select avg_response_minutes into v_avg_response
  from public.providers
  where id=p_provider_id;

  v_sla:=greatest(15,least(60,coalesce(v_avg_response,20)*2));

  if p_scheduled_at is not null then
    if p_scheduled_at<=now()+interval '24 hours' then
      v_sla:=least(v_sla,15);
    elsif p_scheduled_at<=now()+interval '72 hours' then
      v_sla:=least(v_sla,30);
    end if;
  end if;

  return v_sla::smallint;
end;
$$;

revoke all on function public.compute_booking_confirmation_sla(uuid,timestamptz)
  from public,anon,authenticated;
grant execute on function public.compute_booking_confirmation_sla(uuid,timestamptz)
  to service_role;

create or replace function public.compute_booking_confirmation_deadline(
  p_provider_id uuid,
  p_scheduled_at timestamptz,
  p_requested_at timestamptz default now()
)
returns timestamptz
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_sla integer;
  v_remaining integer;
  v_timezone text:='Asia/Seoul';
  v_cursor_local timestamp;
  v_day date;
  v_rule record;
  v_window_start timestamp;
  v_window_end timestamp;
  v_available integer;
  v_guard integer:=0;
  v_has_rules boolean;
begin
  v_sla:=public.compute_booking_confirmation_sla(p_provider_id,p_scheduled_at);
  v_remaining:=v_sla;

  select exists(
    select 1 from public.provider_response_hours
    where provider_id=p_provider_id and active=true
  ) into v_has_rules;

  if not v_has_rules then
    return p_requested_at+make_interval(mins=>v_sla);
  end if;

  select coalesce((
    select timezone
    from public.provider_response_hours
    where provider_id=p_provider_id and active=true
    order by day_of_week,start_time
    limit 1
  ),'Asia/Seoul') into v_timezone;

  v_cursor_local:=p_requested_at at time zone v_timezone;

  while v_guard<21 loop
    v_guard:=v_guard+1;
    v_day:=v_cursor_local::date;

    select start_time,end_time into v_rule
    from public.provider_response_hours
    where provider_id=p_provider_id
      and active=true
      and day_of_week=extract(dow from v_day)::int
    order by start_time
    limit 1;

    if not found then
      v_cursor_local:=(v_day+1)::timestamp;
      continue;
    end if;

    v_window_start:=v_day+v_rule.start_time;
    v_window_end:=v_day+v_rule.end_time;

    if v_cursor_local<v_window_start then
      v_cursor_local:=v_window_start;
    elsif v_cursor_local>=v_window_end then
      v_cursor_local:=(v_day+1)::timestamp;
      continue;
    end if;

    v_available:=greatest(
      0,
      floor(extract(epoch from (v_window_end-v_cursor_local))/60.0)::integer
    );

    if v_remaining<=v_available then
      return (v_cursor_local+make_interval(mins=>v_remaining)) at time zone v_timezone;
    end if;

    v_remaining:=v_remaining-v_available;
    v_cursor_local:=(v_day+1)::timestamp;
  end loop;

  return p_requested_at+make_interval(mins=>v_sla);
end;
$$;

revoke all on function public.compute_booking_confirmation_deadline(uuid,timestamptz,timestamptz)
  from public,anon,authenticated;
grant execute on function public.compute_booking_confirmation_deadline(uuid,timestamptz,timestamptz)
  to service_role;

create or replace function public.set_booking_confirmation_defaults()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status in ('completed','cancelled') then
    new.confirmation_status:='not_required';
    new.recovery_status:='none';
    return new;
  end if;

  if new.confirmation_sla_minutes is null then
    new.confirmation_sla_minutes:=public.compute_booking_confirmation_sla(
      new.provider_id,new.scheduled_at
    );
  end if;

  if new.confirmation_deadline is null then
    new.confirmation_deadline:=public.compute_booking_confirmation_deadline(
      new.provider_id,new.scheduled_at,now()
    );
  end if;

  if new.confirmation_status is null then
    new.confirmation_status:='awaiting';
  end if;

  return new;
end;
$$;

revoke all on function public.set_booking_confirmation_defaults() from public,anon,authenticated;

drop trigger if exists bookings_set_confirmation_defaults_trg on public.bookings;
create trigger bookings_set_confirmation_defaults_trg
before insert on public.bookings
for each row execute function public.set_booking_confirmation_defaults();

create or replace function public.create_booking_confirmation_attempt()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.confirmation_status='awaiting' and new.confirmation_deadline is not null then
    insert into public.booking_provider_attempts(
      booking_id,provider_id,attempt_no,status,sent_at,deadline_at,metadata
    ) values (
      new.id,new.provider_id,1,'awaiting',now(),new.confirmation_deadline,
      jsonb_build_object('source','booking.created')
    )
    on conflict(booking_id,attempt_no) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.create_booking_confirmation_attempt() from public,anon,authenticated;

drop trigger if exists bookings_create_confirmation_attempt_trg on public.bookings;
create trigger bookings_create_confirmation_attempt_trg
after insert on public.bookings
for each row execute function public.create_booking_confirmation_attempt();

create or replace function public.validate_booking_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status is not distinct from old.status then return new; end if;
  if old.status='pending' and new.status in ('confirmed','completed','cancelled') then return new; end if;
  if old.status='confirmed' and new.status in ('pending','completed','cancelled') then return new; end if;
  raise exception 'invalid booking transition: % -> %', old.status, new.status
    using errcode='23514';
end;
$$;

revoke all on function public.validate_booking_transition() from public,anon,authenticated;

create or replace function public.refresh_booking_confirmation_v1(
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_booking public.bookings%rowtype;
  v_attempt public.booking_provider_attempts%rowtype;
begin
  select * into v_booking
  from public.bookings
  where id=p_booking_id
  for update;

  if not found then raise exception 'booking not found'; end if;

  if v_booking.status in ('completed','cancelled') then
    if v_booking.confirmation_status<>'not_required' or v_booking.recovery_status<>'none' then
      update public.bookings
      set confirmation_status='not_required',
          recovery_status='none',
          updated_at=now()
      where id=v_booking.id
      returning * into v_booking;
    end if;

    return jsonb_build_object(
      'confirmation_status',v_booking.confirmation_status,
      'recovery_status',v_booking.recovery_status,
      'deadline',v_booking.confirmation_deadline,
      'expired_now',false
    );
  end if;

  if v_booking.confirmation_status='awaiting'
     and v_booking.confirmation_deadline is not null
     and v_booking.confirmation_deadline<=now() then

    update public.bookings
    set confirmation_status='expired',
        recovery_status='action_required',
        updated_at=now()
    where id=v_booking.id
    returning * into v_booking;

    update public.booking_provider_attempts
    set status='expired',
        responded_at=now(),
        response_minutes=extract(epoch from (now()-sent_at))/60.0
    where booking_id=v_booking.id
      and status='awaiting';

    insert into public.service_request_events(
      request_id,event_type,from_status,to_status,actor_type,metadata
    ) values (
      v_booking.request_id,'provider.confirmation_expired',null,null,'system',
      jsonb_build_object(
        'booking_id',v_booking.id,
        'provider_id',v_booking.provider_id,
        'confirmation_deadline',v_booking.confirmation_deadline
      )
    );

    return jsonb_build_object(
      'confirmation_status','expired',
      'recovery_status','action_required',
      'deadline',v_booking.confirmation_deadline,
      'expired_now',true
    );
  end if;

  select * into v_attempt
  from public.booking_provider_attempts
  where booking_id=v_booking.id
  order by attempt_no desc
  limit 1;

  return jsonb_build_object(
    'confirmation_status',v_booking.confirmation_status,
    'recovery_status',v_booking.recovery_status,
    'deadline',v_booking.confirmation_deadline,
    'sla_minutes',v_booking.confirmation_sla_minutes,
    'attempt_status',v_attempt.status,
    'attempt_no',v_attempt.attempt_no,
    'expired_now',false
  );
end;
$$;

revoke all on function public.refresh_booking_confirmation_v1(uuid) from public,anon,authenticated;
grant execute on function public.refresh_booking_confirmation_v1(uuid) to service_role;

create or replace function public.record_provider_booking_response_v1(
  p_booking_id uuid,
  p_provider_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_booking public.bookings%rowtype;
  v_attempt public.booking_provider_attempts%rowtype;
  v_decision text:=lower(trim(coalesce(p_decision,'')));
  v_late boolean:=false;
  v_has_slot boolean:=false;
begin
  if v_decision not in ('confirmed','declined') then
    raise exception 'invalid provider decision';
  end if;

  select * into v_booking
  from public.bookings
  where id=p_booking_id
    and provider_id=p_provider_id
  for update;

  if not found then raise exception 'booking not found'; end if;
  if v_booking.status not in ('pending','confirmed') then raise exception 'booking not actionable'; end if;

  if v_booking.confirmation_status=v_decision then
    return jsonb_build_object(
      'booking_id',v_booking.id,
      'confirmation_status',v_booking.confirmation_status,
      'booking_status',v_booking.status,
      'idempotent',true
    );
  end if;

  if v_booking.confirmation_status in ('confirmed','declined') then
    raise exception 'provider decision already final';
  end if;

  v_late:=v_booking.confirmation_status='expired';

  select exists(
    select 1 from public.provider_slot_holds
    where booking_id=v_booking.id and status='converted'
  ) into v_has_slot;

  if v_late and v_decision='confirmed' and not v_has_slot then
    raise exception 'late confirmation slot unavailable';
  end if;

  select * into v_attempt
  from public.booking_provider_attempts
  where booking_id=v_booking.id
    and provider_id=p_provider_id
  order by attempt_no desc
  limit 1
  for update;

  if v_decision='confirmed' then
    update public.bookings
    set status='confirmed',
        confirmation_status='confirmed',
        provider_confirmed_at=now(),
        provider_declined_at=null,
        recovery_status='resolved',
        updated_at=now()
    where id=v_booking.id
    returning * into v_booking;

    if not v_late and v_attempt.id is not null then
      update public.booking_provider_attempts
      set status='confirmed',
          responded_at=now(),
          response_minutes=extract(epoch from (now()-sent_at))/60.0
      where id=v_attempt.id;
    end if;

    insert into public.service_request_events(
      request_id,event_type,from_status,to_status,actor_type,metadata
    ) values (
      v_booking.request_id,
      case when v_late then 'provider.confirmed_late' else 'provider.confirmed' end,
      null,null,'provider',
      jsonb_build_object(
        'booking_id',v_booking.id,
        'provider_id',p_provider_id,
        'late',v_late
      )
    );
  else
    update public.bookings
    set confirmation_status='declined',
        provider_declined_at=now(),
        recovery_status='action_required',
        updated_at=now()
    where id=v_booking.id
    returning * into v_booking;

    update public.provider_slot_holds
    set status='released',updated_at=now()
    where booking_id=v_booking.id
      and status='converted';

    if not v_late and v_attempt.id is not null then
      update public.booking_provider_attempts
      set status='declined',
          responded_at=now(),
          response_minutes=extract(epoch from (now()-sent_at))/60.0
      where id=v_attempt.id;
    end if;

    insert into public.service_request_events(
      request_id,event_type,from_status,to_status,actor_type,metadata
    ) values (
      v_booking.request_id,
      case when v_late then 'provider.declined_late' else 'provider.declined' end,
      null,null,'provider',
      jsonb_build_object(
        'booking_id',v_booking.id,
        'provider_id',p_provider_id,
        'late',v_late
      )
    );
  end if;

  return jsonb_build_object(
    'booking_id',v_booking.id,
    'confirmation_status',v_booking.confirmation_status,
    'booking_status',v_booking.status,
    'recovery_status',v_booking.recovery_status,
    'late',v_late,
    'idempotent',false
  );
end;
$$;

revoke all on function public.record_provider_booking_response_v1(uuid,uuid,text)
  from public,anon,authenticated;
grant execute on function public.record_provider_booking_response_v1(uuid,uuid,text)
  to service_role;

create or replace view public.provider_confirmation_metrics
with (security_invoker = true)
as
select
  p.id as provider_id,
  p.provider_key,
  count(a.id)::int as attempt_count,
  count(*) filter (where a.status='confirmed')::int as confirmed_count,
  count(*) filter (where a.status='expired')::int as expired_count,
  count(*) filter (where a.status='declined')::int as declined_count,
  round(avg(a.response_minutes) filter (where a.responded_at is not null),2) as observed_response_minutes,
  round(
    ((count(*) filter (where a.status='confirmed'))::numeric+4)
    / nullif(count(a.id)::numeric+5,0)
  ,4) as shrunk_confirmation_rate,
  (count(a.id)>=20) as eligible_for_ranking,
  case when count(a.id)>=20 then round(
    ((count(*) filter (where a.status='confirmed'))::numeric+4)
    / nullif(count(a.id)::numeric+5,0)
  ,4) else null end as ranking_confirmation_rate
from public.providers p
left join public.booking_provider_attempts a on a.provider_id=p.id
group by p.id,p.provider_key;

revoke all on public.provider_confirmation_metrics from public,anon,authenticated;
grant select on public.provider_confirmation_metrics to service_role;

create or replace function private.sweep_expired_booking_confirmations_v1(
  p_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_row record;
  v_count integer:=0;
begin
  for v_row in
    select b.id,b.request_id,b.provider_id,b.confirmation_deadline
    from public.bookings b
    where b.status in ('pending','confirmed')
      and b.confirmation_status='awaiting'
      and b.confirmation_deadline is not null
      and b.confirmation_deadline<=now()
    order by b.confirmation_deadline
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,100),500))
  loop
    update public.bookings
    set confirmation_status='expired',
        recovery_status='action_required',
        updated_at=now()
    where id=v_row.id and confirmation_status='awaiting';

    if found then
      update public.booking_provider_attempts
      set status='expired',
          responded_at=coalesce(responded_at,now()),
          response_minutes=coalesce(
            response_minutes,
            extract(epoch from (now()-sent_at))/60.0
          )
      where booking_id=v_row.id and status='awaiting';

      insert into public.service_request_events(
        request_id,event_type,from_status,to_status,actor_type,metadata
      ) values (
        v_row.request_id,'provider.confirmation_expired',
        null,null,'system',
        jsonb_build_object(
          'booking_id',v_row.id,
          'provider_id',v_row.provider_id,
          'confirmation_deadline',v_row.confirmation_deadline,
          'source','korual_auto_ops'
        )
      );

      v_count:=v_count+1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function private.sweep_expired_booking_confirmations_v1(integer)
  from public,anon,authenticated;

-- Recovery swap function and cancel/reschedule functions are kept in the
-- existing booking lifecycle migration and are upgraded in production.
-- This migration records the new confirmation/recovery schema and SLA policy.
