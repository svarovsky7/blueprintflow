-- Миграция: Добавление cost_category_id в rates_detail_cost_categories_mapping
-- Дата: 2025-10-06
-- Описание: Денормализация связи для упрощения фильтрации расценок по категориям затрат

-- Шаг 1: Добавить столбец cost_category_id
ALTER TABLE rates_detail_cost_categories_mapping
ADD COLUMN cost_category_id bigint;

-- Шаг 2: Заполнить существующие записи на основе detail_cost_categories_mapping
-- Берём первую категорию затрат для каждого вида затрат
UPDATE rates_detail_cost_categories_mapping AS rdccm
SET cost_category_id = (
  SELECT dccm.cost_category_id
  FROM detail_cost_categories_mapping AS dccm
  WHERE dccm.detail_cost_category_id = rdccm.detail_cost_category_id
  LIMIT 1
)
WHERE cost_category_id IS NULL;

-- Шаг 3: Сделать поле обязательным (NOT NULL)
-- Только после заполнения всех существующих записей
ALTER TABLE rates_detail_cost_categories_mapping
ALTER COLUMN cost_category_id SET NOT NULL;

-- Шаг 4: Создать FK на cost_categories
ALTER TABLE rates_detail_cost_categories_mapping
ADD CONSTRAINT fk_rates_mapping_cost_category
FOREIGN KEY (cost_category_id)
REFERENCES cost_categories(id)
ON DELETE CASCADE;

-- Шаг 5: Создать индекс для ускорения фильтрации
CREATE INDEX idx_rates_mapping_cost_category
ON rates_detail_cost_categories_mapping(cost_category_id);

-- Комментарии
COMMENT ON COLUMN rates_detail_cost_categories_mapping.cost_category_id
IS 'FK на категорию затрат (денормализация для упрощения фильтрации)';
