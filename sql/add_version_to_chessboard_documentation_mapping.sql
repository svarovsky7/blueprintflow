-- Изменение схемы chessboard_documentation_mapping для прямой ссылки на documentation_versions
-- вместо documentations. Теперь каждая запись шахматки привязана к конкретной версии документа.

-- Удаление старого внешнего ключа на documentations
ALTER TABLE public.chessboard_documentation_mapping 
DROP CONSTRAINT IF EXISTS fk_chessboard_documentation_mapping_documentation;

-- Переименование поля documentation_id в version_id
ALTER TABLE public.chessboard_documentation_mapping 
RENAME COLUMN documentation_id TO version_id;

-- Добавление внешнего ключа на таблицу documentation_versions
ALTER TABLE public.chessboard_documentation_mapping 
ADD CONSTRAINT fk_chessboard_documentation_mapping_version 
FOREIGN KEY (version_id) REFERENCES public.documentation_versions(id);

-- Обновление комментария таблицы
COMMENT ON TABLE public.chessboard_documentation_mapping 
IS 'Связь записей шахматки с версиями документов (шифр + версия)';

-- Добавление комментария к полю
COMMENT ON COLUMN public.chessboard_documentation_mapping.version_id 
IS 'Ссылка на версию документа из таблицы documentation_versions (шифр + версия)';