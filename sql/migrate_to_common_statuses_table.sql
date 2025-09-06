-- Миграция для использования общей таблицы statuses вместо chessboard_set_statuses

-- 1. Сначала добавим статусы для Шахматки в общую таблицу statuses
-- Используем формат "documents/chessboard" для единообразия
INSERT INTO statuses (name, color, is_active, applicable_pages) 
VALUES 
    ('Черновик', '#888888', true, '["documents/chessboard"]'),
    ('На проверке', '#faad14', true, '["documents/chessboard"]'),
    ('Утвержден', '#52c41a', true, '["documents/chessboard"]'),
    ('Отклонен', '#ff4d4f', true, '["documents/chessboard"]'),
    ('Архив', '#d9d9d9', true, '["documents/chessboard"]')
ON CONFLICT (name) DO UPDATE 
SET applicable_pages = 
    CASE 
        WHEN NOT (statuses.applicable_pages::jsonb ? 'documents/chessboard') 
        THEN statuses.applicable_pages::jsonb || '["documents/chessboard"]'::jsonb
        ELSE statuses.applicable_pages
    END;

-- 2. Если таблица chessboard_sets существует, обновляем её структуру
DO $$ 
BEGIN
    -- Проверяем, существует ли таблица chessboard_sets
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'chessboard_sets'
    ) THEN
        -- Удаляем старый foreign key если существует
        ALTER TABLE chessboard_sets 
        DROP CONSTRAINT IF EXISTS chessboard_sets_status_id_fkey;
        
        -- Изменяем тип столбца status_id если нужно
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'chessboard_sets' 
            AND column_name = 'status_id' 
            AND data_type = 'integer'
        ) THEN
            ALTER TABLE chessboard_sets 
            ALTER COLUMN status_id TYPE UUID USING NULL;
        END IF;
        
        -- Добавляем новый foreign key на таблицу statuses только если столбец существует
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'chessboard_sets' 
            AND column_name = 'status_id'
        ) THEN
            ALTER TABLE chessboard_sets 
            ADD CONSTRAINT chessboard_sets_status_id_fkey 
            FOREIGN KEY (status_id) REFERENCES statuses(id) ON DELETE RESTRICT;
        END IF;
    END IF;
END $$;

-- 3. Удаляем старую таблицу chessboard_set_statuses если она существует
DROP TABLE IF EXISTS chessboard_set_statuses CASCADE;

-- 4. Комментарий для документации
-- Статусы теперь хранятся в таблице chessboard_sets_status_mapping для отслеживания истории
-- Старый столбец status_id был удален из таблицы chessboard_sets