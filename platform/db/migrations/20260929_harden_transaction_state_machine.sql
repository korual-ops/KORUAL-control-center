-- Applied to Supabase production on 2026-09-29.
-- Transaction state machine v2: separate marketplace matching from direct booking,
-- enforce valid lifecycle transitions, snapshot accepted quotes, and link recommendation runs.

alter table public.service_requests
  add column if not exists matching_mode text not null default 'marketplace';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='service_requests_matching_mode_check'
      and conrelid='public.service_requests'::regclass
  ) then
    alter table public.service_requests
      add constraint service_requests_matching_mode_check
      check (matching_mode in ('marketplace','direct_booking'));
  end if;
end $$;

alter table public.provider_quotes
  add column if not exists quote_expires_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists quote_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists recommendation_run_id uuid
    references public.recommendation_runs(id) on delete set null;

alter table public.bookings
  add column if not exists recommendation_run_id uuid
    references public.recommendation_runs(id) on delete set null;

create index if not exists provider_quotes_expiry_idx
  on public.provider_quotes(quote_expires_at)
  where status='submitted';

create index if not exists provider_quotes_recommendation_run_idx
  on public.provider_quotes(recommendation_run_id)
  where recommendation_run_id is not null;

create index if not exists bookings_recommendation_run_idx
  on public.bookings(recommendation_run_id)
  where recommendation_run_id is not null;

create or replace function public.validate_service_request_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status is not distinct from old.status then return new; end if;

  if old.status='NEW' and new.status in ('MATCHING','QUOTED','CANCELLED') then return new; end if;
  if old.status='MATCHING' and new.status in ('QUOTED','CANCELLED') then return new; end if;
  if old.status='QUOTED' and new.status in ('BOOKED','CANCELLED') then return new; end if;
  if old.status='BOOKED' and new.status in ('COMPLETED','CANCELLED') then return new; end if;

  raise exception 'invalid service request transition: % -> %', old.status, new.status
    using errcode='23514';
end;
$$;

revoke all on function public.validate_service_request_transition() from public, anon, authenticated;

drop trigger if exists service_requests_validate_transition_trg on public.service_requests;
create trigger service_requests_validate_transition_trg
before update of status on public.service_requests
for each row execute function public.validate_service_request_transition();

create or replace function public.validate_provider_quote_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status is not distinct from old.status then return new; end if;
  if old.status='submitted' and new.status in ('accepted','rejected','expired') then return new; end if;

  raise exception 'invalid provider quote transition: % -> %', old.status, new.status
    using errcode='23514';
end;
$$;

revoke all on function public.validate_provider_quote_transition() from public, anon, authenticated;

drop trigger if exists provider_quotes_validate_transition_trg on public.provider_quotes;
create trigger provider_quotes_validate_transition_trg
before update of status on public.provider_quotes
for each row execute function public.validate_provider_quote_transition();

create or replace function public.validate_booking_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status is not distinct from old.status then return new; end if;
  if old.status='pending' and new.status in ('confirmed','completed','cancelled') then return new; end if;
  if old.status='confirmed' and new.status in ('completed','cancelled') then return new; end if;

  raise exception 'invalid booking transition: % -> %', old.status, new.status
    using errcode='23514';
end;
$$;

revoke all on function public.validate_booking_transition() from public, anon, authenticated;

drop trigger if exists bookings_validate_transition_trg on public.bookings;
create trigger bookings_validate_transition_trg
before update of status on public.bookings
for each row execute function public.validate_booking_transition();

create or replace function public.match_service_providers(
  p_request_id uuid,
  p_limit integer default 5
)
returns table(
  provider_id uuid,
  provider_name text,
  score integer,
  rating numeric,
  review_count integer,
  verified boolean
)
language sql
security definer
set search_path = pg_catalog, public
as $
with req as (
  select id, services, region
  from public.service_requests
  where id=p_request_id
),
scored as (
  select
    p.id,
    p.name,
    p.rating,
    p.review_count,
    p.verified,
    p.korual_score,
    p.avg_response_minutes,
    p.completed_jobs,
    cardinality(r.services) as requested_count,
    (
      select count(*)
      from unnest(r.services) s
      where
        s = any(coalesce(p.service_categories,'{}'::text[]))
        or (
          '생활 서비스' = any(coalesce(p.service_categories,'{}'::text[]))
          and s = any(array[
            '이사','입주청소','청소','인터넷 설치','에어컨',
            '인테리어','수리·시공','생활 서비스'
          ]::text[])
        )
    ) as supported_count,
    exists(
      select 1
      from unnest(coalesce(p.regions,'{}'::text[])) rg
      where
        rg='전국'
        or r.region ilike '%' || rg || '%'
        or rg ilike '%' || r.region || '%'
    ) as region_match
  from req r
  cross join public.providers p
  where p.active=true
    and p.verified=true
)
select
  id,
  name,
  least(
    100,
    round(
      35 * (coalesce(korual_score,0)::numeric / 100) +
      20 * (coalesce(rating,0)::numeric / 5) +
      15 * (
        case
          when avg_response_minutes is null then 0.55
          when avg_response_minutes <= 10 then 1.00
          when avg_response_minutes <= 20 then 0.90
          when avg_response_minutes <= 45 then 0.78
          when avg_response_minutes <= 90 then 0.65
          else 0.45
        end
      ) +
      15 * least(1.0, ln(greatest(1,coalesce(completed_jobs,0)+1)) / ln(501)) +
      10 * least(1.0, ln(greatest(1,coalesce(review_count,0)+1)) / ln(301)) +
      5 * (
        case when requested_count > 0
          then supported_count::numeric / requested_count
          else 0
        end
      )
    )::integer
  ) as score,
  rating,
  review_count,
  verified
