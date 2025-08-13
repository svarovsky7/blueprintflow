-- Создание таблиц категорий затрат и видов затрат
create table if not exists cost_categories (
  id integer primary key generated always as identity,
  name text not null,
  description text,
  unit_id uuid references units(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists detail_cost_categories (
  id integer primary key generated always as identity,
  cost_category_id integer references cost_categories(id) not null,
  location_id integer references location(id) not null,
  name text not null,
  description text,
  unit_id uuid references units(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
