alter table public.chessboard_nomenclature_mapping add column supplier_name text;
alter table public.chessboard_nomenclature_mapping drop column if exists created_at;
alter table public.chessboard_nomenclature_mapping drop column if exists updated_at;
