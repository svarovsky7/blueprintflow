create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.material_prices (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references public.materials(id) on delete cascade,
  price numeric,
  purchase_date date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (material_id, purchase_date)
);

create index if not exists idx_material_prices_material_id on public.material_prices(material_id);

grant all on table public.materials to anon;
grant all on table public.materials to authenticated;
grant all on table public.materials to service_role;

grant all on table public.material_prices to anon;
grant all on table public.material_prices to authenticated;
grant all on table public.material_prices to service_role;
