-- Создание таблицы room_numbers для хранения номеров помещений
-- Используется на странице "Расчет по типам" (FinishingCalculation)

CREATE TABLE IF NOT EXISTS public.room_numbers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT unique_room_number_per_project UNIQUE (project_id, name)
);

-- Комментарии к таблице и столбцам
COMMENT ON TABLE public.room_numbers IS 'Справочник номеров помещений для расчета по типам';
COMMENT ON COLUMN public.room_numbers.id IS 'Уникальный идентификатор номера помещения';
COMMENT ON COLUMN public.room_numbers.project_id IS 'Ссылка на проект';
COMMENT ON COLUMN public.room_numbers.name IS 'Текстовое значение номера помещения (уникально в пределах проекта)';
COMMENT ON COLUMN public.room_numbers.created_at IS 'Дата и время создания записи';
COMMENT ON COLUMN public.room_numbers.updated_at IS 'Дата и время последнего обновления записи';

-- Индекс для быстрого поиска по проекту и имени
CREATE INDEX IF NOT EXISTS idx_room_numbers_project_name ON public.room_numbers(project_id, name);

-- Добавление столбца room_number_id в type_calculation_mapping
ALTER TABLE public.type_calculation_mapping
ADD COLUMN IF NOT EXISTS room_number_id uuid REFERENCES public.room_numbers(id) ON DELETE SET NULL;

-- Комментарий к новому столбцу
COMMENT ON COLUMN public.type_calculation_mapping.room_number_id IS 'Ссылка на номер помещения из справочника room_numbers';

-- Индекс для быстрой фильтрации по room_number_id
CREATE INDEX IF NOT EXISTS idx_type_calculation_mapping_room_number_id
ON public.type_calculation_mapping(room_number_id);
