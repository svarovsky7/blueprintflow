-- Переименование detail_cost_category_id в detail_cost_category_name и изменение типа данных

-- 1. Удалить внешний ключ (если существует)
ALTER TABLE finishing_pie_mapping
DROP CONSTRAINT IF EXISTS finishing_pie_mapping_detail_cost_category_id_fkey;

-- 2. Переименовать столбец
ALTER TABLE finishing_pie_mapping
RENAME COLUMN detail_cost_category_id TO detail_cost_category_name;

-- 3. Изменить тип данных с integer на text
ALTER TABLE finishing_pie_mapping
ALTER COLUMN detail_cost_category_name TYPE text;

-- 4. Обновить комментарий к столбцу
COMMENT ON COLUMN finishing_pie_mapping.detail_cost_category_name
IS 'Название вида затрат (текстовое значение из detail_cost_categories.name)';
