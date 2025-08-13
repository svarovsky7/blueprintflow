-- Создание таблицы маппинга записей шахматки с категориями затрат, видами затрат и локализацией
create table if not exists chessboard_mapping (
  id uuid primary key default gen_random_uuid(),
  chessboard_id uuid references chessboard(id) on delete cascade unique,
  cost_category_code text references cost_categories(code) not null,
  cost_type_code text references detail_cost_categories(code),
  location_id integer references location(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
