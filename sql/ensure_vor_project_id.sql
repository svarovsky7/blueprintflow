-- Убедиться что поле project_id существует в таблице vor
-- Проверяем существование поля и добавляем его если отсутствует

DO $$
BEGIN
    -- Проверяем есть ли поле project_id в таблице vor
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'vor'
        AND column_name = 'project_id'
    ) THEN
        -- Добавляем поле project_id если его нет
        ALTER TABLE public.vor ADD COLUMN project_id uuid;
        RAISE NOTICE 'Поле project_id добавлено в таблицу vor';
    ELSE
        RAISE NOTICE 'Поле project_id уже существует в таблице vor';
    END IF;
END
$$;

-- Добавляем внешний ключ на projects.id если его еще нет
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'vor_project_id_fkey'
        AND table_name = 'vor'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.vor
        ADD CONSTRAINT vor_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES public.projects(id);
        RAISE NOTICE 'Внешний ключ vor_project_id_fkey добавлен';
    ELSE
        RAISE NOTICE 'Внешний ключ vor_project_id_fkey уже существует';
    END IF;
END
$$;