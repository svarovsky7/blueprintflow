-- Создание таблицы маппинга для связи статусов и комплектов шахматок
-- Эта таблица позволяет отслеживать историю изменения статусов комплектов

-- Таблица маппинга статусов и комплектов
CREATE TABLE IF NOT EXISTS chessboard_sets_status_mapping (
    -- Связи с основными таблицами
    chessboard_set_id UUID NOT NULL REFERENCES chessboard_sets(id) ON DELETE CASCADE,
    status_id UUID NOT NULL REFERENCES statuses(id) ON DELETE RESTRICT,
    
    -- Дополнительные поля для истории
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, -- Когда был присвоен статус
    assigned_by UUID, -- ID пользователя, который присвоил статус (если будет аутентификация)
    comment TEXT, -- Комментарий при изменении статуса
    is_current BOOLEAN DEFAULT true, -- Является ли этот статус текущим для комплекта
    
    -- Составной первичный ключ для уникальности записи
    PRIMARY KEY (chessboard_set_id, status_id, assigned_at)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_chessboard_sets_status_mapping_set_id 
    ON chessboard_sets_status_mapping(chessboard_set_id);
    
CREATE INDEX idx_chessboard_sets_status_mapping_status_id 
    ON chessboard_sets_status_mapping(status_id);
    
CREATE INDEX idx_chessboard_sets_status_mapping_current 
    ON chessboard_sets_status_mapping(chessboard_set_id, is_current) 
    WHERE is_current = true;

CREATE INDEX idx_chessboard_sets_status_mapping_assigned_at 
    ON chessboard_sets_status_mapping(assigned_at DESC);

-- Функция для автоматического обновления флага is_current
-- При добавлении нового статуса, предыдущий статус становится не текущим
CREATE OR REPLACE FUNCTION update_chessboard_set_status_current()
RETURNS TRIGGER AS $$
BEGIN
    -- Если вставляется запись с is_current = true
    IF NEW.is_current = true THEN
        -- Обновляем все предыдущие записи для этого комплекта
        UPDATE chessboard_sets_status_mapping
        SET is_current = false
        WHERE chessboard_set_id = NEW.chessboard_set_id
        AND assigned_at < NEW.assigned_at
        AND is_current = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления is_current
CREATE TRIGGER trigger_update_chessboard_set_status_current
    AFTER INSERT ON chessboard_sets_status_mapping
    FOR EACH ROW
    EXECUTE FUNCTION update_chessboard_set_status_current();

-- Представление для получения текущего статуса каждого комплекта
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

-- Функция для добавления нового статуса комплекту
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

-- Функция для получения истории статусов комплекта
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

-- Комментарии к таблице и полям
COMMENT ON TABLE chessboard_sets_status_mapping IS 'Таблица маппинга для связи статусов и комплектов шахматок с историей изменений';
COMMENT ON COLUMN chessboard_sets_status_mapping.chessboard_set_id IS 'ID комплекта из таблицы chessboard_sets';
COMMENT ON COLUMN chessboard_sets_status_mapping.status_id IS 'ID статуса из таблицы statuses';
COMMENT ON COLUMN chessboard_sets_status_mapping.assigned_at IS 'Дата и время присвоения статуса';
COMMENT ON COLUMN chessboard_sets_status_mapping.assigned_by IS 'ID пользователя, который присвоил статус';
COMMENT ON COLUMN chessboard_sets_status_mapping.comment IS 'Комментарий при изменении статуса';
COMMENT ON COLUMN chessboard_sets_status_mapping.is_current IS 'Флаг текущего статуса (true для последнего присвоенного статуса)';

-- Миграция существующих данных из chessboard_sets (если есть статусы)
-- Эта часть выполняется только если в таблице chessboard_sets есть поле status_id
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
            is_current
        )
        SELECT 
            id,
            status_id,
            COALESCE(updated_at, created_at, CURRENT_TIMESTAMP),
            true
        FROM chessboard_sets
        WHERE status_id IS NOT NULL
        ON CONFLICT DO NOTHING;
        
        -- После миграции можно удалить столбец status_id из chessboard_sets
        -- ALTER TABLE chessboard_sets DROP COLUMN IF EXISTS status_id;
    END IF;
END $$;