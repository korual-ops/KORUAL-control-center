-- Applied in KORUAL Supabase project, migration 20261013001404.

-- KORUAL ERP Core v1. Additive migration; preserves existing marketplace tables.
create table if not exists public.erp_businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  display_name text not null,
  provider_id uuid unique references public.providers(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','active','suspended','closed')),
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.erp_business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.erp_businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  business_role text not null check (business_role in ('owner','manager','staff')),
  status text not null default 'active' check (status in ('active','invited','revoked')),
  created_at timestamptz not null default now(),
  unique(business_id,user_id)
);
create index if not exists erp_business_members_user_idx on public.erp_business_members(user_id,business_id) where status='active';

create table if not exists public.erp_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.erp_businesses(id) on delete restrict,
  code text not null,
  name text not null,
  location_type text not null default 'warehouse' check (location_type in ('warehouse','store','service','other')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(business_id,code),
  unique(id,business_id)
);
create table if not exists public.erp_product_listings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.erp_businesses(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  sale_price numeric(16,2) not null check (sale_price >= 0),
  currency char(3) not null default 'KRW' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id,product_id)
);
create index if not exists erp_listings_product_idx on public.erp_product_listings(product_id) where status='active';

create table if not exists public.erp_inventory_balances (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.erp_businesses(id) on delete restrict,
  location_id uuid not null,
  product_id uuid not null references public.products(id) on delete restrict,
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0 and reserved <= on_hand),
  updated_at timestamptz not null default now(),
  foreign key(location_id,business_id) references public.erp_locations(id,business_id) on delete restrict,
  unique(business_id,location_id,product_id)
);
create index if not exists erp_balance_product_idx on public.erp_inventory_balances(business_id,product_id);

create table if not exists public.erp_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.erp_businesses(id) on delete restrict,
  location_id uuid not null,
  product_id uuid not null references public.products(id) on delete restrict,
  movement_type text not null check (movement_type in ('receipt','sale','return','reserve','release','adjustment','transfer_in','transfer_out')),
  delta_on_hand integer not null default 0,
  delta_reserved integer not null default 0,
  reference_type text,
  reference_id text,
  idempotency_key text not null check (length(idempotency_key) between 8 and 180),
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key(location_id,business_id) references public.erp_locations(id,business_id) on delete restrict,
  check (delta_on_hand <> 0 or delta_reserved <> 0),
  unique(business_id,idempotency_key)
);
create index if not exists erp_movement_recent_idx on public.erp_inventory_movements(business_id,product_id,created_at desc);

create table if not exists public.erp_customer_order_links (
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(order_id,user_id)
);
create index if not exists erp_customer_orders_user_idx on public.erp_customer_order_links(user_id,created_at desc);

create table if not exists public.erp_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  business_id uuid not null references public.erp_businesses(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(16,2) not null check (unit_price >= 0),
  discount_amount numeric(16,2) not null default 0 check (discount_amount >= 0),
  tax_amount numeric(16,2) not null default 0 check (tax_amount >= 0),
  line_total numeric(16,2) generated always as (quantity*unit_price-discount_amount+tax_amount) stored,
  status text not null default 'created' check (status in ('created','confirmed','fulfilled','cancelled','refunded')),
  created_at timestamptz not null default now(),
  check(discount_amount <= quantity * unit_price),
  unique(id,business_id)
);
create index if not exists erp_order_items_order_idx on public.erp_order_items(order_id);
create index if not exists erp_order_items_business_idx on public.erp_order_items(business_id,created_at desc);

create table if not exists public.erp_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete restrict,
  payment_provider text not null,
  provider_payment_id text,
  idempotency_key text not null unique,
  amount numeric(16,2) not null check(amount >= 0),
  currency char(3) not null default 'KRW' check(currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check(status in ('pending','authorized','paid','partially_refunded','refunded','failed','cancelled')),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  check(num_nonnulls(order_id,booking_id)=1),
  unique(payment_provider,provider_payment_id)
);
create index if not exists erp_payments_order_idx on public.erp_payments(order_id,created_at desc) where order_id is not null;
create index if not exists erp_payments_booking_idx on public.erp_payments(booking_id,created_at desc) where booking_id is not null;

