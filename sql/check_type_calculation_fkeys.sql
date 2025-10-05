-- Проверка foreign keys в type_calculation_work_mapping

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
WHERE tc.table_name = 'type_calculation_work_mapping'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY kcu.column_name;
