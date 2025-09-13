-- Миграция: Заполнение столбца tag_id в таблице documentations_projects_mapping
-- Дата: 2025-01-09
-- Описание: Копирует tag_id из таблицы documentations в таблицу documentations_projects_mapping

-- Обновляем tag_id в таблице маппинга на основе данных из основной таблицы documentations
UPDATE public.documentations_projects_mapping
SET tag_id = d.tag_id
FROM public.documentations d
WHERE documentations_projects_mapping.documentation_id = d.id
  AND d.tag_id IS NOT NULL;

-- Проверяем результат
SELECT
    COUNT(*) as total_mappings,
    COUNT(tag_id) as mappings_with_tag_id,
    COUNT(*) - COUNT(tag_id) as mappings_without_tag_id
FROM public.documentations_projects_mapping;

-- Показываем статистику по разделам
SELECT
    dt.name as tag_name,
    COUNT(dpm.documentation_id) as documents_count
FROM public.documentations_projects_mapping dpm
LEFT JOIN public.documentation_tags dt ON dpm.tag_id = dt.id
GROUP BY dt.id, dt.name
ORDER BY documents_count DESC;