create table if not exists public.erp_settlements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.erp_businesses(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  currency char(3) not null default 'KRW' check(currency ~ '^[A-Z]{3}$'),
  gross_amount numeric(16,2) not null default 0 check(gross_amount >= 0),
  platform_fee numeric(16,2) not null default 0 check(platform_fee >= 0),
  refund_amount numeric(16,2) not null default 0 check(refund_amount >= 0),
  net_amount numeric(16,2) generated always as (gross_amount-platform_fee-refund_amount) stored,
  status text not null default 'draft' check(status in ('draft','review','approved','paid','cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(period_end >= period_start),
  check(gross_amount >= platform_fee+refund_amount),
  unique(id,business_id),
  unique(business_id,period_start,period_end,currency)
);
create index if not exists erp_settlements_status_idx on public.erp_settlements(status,created_at desc);
create table if not exists public.erp_settlement_lines (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null,
  business_id uuid not null references public.erp_businesses(id) on delete restrict,
  order_item_id uuid,
  booking_id uuid references public.bookings(id) on delete restrict,
  source_key text not null,
  gross_amount numeric(16,2) not null check(gross_amount >= 0),
  fee_amount numeric(16,2) not null default 0 check(fee_amount >= 0),
  refund_amount numeric(16,2) not null default 0 check(refund_amount >= 0),
  created_at timestamptz not null default now(),
  check(num_nonnulls(order_item_id,booking_id)=1),
  check(gross_amount >= fee_amount + refund_amount),
  foreign key(settlement_id,business_id) references public.erp_settlements(id,business_id) on delete restrict,
  foreign key(order_item_id,business_id) references public.erp_order_items(id,business_id) on delete restrict,
  unique(settlement_id,source_key)
);
create index if not exists erp_settlement_lines_business_idx on public.erp_settlement_lines(business_id);

create table if not exists public.erp_external_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.erp_businesses(id) on delete restrict,
  provider text not null,
  external_entity_type text not null,
  external_entity_id text not null,
  internal_entity_type text not null,
  internal_entity_id uuid not null,
  sync_status text not null default 'linked' check(sync_status in ('linked','pending','failed','disabled')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider,external_entity_type,external_entity_id)
);
create index if not exists erp_external_internal_idx on public.erp_external_records(internal_entity_type,internal_entity_id);

create table if not exists public.erp_audit_events (
  id bigint generated always as identity primary key,
  business_id uuid references public.erp_businesses(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  summary jsonb not null default '{}'::jsonb check(jsonb_typeof(summary)='object'),
  created_at timestamptz not null default now()
);
create index if not exists erp_audit_business_idx on public.erp_audit_events(business_id,created_at desc);

-- Claims are sourced exclusively from signed, server-controlled app_metadata.
create or replace function public.erp_is_platform_admin()
returns boolean language sql stable security definer set search_path=''
as $$ select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role')='admin',false)
       or coalesce((select auth.jwt() -> 'app_metadata' ->> 'korual_role')='platform_admin',false) $$;

create or replace function public.erp_is_business_member(p_business_id uuid, p_allowed_roles text[] default array['owner','manager','staff'])
returns boolean language sql stable security definer set search_path=''
as $$
  select public.erp_is_platform_admin() or exists (
    select 1 from public.erp_business_members m
    where m.business_id=p_business_id and m.user_id=(select auth.uid())
      and m.status='active' and m.business_role=any(p_allowed_roles)
  )
$$;

-- Read-only roles for client apps; all mutations are through trusted backend except inventory RPC.
alter table public.erp_businesses enable row level security;
alter table public.erp_business_members enable row level security;
alter table public.erp_locations enable row level security;
alter table public.erp_product_listings enable row level security;
alter table public.erp_inventory_balances enable row level security;
alter table public.erp_inventory_movements enable row level security;
alter table public.erp_customer_order_links enable row level security;
alter table public.erp_order_items enable row level security;
alter table public.erp_payments enable row level security;
alter table public.erp_settlements enable row level security;
alter table public.erp_settlement_lines enable row level security;
alter table public.erp_external_records enable row level security;
alter table public.erp_audit_events enable row level security;

create policy erp_businesses_public on public.erp_businesses for select to anon,authenticated using (status='active');
create policy erp_businesses_member on public.erp_businesses for select to authenticated using (public.erp_is_business_member(id));
create policy erp_members_self on public.erp_business_members for select to authenticated using (user_id=(select auth.uid()) or public.erp_is_platform_admin());
create policy erp_locations_member on public.erp_locations for select to authenticated using (public.erp_is_business_member(business_id));
create policy erp_listings_public on public.erp_product_listings for select to anon,authenticated using (
 status='active' and exists (select 1 from public.erp_businesses b where b.id=business_id and b.status='active')
);
create policy erp_listings_member on public.erp_product_listings for select to authenticated using (public.erp_is_business_member(business_id));
create policy erp_balances_member on public.erp_inventory_balances for select to authenticated using (public.erp_is_business_member(business_id));
create policy erp_movements_member on public.erp_inventory_movements for select to authenticated using (public.erp_is_business_member(business_id));
create policy erp_customer_link_self on public.erp_customer_order_links for select to authenticated using (user_id=(select auth.uid()) or public.erp_is_platform_admin());
create policy erp_items_read on public.erp_order_items for select to authenticated using (
  public.erp_is_business_member(business_id) or exists (
    select 1 from public.erp_customer_order_links l where l.order_id=erp_order_items.order_id and l.user_id=(select auth.uid())
  )
);
create policy erp_payments_customer_or_admin on public.erp_payments for select to authenticated using (
 public.erp_is_platform_admin() or
 (order_id is not null and exists (
  select 1 from public.erp_customer_order_links l where l.order_id=erp_payments.order_id and l.user_id=(select auth.uid())
 ))
);
create policy erp_settlements_read on public.erp_settlements for select to authenticated using (public.erp_is_business_member(business_id,array['owner','manager']));
create policy erp_settlement_lines_read on public.erp_settlement_lines for select to authenticated using (public.erp_is_business_member(business_id,array['owner','manager']));
create policy erp_external_read on public.erp_external_records for select to authenticated using (public.erp_is_platform_admin() or (business_id is not null and public.erp_is_business_member(business_id,array['owner','manager'])));
create policy erp_audit_read on public.erp_audit_events for select to authenticated using (public.erp_is_platform_admin() or (business_id is not null and public.erp_is_business_member(business_id,array['owner','manager'])));

revoke all on table public.erp_businesses,public.erp_business_members,public.erp_locations,public.erp_product_listings,
 public.erp_inventory_balances,public.erp_inventory_movements,public.erp_customer_order_links,public.erp_order_items,
 public.erp_payments,public.erp_settlements,public.erp_settlement_lines,public.erp_external_records,public.erp_audit_events
from public,anon,authenticated;
grant select on table public.erp_businesses,public.erp_product_listings to anon,authenticated;
grant select on table public.erp_business_members,public.erp_locations,public.erp_inventory_balances,public.erp_inventory_movements,
 public.erp_customer_order_links,public.erp_order_items,public.erp_payments,public.erp_settlements,public.erp_settlement_lines,
 public.erp_external_records,public.erp_audit_events to authenticated;
grant all on table public.erp_businesses,public.erp_business_members,public.erp_locations,public.erp_product_listings,
 public.erp_inventory_balances,public.erp_inventory_movements,public.erp_customer_order_links,public.erp_order_items,
 public.erp_payments,public.erp_settlements,public.erp_settlement_lines,public.erp_external_records,public.erp_audit_events
to service_role;
grant usage,select on sequence public.erp_audit_events_id_seq to service_role;
revoke all on function public.erp_is_platform_admin(),public.erp_is_business_member(uuid,text[]) from public,anon;
grant execute on function public.erp_is_platform_admin(),public.erp_is_business_member(uuid,text[]) to authenticated,service_role;

create or replace function public.erp_apply_inventory_movement(
 p_business_id uuid,p_location_id uuid,p_product_id uuid,p_movement_type text,
 p_delta_on_hand integer,p_delta_reserved integer,p_idempotency_key text,
 p_reference_type text default null,p_reference_id text default null
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare v_id uuid;
begin
 if (select auth.uid()) is null or not public.erp_is_business_member(p_business_id,array['owner','manager']) then
   raise exception 'inventory permission denied' using errcode='42501';
 end if;
 if p_business_id is null or p_location_id is null or p_product_id is null then
   raise exception 'business, location and product required' using errcode='22023';
 end if;
 if not exists (select 1 from public.erp_businesses where id=p_business_id and status='active') then
   raise exception 'business inactive' using errcode='22023';
 end if;
 if not exists (select 1 from public.erp_product_listings
   where business_id=p_business_id and product_id=p_product_id and status in ('active','paused')) then
   raise exception 'product listing not found' using errcode='22023';
 end if;
 if not exists (select 1 from public.erp_locations where id=p_location_id and business_id=p_business_id and active) then
   raise exception 'active location not found' using errcode='22023';
 end if;
 insert into public.erp_inventory_movements(
   business_id,location_id,product_id,movement_type,delta_on_hand,delta_reserved,
   idempotency_key,reference_type,reference_id,actor_user_id)
 values(p_business_id,p_location_id,p_product_id,p_movement_type,p_delta_on_hand,p_delta_reserved,
   p_idempotency_key,p_reference_type,p_reference_id,(select auth.uid()))
 on conflict(business_id,idempotency_key) do nothing returning id into v_id;

 if v_id is null then
   select id into v_id from public.erp_inventory_movements
   where business_id=p_business_id and idempotency_key=p_idempotency_key
     and location_id=p_location_id and product_id=p_product_id and movement_type=p_movement_type
     and delta_on_hand=p_delta_on_hand and delta_reserved=p_delta_reserved;
   if v_id is null then
     raise exception 'idempotency key reused with different payload' using errcode='23505';
   end if;
   return v_id;
 end if;

 insert into public.erp_inventory_balances (business_id,location_id,product_id,on_hand,reserved)
 values(p_business_id,p_location_id,p_product_id,p_delta_on_hand,p_delta_reserved)
 on conflict(business_id,location_id,product_id) do update set
  on_hand=erp_inventory_balances.on_hand+excluded.on_hand,
  reserved=erp_inventory_balances.reserved+excluded.reserved,
  updated_at=now();

 insert into public.erp_audit_events(business_id,actor_user_id,action,entity_type,entity_id,summary)
 values(p_business_id,(select auth.uid()),'inventory.movement','inventory_movement',v_id::text,
  jsonb_build_object('delta_on_hand',p_delta_on_hand,'delta_reserved',p_delta_reserved,
    'product_id',p_product_id,'location_id',p_location_id,'movement_type',p_movement_type));
 return v_id;
end $$;
revoke all on function public.erp_apply_inventory_movement(uuid,uuid,uuid,text,integer,integer,text,text,text) from public,anon;
grant execute on function public.erp_apply_inventory_movement(uuid,uuid,uuid,text,integer,integer,text,text,text) to authenticated,service_role;

