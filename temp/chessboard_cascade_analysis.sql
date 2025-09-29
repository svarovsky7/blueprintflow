-- Анализ каскадных ограничений удаления для таблицы chessboard
-- Этот файл содержит результаты проверки актуальных foreign key constraints

-- НАЙДЕННЫЕ MAPPING ТАБЛИЦЫ, СВЯЗАННЫЕ С CHESSBOARD:

-- 1. chessboard_documentation_mapping
-- ✅ КАСКАДНОЕ УДАЛЕНИЕ НАСТРОЕНО
-- Constraint: chessboard_documentation_mapping_chessboard_id_fkey
-- FOREIGN KEY (chessboard_id) REFERENCES public.chessboard(id) ON DELETE CASCADE

-- 2. chessboard_floor_mapping
-- ✅ КАСКАДНОЕ УДАЛЕНИЕ НАСТРОЕНО
-- Constraint: chessboard_floor_mapping_chessboard_id_fkey
-- FOREIGN KEY (chessboard_id) REFERENCES public.chessboard(id) ON DELETE CASCADE

-- 3. chessboard_mapping
-- ✅ КАСКАДНОЕ УДАЛЕНИЕ НАСТРОЕНО
-- Constraint: chessboard_mapping_chessboard_id_fkey
-- FOREIGN KEY (chessboard_id) REFERENCES public.chessboard(id) ON DELETE CASCADE

-- 4. chessboard_nomenclature_mapping
-- ✅ КАСКАДНОЕ УДАЛЕНИЕ НАСТРОЕНО
-- Constraint: chessboard_nomenclature_mapping_chessboard_id_fkey
-- FOREIGN KEY (chessboard_id) REFERENCES public.chessboard(id) ON DELETE CASCADE

-- 5. chessboard_rates_mapping
-- ✅ КАСКАДНОЕ УДАЛЕНИЕ НАСТРОЕНО
-- Constraint: chessboard_rates_mapping_chessboard_id_fkey
-- FOREIGN KEY (chessboard_id) REFERENCES public.chessboard(id) ON DELETE CASCADE

-- ДОПОЛНИТЕЛЬНЫЕ MAPPING ТАБЛИЦЫ (не прямо связанные с chessboard):

-- 6. chessboard_sets_documents_mapping
-- Не имеет прямой связи с таблицей chessboard
-- Связана с chessboard_sets через set_id

-- 7. vor_chessboard_sets_mapping
-- Не имеет прямой связи с таблицей chessboard
-- Связана с chessboard_sets через set_id

-- ИТОГОВЫЙ АНАЛИЗ:
-- ✅ ВСЕ 5 ОСНОВНЫХ MAPPING ТАБЛИЦ ИМЕЮТ КАСКАДНОЕ УДАЛЕНИЕ
-- ✅ При удалении записи из chessboard все связанные записи будут удалены автоматически
-- ✅ Дополнительные mapping таблицы для chessboard_sets не нуждаются в прямых связях с chessboard

-- ЗАПРОС ДЛЯ ПРОВЕРКИ FOREIGN KEY CONSTRAINTS:
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_type,
    rc.delete_rule
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    LEFT JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
WHERE
    tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'chessboard'
    AND tc.table_name LIKE '%chessboard%mapping%'
ORDER BY tc.table_name;