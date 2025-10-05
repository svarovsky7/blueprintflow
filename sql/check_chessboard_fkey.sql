-- Проверка foreign key constraints в таблице chessboard_mapping

-- 1. Все foreign keys в chessboard_mapping
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'chessboard_mapping'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY kcu.column_name;

-- 2. Специфическая проверка для cost_type_id
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'chessboard_mapping'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'cost_type_id';

-- 3. Проверка существования таблицы detail_cost_categories
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'detail_cost_categories%'
ORDER BY table_name;
