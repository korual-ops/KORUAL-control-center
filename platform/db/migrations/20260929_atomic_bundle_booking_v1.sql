-- Atomic Bundle Booking v1
-- Parent bundle request + service-level child requests/quotes/bookings.
-- All child bookings are created in one PostgreSQL transaction.

begin;

alter table public.provider_slot_holds
  add column if not exists hold_context text not null default 'single';

create index if not exists provider_slot_holds_context_idx
  on public.provider_slot_holds(provider_id,session_id,hold_context,status,expires_at);

create table if not exists public.bundle_booking_groups (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.service_requests(id) on delete set null,
  session_id text not null,
  operation_key text not null,
  services text[] not null,
  region text not null,
  desired_date date not null,
  status text not null default 'planning'
    check (status in ('planning','booked','cancelled','completed')),
  total_amount integer not null default 0 check (total_amount >= 0),
  customer_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id,operation_key)
);

create table if not exists public.bundle_booking_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.bundle_booking_groups(id) on delete cascade,
  sequence_no smallint not null check (sequence_no between 1 and 20),
  service text not null,
  provider_id uuid not null references public.providers(id) on delete restrict,
  child_request_id uuid references public.service_requests(id) on delete set null,
  quote_id uuid references public.provider_quotes(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  slot_hold_id uuid references public.provider_slot_holds(id) on delete set null,
  amount integer not null check (amount >= 0),
  status text not null default 'booked'
    check (status in ('booked','cancelled','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_id,sequence_no),
  unique(group_id,service)
);

alter table public.bundle_booking_items
  add column if not exists child_request_id uuid
  references public.service_requests(id) on delete set null;

create index if not exists bundle_booking_groups_session_idx
  on public.bundle_booking_groups(session_id,created_at desc);
create index if not exists bundle_booking_items_group_idx
  on public.bundle_booking_items(group_id,sequence_no);
create index if not exists bundle_booking_items_child_request_idx
  on public.bundle_booking_items(child_request_id)
  where child_request_id is not null;

alter table public.bundle_booking_groups enable row level security;
alter table public.bundle_booking_items enable row level security;

revoke all on table public.bundle_booking_groups from public,anon,authenticated;
revoke all on table public.bundle_booking_items from public,anon,authenticated;
grant select,insert,update,delete on table public.bundle_booking_groups to service_role;
grant select,insert,update,delete on table public.bundle_booking_items to service_role;

drop policy if exists bundle_booking_groups_deny_all on public.bundle_booking_groups;
create policy bundle_booking_groups_deny_all
on public.bundle_booking_groups as restrictive for all
to anon,authenticated using(false) with check(false);

drop policy if exists bundle_booking_items_deny_all on public.bundle_booking_items;
create policy bundle_booking_items_deny_all
on public.bundle_booking_items as restrictive for all
to anon,authenticated using(false) with check(false);

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
  if p_session_id is null or length(p_session_id)<8 then
    raise exception 'invalid session';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_provider_id::text || '|' || p_starts_at::text,0));

  update public.provider_slot_holds
  set status='expired', updated_at=now()
  where status='held' and expires_at<=now();

  select * into v_hold
  from public.provider_slot_holds
  where provider_id=p_provider_id
    and session_id=p_session_id
    and hold_context='single'
    and status='held'
  order by created_at desc
  limit 1
  for update;

  if found and v_hold.starts_at=p_starts_at and v_hold.expires_at>now() then
    return jsonb_build_object(
      'hold_id',v_hold.id,
      'starts_at',v_hold.starts_at,
      'ends_at',v_hold.ends_at,
      'expires_at',v_hold.expires_at,
      'hold_context',v_hold.hold_context,
      'idempotent',true
    );
  end if;

  select * into v_slot
  from public.get_provider_available_slots(
    p_provider_id,
    (p_starts_at at time zone 'Asia/Seoul')::date
  ) s
  where s.starts_at=p_starts_at
  limit 1;

  if not found or v_slot.remaining<1 then
    raise exception 'slot unavailable';
  end if;

  update public.provider_slot_holds
  set status='released', updated_at=now()
  where provider_id=p_provider_id
    and session_id=p_session_id
    and hold_context='single'
    and status='held';

  insert into public.provider_slot_holds(
    provider_id,session_id,hold_context,starts_at,ends_at,status,expires_at
  ) values (
    p_provider_id,p_session_id,'single',v_slot.starts_at,v_slot.ends_at,'held',now()+interval '10 minutes'
  )
  returning * into v_hold;

  return jsonb_build_object(
    'hold_id',v_hold.id,
    'starts_at',v_hold.starts_at,
    'ends_at',v_hold.ends_at,
    'expires_at',v_hold.expires_at,
    'hold_context',v_hold.hold_context,
    'idempotent',false
  );
