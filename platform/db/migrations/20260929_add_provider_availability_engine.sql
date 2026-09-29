-- Applied to Supabase production on 2026-09-29.
-- Availability Engine v1: provider schedules, time-off, transactional slot holds, collision-safe booking.

create table if not exists public.provider_availability_rules (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_minutes smallint not null default 120 check (slot_minutes between 30 and 720),
  capacity smallint not null default 1 check (capacity between 1 and 20),
  timezone text not null default 'Asia/Seoul',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  unique(provider_id,day_of_week,start_time,end_time)
);

create table if not exists public.provider_time_off (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.provider_slot_holds (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  session_id text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'held'
    check (status in ('held','converted','released','expired')),
  expires_at timestamptz not null,
  booking_id uuid references public.bookings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (expires_at > created_at)
);

create index if not exists provider_availability_rules_lookup_idx
  on public.provider_availability_rules(provider_id,day_of_week)
  where active=true;

create index if not exists provider_time_off_lookup_idx
  on public.provider_time_off(provider_id,starts_at,ends_at);

create index if not exists provider_slot_holds_lookup_idx
  on public.provider_slot_holds(provider_id,starts_at,status,expires_at);

alter table public.provider_availability_rules enable row level security;
alter table public.provider_time_off enable row level security;
alter table public.provider_slot_holds enable row level security;

revoke all on table public.provider_availability_rules from public,anon,authenticated;
revoke all on table public.provider_time_off from public,anon,authenticated;
revoke all on table public.provider_slot_holds from public,anon,authenticated;

grant select,insert,update,delete on table public.provider_availability_rules to service_role;
grant select,insert,update,delete on table public.provider_time_off to service_role;
grant select,insert,update,delete on table public.provider_slot_holds to service_role;

drop policy if exists provider_availability_rules_deny_all on public.provider_availability_rules;
create policy provider_availability_rules_deny_all
on public.provider_availability_rules as restrictive for all
to anon,authenticated using(false) with check(false);

drop policy if exists provider_time_off_deny_all on public.provider_time_off;
create policy provider_time_off_deny_all
on public.provider_time_off as restrictive for all
to anon,authenticated using(false) with check(false);

drop policy if exists provider_slot_holds_deny_all on public.provider_slot_holds;
create policy provider_slot_holds_deny_all
on public.provider_slot_holds as restrictive for all
to anon,authenticated using(false) with check(false);

create or replace function public.get_provider_available_slots(
  p_provider_id uuid,
  p_date date
)
returns table(
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer,
  remaining integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_rule record;
  v_slot_local timestamp;
  v_slot_end_local timestamp;
  v_start timestamptz;
  v_end timestamptz;
  v_booked integer;
  v_held integer;
begin
  if p_date < current_date or p_date > current_date + 366 then return; end if;

  update public.provider_slot_holds
  set status='expired',updated_at=now()
  where status='held' and expires_at<=now();

  for v_rule in
    select *
    from public.provider_availability_rules
    where provider_id=p_provider_id
      and active=true
      and day_of_week=extract(dow from p_date)::int
    order by start_time
  loop
    v_slot_local:=p_date+v_rule.start_time;

    while v_slot_local+make_interval(mins=>v_rule.slot_minutes)<=p_date+v_rule.end_time loop
      v_slot_end_local:=v_slot_local+make_interval(mins=>v_rule.slot_minutes);
      v_start:=v_slot_local at time zone v_rule.timezone;
      v_end:=v_slot_end_local at time zone v_rule.timezone;

      if not exists (
        select 1
        from public.provider_time_off o
        where o.provider_id=p_provider_id
          and tstzrange(o.starts_at,o.ends_at,'[)') && tstzrange(v_start,v_end,'[)')
      ) then
        select count(*) into v_booked
        from public.bookings b
        where b.provider_id=p_provider_id
          and b.status in ('pending','confirmed')
          and b.scheduled_at>=v_start
          and b.scheduled_at<v_end;

        select count(*) into v_held
        from public.provider_slot_holds h
        where h.provider_id=p_provider_id
          and h.status='held'
          and h.expires_at>now()
          and h.starts_at=v_start;

        if v_rule.capacity-v_booked-v_held>0 then
          starts_at:=v_start;
          ends_at:=v_end;
          capacity:=v_rule.capacity;
          remaining:=v_rule.capacity-v_booked-v_held;
          return next;
        end if;
      end if;

      v_slot_local:=v_slot_end_local;
    end loop;
  end loop;
end;
$$;

revoke all on function public.get_provider_available_slots(uuid,date) from public,anon,authenticated;
grant execute on function public.get_provider_available_slots(uuid,date) to service_role;

create or replace function public.hold_provider_slot(
  p_provider_id uuid,
  p_session_id text,
  p_starts_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_slot record;
  v_hold public.provider_slot_holds%rowtype;
begin
  if p_session_id is null or length(p_session_id)<8 then raise exception 'invalid session'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_provider_id::text || '|' || p_starts_at::text,0));

  update public.provider_slot_holds
  set status='expired',updated_at=now()
  where status='held' and expires_at<=now();

  select * into v_slot
  from public.get_provider_available_slots(
    p_provider_id,
    (p_starts_at at time zone 'Asia/Seoul')::date
  ) s
  where s.starts_at=p_starts_at
  limit 1;

  if not found or v_slot.remaining<1 then raise exception 'slot unavailable'; end if;

  update public.provider_slot_holds
  set status='released',updated_at=now()
  where provider_id=p_provider_id
    and session_id=p_session_id
    and status='held';

  insert into public.provider_slot_holds(
    provider_id,session_id,starts_at,ends_at,status,expires_at
  ) values (
    p_provider_id,p_session_id,v_slot.starts_at,v_slot.ends_at,'held',now()+interval '10 minutes'
  )
  returning * into v_hold;

  return jsonb_build_object(
    'hold_id',v_hold.id,
    'starts_at',v_hold.starts_at,
    'ends_at',v_hold.ends_at,
    'expires_at',v_hold.expires_at
  );
end;
$$;

revoke all on function public.hold_provider_slot(uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.hold_provider_slot(uuid,text,timestamptz) to service_role;

create or replace function public.create_beta_booking_v2(
  p_session_id text,
  p_idempotency_key text,
  p_services text[],
  p_region text,
  p_desired_date date,
  p_customer_name text,
  p_phone text,
  p_provider_key text,
  p_amount integer,
  p_slot_hold_id uuid,
  p_message text default 'KORUAL booking'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_request public.service_requests%rowtype;
  v_provider public.providers%rowtype;
  v_quote public.provider_quotes%rowtype;
  v_booking public.bookings%rowtype;
  v_hold public.provider_slot_holds%rowtype;
begin
  if p_session_id is null or length(p_session_id)<8 then raise exception 'invalid session'; end if;
  if p_idempotency_key is null or length(p_idempotency_key)<8 then raise exception 'invalid idempotency key'; end if;
  if coalesce(array_length(p_services,1),0)<1 then raise exception 'at least one service required'; end if;
  if p_region is null or length(trim(p_region))<2 then raise exception 'region required'; end if;
  if p_desired_date is null then raise exception 'desired date required'; end if;
  if p_customer_name is null or length(trim(p_customer_name))<2 then raise exception 'customer name required'; end if;
  if p_phone is null or length(regexp_replace(p_phone,'[^0-9]','','g'))<10 then raise exception 'phone required'; end if;
  if p_amount<0 then raise exception 'invalid amount'; end if;
  if p_slot_hold_id is null then raise exception 'slot hold required'; end if;

  select * into v_request
  from public.service_requests
  where session_id=p_session_id and idempotency_key=p_idempotency_key
  limit 1;

  if found then
    select * into v_booking
    from public.bookings
    where request_id=v_request.id
    order by created_at desc
    limit 1;

    select * into v_quote
    from public.provider_quotes
    where request_id=v_request.id
    order by created_at desc
    limit 1;

    return jsonb_build_object(
      'request_id',v_request.id,
      'request_code',v_request.request_code,
      'quote_id',v_quote.id,
      'booking_id',v_booking.id,
      'status',coalesce(v_booking.status,'pending'),
      'scheduled_at',v_booking.scheduled_at,
      'idempotent',true
    );
  end if;

  select * into v_provider
  from public.providers
  where provider_key=p_provider_key and active=true and verified=true
  limit 1;

  if not found then raise exception 'provider unavailable'; end if;

  select * into v_hold
  from public.provider_slot_holds
  where id=p_slot_hold_id
  for update;

  if not found then raise exception 'slot hold not found'; end if;
  if v_hold.provider_id<>v_provider.id then raise exception 'slot hold provider mismatch'; end if;
  if v_hold.session_id<>p_session_id then raise exception 'slot hold session mismatch'; end if;
  if v_hold.status<>'held' then raise exception 'slot hold inactive'; end if;
  if v_hold.expires_at<=now() then
    update public.provider_slot_holds set status='expired',updated_at=now() where id=v_hold.id;
    raise exception 'slot hold expired';
  end if;
  if (v_hold.starts_at at time zone 'Asia/Seoul')::date<>p_desired_date then
    raise exception 'slot hold date mismatch';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_provider.id::text || '|' || v_hold.starts_at::text,0));

  insert into public.service_requests(
    services,region,desired_date,customer_name,phone,
    status,source,session_id,priority,idempotency_key,matching_mode
  ) values (
    p_services,trim(p_region),p_desired_date,trim(p_customer_name),
    regexp_replace(p_phone,'[^0-9]','','g'),
    'NEW','platform_beta',p_session_id,50,p_idempotency_key,'direct_booking'
  )
  returning * into v_request;

  update public.service_requests set status='QUOTED' where id=v_request.id;

  insert into public.provider_quotes(
    request_id,provider_id,amount,message,status,
    quote_expires_at,accepted_at,quote_snapshot
  ) values (
    v_request.id,v_provider.id,p_amount,p_message,'accepted',
    now()+interval '30 minutes',now(),
    jsonb_build_object(
      'services',p_services,
      'region',trim(p_region),
      'provider_key',p_provider_key,
      'amount',p_amount,
      'source','signed_quote_token',
      'slot_hold_id',v_hold.id,
      'scheduled_at',v_hold.starts_at
    )
  )
  returning * into v_quote;

  insert into public.service_request_events(
    request_id,event_type,from_status,to_status,actor_type,metadata
  ) values (
    v_request.id,'quote.accepted',null,null,'customer',
    jsonb_build_object(
      'quote_id',v_quote.id,
      'provider_id',v_provider.id,
      'amount',v_quote.amount,
      'slot_hold_id',v_hold.id
    )
  );

  insert into public.bookings(
    request_id,quote_id,provider_id,scheduled_at,status,customer_name,phone
  ) values (
    v_request.id,v_quote.id,v_provider.id,v_hold.starts_at,
    'pending',trim(p_customer_name),regexp_replace(p_phone,'[^0-9]','','g')
  )
  returning * into v_booking;

  update public.provider_slot_holds
  set status='converted',booking_id=v_booking.id,updated_at=now()
  where id=v_hold.id;

  update public.service_requests set status='BOOKED' where id=v_request.id;

  insert into public.service_request_events(
    request_id,event_type,from_status,to_status,actor_type,metadata
  ) values (
    v_request.id,'booking.created',null,null,'customer',
    jsonb_build_object(
      'booking_id',v_booking.id,
      'quote_id',v_quote.id,
      'slot_hold_id',v_hold.id,
      'scheduled_at',v_booking.scheduled_at
    )
  );

  return jsonb_build_object(
    'request_id',v_request.id,
    'request_code',v_request.request_code,
    'quote_id',v_quote.id,
    'booking_id',v_booking.id,
    'status',v_booking.status,
    'scheduled_at',v_booking.scheduled_at,
    'provider_name',v_provider.name,
    'amount',v_quote.amount,
    'slot_hold_id',v_hold.id,
    'idempotent',false
  );
end;
$$;

revoke all on function public.create_beta_booking_v2(
  text,text,text[],text,date,text,text,text,integer,uuid,text
) from public,anon,authenticated;

grant execute on function public.create_beta_booking_v2(
  text,text,text[],text,date,text,text,text,integer,uuid,text
) to service_role;

-- Demo-only availability. Real providers must supply actual calendar rules.
insert into public.provider_availability_rules(
  provider_id,day_of_week,start_time,end_time,slot_minutes,capacity,timezone,active
)
select p.id,d.dow,'09:00'::time,'18:00'::time,180,1,'Asia/Seoul',true
from public.providers p
cross join (values (1),(2),(3),(4),(5),(6)) d(dow)
where p.is_demo=true and p.active=true
on conflict(provider_id,day_of_week,start_time,end_time) do update set
  slot_minutes=excluded.slot_minutes,
  capacity=excluded.capacity,
  timezone=excluded.timezone,
  active=excluded.active,
  updated_at=now();
