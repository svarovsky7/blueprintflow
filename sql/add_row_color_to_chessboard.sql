-- Добавление поля цвета строки в шахматку
ALTER TABLE chessboard
ADD COLUMN IF NOT EXISTS color text;
