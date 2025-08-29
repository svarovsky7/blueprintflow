create table if not exists public.chessboard_nomenclature_mapping (
  chessboard_id uuid not null references public.chessboard(id) on delete cascade,
  nomenclature_id uuid not null references public.nomenclature(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (chessboard_id, nomenclature_id)
);

create index if not exists idx_chessboard_nomenclature_mapping_chessboard_id
  on public.chessboard_nomenclature_mapping (chessboard_id);
create index if not exists idx_chessboard_nomenclature_mapping_nomenclature_id
  on public.chessboard_nomenclature_mapping (nomenclature_id);

grant all on table public.chessboard_nomenclature_mapping to anon;
grant all on table public.chessboard_nomenclature_mapping to authenticated;
grant all on table public.chessboard_nomenclature_mapping to service_role;
