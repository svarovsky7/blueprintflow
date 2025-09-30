-- Добавление project_id в таблицу finishing_pie_types для фильтрации типов по проектам
-- Дата: 2025-09-30

-- 1. Добавить поле project_id
ALTER TABLE public.finishing_pie_types
ADD COLUMN project_id UUID;

-- 2. Установить значения project_id для существующих записей (если есть)
-- Временно можно использовать первый доступный проект или NULL
-- После миграции нужно будет вручную проставить правильные значения

-- 3. Сделать поле обязательным после заполнения данных
ALTER TABLE public.finishing_pie_types
ALTER COLUMN project_id SET NOT NULL;

-- 4. Добавить внешний ключ на таблицу projects
ALTER TABLE public.finishing_pie_types
ADD CONSTRAINT finishing_pie_types_project_id_fkey
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- 5. Добавить уникальный индекс для предотвращения дублирования типов в проекте
CREATE UNIQUE INDEX finishing_pie_types_project_name_unique
ON public.finishing_pie_types(project_id, name);

-- 6. Добавить комментарий к полю
COMMENT ON COLUMN public.finishing_pie_types.project_id IS 'ID проекта для фильтрации типов пирогов отделки';