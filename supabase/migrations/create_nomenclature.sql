create table if not exists public.nomenclature (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists nomenclature_name_key on public.nomenclature(name);

create table if not exists public.material_prices (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references public.nomenclature(id) on delete cascade,
  price numeric,
  purchase_date date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (material_id, price, purchase_date)
);

-- Remove duplicate price entries before adding unique constraint
delete from public.material_prices mp
using public.material_prices mp2
where mp.id > mp2.id
  and mp.material_id = mp2.material_id
  and mp.price = mp2.price
  and mp.purchase_date = mp2.purchase_date;

create unique index if not exists material_prices_material_id_price_purchase_date_key
  on public.material_prices(material_id, price, purchase_date);

create index if not exists idx_material_prices_material_id on public.material_prices(material_id);

grant all on table public.nomenclature to anon;
grant all on table public.nomenclature to authenticated;
grant all on table public.nomenclature to service_role;

grant all on table public.material_prices to anon;
grant all on table public.material_prices to authenticated;
grant all on table public.material_prices to service_role;

create table if not exists public.supplier_names (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create unique index if not exists supplier_names_name_key on public.supplier_names(name);

create table if not exists public.nomenclature_supplier_mapping (
  nomenclature_id uuid references public.nomenclature(id) on delete cascade,
  supplier_id uuid references public.supplier_names(id) on delete cascade,
  primary key (nomenclature_id, supplier_id)
);

grant all on table public.supplier_names to anon;
grant all on table public.supplier_names to authenticated;
grant all on table public.supplier_names to service_role;

grant all on table public.nomenclature_supplier_mapping to anon;
grant all on table public.nomenclature_supplier_mapping to authenticated;
grant all on table public.nomenclature_supplier_mapping to service_role;

create or replace function public.import_nomenclature(rows jsonb)
returns bigint
language plpgsql
as $$
declare
  inserted bigint;
begin
  insert into public.nomenclature(name)
  select distinct value->>'name'
  from jsonb_array_elements(rows) as value
  where trim(coalesce(value->>'name', '')) <> ''
  on conflict (name) do nothing;

  insert into public.supplier_names(name)
  select distinct value->>'supplier'
  from jsonb_array_elements(rows) as value
  where trim(coalesce(value->>'supplier', '')) <> ''
  on conflict (name) do nothing;

  insert into public.nomenclature_supplier_mapping(nomenclature_id, supplier_id)
  select n.id, s.id
  from (
    select distinct value->>'name' as name, value->>'supplier' as supplier
    from jsonb_array_elements(rows) as value
    where trim(coalesce(value->>'name', '')) <> ''
      and trim(coalesce(value->>'supplier', '')) <> ''
  ) as t
  join public.nomenclature n on n.name = t.name
  join public.supplier_names s on s.name = t.supplier
  on conflict do nothing;

  insert into public.material_prices(material_id, price, purchase_date)
  select n.id,
         (value->>'price')::numeric,
         coalesce(
           nullif(value->>'date', '')::date,
           current_date)
  from jsonb_array_elements(rows) as value
  join public.nomenclature n on n.name = value->>'name'
  where trim(coalesce(value->>'price', '')) <> ''
    and (value->>'price') ~ '^\d+(\.\d+)?$'
    and (
      value->>'date' is null
      or value->>'date' = ''
      or value->>'date' ~ '^\d{4}-\d{2}-\d{2}$'
    )
  on conflict (material_id, price, purchase_date) do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;
