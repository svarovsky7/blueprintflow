-- Миграция: Добавление столбца tag_id в таблицу chessboard_documentation_mapping
-- Дата: 2025-01-13
-- Описание: Добавляет столбец tag_id для хранения связи между записями шахматки и разделами документации

-- Добавляем столбец tag_id
ALTER TABLE public.chessboard_documentation_mapping
ADD COLUMN tag_id integer;

-- Добавляем комментарий к столбцу
COMMENT ON COLUMN public.chessboard_documentation_mapping.tag_id IS 'ID раздела документации (связь с documentation_tags)';

-- Добавляем индекс для улучшения производительности поиска по tag_id
CREATE INDEX idx_chessboard_documentation_mapping_tag_id
ON public.chessboard_documentation_mapping USING btree (tag_id);

-- Добавляем внешний ключ к таблице documentation_tags
ALTER TABLE public.chessboard_documentation_mapping
ADD CONSTRAINT chessboard_documentation_mapping_tag_id_fkey
FOREIGN KEY (tag_id) REFERENCES public.documentation_tags(id) ON DELETE SET NULL;