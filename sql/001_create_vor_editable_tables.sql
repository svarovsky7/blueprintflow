-- Создание таблиц для редактируемых ВОР
-- Миграция: Добавление возможности редактирования ВОР с работами и материалами

-- Таблица работ ВОР
CREATE TABLE IF NOT EXISTS public.vor_works (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vor_id uuid NOT NULL REFERENCES vor(id) ON DELETE CASCADE,
    rate_id uuid NOT NULL REFERENCES rates(id),
    name text NOT NULL,
    unit_id uuid REFERENCES units(id),
    quantity numeric(15,4) DEFAULT 0,
    coefficient numeric(10,4) DEFAULT 1.0,
    base_rate numeric(15,4),
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Таблица материалов ВОР
CREATE TABLE IF NOT EXISTS public.vor_materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vor_work_id uuid NOT NULL REFERENCES vor_works(id) ON DELETE CASCADE,
    supplier_material_name text NOT NULL,
    unit_id uuid REFERENCES units(id),
    quantity numeric(15,4) DEFAULT 0,
    price numeric(15,4) DEFAULT 0,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Индексы для производительности

-- Индексы для vor_works
CREATE INDEX IF NOT EXISTS idx_vor_works_vor_id ON vor_works(vor_id);
CREATE INDEX IF NOT EXISTS idx_vor_works_rate_id ON vor_works(rate_id);
CREATE INDEX IF NOT EXISTS idx_vor_works_sort_order ON vor_works(sort_order);

-- Индексы для vor_materials
CREATE INDEX IF NOT EXISTS idx_vor_materials_vor_work_id ON vor_materials(vor_work_id);
CREATE INDEX IF NOT EXISTS idx_vor_materials_sort_order ON vor_materials(sort_order);

-- Триггер для автоматического обновления updated_at

-- Функция для обновления updated_at (если не существует)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для vor_works
CREATE TRIGGER IF NOT EXISTS update_vor_works_updated_at
    BEFORE UPDATE ON vor_works
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Триггеры для vor_materials
CREATE TRIGGER IF NOT EXISTS update_vor_materials_updated_at
    BEFORE UPDATE ON vor_materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Комментарии к таблицам и полям
COMMENT ON TABLE vor_works IS 'Работы в редактируемых ВОР';
COMMENT ON COLUMN vor_works.vor_id IS 'Ссылка на ВОР';
COMMENT ON COLUMN vor_works.rate_id IS 'Ссылка на расценку из справочника';
COMMENT ON COLUMN vor_works.coefficient IS 'Индивидуальный коэффициент для работы';
COMMENT ON COLUMN vor_works.base_rate IS 'Кэш базовой расценки для быстрого доступа';
COMMENT ON COLUMN vor_works.sort_order IS 'Порядок сортировки работ в ВОР';

COMMENT ON TABLE vor_materials IS 'Материалы для работ в редактируемых ВОР';
COMMENT ON COLUMN vor_materials.vor_work_id IS 'Ссылка на работу ВОР';
COMMENT ON COLUMN vor_materials.supplier_material_name IS 'Название материала (из supplier_names или ручной ввод)';
COMMENT ON COLUMN vor_materials.price IS 'Цена материала за единицу';
COMMENT ON COLUMN vor_materials.sort_order IS 'Порядок сортировки материалов в работе';