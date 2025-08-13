-- Создание таблицы маппинга записей шахматки с категориями затрат, видами затрат и локализацией
create table if not exists chessboard_mapping (
  id uuid primary key default gen_random_uuid(),
  chessboard_id uuid references chessboard(id) on delete cascade unique,
  cost_category_id integer references cost_categories(id) not null,
  cost_type_id integer references detail_cost_categories(id),
  location_id integer references location(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