end;
$$;

revoke all on function public.hold_provider_slot(uuid,text,timestamptz)
  from public,anon,authenticated;
grant execute on function public.hold_provider_slot(uuid,text,timestamptz)
  to service_role;

create or replace function public.hold_provider_slot_bundle_v1(
  p_provider_id uuid,
  p_session_id text,
  p_hold_context text,
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
  v_context text:=trim(coalesce(p_hold_context,''));
begin
  if p_session_id is null or length(p_session_id)<8 then
    raise exception 'invalid session';
  end if;
  if length(v_context)<12 or length(v_context)>160 or v_context not like 'bundle:%' then
    raise exception 'invalid bundle hold context';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_provider_id::text || '|' || p_starts_at::text,0));

  update public.provider_slot_holds
  set status='expired', updated_at=now()
  where status='held' and expires_at<=now();

  select * into v_hold
  from public.provider_slot_holds
  where provider_id=p_provider_id
    and session_id=p_session_id
    and hold_context=v_context
    and status='held'
  order by created_at desc
  limit 1
  for update;

  if found and v_hold.starts_at=p_starts_at and v_hold.expires_at>now() then
    return jsonb_build_object(
      'hold_id',v_hold.id,
      'starts_at',v_hold.starts_at,
      'ends_at',v_hold.ends_at,
      'expires_at',v_hold.expires_at,
      'hold_context',v_hold.hold_context,
      'idempotent',true
    );
  end if;

  select * into v_slot
  from public.get_provider_available_slots(
    p_provider_id,
    (p_starts_at at time zone 'Asia/Seoul')::date
  ) s
  where s.starts_at=p_starts_at
  limit 1;

  if not found or v_slot.remaining<1 then
    raise exception 'slot unavailable';
  end if;

  update public.provider_slot_holds
  set status='released',updated_at=now()
  where provider_id=p_provider_id
    and session_id=p_session_id
    and hold_context=v_context
    and status='held';

  insert into public.provider_slot_holds(
    provider_id,session_id,hold_context,starts_at,ends_at,status,expires_at
  ) values (
    p_provider_id,p_session_id,v_context,v_slot.starts_at,v_slot.ends_at,'held',now()+interval '10 minutes'
  )
  returning * into v_hold;

  return jsonb_build_object(
    'hold_id',v_hold.id,
    'starts_at',v_hold.starts_at,
    'ends_at',v_hold.ends_at,
    'expires_at',v_hold.expires_at,
    'hold_context',v_hold.hold_context,
    'idempotent',false
  );
end;
$$;

revoke all on function public.hold_provider_slot_bundle_v1(uuid,text,text,timestamptz)
  from public,anon,authenticated;
grant execute on function public.hold_provider_slot_bundle_v1(uuid,text,text,timestamptz)
  to service_role;

