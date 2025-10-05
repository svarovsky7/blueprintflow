-- =====================================================================================================================
-- Шаг 2: Миграция данных с тройной связью
-- =====================================================================================================================
-- Цель: Перенести данные из старой структуры в новую с тройной связью
-- Логика:
--   1. Заполнить detail_cost_categories_new ТОЛЬКО уникальными именами (БЕЗ дубликатов)
--   2. Заполнить detail_cost_categories_mapping тройными связями (category - detail - location)
--
-- Ожидаемый результат:
--   - detail_cost_categories_new: 172 записи (уникальные имена)
--   - detail_cost_categories_mapping: 218 связей (тройные связи)
-- =====================================================================================================================

-- 1. Заполнить detail_cost_categories_new ТОЛЬКО уникальными именами
-- Используем DISTINCT ON (name) для выбора первой записи по каждому уникальному имени
INSERT INTO detail_cost_categories_new (name, description, unit_id, created_at, updated_at)
SELECT DISTINCT ON (name)
    name,
    description,
    unit_id,
    created_at,
    updated_at
FROM detail_cost_categories
ORDER BY name, id;

-- Вывести количество перенесённых видов затрат
DO $$
DECLARE
    new_count INTEGER;
    old_count INTEGER;
    unique_names INTEGER;
BEGIN
    SELECT COUNT(*) INTO new_count FROM detail_cost_categories_new;
    SELECT COUNT(*) INTO old_count FROM detail_cost_categories;
    SELECT COUNT(DISTINCT name) INTO unique_names FROM detail_cost_categories;

    RAISE NOTICE 'Перенесено уникальных видов затрат: % (было % записей, % уникальных имён)',
                 new_count, old_count, unique_names;

    IF new_count != unique_names THEN
        RAISE WARNING 'ВНИМАНИЕ! Количество записей не совпадает с уникальными именами!';
    END IF;
END $$;

-- 2. Заполнить detail_cost_categories_mapping ТРОЙНЫМИ связями
-- JOIN старой таблицы с новой по name для получения новых ID
-- Результат: категория затрат ↔ вид затрат ↔ локализация
INSERT INTO detail_cost_categories_mapping (cost_category_id, detail_cost_category_id, location_id)
SELECT DISTINCT
    old.cost_category_id,
    new.id AS detail_cost_category_id,
    old.location_id
FROM detail_cost_categories old
JOIN detail_cost_categories_new new ON old.name = new.name
WHERE old.location_id IS NOT NULL
ORDER BY old.cost_category_id, new.id, old.location_id;

-- Вывести количество созданных тройных связей
DO $$
DECLARE
    mapping_count INTEGER;
    old_with_location INTEGER;
BEGIN
    SELECT COUNT(*) INTO mapping_count FROM detail_cost_categories_mapping;
    SELECT COUNT(*) INTO old_with_location
    FROM detail_cost_categories
    WHERE location_id IS NOT NULL;

    RAISE NOTICE 'Создано тройных связей в маппинге: % (было % записей с локализацией)',
                 mapping_count, old_with_location;

    IF mapping_count != old_with_location THEN
        RAISE WARNING 'ВНИМАНИЕ! Количество связей не совпадает с записями в старой таблице!';
    END IF;
END $$;

-- 3. Проверка целостности данных
-- Проверить, что все записи из старой таблицы нашли соответствие в новой структуре
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    -- Проверяем, что для каждой записи из старой таблицы есть соответствие в маппинге
    SELECT COUNT(*) INTO orphaned_count
    FROM detail_cost_categories old
    WHERE old.location_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM detail_cost_categories_mapping m
        JOIN detail_cost_categories_new new ON m.detail_cost_category_id = new.id
        WHERE new.name = old.name
          AND m.cost_category_id = old.cost_category_id
          AND m.location_id = old.location_id
    );

    IF orphaned_count > 0 THEN
        RAISE WARNING 'ВНИМАНИЕ! Найдено % записей без соответствия в новой структуре!', orphaned_count;
    ELSE
        RAISE NOTICE 'Проверка целостности пройдена: все записи перенесены успешно';
    END IF;
END $$;

-- 4. Вывести детальную статистику
DO $$
DECLARE
    detail_count INTEGER;
    mapping_count INTEGER;
    unique_details INTEGER;
    unique_categories INTEGER;
    unique_locations INTEGER;
    duplicates_eliminated INTEGER;
BEGIN
    SELECT COUNT(*) INTO detail_count FROM detail_cost_categories_new;
    SELECT COUNT(*) INTO mapping_count FROM detail_cost_categories_mapping;
    SELECT COUNT(DISTINCT detail_cost_category_id) INTO unique_details FROM detail_cost_categories_mapping;
    SELECT COUNT(DISTINCT cost_category_id) INTO unique_categories FROM detail_cost_categories_mapping;
    SELECT COUNT(DISTINCT location_id) INTO unique_locations FROM detail_cost_categories_mapping;

    SELECT COUNT(*) - (SELECT COUNT(*) FROM detail_cost_categories_new)
    INTO duplicates_eliminated
    FROM detail_cost_categories;

    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Миграция данных завершена!';
    RAISE NOTICE '-----------------------------------------------------------------';
    RAISE NOTICE 'Видов затрат в detail_cost_categories_new: %', detail_count;
    RAISE NOTICE 'Тройных связей в маппинге: %', mapping_count;
    RAISE NOTICE '  - Уникальных видов затрат в маппинге: %', unique_details;
    RAISE NOTICE '  - Уникальных категорий в маппинге: %', unique_categories;
    RAISE NOTICE '  - Уникальных локализаций в маппинге: %', unique_locations;
    RAISE NOTICE 'Устранено дубликатов: % записей', duplicates_eliminated;
    RAISE NOTICE '-----------------------------------------------------------------';
    RAISE NOTICE 'Следующий шаг: refactor_detail_cost_categories_CORRECT_step3_replace_tables.sql';
    RAISE NOTICE '=================================================================';
END $$;

-- 5. Примеры тройных связей для проверки
DO $$
BEGIN
    RAISE NOTICE 'Примеры тройных связей (первые 10):';
END $$;

SELECT
    cc.name AS category_name,
    dc.name AS detail_name,
    l.name AS location_name
FROM detail_cost_categories_mapping m
JOIN cost_categories cc ON m.cost_category_id = cc.id
JOIN detail_cost_categories_new dc ON m.detail_cost_category_id = dc.id
JOIN location l ON m.location_id = l.id
ORDER BY cc.name, dc.name, l.name
LIMIT 10;

-- =====================================================================================================================
-- Завершение шага 2
-- =====================================================================================================================
-- Результат: Данные перенесены в новую структуру с тройными связями
-- - 172 уникальных вида затрат в detail_cost_categories_new
-- - 218 тройных связей в detail_cost_categories_mapping
-- Следующий шаг: Замена таблиц и активация новой структуры
-- =====================================================================================================================
