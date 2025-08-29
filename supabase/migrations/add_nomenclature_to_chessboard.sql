alter table if exists public.chessboard
  add column if not exists nomenclature_id uuid references public.nomenclature(id) on delete set null;
