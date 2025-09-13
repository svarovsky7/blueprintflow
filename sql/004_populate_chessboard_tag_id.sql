-- Миграция: Заполнение столбца tag_id в таблице chessboard_documentation_mapping
-- Дата: 2025-01-13
-- Описание: Заполняет tag_id в chessboard_documentation_mapping на основе связанной документации

-- Обновляем tag_id в таблице chessboard_documentation_mapping на основе данных из documentations
UPDATE public.chessboard_documentation_mapping cdm
SET tag_id = d.tag_id
FROM public.documentation_versions dv
JOIN public.documentations d ON dv.documentation_id = d.id
WHERE cdm.version_id = dv.id
  AND d.tag_id IS NOT NULL
  AND cdm.tag_id IS NULL;

-- Проверяем результат
SELECT
    COUNT(*) as total_chessboard_mappings,
    COUNT(tag_id) as mappings_with_tag_id,
    COUNT(*) - COUNT(tag_id) as mappings_without_tag_id
FROM public.chessboard_documentation_mapping;

-- Показываем статистику по разделам в шахматке
SELECT
    dt.name as tag_name,
    COUNT(cdm.chessboard_id) as chessboard_records_count
FROM public.chessboard_documentation_mapping cdm
LEFT JOIN public.documentation_tags dt ON cdm.tag_id = dt.id
GROUP BY dt.id, dt.name
ORDER BY chessboard_records_count DESC;