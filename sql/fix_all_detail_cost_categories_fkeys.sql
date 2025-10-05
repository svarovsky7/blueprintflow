-- =====================================================================================================================
-- Исправление ВСЕХ foreign keys на detail_cost_categories
-- =====================================================================================================================
-- Проблема: После миграции некоторые таблицы ссылаются на detail_cost_categories_old вместо detail_cost_categories
-- Решение: Пересоздать foreign keys для всех таблиц с неправильными ссылками
-- =====================================================================================================================

-- 1. Исправить rates_detail_cost_categories_mapping
ALTER TABLE rates_detail_cost_categories_mapping
DROP CONSTRAINT IF EXISTS rates_detail_cost_categories_mapping_detail_cost_category_id_fk;

ALTER TABLE rates_detail_cost_categories_mapping
ADD CONSTRAINT rates_detail_cost_categories_mapping_detail_cost_category_id_fk
FOREIGN KEY (detail_cost_category_id)
REFERENCES detail_cost_categories(id)
ON DELETE CASCADE
NOT VALID;

-- 2. Исправить type_calculation_work_mapping
ALTER TABLE type_calculation_work_mapping
DROP CONSTRAINT IF EXISTS type_calculation_work_mapping_detail_cost_category_id_fkey;

ALTER TABLE type_calculation_work_mapping
ADD CONSTRAINT type_calculation_work_mapping_detail_cost_category_id_fkey
FOREIGN KEY (detail_cost_category_id)
REFERENCES detail_cost_categories(id)
ON DELETE CASCADE
NOT VALID;

-- 3. Валидация constraints (опционально, можно пропустить если будет таймаут)
-- Раскомментируй если хочешь проверить существующие данные:
-- ALTER TABLE rates_detail_cost_categories_mapping VALIDATE CONSTRAINT rates_detail_cost_categories_mapping_detail_cost_category_id_fk;
-- ALTER TABLE type_calculation_work_mapping VALIDATE CONSTRAINT type_calculation_work_mapping_detail_cost_category_id_fkey;

-- 4. Проверка результата
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name IN ('detail_cost_categories', 'detail_cost_categories_old')
  AND tc.table_name IN ('rates_detail_cost_categories_mapping', 'type_calculation_work_mapping')
ORDER BY tc.table_name;

-- =====================================================================================================================
-- Ожидаемый результат: Все foreign keys должны ссылаться на detail_cost_categories (не на _old)
-- =====================================================================================================================
