-- Добавление полей для отслеживания авторов создания и редактирования в таблицу chessboard
-- Дата: 2024-12-19
-- Описание: Добавляет поля created_by и updated_by для хранения UUID авторов

-- 1. Добавление полей в таблицу chessboard
ALTER TABLE public.chessboard 
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Комментарии к полям
COMMENT ON COLUMN public.chessboard.created_by IS 'Автор создания записи (UUID из auth.users)';
COMMENT ON COLUMN public.chessboard.updated_by IS 'Автор последнего редактирования (UUID из auth.users)';

-- Примечание: Заполнение полей авторов происходит на уровне приложения
-- в методах create() и update() API chessboardApi
