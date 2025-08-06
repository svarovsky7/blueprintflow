create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table estimates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  type text check (type in ('chessboard', 'vor')) not null,
  name text,
  created_at timestamptz default now()
);

create table estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates on delete cascade,
  description text,
  quantity numeric,
  unit_price numeric,
  created_at timestamptz default now()
);

create table references (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  data jsonb,
  created_at timestamptz default now()
);

create table work_progress (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  description text,
  quantity numeric,
  unit text,
  completed_at timestamptz default now()
);
