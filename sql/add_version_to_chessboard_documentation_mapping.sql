-- Изменение схемы chessboard_documentation_mapping для прямой ссылки на documentation_versions
-- вместо documentations. Теперь каждая запись шахматки привязана к конкретной версии документа.

-- Удаление старого внешнего ключа на documentations
ALTER TABLE public.chessboard_documentation_mapping 
DROP CONSTRAINT IF EXISTS fk_chessboard_documentation_mapping_documentation;

-- Сначала очищаем таблицу от записей, которые не смогут быть сопоставлены с версиями
-- Удаляем записи где documentation_id не существует в documentations
DELETE FROM public.chessboard_documentation_mapping 
WHERE documentation_id NOT IN (SELECT id FROM public.documentations);

-- Добавляем новое поле version_id
ALTER TABLE public.chessboard_documentation_mapping 
ADD COLUMN version_id uuid;

-- Заполняем version_id последними версиями для каждого документа
UPDATE public.chessboard_documentation_mapping 
SET version_id = (
  SELECT dv.id 
  FROM public.documentation_versions dv 
  WHERE dv.documentation_id = chessboard_documentation_mapping.documentation_id
  ORDER BY dv.version_number DESC 
  LIMIT 1
);

-- Удаляем записи где не удалось найти версию
DELETE FROM public.chessboard_documentation_mapping 
WHERE version_id IS NULL;

-- Удаляем старое поле documentation_id
ALTER TABLE public.chessboard_documentation_mapping 
DROP COLUMN documentation_id;

-- Делаем version_id обязательным
ALTER TABLE public.chessboard_documentation_mapping 
ALTER COLUMN version_id SET NOT NULL;

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