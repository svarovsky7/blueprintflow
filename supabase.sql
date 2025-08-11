create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now()
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
  project text,
  material text,
  "quantityPd" numeric,
  "quantitySpec" numeric,
  "quantityRd" numeric,
  unit text,
  created_at timestamptz default now()
);

create table if not exists chessboard (
  id uuid primary key default gen_random_uuid(),
  project text,
  material text,
  "quantityPd" numeric,
  "quantitySpec" numeric,
  "quantityRd" numeric,
  unit text,
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
  created_at timestamptz default now()
);
