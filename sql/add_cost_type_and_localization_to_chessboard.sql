-- Добавление вида затрат и локализации в таблицу шахматки
alter table if exists chessboard
  add column if not exists cost_type_code text references cost_categories(code),
  add column if not exists localization text;

-- Обновление временной метки изменения
alter table if exists chessboard
  add column if not exists updated_at timestamptz default now();

