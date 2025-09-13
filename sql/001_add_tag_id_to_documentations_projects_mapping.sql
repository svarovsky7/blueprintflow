-- Миграция: Добавление столбца tag_id в таблицу documentations_projects_mapping
-- Дата: 2025-01-09
-- Описание: Добавляет столбец tag_id для хранения связи между документами и разделами на уровне проекта

-- Добавляем столбец tag_id
ALTER TABLE public.documentations_projects_mapping
ADD COLUMN tag_id integer;

-- Добавляем комментарий к столбцу
COMMENT ON COLUMN public.documentations_projects_mapping.tag_id IS 'ID раздела документации (связь с documentation_tags)';

-- Добавляем индекс для улучшения производительности поиска по tag_id
CREATE INDEX idx_documentations_projects_mapping_tag_id
ON public.documentations_projects_mapping USING btree (tag_id);

-- Добавляем внешний ключ к таблице documentation_tags
ALTER TABLE public.documentations_projects_mapping
ADD CONSTRAINT documentations_projects_mapping_tag_id_fkey
FOREIGN KEY (tag_id) REFERENCES public.documentation_tags(id) ON DELETE SET NULL;

-- Обновляем уникальное ограничение, включая новый столбец tag_id
-- (опционально - если нужно чтобы один документ мог иметь разные теги для одного проекта)
-- ALTER TABLE public.documentations_projects_mapping
-- DROP CONSTRAINT documentations_projects_mappi_documentation_id_project_id_b_key;
--
-- ALTER TABLE public.documentations_projects_mapping
-- ADD CONSTRAINT documentations_projects_mappi_documentation_id_project_id_tag_key
-- UNIQUE (documentation_id, project_id, block_id, tag_id);