from scored
where requested_count > 0
  and supported_count = requested_count
  and region_match
order by score desc, rating desc, review_count desc
limit greatest(1,least(p_limit,20));
$;

revoke all on function public.match_service_providers(uuid,integer) from public, anon, authenticated;
grant execute on function public.match_service_providers(uuid,integer) to service_role;

create or replace function public.auto_dispatch_service_request_matches()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $
declare
  v_match_count integer := 0;
begin
  if new.matching_mode <> 'marketplace' then
    return new;
  end if;

  insert into public.service_request_matches
    (request_id, provider_id, match_score, status, sent_at)
  select
    new.id, m.provider_id, m.score, 'contacted', now()
  from public.match_service_providers(new.id, 5) m
  on conflict (request_id, provider_id) do update set
    match_score = excluded.match_score,
    status = 'contacted',
    sent_at = coalesce(public.service_request_matches.sent_at, excluded.sent_at),
    updated_at = now();

  get diagnostics v_match_count = row_count;

  if v_match_count > 0 then
    update public.service_requests
    set status='MATCHING', updated_at=now()
    where id=new.id and status='NEW';
  else
    insert into public.service_request_events(
      request_id,event_type,from_status,to_status,actor_type,metadata
    ) values (
      new.id,'matching.no_candidates','NEW','NEW','system',
      jsonb_build_object('matching_mode',new.matching_mode)
    );
  end if;

  return new;
end;
$;

revoke all on function public.auto_dispatch_service_request_matches() from public, anon, authenticated;

create or replace function public.create_beta_booking(
  p_session_id text,
  p_idempotency_key text,
  p_services text[],
  p_region text,
  p_desired_date date,
  p_customer_name text,
  p_phone text,
  p_provider_key text,
  p_amount integer,
  p_message text default 'KORUAL beta quote'
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
begin
  if p_session_id is null or length(p_session_id) < 8 then raise exception 'invalid session'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then raise exception 'invalid idempotency key'; end if;
  if coalesce(array_length(p_services,1),0) < 1 then raise exception 'at least one service required'; end if;
  if p_region is null or length(trim(p_region)) < 2 then raise exception 'region required'; end if;
  if p_desired_date is null then raise exception 'desired date required'; end if;
  if p_customer_name is null or length(trim(p_customer_name)) < 2 then raise exception 'customer name required'; end if;
  if p_phone is null or length(regexp_replace(p_phone,'[^0-9]','','g')) < 10 then raise exception 'phone required'; end if;
  if p_amount < 0 then raise exception 'invalid amount'; end if;

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
      'idempotent',true
    );
  end if;

  select * into v_provider
  from public.providers
  where provider_key=p_provider_key
    and active=true
    and verified=true
  limit 1;

  if not found then raise exception 'provider unavailable'; end if;

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
      'source','signed_quote_token'
    )
  )
  returning * into v_quote;

  insert into public.service_request_events(
    request_id,event_type,from_status,to_status,actor_type,metadata
  ) values (
    v_request.id,'quote.accepted',null,null,'customer',
    jsonb_build_object('quote_id',v_quote.id,'provider_id',v_provider.id,'amount',v_quote.amount)
  );

  insert into public.bookings(
    request_id,quote_id,provider_id,scheduled_at,status,customer_name,phone
  ) values (
    v_request.id,v_quote.id,v_provider.id,
    p_desired_date::timestamp + interval '10 hours',
    'pending',trim(p_customer_name),regexp_replace(p_phone,'[^0-9]','','g')
  )
  returning * into v_booking;

  update public.service_requests set status='BOOKED' where id=v_request.id;

  insert into public.service_request_events(
    request_id,event_type,from_status,to_status,actor_type,metadata
  ) values (
    v_request.id,'booking.created',null,null,'customer',
    jsonb_build_object('booking_id',v_booking.id,'quote_id',v_quote.id)
  );

  return jsonb_build_object(
    'request_id',v_request.id,
    'request_code',v_request.request_code,
    'quote_id',v_quote.id,
    'booking_id',v_booking.id,
    'status',v_booking.status,
    'provider_name',v_provider.name,
    'amount',v_quote.amount,
    'idempotent',false
  );
end;
$$;

revoke all on function public.create_beta_booking(
  text,text,text[],text,date,text,text,text,integer,text
) from public, anon, authenticated;

grant execute on function public.create_beta_booking(
  text,text,text[],text,date,text,text,text,integer,text
) to service_role;


-- Keep provider pricing profiles server-only without duplicate permissive policies.
drop policy if exists provider_pricing_profiles_deny_select on public.provider_pricing_profiles;
