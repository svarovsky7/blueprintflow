create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text
);

create table if not exists floors (
  number integer primary key
);

insert into floors (number)
select generate_series(-3, 120)
on conflict do nothing;

create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bottom_underground_floor integer,
  top_ground_floor integer
);

create table if not exists projects_blocks (
  project_id uuid references projects on delete cascade,
  block_id uuid references blocks on delete cascade,
  primary key (project_id, block_id)
);

create table if not exists estimates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  type text check (type in ('chessboard', 'vor')) not null,
  name text
);

create table if not exists estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates on delete cascade,
  description text,
  quantity numeric,
  unit_price numeric
);

create table if not exists chessboard (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  material text,
  "quantityPd" numeric,
  "quantitySpec" numeric,
  "quantityRd" numeric,
  unit_id uuid references units on delete set null,
  cost_category_code text,
  color text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- reference data (renamed from reserved keyword "references")
create table if not exists reference_data (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists work_progress (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  description text,
  quantity numeric,
  unit_id uuid references units on delete set null,
  completed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists location (
  id integer primary key generated always as identity,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists cost_categories (
  id integer primary key generated always as identity,
  number integer not null,
  name text not null,
  unit_id uuid references units on delete set null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists detail_cost_categories (
  id integer primary key generated always as identity,
  cost_category_id integer references cost_categories(id),
  location_id integer references location(id),
  name text not null,
  description text,
  unit_id uuid references units on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into cost_categories (number, name)
values (99, 'Прочее')
on conflict (number) do nothing;

update chessboard
set cost_category_code = '99'
where cost_category_code is null;
