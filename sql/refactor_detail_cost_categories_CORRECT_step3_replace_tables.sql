-- =====================================================================================================================
-- Шаг 3: Замена таблиц и активация новой структуры
-- =====================================================================================================================
-- Цель: Заменить старую таблицу на новую и добавить все необходимые constraints
-- Действия:
--   1. Переименовать старую таблицу (для возможности отката)
--   2. Переименовать новую таблицу в рабочую
--   3. Добавить FOREIGN KEY constraint на unit_id
--   4. Добавить индексы
--   5. Обновить sequence для auto-increment ID
-- =====================================================================================================================

-- 1. Переименовать старую таблицу detail_cost_categories -> detail_cost_categories_old
-- Сохраняем для возможности отката миграции (если ещё не переименована)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'detail_cost_categories'
        AND table_schema = 'public'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'detail_cost_categories_new'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE detail_cost_categories RENAME TO detail_cost_categories_old;
        RAISE NOTICE 'Старая таблица переименована в detail_cost_categories_old';
    ELSE
        RAISE NOTICE 'Старая таблица уже переименована или новая таблица не существует, пропускаем';
    END IF;
END $$;

-- 2. Переименовать новую таблицу detail_cost_categories_new -> detail_cost_categories
-- (если ещё не переименована)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'detail_cost_categories_new'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE detail_cost_categories_new RENAME TO detail_cost_categories;
        RAISE NOTICE 'Новая таблица активирована как detail_cost_categories';
    ELSE
        RAISE NOTICE 'Новая таблица уже активирована, пропускаем';
    END IF;
END $$;

-- 3. Переименовать sequence для auto-increment ID (если ещё не переименован)
DO $$
BEGIN
    -- Проверяем, что старый sequence существует И целевой ещё не существует
    IF EXISTS (
        SELECT 1 FROM pg_class WHERE relname = 'detail_cost_categories_new_id_seq' AND relkind = 'S'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = 'detail_cost_categories_id_seq' AND relkind = 'S'
    ) THEN
        ALTER SEQUENCE detail_cost_categories_new_id_seq RENAME TO detail_cost_categories_id_seq;
        RAISE NOTICE 'Sequence переименован в detail_cost_categories_id_seq';
    ELSE
        RAISE NOTICE 'Sequence уже переименован, пропускаем';
    END IF;
END $$;

-- 4. Добавить FOREIGN KEY constraint на unit_id (если таблица units существует и constraint ещё не добавлен)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'units') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_detail_cost_categories_unit'
            AND table_name = 'detail_cost_categories'
        ) THEN
            ALTER TABLE detail_cost_categories
            ADD CONSTRAINT fk_detail_cost_categories_unit
            FOREIGN KEY (unit_id) REFERENCES units(id)
            ON DELETE SET NULL;

            RAISE NOTICE 'Добавлен FK constraint: detail_cost_categories.unit_id -> units.id';
        ELSE
            RAISE NOTICE 'FK constraint на unit_id уже существует, пропускаем';
        END IF;
    ELSE
        RAISE NOTICE 'Таблица units не найдена, пропускаем FK constraint на unit_id';
    END IF;
END $$;

-- 5. Обновить FK constraints в маппинге для ссылки на новую таблицу
DO $$
BEGIN
    -- Удалить старые constraints, если они ссылаются на _new таблицу
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'detail_cost_categories_mapping_detail_cost_category_id_fkey'
        AND table_name = 'detail_cost_categories_mapping'
    ) THEN
        ALTER TABLE detail_cost_categories_mapping
        DROP CONSTRAINT detail_cost_categories_mapping_detail_cost_category_id_fkey;
        RAISE NOTICE 'Удалён старый FK constraint в маппинге';
    END IF;

    -- Добавить новый constraint на активную таблицу
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_dcc_mapping_detail_cost_category'
        AND table_name = 'detail_cost_categories_mapping'
    ) THEN
        ALTER TABLE detail_cost_categories_mapping
        ADD CONSTRAINT fk_dcc_mapping_detail_cost_category
        FOREIGN KEY (detail_cost_category_id) REFERENCES detail_cost_categories(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Добавлен FK constraint: detail_cost_categories_mapping.detail_cost_category_id -> detail_cost_categories.id';
    ELSE
        RAISE NOTICE 'FK constraint в маппинге уже существует, пропускаем';
    END IF;
END $$;

-- 6. Пересоздать индексы с правильными именами (если ещё не созданы)
DO $$
BEGIN
    DROP INDEX IF EXISTS idx_detail_cost_categories_new_name;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_detail_cost_categories_name'
    ) THEN
        CREATE INDEX idx_detail_cost_categories_name
        ON detail_cost_categories(name);

        RAISE NOTICE 'Создан индекс idx_detail_cost_categories_name';
    ELSE
        RAISE NOTICE 'Индекс idx_detail_cost_categories_name уже существует, пропускаем';
    END IF;
END $$;

-- 7. Обновить комментарии к таблице и полям
COMMENT ON TABLE detail_cost_categories IS 'Справочник видов затрат с глобально уникальными названиями (после рефакторинга)';
COMMENT ON COLUMN detail_cost_categories.name IS 'Уникальное название вида затрат (глобально)';
COMMENT ON COLUMN detail_cost_categories.description IS 'Описание вида затрат';
COMMENT ON COLUMN detail_cost_categories.unit_id IS 'FK на единицы измерения (units.id)';

-- 8. Вывести итоговую статистику
DO $$
DECLARE
    dcc_count INTEGER;
    mapping_count INTEGER;
    old_count INTEGER;
    unique_categories INTEGER;
    unique_locations INTEGER;
BEGIN
    SELECT COUNT(*) INTO dcc_count FROM detail_cost_categories;
    SELECT COUNT(*) INTO mapping_count FROM detail_cost_categories_mapping;
    SELECT COUNT(*) INTO old_count FROM detail_cost_categories_old;
    SELECT COUNT(DISTINCT cost_category_id) INTO unique_categories FROM detail_cost_categories_mapping;
    SELECT COUNT(DISTINCT location_id) INTO unique_locations FROM detail_cost_categories_mapping;

    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Миграция завершена успешно!';
    RAISE NOTICE '-----------------------------------------------------------------';
    RAISE NOTICE 'Записей в detail_cost_categories: % (было: %)', dcc_count, old_count;
    RAISE NOTICE 'Тройных связей в маппинге: %', mapping_count;
    RAISE NOTICE '  - Уникальных категорий: %', unique_categories;
    RAISE NOTICE '  - Уникальных локализаций: %', unique_locations;
    RAISE NOTICE 'Старая таблица сохранена как: detail_cost_categories_old';
    RAISE NOTICE '-----------------------------------------------------------------';
    RAISE NOTICE 'ВАЖНО: Теперь необходимо обновить код приложения для работы с новой структурой!';
    RAISE NOTICE '=================================================================';
END $$;

-- =====================================================================================================================
-- Завершение шага 3
-- =====================================================================================================================
-- Результат: Новая структура БД активирована со всеми constraints
-- Старая таблица сохранена как detail_cost_categories_old для возможности отката
--
-- ВАЖНО: Теперь необходимо обновить код приложения для работы с новой структурой:
--   - detail_cost_categories БЕЗ cost_category_id
--   - detail_cost_categories_mapping с тройной связью (category - detail - location)
-- =====================================================================================================================
