create table if not exists cost_categories (
  id integer primary key generated always as identity,
  number integer not null,
  name text not null,
  unit_id uuid references units on delete set null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists chessboard
  add column if not exists cost_category_code text;

insert into cost_categories (number, name)
values (99, 'Прочее')
on conflict (number) do nothing;

update chessboard
set cost_category_code = '99'
where cost_category_code is null;
