-- Добавление поля для вида затрат в таблицу rates
alter table rates 
add column if not exists detail_cost_category_id integer references detail_cost_categories on delete set null;

-- Создание индекса для производительности
create index if not exists idx_rates_detail_cost_category_id on rates(detail_cost_category_id);

-- Обновление функции триггера (без изменений, но для полноты)
create or replace function update_rates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;