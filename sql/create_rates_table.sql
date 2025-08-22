-- Создание таблицы расценок
create table if not exists rates (
  id uuid primary key default gen_random_uuid(),
  work_name text not null, -- Ключевое поле: НАИМЕНОВАНИЕ РАБОТ
  work_set text, -- РАБОЧИЙ НАБОР
  base_rate numeric not null, -- Расценка БАЗОВАЯ
  unit_id uuid references units on delete set null, -- Ед.изм.
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Добавляем уникальный индекс по наименованию работ
  unique(work_name)
);

-- Создание таблицы маппинга для связи с категориями затрат
create table if not exists rates_cost_categories_mapping (
  rate_id uuid references rates on delete cascade,
  cost_category_id integer references cost_categories on delete cascade,
  primary key (rate_id, cost_category_id)
);

-- Создание индексов для производительности
create index if not exists idx_rates_work_name on rates(work_name);
create index if not exists idx_rates_updated_at on rates(updated_at);
create index if not exists idx_rates_cost_categories_mapping_rate_id on rates_cost_categories_mapping(rate_id);
create index if not exists idx_rates_cost_categories_mapping_cost_category_id on rates_cost_categories_mapping(cost_category_id);

-- Триггер для автоматического обновления updated_at
create or replace function update_rates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_update_rates_updated_at
  before update on rates
  for each row
  execute function update_rates_updated_at();