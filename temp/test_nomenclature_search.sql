-- Тестирование поиска в таблице nomenclature
-- Проверяем общее количество записей
SELECT COUNT(*) as total_records FROM nomenclature;

-- Поиск записей содержащих "лифт" (без учета регистра)
SELECT COUNT(*) as lift_records FROM nomenclature WHERE name ILIKE '%лифт%';

-- Поиск записей содержащих "Лифт пассажирский 630"
SELECT COUNT(*) as specific_search FROM nomenclature WHERE name ILIKE '%Лифт пассажирский%630%';

-- Точные совпадения для "Лифт пассажирский 630 кг"
SELECT id, name FROM nomenclature WHERE name ILIKE '%Лифт пассажирский%630 кг%' LIMIT 10;

-- Проверяем производительность запроса
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, name FROM nomenclature WHERE name ILIKE '%лифт%' LIMIT 20;

-- Проверяем индексы на таблице
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'nomenclature';

-- Проверяем ограничения
SELECT
    conname,
    contype,
    confupdtype,
    confdeltype
FROM pg_constraint
WHERE conrelid = 'nomenclature'::regclass;