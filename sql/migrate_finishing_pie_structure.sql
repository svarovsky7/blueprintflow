-- Миграция структуры таблиц для типов пирогов отделки
-- Создаём таблицу finishing_pie для заголовков документов с проектом и корпусом

-- 1. Создаём новую таблицу finishing_pie
CREATE TABLE IF NOT EXISTS public.finishing_pie (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    project_id UUID NOT NULL,
    block_id UUID, -- Корпус (необязательный)
    name TEXT NOT NULL, -- Название документа (Тип-1, Тип-2, и т.д.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Добавляем constraints для finishing_pie
DO $finishing_pie_constraints$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finishing_pie_pkey') THEN
        ALTER TABLE public.finishing_pie ADD CONSTRAINT finishing_pie_pkey PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finishing_pie_project_id_fkey') THEN
        ALTER TABLE public.finishing_pie ADD CONSTRAINT finishing_pie_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finishing_pie_block_id_fkey') THEN
        ALTER TABLE public.finishing_pie ADD CONSTRAINT finishing_pie_block_id_fkey
        FOREIGN KEY (block_id) REFERENCES public.blocks(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finishing_pie_project_name_unique') THEN
        ALTER TABLE public.finishing_pie ADD CONSTRAINT finishing_pie_project_name_unique
        UNIQUE(project_id, name);
    END IF;
END $finishing_pie_constraints$;

-- 2. Добавляем столбец finishing_pie_id в finishing_pie_mapping
ALTER TABLE public.finishing_pie_mapping ADD COLUMN IF NOT EXISTS finishing_pie_id UUID;

-- 3. Мигрируем данные из finishing_pie_types в finishing_pie
INSERT INTO public.finishing_pie (id, project_id, name, created_at, updated_at)
SELECT id, project_id, name, created_at, updated_at
FROM public.finishing_pie_types
ON CONFLICT (id) DO NOTHING;

-- 4. Обновляем finishing_pie_mapping, связывая строки с finishing_pie
UPDATE public.finishing_pie_mapping fpm
SET finishing_pie_id = fpm.pie_type_id
WHERE fpm.finishing_pie_id IS NULL;

-- 5. Добавляем constraints для finishing_pie_mapping.finishing_pie_id
DO $finishing_pie_mapping_new_constraints$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finishing_pie_mapping_finishing_pie_id_fkey') THEN
        ALTER TABLE public.finishing_pie_mapping ADD CONSTRAINT finishing_pie_mapping_finishing_pie_id_fkey
        FOREIGN KEY (finishing_pie_id) REFERENCES public.finishing_pie(id) ON DELETE CASCADE;
    END IF;
END $finishing_pie_mapping_new_constraints$;

-- 6. Удаляем старые constraints и столбцы (осторожно!)
-- ВАЖНО: Раскомментируйте следующие строки только после проверки данных!
-- ALTER TABLE public.finishing_pie_mapping DROP CONSTRAINT IF EXISTS finishing_pie_mapping_pie_type_id_fkey;
-- ALTER TABLE public.finishing_pie_mapping DROP COLUMN IF EXISTS pie_type_id;
-- DROP TABLE IF EXISTS public.finishing_pie_types CASCADE;

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_finishing_pie_project ON public.finishing_pie(project_id);
CREATE INDEX IF NOT EXISTS idx_finishing_pie_block ON public.finishing_pie(block_id);
CREATE INDEX IF NOT EXISTS idx_finishing_pie_mapping_finishing_pie ON public.finishing_pie_mapping(finishing_pie_id);

-- Комментарии к таблицам
COMMENT ON TABLE public.finishing_pie IS 'Документы типов пирогов отделки с привязкой к проекту и корпусу';
COMMENT ON COLUMN public.finishing_pie.name IS 'Название документа (Тип-1, Тип-2, и т.д.)';
COMMENT ON COLUMN public.finishing_pie.block_id IS 'Корпус (опционально)';
COMMENT ON COLUMN public.finishing_pie_mapping.finishing_pie_id IS 'Ссылка на документ типа пирога отделки';