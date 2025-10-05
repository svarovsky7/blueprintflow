-- Проверка успешности миграции

-- 1. Проверить структуру detail_cost_categories
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'detail_cost_categories'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Проверить уникальность имён
SELECT
    COUNT(*) as total_records,
    COUNT(DISTINCT name) as unique_names,
    COUNT(*) - COUNT(DISTINCT name) as duplicates
FROM detail_cost_categories;

-- 3. Проверить маппинг
SELECT
    COUNT(*) as mapping_count,
    COUNT(DISTINCT detail_cost_category_id) as unique_details,
    COUNT(DISTINCT cost_category_id) as unique_categories,
    COUNT(DISTINCT location_id) as unique_locations
FROM detail_cost_categories_mapping;

-- 4. Примеры тройных связей (первые 5)
SELECT
    cc.name AS category,
    dc.name AS detail,
    l.name AS location
FROM detail_cost_categories_mapping m
JOIN cost_categories cc ON m.cost_category_id = cc.id
JOIN detail_cost_categories dc ON m.detail_cost_category_id = dc.id
JOIN location l ON m.location_id = l.id
ORDER BY dc.name, cc.name, l.name
LIMIT 5;
