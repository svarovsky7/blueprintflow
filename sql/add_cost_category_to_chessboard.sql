-- Добавление категории затрат в шахматку и заполнение значений по умолчанию
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
