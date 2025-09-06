-- Скрипт для исправления формата данных статусов
-- Приводит к единому формату все existing статусы

-- 1. Обновляем статусы, у которых в applicable_pages есть "Шахматка"
-- Заменяем на правильный формат "documents/chessboard"
UPDATE statuses
SET applicable_pages = 
    CASE 
        WHEN applicable_pages::jsonb ? 'Шахматка' THEN
            -- Удаляем "Шахматка" и добавляем "documents/chessboard"
            (applicable_pages::jsonb - 'Шахматка') || '["documents/chessboard"]'::jsonb
        ELSE 
            applicable_pages
    END
WHERE applicable_pages::jsonb ? 'Шахматка';

-- 2. Исправляем цвета статусов для единообразия
-- Конвертируем текстовые названия цветов в hex формат
UPDATE statuses
SET color = 
    CASE color
        WHEN 'green' THEN '#52c41a'
        WHEN 'yellow' THEN '#faad14'
        WHEN 'blue' THEN '#1890ff'
        WHEN 'red' THEN '#ff4d4f'
        WHEN 'gray' THEN '#d9d9d9'
        WHEN 'grey' THEN '#d9d9d9'
        WHEN 'orange' THEN '#fa8c16'
        WHEN 'purple' THEN '#722ed1'
        ELSE color -- Оставляем как есть, если уже в hex формате
    END
WHERE color NOT LIKE '#%';

-- 3. Добавляем стандартные статусы для Шахматки, если их еще нет
INSERT INTO statuses (name, color, is_active, applicable_pages) 
VALUES 
    ('Черновик', '#888888', true, '["documents/chessboard"]'),
    ('На проверке', '#faad14', true, '["documents/chessboard"]'),
    ('Утвержден', '#52c41a', true, '["documents/chessboard"]'),
    ('Отклонен', '#ff4d4f', true, '["documents/chessboard"]'),
    ('Архив', '#d9d9d9', true, '["documents/chessboard"]')
ON CONFLICT (name) DO UPDATE 
SET 
    applicable_pages = 
        CASE 
            WHEN NOT (statuses.applicable_pages::jsonb ? 'documents/chessboard') 
            THEN statuses.applicable_pages::jsonb || '["documents/chessboard"]'::jsonb
            ELSE statuses.applicable_pages
        END,
    color = 
        CASE 
            WHEN statuses.color NOT LIKE '#%' OR statuses.color IS NULL
            THEN EXCLUDED.color
            ELSE statuses.color
        END;

-- 4. Проверяем результат
SELECT 
    name,
    color,
    is_active,
    applicable_pages
FROM statuses
WHERE applicable_pages::jsonb ? 'documents/chessboard'
ORDER BY name;