-- =====================================================================================================================
-- Шаг 1: Создание правильной структуры БД с тройной связью
-- =====================================================================================================================
-- Цель: Создать структуру, где:
--   - detail_cost_categories содержит ТОЛЬКО уникальные виды затрат (БЕЗ cost_category_id)
--   - detail_cost_categories_mapping содержит ТРОЙНУЮ связь (category - detail - location)
--
-- Действия:
--   1. Удалить неправильно созданные таблицы (если существуют)
--   2. Создать detail_cost_categories_new БЕЗ cost_category_id
--   3. Создать detail_cost_categories_mapping с тройной связью
-- =====================================================================================================================

-- 1. Удалить неправильно созданные таблицы (если существуют)
DO $$
BEGIN
    -- Удалить detail_cost_categories_new (неправильная структура с cost_category_id)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'detail_cost_categories_new'
        AND table_schema = 'public'
    ) THEN
        DROP TABLE detail_cost_categories_new CASCADE;
        RAISE NOTICE 'Удалена неправильная таблица detail_cost_categories_new';
    ELSE
        RAISE NOTICE 'Таблица detail_cost_categories_new не существует, пропускаем';
    END IF;

    -- Удалить detail_cost_categories_location_mapping (неправильная структура без cost_category_id)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'detail_cost_categories_location_mapping'
        AND table_schema = 'public'
    ) THEN
        DROP TABLE detail_cost_categories_location_mapping CASCADE;
        RAISE NOTICE 'Удалена неправильная таблица detail_cost_categories_location_mapping';
    ELSE
        RAISE NOTICE 'Таблица detail_cost_categories_location_mapping не существует, пропускаем';
    END IF;
END $$;

-- 2. Создать detail_cost_categories_new БЕЗ cost_category_id
-- Виды затрат теперь глобально уникальны по name
CREATE TABLE detail_cost_categories_new (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,  -- Глобально уникальное имя вида затрат
    description TEXT,
    unit_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Добавить комментарии к таблице
COMMENT ON TABLE detail_cost_categories_new IS 'Справочник видов затрат с глобально уникальными названиями (БЕЗ привязки к категории)';
COMMENT ON COLUMN detail_cost_categories_new.name IS 'Уникальное название вида затрат (глобально)';
COMMENT ON COLUMN detail_cost_categories_new.description IS 'Описание вида затрат';
COMMENT ON COLUMN detail_cost_categories_new.unit_id IS 'FK на единицы измерения (units.id)';

-- 3. Создать detail_cost_categories_mapping с ТРОЙНОЙ связью
-- Связь: Категория затрат ↔ Вид затрат ↔ Локализация
CREATE TABLE detail_cost_categories_mapping (
    cost_category_id BIGINT NOT NULL,
    detail_cost_category_id INTEGER NOT NULL,
    location_id BIGINT NOT NULL,
    PRIMARY KEY (cost_category_id, detail_cost_category_id, location_id),
    FOREIGN KEY (cost_category_id) REFERENCES cost_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (detail_cost_category_id) REFERENCES detail_cost_categories_new(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE CASCADE
);

-- Добавить комментарии к таблице маппинга
COMMENT ON TABLE detail_cost_categories_mapping IS 'Маппинг с тройной связью: категория затрат ↔ вид затрат ↔ локализация';
COMMENT ON COLUMN detail_cost_categories_mapping.cost_category_id IS 'FK на категорию затрат (cost_categories.id)';
COMMENT ON COLUMN detail_cost_categories_mapping.detail_cost_category_id IS 'FK на вид затрат (detail_cost_categories.id)';
COMMENT ON COLUMN detail_cost_categories_mapping.location_id IS 'FK на локализацию (location.id)';

-- 4. Создать индексы для производительности
CREATE INDEX idx_detail_cost_categories_new_name ON detail_cost_categories_new(name);
CREATE INDEX idx_dcc_mapping_cost_category ON detail_cost_categories_mapping(cost_category_id);
CREATE INDEX idx_dcc_mapping_detail_category ON detail_cost_categories_mapping(detail_cost_category_id);
CREATE INDEX idx_dcc_mapping_location ON detail_cost_categories_mapping(location_id);

-- 5. Вывести итоговую статистику
DO $$
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Шаг 1 завершён: Структура БД создана';
    RAISE NOTICE 'Создана таблица: detail_cost_categories_new (БЕЗ cost_category_id)';
    RAISE NOTICE 'Создана таблица: detail_cost_categories_mapping (тройная связь)';
    RAISE NOTICE 'Следующий шаг: refactor_detail_cost_categories_CORRECT_step2_migrate_data.sql';
    RAISE NOTICE '=================================================================';
END $$;

-- =====================================================================================================================
-- Завершение шага 1
-- =====================================================================================================================
-- Результат: Созданы таблицы с правильной структурой
-- Следующий шаг: Миграция данных из старой структуры в новую
-- =====================================================================================================================
