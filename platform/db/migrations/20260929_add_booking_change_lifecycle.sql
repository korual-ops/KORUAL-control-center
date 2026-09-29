-- Applied to Supabase production on 2026-09-29.
-- Booking lifecycle v1: customer cancellation and atomic rescheduling.

create or replace function public.cancel_beta_booking_v1(
  p_session_id text,
  p_booking_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_booking public.bookings%rowtype;
  v_request public.service_requests%rowtype;
begin
  if p_session_id is null or length(p_session_id)<8 then raise exception 'invalid session'; end if;

  select b.* into v_booking
  from public.bookings b
  join public.service_requests r on r.id=b.request_id
  where b.id=p_booking_id
    and r.session_id=p_session_id
  for update;

  if not found then raise exception 'booking not found'; end if;

  select * into v_request
  from public.service_requests
  where id=v_booking.request_id
  for update;

  if v_booking.status='cancelled' and v_request.status='CANCELLED' then
    return jsonb_build_object(
      'booking_id',v_booking.id,
      'status','cancelled',
      'request_status','CANCELLED',
      'idempotent',true
    );
  end if;

  if v_booking.status not in ('pending','confirmed') then
    raise exception 'booking cannot be cancelled';
  end if;

  update public.bookings
  set status='cancelled',updated_at=now()
  where id=v_booking.id;

  update public.provider_slot_holds
  set status='released',updated_at=now()
  where booking_id=v_booking.id
    and status='converted';

  update public.service_requests
  set status='CANCELLED',updated_at=now()
  where id=v_request.id;

  insert into public.service_request_events(
    request_id,event_type,from_status,to_status,actor_type,metadata
  ) values (
    v_request.id,'booking.cancelled',v_request.status,'CANCELLED','customer',
    jsonb_build_object(
      'booking_id',v_booking.id,
      'reason',nullif(trim(coalesce(p_reason,'')),'')
    )
  );

  return jsonb_build_object(
    'booking_id',v_booking.id,
    'status','cancelled',
    'request_status','CANCELLED',
    'idempotent',false
  );
end;
$$;

revoke all on function public.cancel_beta_booking_v1(text,uuid,text) from public,anon,authenticated;
grant execute on function public.cancel_beta_booking_v1(text,uuid,text) to service_role;

create or replace function public.reschedule_beta_booking_v1(
  p_session_id text,
  p_booking_id uuid,
  p_slot_hold_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_booking public.bookings%rowtype;
  v_request public.service_requests%rowtype;
  v_hold public.provider_slot_holds%rowtype;
  v_old_scheduled timestamptz;
begin
  if p_session_id is null or length(p_session_id)<8 then raise exception 'invalid session'; end if;

  select b.* into v_booking
  from public.bookings b
  join public.service_requests r on r.id=b.request_id
  where b.id=p_booking_id
    and r.session_id=p_session_id
  for update;

  if not found then raise exception 'booking not found'; end if;
  if v_booking.status not in ('pending','confirmed') then raise exception 'booking cannot be rescheduled'; end if;

  select * into v_request
  from public.service_requests
  where id=v_booking.request_id
  for update;

  select * into v_hold
  from public.provider_slot_holds
  where id=p_slot_hold_id
  for update;

  if not found then raise exception 'slot hold not found'; end if;
  if v_hold.provider_id<>v_booking.provider_id then raise exception 'slot hold provider mismatch'; end if;
  if v_hold.session_id<>p_session_id then raise exception 'slot hold session mismatch'; end if;
  if v_hold.status<>'held' then raise exception 'slot hold inactive'; end if;
  if v_hold.expires_at<=now() then
    update public.provider_slot_holds set status='expired',updated_at=now() where id=v_hold.id;
    raise exception 'slot hold expired';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_booking.provider_id::text || '|' || v_hold.starts_at::text,0));

  v_old_scheduled:=v_booking.scheduled_at;

  update public.provider_slot_holds
  set status='released',updated_at=now()
  where booking_id=v_booking.id
    and status='converted';

  update public.bookings
  set scheduled_at=v_hold.starts_at,updated_at=now()
  where id=v_booking.id;

  update public.provider_slot_holds
  set status='converted',booking_id=v_booking.id,updated_at=now()
  where id=v_hold.id;

  update public.service_requests
  set desired_date=(v_hold.starts_at at time zone 'Asia/Seoul')::date,
      updated_at=now()
  where id=v_request.id;

  insert into public.service_request_events(
    request_id,event_type,from_status,to_status,actor_type,metadata
  ) values (
    v_request.id,'booking.rescheduled',v_request.status,v_request.status,'customer',
    jsonb_build_object(
      'booking_id',v_booking.id,
      'old_scheduled_at',v_old_scheduled,
      'new_scheduled_at',v_hold.starts_at,
      'slot_hold_id',v_hold.id
    )
  );

  return jsonb_build_object(
    'booking_id',v_booking.id,
    'status',v_booking.status,
    'scheduled_at',v_hold.starts_at,
    'request_status',v_request.status
  );
end;
$$;

revoke all on function public.reschedule_beta_booking_v1(text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.reschedule_beta_booking_v1(text,uuid,uuid) to service_role;
