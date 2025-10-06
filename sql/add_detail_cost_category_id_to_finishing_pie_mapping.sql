-- Миграция: Добавление detail_cost_category_id в finishing_pie_mapping
-- Удаление detail_cost_category_name

-- Шаг 1: Добавить поле detail_cost_category_id
ALTER TABLE finishing_pie_mapping
ADD COLUMN detail_cost_category_id integer;

-- Шаг 2: Создать FK на detail_cost_categories
ALTER TABLE finishing_pie_mapping
ADD CONSTRAINT fk_finishing_pie_mapping_detail_cost_category
FOREIGN KEY (detail_cost_category_id)
REFERENCES detail_cost_categories(id)
ON DELETE SET NULL;

-- Шаг 3: Удалить старое текстовое поле detail_cost_category_name
ALTER TABLE finishing_pie_mapping
DROP COLUMN IF EXISTS detail_cost_category_name;

-- Комментарий
COMMENT ON COLUMN finishing_pie_mapping.detail_cost_category_id IS 'FK на detail_cost_categories - вид затрат';
