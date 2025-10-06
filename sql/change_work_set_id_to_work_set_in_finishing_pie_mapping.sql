-- Изменение структуры finishing_pie_mapping: заменить work_set_id (UUID FK) на work_set (TEXT)
-- Это необходимо для хранения названия рабочего набора вместо ID расценки

-- 1. Удаляем FK constraint
ALTER TABLE finishing_pie_mapping
DROP CONSTRAINT IF EXISTS finishing_pie_mapping_work_set_id_fkey;

-- 2. Удаляем старое поле work_set_id (UUID)
ALTER TABLE finishing_pie_mapping
DROP COLUMN IF EXISTS work_set_id;

-- 3. Добавляем новое поле work_set (TEXT)
ALTER TABLE finishing_pie_mapping
ADD COLUMN work_set TEXT;

-- 4. Обновляем комментарий
COMMENT ON COLUMN finishing_pie_mapping.work_set IS 'Название рабочего набора (rates.work_set)';
