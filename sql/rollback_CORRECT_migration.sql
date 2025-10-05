-- =====================================================================================================================
-- Откат миграции с тройной связью
-- =====================================================================================================================
-- Использовать этот скрипт, если миграция завершилась с ошибками
-- и нужно вернуться к исходному состоянию
-- =====================================================================================================================

-- 1. Удалить FK constraints из маппинга
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_dcc_mapping_detail_cost_category'
        AND table_name = 'detail_cost_categories_mapping'
    ) THEN
        ALTER TABLE detail_cost_categories_mapping DROP CONSTRAINT fk_dcc_mapping_detail_cost_category;
        RAISE NOTICE 'FK constraint fk_dcc_mapping_detail_cost_category удалён';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'detail_cost_categories_mapping_cost_category_id_fkey'
        AND table_name = 'detail_cost_categories_mapping'
    ) THEN
        ALTER TABLE detail_cost_categories_mapping DROP CONSTRAINT detail_cost_categories_mapping_cost_category_id_fkey;
        RAISE NOTICE 'FK constraint на cost_category_id удалён';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'detail_cost_categories_mapping_location_id_fkey'
        AND table_name = 'detail_cost_categories_mapping'
    ) THEN
        ALTER TABLE detail_cost_categories_mapping DROP CONSTRAINT detail_cost_categories_mapping_location_id_fkey;
        RAISE NOTICE 'FK constraint на location_id удалён';
    END IF;
END $$;

-- 2. Удалить FK constraint на unit_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_detail_cost_categories_unit'
        AND table_name = 'detail_cost_categories'
    ) THEN
        ALTER TABLE detail_cost_categories DROP CONSTRAINT fk_detail_cost_categories_unit;
        RAISE NOTICE 'FK constraint fk_detail_cost_categories_unit удалён';
    END IF;
END $$;

-- 3. Переименовать таблицы обратно
DO $$
BEGIN
    -- Если текущая detail_cost_categories существует, переименовываем её обратно в _new
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'detail_cost_categories'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'detail_cost_categories_old'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE detail_cost_categories RENAME TO detail_cost_categories_new;
        RAISE NOTICE 'Таблица detail_cost_categories переименована обратно в detail_cost_categories_new';
    END IF;

    -- Если старая таблица существует, возвращаем её как рабочую
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'detail_cost_categories_old'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE detail_cost_categories_old RENAME TO detail_cost_categories;
        RAISE NOTICE 'Старая таблица восстановлена как detail_cost_categories';
    END IF;
END $$;

-- 4. Переименовать sequence обратно
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class WHERE relname = 'detail_cost_categories_id_seq' AND relkind = 'S'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = 'detail_cost_categories_new_id_seq' AND relkind = 'S'
    ) THEN
        ALTER SEQUENCE detail_cost_categories_id_seq RENAME TO detail_cost_categories_new_id_seq;
        RAISE NOTICE 'Sequence переименован обратно в detail_cost_categories_new_id_seq';
    END IF;
END $$;

-- 5. Удалить индексы новой таблицы
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_detail_cost_categories_name'
    ) THEN
        DROP INDEX idx_detail_cost_categories_name;
        RAISE NOTICE 'Индекс idx_detail_cost_categories_name удалён';
    END IF;
END $$;

-- 6. Вывести итоговую статистику
DO $$
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Откат миграции завершён';
    RAISE NOTICE 'Старая структура восстановлена';
    RAISE NOTICE 'Можно исправить миграцию и повторить заново';
    RAISE NOTICE '=================================================================';
END $$;

-- =====================================================================================================================
-- Полный откат (удалить все созданные таблицы)
-- =====================================================================================================================
-- ВНИМАНИЕ! Используйте эти команды только если нужно полностью удалить новую структуру

-- DROP TABLE IF EXISTS detail_cost_categories_new CASCADE;
-- DROP TABLE IF EXISTS detail_cost_categories_mapping CASCADE;

-- Если нужно восстановить старую таблицу из _old:
-- ALTER TABLE detail_cost_categories_old RENAME TO detail_cost_categories;
