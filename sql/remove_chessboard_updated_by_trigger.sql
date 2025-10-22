-- Удаление триггера set_chessboard_updated_by, который конфликтует с заполнением поля в коде
-- Дата: 2024-12-19
-- Описание: Удаляет триггер, который перезаписывает поле updated_by на NULL

-- Удаляем триггер
DROP TRIGGER IF EXISTS chessboard_set_updated_by ON public.chessboard;

-- Удаляем функцию (если она больше не используется)
-- DROP FUNCTION IF EXISTS public.set_chessboard_updated_by();

-- Комментарий: Теперь поле updated_by заполняется только в коде приложения
-- через методы updateRow и updateEditingRow в useTableOperations.tsx
