create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  address text,
  bottom_underground_floor integer,
  top_ground_floor integer,
  blocks_count integer,
  created_at timestamptz default now()
);

create table if not exists floors (
  number integer primary key
);

insert into floors (number)
select generate_series(-3, 120)
on conflict do nothing;

create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  name text not null
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
  name text,
  created_at timestamptz default now()
);

create table if not exists estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates on delete cascade,
  description text,
  quantity numeric,
  unit_price numeric,
  created_at timestamptz default now()
);

create table chessboard (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  material text,
  "quantityPd" numeric,
  "quantitySpec" numeric,
  "quantityRd" numeric,
  unit_id uuid references units on delete set null,
  cost_category_code text references cost_categories(code),
  created_at timestamptz default now()
);

create table if not exists chessboard (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  material text,
  "quantityPd" numeric,
  "quantitySpec" numeric,
  "quantityRd" numeric,
  unit_id uuid references units on delete set null,
  cost_category_code text references cost_categories(code),
  created_at timestamptz default now()
);

-- reference data (renamed from reserved keyword "references")
create table if not exists reference_data (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  data jsonb,
  created_at timestamptz default now()
);

create table if not exists work_progress (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  description text,
  quantity numeric,
  unit text,
  completed_at timestamptz default now()
);

create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  created_at timestamptz default now()
);

alter table if exists units
add column if not exists description text;

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit_id uuid references units,
  created_at timestamptz default now()
);

create table if not exists cost_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references cost_categories on delete set null,
  code text unique not null,
  name text not null,
  level int check (level in (1, 2, 3)) not null,
  description text,
  created_at timestamptz default now()
);

create view if not exists cost_categories_sorted as
select *
from cost_categories
order by code asc;

alter table if exists chessboard
add column if not exists cost_category_code text references cost_categories(code);

insert into cost_categories (code, name, level)
values ('99', 'Прочее', 1)
on conflict (code) do nothing;

update chessboard
set cost_category_code = '99'
where cost_category_code is null;
