-- Добавление уникального ограничения на комбинацию фильтров для таблицы chessboard_sets
-- Это гарантирует, что не может быть двух комплектов с одинаковым набором фильтров

-- Создаем уникальный индекс на комбинацию всех фильтров
-- Используем COALESCE для обработки NULL значений в массивах
CREATE UNIQUE INDEX IF NOT EXISTS idx_chessboard_sets_unique_filters 
ON public.chessboard_sets (
    project_id,
    documentation_id, 
    version_id,
    COALESCE(tag_id, -1), -- Используем -1 как значение по умолчанию для NULL
    COALESCE(block_ids, ARRAY[]::uuid[]),
    COALESCE(cost_category_ids, ARRAY[]::integer[]),
    COALESCE(cost_type_ids, ARRAY[]::integer[])
);

-- Добавляем комментарий к индексу
COMMENT ON INDEX idx_chessboard_sets_unique_filters IS 'Уникальное ограничение на комбинацию фильтров для предотвращения дублирования комплектов';