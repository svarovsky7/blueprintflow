-- Создание таблицы для типов отделки (справочник)
CREATE TABLE IF NOT EXISTS public.finishing_pie_types (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    project_id UUID NOT NULL,
    name TEXT NOT NULL, -- Тип-1, Тип-2, и т.д.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Добавляем constraints для finishing_pie_types
DO $finishing_pie_types_constraints$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finishing_pie_types_pkey') THEN
        ALTER TABLE public.finishing_pie_types ADD CONSTRAINT finishing_pie_types_pkey PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finishing_pie_types_project_id_fkey') THEN
        ALTER TABLE public.finishing_pie_types ADD CONSTRAINT finishing_pie_types_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finishing_pie_types_project_name_unique') THEN
        ALTER TABLE public.finishing_pie_types ADD CONSTRAINT finishing_pie_types_project_name_unique
        UNIQUE(project_id, name);
    END IF;
END $finishing_pie_types_constraints$;

-- Создание маппинг-таблицы для строк типов пирогов отделки
CREATE TABLE IF NOT EXISTS public.finishing_pie_mapping (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    pie_type_id UUID NOT NULL,
    material_id UUID, -- Материал
    unit_id UUID, -- Единица измерения
    consumption NUMERIC(10, 4), -- Расход
    rate_id UUID, -- Работа из расценок
    rate_unit_id UUID, -- Ед.изм. работы (копируется из расценки)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Добавляем constraints для finishing_pie_mapping
DO $finishing_pie_mapping_constraints$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finishing_pie_mapping_pkey') THEN
        ALTER TABLE public.finishing_pie_mapping ADD CONSTRAINT finishing_pie_mapping_pkey PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finishing_pie_mapping_pie_type_id_fkey') THEN
        ALTER TABLE public.finishing_pie_mapping ADD CONSTRAINT finishing_pie_mapping_pie_type_id_fkey
        FOREIGN KEY (pie_type_id) REFERENCES public.finishing_pie_types(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finishing_pie_mapping_material_id_fkey') THEN
        ALTER TABLE public.finishing_pie_mapping ADD CONSTRAINT finishing_pie_mapping_material_id_fkey
        FOREIGN KEY (material_id) REFERENCES public.materials(uuid) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finishing_pie_mapping_unit_id_fkey') THEN
        ALTER TABLE public.finishing_pie_mapping ADD CONSTRAINT finishing_pie_mapping_unit_id_fkey
        FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finishing_pie_mapping_rate_id_fkey') THEN
        ALTER TABLE public.finishing_pie_mapping ADD CONSTRAINT finishing_pie_mapping_rate_id_fkey
        FOREIGN KEY (rate_id) REFERENCES public.rates(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finishing_pie_mapping_rate_unit_id_fkey') THEN
        ALTER TABLE public.finishing_pie_mapping ADD CONSTRAINT finishing_pie_mapping_rate_unit_id_fkey
        FOREIGN KEY (rate_unit_id) REFERENCES public.units(id) ON DELETE SET NULL;
    END IF;
END $finishing_pie_mapping_constraints$;

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_finishing_pie_types_project ON public.finishing_pie_types(project_id);
CREATE INDEX IF NOT EXISTS idx_finishing_pie_mapping_pie_type ON public.finishing_pie_mapping(pie_type_id);
CREATE INDEX IF NOT EXISTS idx_finishing_pie_mapping_material ON public.finishing_pie_mapping(material_id);
CREATE INDEX IF NOT EXISTS idx_finishing_pie_mapping_rate ON public.finishing_pie_mapping(rate_id);

-- Комментарии к таблицам
COMMENT ON TABLE public.finishing_pie_types IS 'Справочник типов пирогов отделки (Тип-1, Тип-2, и т.д.) в рамках проекта';
COMMENT ON TABLE public.finishing_pie_mapping IS 'Маппинг-таблица для строк типов пирогов отделки с материалами, расходом и работами';

COMMENT ON COLUMN public.finishing_pie_types.name IS 'Название типа (Тип-1, Тип-2, и т.д.)';
COMMENT ON COLUMN public.finishing_pie_mapping.pie_type_id IS 'Ссылка на тип пирога';
COMMENT ON COLUMN public.finishing_pie_mapping.material_id IS 'Ссылка на материал из справочника materials';
COMMENT ON COLUMN public.finishing_pie_mapping.unit_id IS 'Единица измерения материала';
COMMENT ON COLUMN public.finishing_pie_mapping.consumption IS 'Расход материала';
COMMENT ON COLUMN public.finishing_pie_mapping.rate_id IS 'Ссылка на работу из справочника расценок';
COMMENT ON COLUMN public.finishing_pie_mapping.rate_unit_id IS 'Единица измерения работы (копируется из расценки при выборе)';