-- Добавление связи записи шахматки с корпусом проекта
alter table if exists chessboard_mapping
  add column if not exists block_id uuid references blocks(id);