create or replace function public.create_beta_bundle_booking_v1(
  p_session_id text,
  p_operation_key text,
  p_services text[],
  p_region text,
  p_desired_date date,
  p_customer_name text,
  p_phone text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_group public.bundle_booking_groups%rowtype;
  v_parent_request public.service_requests%rowtype;
  v_child_request public.service_requests%rowtype;
  v_provider public.providers%rowtype;
  v_hold public.provider_slot_holds%rowtype;
  v_quote public.provider_quotes%rowtype;
  v_booking public.bookings%rowtype;
  v_item jsonb;
  v_service text;
  v_provider_key text;
  v_hold_id uuid;
  v_amount integer;
  v_sequence integer := 0;
  v_total integer := 0;
  v_seen_services text[] := '{}'::text[];
  v_seen_holds uuid[] := '{}'::uuid[];
  v_item_count integer;
  v_child_key text;
begin
  if p_session_id is null or length(p_session_id)<8 then raise exception 'invalid session'; end if;
  if p_operation_key is null or length(p_operation_key)<8 then raise exception 'invalid operation key'; end if;
  if coalesce(array_length(p_services,1),0)<2 then raise exception 'bundle requires multiple services'; end if;
  if p_region is null or length(trim(p_region))<2 then raise exception 'region required'; end if;
  if p_desired_date is null then raise exception 'desired date required'; end if;
  if p_customer_name is null or length(trim(p_customer_name))<2 then raise exception 'customer name required'; end if;
  if p_phone is null or length(regexp_replace(p_phone,'[^0-9]','','g'))<10 then raise exception 'phone required'; end if;
  if jsonb_typeof(p_items)<>'array' then raise exception 'items array required'; end if;

  v_item_count:=jsonb_array_length(p_items);
  if v_item_count<2 or v_item_count>8 then raise exception 'invalid bundle item count'; end if;
  if v_item_count<>array_length(p_services,1) then raise exception 'bundle service count mismatch'; end if;

  select * into v_group
  from public.bundle_booking_groups
  where session_id=p_session_id and operation_key=p_operation_key
  limit 1;

  if found then
    return jsonb_build_object(
      'group_id',v_group.id,
      'request_id',v_group.request_id,
      'status',v_group.status,
      'total_amount',v_group.total_amount,
      'idempotent',true,
      'items',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',i.id,'service',i.service,'child_request_id',i.child_request_id,
          'booking_id',i.booking_id,'quote_id',i.quote_id,'slot_hold_id',i.slot_hold_id,
          'amount',i.amount,'status',i.status,'scheduled_at',b.scheduled_at
        ) order by i.sequence_no)
        from public.bundle_booking_items i
        left join public.bookings b on b.id=i.booking_id
        where i.group_id=v_group.id
      ),'[]'::jsonb)
    );
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_sequence:=v_sequence+1;
    v_service:=trim(coalesce(v_item->>'service',''));
    v_provider_key:=trim(coalesce(v_item->>'provider_key',''));

    begin v_amount:=(v_item->>'amount')::integer;
    exception when others then raise exception 'invalid amount'; end;

    begin v_hold_id:=(v_item->>'slot_hold_id')::uuid;
    exception when others then raise exception 'invalid slot hold id'; end;

    if v_service='' or not (v_service=any(p_services)) then raise exception 'bundle service mismatch'; end if;
    if v_service=any(v_seen_services) then raise exception 'duplicate bundle service'; end if;
    v_seen_services:=array_append(v_seen_services,v_service);

    if v_hold_id=any(v_seen_holds) then raise exception 'duplicate slot hold'; end if;
    v_seen_holds:=array_append(v_seen_holds,v_hold_id);

    if v_amount<0 then raise exception 'invalid amount'; end if;

    select * into v_provider
    from public.providers
    where provider_key=v_provider_key and active=true and verified=true
    limit 1;
    if not found then raise exception 'provider unavailable'; end if;

    if not (
      v_service=any(coalesce(v_provider.service_categories,'{}'::text[]))
      or (
        '생활 서비스'=any(coalesce(v_provider.service_categories,'{}'::text[]))
        and v_service=any(array[
          '이사','입주청소','청소','인터넷 설치','에어컨',
          '인테리어','수리·시공','생활 서비스'
        ]::text[])
      )
    ) then raise exception 'provider does not support service'; end if;

    if not exists (
      select 1 from unnest(coalesce(v_provider.regions,'{}'::text[])) rg
      where rg='전국'
         or trim(p_region) ilike '%'||rg||'%'
         or rg ilike '%'||trim(p_region)||'%'
    ) then raise exception 'provider does not cover region'; end if;

    select * into v_hold
    from public.provider_slot_holds
    where id=v_hold_id
    for update;

    if not found then raise exception 'slot hold not found'; end if;
    if v_hold.provider_id<>v_provider.id then raise exception 'slot hold provider mismatch'; end if;
    if v_hold.session_id<>p_session_id then raise exception 'slot hold session mismatch'; end if;
    if v_hold.hold_context not like 'bundle:%' then raise exception 'bundle hold context required'; end if;
    if v_hold.status<>'held' then raise exception 'slot hold inactive'; end if;
    if v_hold.expires_at<=now() then raise exception 'slot hold expired'; end if;
    if (v_hold.starts_at at time zone 'Asia/Seoul')::date<>p_desired_date then
      raise exception 'slot hold date mismatch';
    end if;

    perform pg_advisory_xact_lock(
      hashtextextended(v_provider.id::text||'|'||v_hold.starts_at::text,0)
    );
    v_total:=v_total+v_amount;
  end loop;

  insert into public.service_requests(
    services,region,desired_date,customer_name,phone,status,source,session_id,
    priority,idempotency_key,matching_mode
  ) values (
    p_services,trim(p_region),p_desired_date,trim(p_customer_name),
    regexp_replace(p_phone,'[^0-9]','','g'),
    'NEW','platform_bundle_parent',p_session_id,50,p_operation_key,'direct_booking'
  )
  returning * into v_parent_request;

  update public.service_requests set status='QUOTED' where id=v_parent_request.id;

  insert into public.bundle_booking_groups(
    request_id,session_id,operation_key,services,region,desired_date,
    status,total_amount,customer_name,phone
  ) values (
    v_parent_request.id,p_session_id,p_operation_key,p_services,trim(p_region),p_desired_date,
    'planning',v_total,trim(p_customer_name),regexp_replace(p_phone,'[^0-9]','','g')
  )
  returning * into v_group;

  v_sequence:=0;
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_sequence:=v_sequence+1;
    v_service:=trim(v_item->>'service');
    v_provider_key:=trim(v_item->>'provider_key');
    v_amount:=(v_item->>'amount')::integer;
    v_hold_id:=(v_item->>'slot_hold_id')::uuid;
    v_child_key:=left(p_operation_key,55)||'_c'||v_sequence::text;

    select * into v_provider
    from public.providers
    where provider_key=v_provider_key and active=true and verified=true
    limit 1;

    select * into v_hold
    from public.provider_slot_holds
    where id=v_hold_id
    for update;

    insert into public.service_requests(
      services,region,desired_date,customer_name,phone,status,source,session_id,
      priority,idempotency_key,matching_mode
    ) values (
      array[v_service],trim(p_region),p_desired_date,trim(p_customer_name),
      regexp_replace(p_phone,'[^0-9]','','g'),
      'NEW','platform_bundle_child',p_session_id,50,v_child_key,'direct_booking'
    )
    returning * into v_child_request;

    update public.service_requests set status='QUOTED' where id=v_child_request.id;

    insert into public.provider_quotes(
      request_id,provider_id,amount,message,status,quote_expires_at,accepted_at,quote_snapshot
    ) values (
      v_child_request.id,v_provider.id,v_amount,'KORUAL atomic bundle child quote','accepted',
      now()+interval '30 minutes',now(),
      jsonb_build_object(
        'bundle_group_id',v_group.id,'bundle_parent_request_id',v_parent_request.id,
        'bundle_sequence',v_sequence,'service',v_service,'region',trim(p_region),
        'provider_key',v_provider_key,'amount',v_amount,'slot_hold_id',v_hold.id,
        'scheduled_at',v_hold.starts_at,'source','bundle_quote_token'
      )
    )
    returning * into v_quote;

    insert into public.bookings(
      request_id,quote_id,provider_id,scheduled_at,status,customer_name,phone
    ) values (
      v_child_request.id,v_quote.id,v_provider.id,v_hold.starts_at,
      'pending',trim(p_customer_name),regexp_replace(p_phone,'[^0-9]','','g')
    )
    returning * into v_booking;

    update public.provider_slot_holds
    set status='converted',booking_id=v_booking.id,updated_at=now()
    where id=v_hold.id;

    update public.service_requests set status='BOOKED' where id=v_child_request.id;

    insert into public.bundle_booking_items(
      group_id,sequence_no,service,provider_id,child_request_id,
      quote_id,booking_id,slot_hold_id,amount,status
    ) values (
      v_group.id,v_sequence,v_service,v_provider.id,v_child_request.id,
      v_quote.id,v_booking.id,v_hold.id,v_amount,'booked'
    );
  end loop;

  update public.service_requests set status='BOOKED' where id=v_parent_request.id;
  update public.bundle_booking_groups
  set status='booked',updated_at=now()
  where id=v_group.id
  returning * into v_group;

  insert into public.service_request_events(
    request_id,event_type,from_status,to_status,actor_type,metadata
  ) values (
    v_parent_request.id,'bundle.booking.created',null,null,'customer',
    jsonb_build_object('bundle_group_id',v_group.id,'item_count',v_item_count,'total_amount',v_total)
  );

  return jsonb_build_object(
    'group_id',v_group.id,'request_id',v_parent_request.id,'status',v_group.status,
    'total_amount',v_group.total_amount,'idempotent',false,
    'items',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',i.id,'service',i.service,'child_request_id',i.child_request_id,
        'booking_id',i.booking_id,'quote_id',i.quote_id,'slot_hold_id',i.slot_hold_id,
        'amount',i.amount,'status',i.status,'scheduled_at',b.scheduled_at
      ) order by i.sequence_no)
      from public.bundle_booking_items i
      join public.bookings b on b.id=i.booking_id
      where i.group_id=v_group.id
    ),'[]'::jsonb)
  );
end;
$$;

revoke all on function public.create_beta_bundle_booking_v1(
  text,text,text[],text,date,text,text,jsonb
) from public,anon,authenticated;
grant execute on function public.create_beta_bundle_booking_v1(
  text,text,text[],text,date,text,text,jsonb
) to service_role;

commit;
