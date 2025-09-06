-- Полная миграция для перехода на использование таблицы маппинга статусов
-- Этот скрипт выполняет все необходимые изменения для работы с новой структурой

-- 1. Создание таблицы маппинга статусов и комплектов
CREATE TABLE IF NOT EXISTS chessboard_sets_status_mapping (
    chessboard_set_id UUID NOT NULL REFERENCES chessboard_sets(id) ON DELETE CASCADE,
    status_id UUID NOT NULL REFERENCES statuses(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    assigned_by UUID,
    comment TEXT,
    is_current BOOLEAN DEFAULT true,
    PRIMARY KEY (chessboard_set_id, status_id, assigned_at)
);

-- 2. Создание индексов
CREATE INDEX IF NOT EXISTS idx_chessboard_sets_status_mapping_set_id 
    ON chessboard_sets_status_mapping(chessboard_set_id);
    
CREATE INDEX IF NOT EXISTS idx_chessboard_sets_status_mapping_status_id 
    ON chessboard_sets_status_mapping(status_id);
    
CREATE INDEX IF NOT EXISTS idx_chessboard_sets_status_mapping_current 
    ON chessboard_sets_status_mapping(chessboard_set_id, is_current) 
    WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_chessboard_sets_status_mapping_assigned_at 
    ON chessboard_sets_status_mapping(assigned_at DESC);

-- 3. Функция для автоматического обновления флага is_current
CREATE OR REPLACE FUNCTION update_chessboard_set_status_current()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current = true THEN
        UPDATE chessboard_sets_status_mapping
        SET is_current = false
        WHERE chessboard_set_id = NEW.chessboard_set_id
        AND assigned_at < NEW.assigned_at
        AND is_current = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Триггер для автоматического обновления is_current
DROP TRIGGER IF EXISTS trigger_update_chessboard_set_status_current ON chessboard_sets_status_mapping;
CREATE TRIGGER trigger_update_chessboard_set_status_current
    AFTER INSERT ON chessboard_sets_status_mapping
    FOR EACH ROW
    EXECUTE FUNCTION update_chessboard_set_status_current();

-- 5. Представление для получения текущего статуса каждого комплекта
-- Сначала удаляем существующее представление, если оно есть
DROP VIEW IF EXISTS chessboard_sets_current_status;

-- Создаем представление заново
CREATE VIEW chessboard_sets_current_status AS
SELECT 
    cs.id as chessboard_set_id,
    cs.set_number,
    cs.name as set_name,
    cs.project_id,
    cs.documentation_id,
    cs.version_id,
    cs.tag_id,
    cs.block_ids,
    cs.cost_category_ids,
    cs.cost_type_ids,
    cs.created_at,
    cs.updated_at,
    s.id as status_id,
    s.name as status_name,
    s.color as status_color,
    cssm.assigned_at,
    cssm.assigned_by,
    cssm.comment
FROM chessboard_sets cs
LEFT JOIN chessboard_sets_status_mapping cssm 
    ON cs.id = cssm.chessboard_set_id AND cssm.is_current = true
LEFT JOIN statuses s 
    ON cssm.status_id = s.id;

-- 6. Добавление статусов для Шахматки в таблицу statuses
-- Используем формат "documents/chessboard" для единообразия со страницей Статусы
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

-- 7. Миграция существующих статусов из chessboard_sets в таблицу маппинга
DO $$
BEGIN
    -- Проверяем, существует ли столбец status_id в таблице chessboard_sets
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'chessboard_sets' 
        AND column_name = 'status_id'
    ) THEN
        -- Мигрируем существующие статусы в таблицу маппинга
        INSERT INTO chessboard_sets_status_mapping (
            chessboard_set_id,
            status_id,
            assigned_at,
            comment,
            is_current
        )
        SELECT 
            id,
            status_id,
            COALESCE(updated_at, created_at, CURRENT_TIMESTAMP),
            'Мигрирован из старой структуры',
            true
        FROM chessboard_sets
        WHERE status_id IS NOT NULL
        ON CONFLICT DO NOTHING;
        
        -- Удаляем столбец status_id из chessboard_sets
        ALTER TABLE chessboard_sets DROP COLUMN IF EXISTS status_id;
    END IF;
END $$;

-- 8. Удаление старой таблицы chessboard_set_statuses
DROP TABLE IF EXISTS chessboard_set_statuses CASCADE;

-- 9. Функции для работы со статусами
CREATE OR REPLACE FUNCTION add_chessboard_set_status(
    p_set_id UUID,
    p_status_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_comment TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO chessboard_sets_status_mapping (
        chessboard_set_id,
        status_id,
        assigned_by,
        comment,
        is_current
    ) VALUES (
        p_set_id,
        p_status_id,
        p_user_id,
        p_comment,
        true
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_chessboard_set_status_history(p_set_id UUID)
RETURNS TABLE (
    status_id UUID,
    status_name VARCHAR,
    status_color VARCHAR,
    assigned_at TIMESTAMP WITH TIME ZONE,
    assigned_by UUID,
    comment TEXT,
    is_current BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.color,
        cssm.assigned_at,
        cssm.assigned_by,
        cssm.comment,
        cssm.is_current
    FROM chessboard_sets_status_mapping cssm
    JOIN statuses s ON cssm.status_id = s.id
    WHERE cssm.chessboard_set_id = p_set_id
    ORDER BY cssm.assigned_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 10. Комментарии к таблицам
COMMENT ON TABLE chessboard_sets_status_mapping IS 'Таблица маппинга для связи статусов и комплектов шахматок с историей изменений';
COMMENT ON COLUMN chessboard_sets_status_mapping.chessboard_set_id IS 'ID комплекта из таблицы chessboard_sets';
COMMENT ON COLUMN chessboard_sets_status_mapping.status_id IS 'ID статуса из таблицы statuses';
COMMENT ON COLUMN chessboard_sets_status_mapping.assigned_at IS 'Дата и время присвоения статуса';
COMMENT ON COLUMN chessboard_sets_status_mapping.assigned_by IS 'ID пользователя, который присвоил статус';
COMMENT ON COLUMN chessboard_sets_status_mapping.comment IS 'Комментарий при изменении статуса';
COMMENT ON COLUMN chessboard_sets_status_mapping.is_current IS 'Флаг текущего статуса (true для последнего присвоенного статуса)';