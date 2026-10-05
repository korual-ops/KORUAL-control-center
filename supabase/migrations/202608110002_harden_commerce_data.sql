-- KORUAL commerce data hygiene (non-destructive)
-- Existing rows are preserved. Constraints are installed as NOT VALID first so
-- historical data can be reviewed before validation in a later migration.

-- 중복이 없는 테이블에만 유니크 인덱스를 설치합니다. 기존 중복 때문에
-- 전체 배포가 중단되는 것을 막고, 중복 목록은 아래 audit view에서 확인합니다.
do $$
begin
  if not exists (select lower(btrim(sku)) from public.products where nullif(btrim(sku),'') is not null group by 1 having count(*) > 1) then
    execute 'create unique index if not exists products_sku_unique_idx on public.products (lower(btrim(sku))) where sku is not null and btrim(sku) <> ''''';
  end if;
  if not exists (select lower(btrim(order_no)) from public.orders where nullif(btrim(order_no),'') is not null group by 1 having count(*) > 1) then
    execute 'create unique index if not exists orders_order_no_unique_idx on public.orders (lower(btrim(order_no))) where order_no is not null and btrim(order_no) <> ''''';
  end if;
  if not exists (select lower(btrim(code)) from public.categories where nullif(btrim(code),'') is not null group by 1 having count(*) > 1) then
    execute 'create unique index if not exists categories_code_unique_idx on public.categories (lower(btrim(code))) where code is not null and btrim(code) <> ''''';
  end if;
  if not exists (select lower(btrim(code)) from public.content_items where nullif(btrim(code),'') is not null group by 1 having count(*) > 1) then
    execute 'create unique index if not exists content_items_code_unique_idx on public.content_items (lower(btrim(code))) where code is not null and btrim(code) <> ''''';
  end if;
end $$;

create or replace view public.data_quality_duplicates
with (security_invoker = true) as
select 'products.sku'::text as field, lower(btrim(sku)) as value, count(*)::bigint as duplicate_count
from public.products where nullif(btrim(sku),'') is not null group by 1, 2 having count(*) > 1
union all
select 'orders.order_no', lower(btrim(order_no)), count(*)::bigint
from public.orders where nullif(btrim(order_no),'') is not null group by 1, 2 having count(*) > 1
union all
select 'categories.code', lower(btrim(code)), count(*)::bigint
from public.categories where nullif(btrim(code),'') is not null group by 1, 2 having count(*) > 1
union all
select 'content_items.code', lower(btrim(code)), count(*)::bigint
from public.content_items where nullif(btrim(code),'') is not null group by 1, 2 having count(*) > 1;

revoke all on public.data_quality_duplicates from anon;
grant select on public.data_quality_duplicates to authenticated;

create index if not exists orders_operations_queue_idx
  on public.orders (status, shipping_due_at, ordered_at desc);

create index if not exists products_inventory_risk_idx
  on public.products (stock asc, status)
  where stock <= 20;

create index if not exists orders_customer_phone_lookup_idx
  on public.orders (customer_phone)
  where customer_phone is not null and btrim(customer_phone) <> '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_nonnegative_values') then
    alter table public.products add constraint products_nonnegative_values
      check (price >= 0 and stock >= 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_positive_values') then
    alter table public.orders add constraint orders_positive_values
      check (amount >= 0 and quantity > 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_shipping_sequence') then
    alter table public.orders add constraint orders_shipping_sequence
      check (shipped_at is null or shipping_due_at is null or shipped_at >= ordered_at) not valid;
  end if;
end $$;

comment on column public.orders.customer_phone is
  'Delivery notification destination. Treat as PII; never expose in analytics or client logs.';
comment on column public.orders.delay_notified_at is
  'Last successful shipping-delay notification timestamp.';
