-- Создание таблиц для комплектов шахматок

-- Справочник статусов комплектов шахматок
CREATE TABLE chessboard_set_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL, -- hex цвет для индикатора
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица комплектов шахматок
CREATE TABLE chessboard_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_number VARCHAR(50) NOT NULL UNIQUE, -- уникальный номер комплекта
    name VARCHAR(200), -- название комплекта (опционально)
    
    -- Обязательные фильтры
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    documentation_id UUID NOT NULL REFERENCES documentations(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES documentation_versions(id) ON DELETE CASCADE,
    
    -- Опциональные фильтры
    tag_id INTEGER REFERENCES documentation_tags(id) ON DELETE SET NULL,
    block_ids UUID[], -- массив ID корпусов
    cost_category_ids INTEGER[], -- массив ID категорий затрат
    cost_type_ids INTEGER[], -- массив ID видов затрат
    
    -- Статус комплекта
    status_id INTEGER NOT NULL REFERENCES chessboard_set_statuses(id) ON DELETE RESTRICT,
    
    -- Метаданные
    created_by UUID, -- ID пользователя (если будет аутентификация)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX idx_chessboard_sets_project_id ON chessboard_sets(project_id);
CREATE INDEX idx_chessboard_sets_documentation_id ON chessboard_sets(documentation_id);
CREATE INDEX idx_chessboard_sets_status_id ON chessboard_sets(status_id);
CREATE INDEX idx_chessboard_sets_set_number ON chessboard_sets(set_number);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_chessboard_sets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER trigger_update_chessboard_set_statuses_updated_at
    BEFORE UPDATE ON chessboard_set_statuses
    FOR EACH ROW
    EXECUTE FUNCTION update_chessboard_sets_updated_at();

CREATE TRIGGER trigger_update_chessboard_sets_updated_at
    BEFORE UPDATE ON chessboard_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_chessboard_sets_updated_at();

-- Вставка начальных статусов
INSERT INTO chessboard_set_statuses (name, color, description) VALUES
    ('Черновик', '#888888', 'Комплект в разработке'),
    ('На проверке', '#faad14', 'Комплект отправлен на проверку'),
    ('Утвержден', '#52c41a', 'Комплект утвержден к использованию'),
    ('Отклонен', '#ff4d4f', 'Комплект отклонен, требует доработки'),
    ('Архив', '#d9d9d9', 'Архивированный комплект');

-- Комментарии к таблицам
COMMENT ON TABLE chessboard_set_statuses IS 'Справочник статусов комплектов шахматок';
COMMENT ON TABLE chessboard_sets IS 'Комплекты шахматок с сохраненными фильтрами';

COMMENT ON COLUMN chessboard_sets.set_number IS 'Уникальный номер комплекта (автоматически генерируется)';
COMMENT ON COLUMN chessboard_sets.project_id IS 'Обязательный фильтр: ID проекта';
COMMENT ON COLUMN chessboard_sets.documentation_id IS 'Обязательный фильтр: ID документации (шифр проекта)';
COMMENT ON COLUMN chessboard_sets.version_id IS 'Обязательный фильтр: ID версии документации';
COMMENT ON COLUMN chessboard_sets.tag_id IS 'Опциональный фильтр: ID раздела';
COMMENT ON COLUMN chessboard_sets.block_ids IS 'Опциональный фильтр: массив ID корпусов';
COMMENT ON COLUMN chessboard_sets.cost_category_ids IS 'Опциональный фильтр: массив ID категорий затрат';
COMMENT ON COLUMN chessboard_sets.cost_type_ids IS 'Опциональный фильтр: массив ID видов затрат';