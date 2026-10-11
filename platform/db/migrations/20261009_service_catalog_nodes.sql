-- KORUAL catalog v1 — review and apply separately from the frontend release.
-- No customer/provider records are modified by this migration.
-- Canonical source for seed values: platform/category-catalog.js
create table if not exists public.service_catalog_nodes (
  code text primary key check (code ~ '^[a-z0-9][a-z0-9-]{1,95}$'),
  parent_code text references public.service_catalog_nodes(code) on delete restrict,
  kind text not null check (kind in ('root','group','service')),
  labels jsonb not null check (jsonb_typeof(labels)='object' and labels ? 'ko' and labels ? 'en'),
  icon text,
  status text not null default 'catalog' check (status in ('catalog','beta','planned')),
  sort_order integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint service_catalog_root_parent_check check (
    (kind='root' and parent_code is null) or (kind <> 'root' and parent_code is not null)
  )
);
create index if not exists service_catalog_nodes_parent_sort_idx
  on public.service_catalog_nodes(parent_code,sort_order);
alter table public.service_catalog_nodes enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='service_catalog_nodes' and policyname='Public catalog read') then
    create policy "Public catalog read" on public.service_catalog_nodes
      for select to anon, authenticated using (active);
  end if;
end $$;
-- Do not expose insert/update/delete privileges to browser clients.
-- Apply generated seed only after review: node platform/scripts/generate-category-seed.mjs
