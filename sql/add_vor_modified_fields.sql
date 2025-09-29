-- SQL миграция: добавление полей для отслеживания изменений в ВОР
-- Дата: 2024-12-29
-- Описание: Добавляет boolean поля is_modified в таблицы vor_works и vor_materials
--           для отслеживания изменений по сравнению с базовыми данными комплекта шахматки

-- Добавляем поле is_modified в таблицу vor_works
ALTER TABLE public.vor_works
ADD COLUMN is_modified boolean DEFAULT false NOT NULL;

-- Добавляем комментарий к полю
COMMENT ON COLUMN public.vor_works.is_modified IS 'Отслеживание изменений: false - строка совпадает с комплектом шахматки, true - строка изменена или добавлена новая';

-- Добавляем поле is_modified в таблицу vor_materials
ALTER TABLE public.vor_materials
ADD COLUMN is_modified boolean DEFAULT false NOT NULL;

-- Добавляем комментарий к полю
COMMENT ON COLUMN public.vor_materials.is_modified IS 'Отслеживание изменений: false - строка совпадает с комплектом шахматки, true - строка изменена или добавлена новая';

-- Создаем индексы для быстрого поиска измененных записей
CREATE INDEX idx_vor_works_is_modified ON public.vor_works(is_modified) WHERE is_modified = true;
CREATE INDEX idx_vor_materials_is_modified ON public.vor_materials(is_modified) WHERE is_modified = true;

-- Миграция выполнена успешно
-- Поля is_modified добавлены в таблицы vor_works и vor_materials