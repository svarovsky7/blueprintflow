-- Оптимизация индексов для таблиц chessboard
-- Создание недостающих индексов для улучшения производительности фильтрации

-- Проверяем существующие индексы на таблицах chessboard
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename LIKE 'chessboard%'
ORDER BY tablename, indexname;

-- Создаем недостающие индексы с проверкой существования

-- Основные индексы для фильтрации (если не существуют)
DO $$
BEGIN
    -- Индекс для chessboard_mapping.chessboard_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chessboard_mapping_chessboard_id') THEN
        CREATE INDEX idx_chessboard_mapping_chessboard_id ON chessboard_mapping(chessboard_id);
        RAISE NOTICE 'Created index: idx_chessboard_mapping_chessboard_id';
    ELSE
        RAISE NOTICE 'Index already exists: idx_chessboard_mapping_chessboard_id';
    END IF;

    -- Индекс для cost_category_id фильтрации
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chessboard_mapping_cost_category') THEN
        CREATE INDEX idx_chessboard_mapping_cost_category ON chessboard_mapping(cost_category_id);
        RAISE NOTICE 'Created index: idx_chessboard_mapping_cost_category';
    ELSE
        RAISE NOTICE 'Index already exists: idx_chessboard_mapping_cost_category';
    END IF;

    -- Индекс для block_id фильтрации
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chessboard_mapping_block_id') THEN
        CREATE INDEX idx_chessboard_mapping_block_id ON chessboard_mapping(block_id);
        RAISE NOTICE 'Created index: idx_chessboard_mapping_block_id';
    ELSE
        RAISE NOTICE 'Index already exists: idx_chessboard_mapping_block_id';
    END IF;

    -- Индекс для cost_type_id фильтрации
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chessboard_mapping_cost_type') THEN
        CREATE INDEX idx_chessboard_mapping_cost_type ON chessboard_mapping(cost_type_id);
        RAISE NOTICE 'Created index: idx_chessboard_mapping_cost_type';
    ELSE
        RAISE NOTICE 'Index already exists: idx_chessboard_mapping_cost_type';
    END IF;

    -- Индекс для documentation mapping
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chessboard_doc_mapping_chessboard_id') THEN
        CREATE INDEX idx_chessboard_doc_mapping_chessboard_id ON chessboard_documentation_mapping(chessboard_id);
        RAISE NOTICE 'Created index: idx_chessboard_doc_mapping_chessboard_id';
    ELSE
        RAISE NOTICE 'Index already exists: idx_chessboard_doc_mapping_chessboard_id';
    END IF;

    -- Индекс для floor mapping
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chessboard_floor_mapping_chessboard_id') THEN
        CREATE INDEX idx_chessboard_floor_mapping_chessboard_id ON chessboard_floor_mapping(chessboard_id);
        RAISE NOTICE 'Created index: idx_chessboard_floor_mapping_chessboard_id';
    ELSE
        RAISE NOTICE 'Index already exists: idx_chessboard_floor_mapping_chessboard_id';
    END IF;

    -- Индекс для nomenclature mapping
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chessboard_nom_mapping_chessboard_id') THEN
        CREATE INDEX idx_chessboard_nom_mapping_chessboard_id ON chessboard_nomenclature_mapping(chessboard_id);
        RAISE NOTICE 'Created index: idx_chessboard_nom_mapping_chessboard_id';
    ELSE
        RAISE NOTICE 'Index already exists: idx_chessboard_nom_mapping_chessboard_id';
    END IF;

    -- Составные индексы для частых фильтров
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chessboard_project_created') THEN
        CREATE INDEX idx_chessboard_project_created ON chessboard(project_id, created_at DESC);
        RAISE NOTICE 'Created index: idx_chessboard_project_created';
    ELSE
        RAISE NOTICE 'Index already exists: idx_chessboard_project_created';
    END IF;

    -- Составной индекс для категория + вид затрат
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_mapping_category_type') THEN
        CREATE INDEX idx_mapping_category_type ON chessboard_mapping(cost_category_id, cost_type_id);
        RAISE NOTICE 'Created index: idx_mapping_category_type';
    ELSE
        RAISE NOTICE 'Index already exists: idx_mapping_category_type';
    END IF;

    -- Составной индекс для chessboard_id + категория (для JOIN оптимизации)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_mapping_chessboard_category') THEN
        CREATE INDEX idx_mapping_chessboard_category ON chessboard_mapping(chessboard_id, cost_category_id);
        RAISE NOTICE 'Created index: idx_mapping_chessboard_category';
    ELSE
        RAISE NOTICE 'Index already exists: idx_mapping_chessboard_category';
    END IF;

END $$;

-- Проверяем созданные индексы
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename LIKE 'chessboard%'
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Анализируем размеры таблиц для понимания объемов
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_stat_get_tuples_returned(c.oid) as rows_returned,
    pg_stat_get_tuples_fetched(c.oid) as rows_fetched
FROM pg_tables pt
JOIN pg_class c ON c.relname = pt.tablename
WHERE tablename LIKE 'chessboard%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;