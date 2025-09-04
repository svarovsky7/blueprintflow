-- Откат миграции: возврат к старой схеме с documentation_id

-- Удаление внешнего ключа на documentation_versions
ALTER TABLE public.chessboard_documentation_mapping 
DROP CONSTRAINT IF EXISTS fk_chessboard_documentation_mapping_version;

-- Добавление поля documentation_id
ALTER TABLE public.chessboard_documentation_mapping 
ADD COLUMN documentation_id uuid;

-- Заполнение documentation_id из version_id через documentation_versions
UPDATE public.chessboard_documentation_mapping 
SET documentation_id = (
  SELECT dv.documentation_id 
  FROM public.documentation_versions dv 
  WHERE dv.id = chessboard_documentation_mapping.version_id
);

-- Удаление поля version_id
ALTER TABLE public.chessboard_documentation_mapping 
DROP COLUMN version_id;

-- Делаем documentation_id обязательным
ALTER TABLE public.chessboard_documentation_mapping 
ALTER COLUMN documentation_id SET NOT NULL;

-- Восстановление внешнего ключа на documentations
ALTER TABLE public.chessboard_documentation_mapping 
ADD CONSTRAINT fk_chessboard_documentation_mapping_documentation 
FOREIGN KEY (documentation_id) REFERENCES public.documentations(id);

-- Восстановление старого комментария таблицы
COMMENT ON TABLE public.chessboard_documentation_mapping 
IS 'Связь записей шахматки с шифрами проектов (документацией)';

-- Восстановление комментария к полю
COMMENT ON COLUMN public.chessboard_documentation_mapping.documentation_id 
IS 'Ссылка на документ из таблицы documentations';