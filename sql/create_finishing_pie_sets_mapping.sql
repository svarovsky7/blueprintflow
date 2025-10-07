-- Таблица связи между документами отделки и комплектами шахматки
-- Используется для:
-- 1. Отображения ссылки на созданный комплект в столбце "Комплект" на странице Отделка
-- 2. Предотвращения повторного импорта одного и того же документа
-- 3. Отслеживания истории импорта документов отделки в шахматку

CREATE TABLE IF NOT EXISTS finishing_pie_sets_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finishing_pie_id UUID NOT NULL REFERENCES finishing_pie(id) ON DELETE CASCADE,
  set_id UUID NOT NULL REFERENCES chessboard_sets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Уникальное ограничение: один документ отделки может быть связан с одним комплектом
  -- (предотвращает повторный импорт)
  CONSTRAINT unique_finishing_pie_set UNIQUE(finishing_pie_id, set_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_finishing_pie_sets_finishing_pie_id
  ON finishing_pie_sets_mapping(finishing_pie_id);

CREATE INDEX IF NOT EXISTS idx_finishing_pie_sets_set_id
  ON finishing_pie_sets_mapping(set_id);

-- Комментарии для документирования
COMMENT ON TABLE finishing_pie_sets_mapping IS
  'Связь между документами отделки (finishing_pie) и созданными комплектами шахматки (chessboard_sets). Используется для отображения ссылки на комплект и предотвращения повторного импорта.';

COMMENT ON COLUMN finishing_pie_sets_mapping.id IS
  'Уникальный идентификатор записи связи';

COMMENT ON COLUMN finishing_pie_sets_mapping.finishing_pie_id IS
  'ID документа отделки (finishing_pie)';

COMMENT ON COLUMN finishing_pie_sets_mapping.set_id IS
  'ID созданного комплекта в шахматке (chessboard_sets)';

COMMENT ON COLUMN finishing_pie_sets_mapping.created_at IS
  'Дата и время создания связи (= дата импорта)';
