-- Отладочные запросы для проверки фильтрации раздела КЖ
-- Проект: Примевара 14 (project_id: f9227acf-9446-42c8-a533-bfeb30fa07a4)

-- 1. Найти tag_id для раздела КЖ
SELECT id, tag_number, name
FROM documentation_tags
WHERE name ILIKE '%КЖ%' OR name ILIKE '%конструк%';

-- 2. Проверить общее количество записей chessboard для проекта
SELECT COUNT(*) as total_chessboard_records
FROM chessboard
WHERE project_id = 'f9227acf-9446-42c8-a533-bfeb30fa07a4';

-- 3. Найти все записи chessboard с документацией раздела КЖ (предполагаем tag_id = X)
-- Этот запрос воспроизводит логику портала
SELECT DISTINCT cdm.chessboard_id
FROM chessboard_documentation_mapping cdm
JOIN documentation_versions dv ON cdm.version_id = dv.id
JOIN documentations d ON dv.documentation_id = d.id
JOIN documentation_tags dt ON d.tag_id = dt.id
WHERE dt.name ILIKE '%КЖ%';

-- 4. Подсчитать количество уникальных chessboard_id с разделом КЖ
SELECT COUNT(DISTINCT cdm.chessboard_id) as kj_records_count
FROM chessboard_documentation_mapping cdm
JOIN documentation_versions dv ON cdm.version_id = dv.id
JOIN documentations d ON dv.documentation_id = d.id
JOIN documentation_tags dt ON d.tag_id = dt.id
WHERE dt.name ILIKE '%КЖ%';

-- 5. Проверить конкретные записи chessboard для проекта с документацией КЖ
SELECT
    c.id as chessboard_id,
    c.material,
    dt.name as section_name,
    d.code as doc_code,
    dv.version_number
FROM chessboard c
JOIN chessboard_documentation_mapping cdm ON c.id = cdm.chessboard_id
JOIN documentation_versions dv ON cdm.version_id = dv.id
JOIN documentations d ON dv.documentation_id = d.id
JOIN documentation_tags dt ON d.tag_id = dt.id
WHERE c.project_id = 'f9227acf-9446-42c8-a533-bfeb30fa07a4'
    AND dt.name ILIKE '%КЖ%'
ORDER BY c.material
LIMIT 50;

-- 6. Проверить все разделы документации для проекта (чтобы увидеть что есть кроме КЖ)
SELECT
    dt.name as section_name,
    COUNT(DISTINCT c.id) as records_count
FROM chessboard c
JOIN chessboard_documentation_mapping cdm ON c.id = cdm.chessboard_id
JOIN documentation_versions dv ON cdm.version_id = dv.id
JOIN documentations d ON dv.documentation_id = d.id
JOIN documentation_tags dt ON d.tag_id = dt.id
WHERE c.project_id = 'f9227acf-9446-42c8-a533-bfeb30fa07a4'
GROUP BY dt.id, dt.name
ORDER BY records_count DESC;