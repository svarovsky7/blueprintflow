-- Добавление work_name_id в таблицу finishing_pie_mapping
-- Для хранения наименования работы через FK на work_names

-- 1. Удалить старый FK constraint для work_set_id
ALTER TABLE finishing_pie_mapping
DROP CONSTRAINT IF EXISTS finishing_pie_mapping_work_set_id_fkey;

-- 2. Удалить устаревшее поле work_set_id
ALTER TABLE finishing_pie_mapping
DROP COLUMN IF EXISTS work_set_id;

-- 3. Добавить новый столбец work_name_id
ALTER TABLE finishing_pie_mapping
ADD COLUMN work_name_id UUID;

-- 4. Создать FK constraint на таблицу work_names
ALTER TABLE finishing_pie_mapping
ADD CONSTRAINT finishing_pie_mapping_work_name_id_fkey
FOREIGN KEY (work_name_id) REFERENCES work_names(id) ON DELETE SET NULL;

-- 5. Добавить комментарии для документирования
COMMENT ON COLUMN finishing_pie_mapping.work_name_id IS 'FK на work_names - наименование работы';
COMMENT ON COLUMN finishing_pie_mapping.rate_id IS 'FK на rates - расценка (включает work_set для группировки)';
