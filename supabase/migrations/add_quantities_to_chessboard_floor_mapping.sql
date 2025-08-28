alter table if exists public.chessboard_floor_mapping
  add column if not exists "quantityPd" numeric,
  add column if not exists "quantitySpec" numeric,
  add column if not exists "quantityRd" numeric;
