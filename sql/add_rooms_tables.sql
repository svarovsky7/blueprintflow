-- Создание таблицы type_rooms (помещения)
CREATE TABLE IF NOT EXISTS public.type_rooms (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы связи location_rooms_mapping (многие-ко-многим)
CREATE TABLE IF NOT EXISTS public.location_rooms_mapping (
    location_id INTEGER NOT NULL REFERENCES public.location(id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES public.type_rooms(id) ON DELETE CASCADE,
    PRIMARY KEY (location_id, room_id)
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_location_rooms_location ON public.location_rooms_mapping(location_id);
CREATE INDEX IF NOT EXISTS idx_location_rooms_room ON public.location_rooms_mapping(room_id);

-- Комментарии к таблицам
COMMENT ON TABLE public.type_rooms IS 'Справочник помещений';
COMMENT ON TABLE public.location_rooms_mapping IS 'Связь многие-ко-многим между локализациями и помещениями';