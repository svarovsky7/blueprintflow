create table if not exists public.materials (
  uuid uuid primary key default gen_random_uuid(),
  name text unique not null
);

-- очистить существующие значения, чтобы избежать ошибок приведения типов
update public.chessboard set material = null;

alter table if exists public.chessboard
  alter column material type uuid using material::uuid,
  add constraint chessboard_material_fkey foreign key (material) references public.materials (uuid);
