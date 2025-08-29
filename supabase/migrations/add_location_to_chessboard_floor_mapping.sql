alter table if exists public.chessboard_floor_mapping
    add column if not exists location_id integer;

alter table if exists public.chessboard_floor_mapping
    alter column floor_number drop not null;

alter table if exists public.chessboard_floor_mapping
    drop constraint if exists chessboard_floor_mapping_chessboard_id_floor_number_key;

create unique index if not exists chessboard_floor_mapping_chessboard_id_floor_number_key
    on public.chessboard_floor_mapping (chessboard_id, floor_number)
    where floor_number is not null;

create unique index if not exists chessboard_floor_mapping_chessboard_id_location_id_key
    on public.chessboard_floor_mapping (chessboard_id, location_id)
    where location_id is not null;

alter table if exists public.chessboard_floor_mapping
    add constraint chessboard_floor_mapping_location_id_fkey foreign key (location_id) references public.location(id);

create index if not exists idx_chessboard_floor_mapping_location_id
    on public.chessboard_floor_mapping (location_id);

comment on column public.chessboard_floor_mapping.location_id is 'ID локации из таблицы location';
comment on table public.chessboard_floor_mapping is 'Связь записей шахматки с этажами или локациями';
