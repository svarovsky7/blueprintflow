-- Тест заполнения полей авторов в таблице chessboard
-- Проверяем, что поля created_by и updated_by работают корректно

-- 1. Проверяем структуру таблицы
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'chessboard' 
  AND table_schema = 'public'
  AND column_name IN ('created_by', 'updated_by')
ORDER BY column_name;

-- 2. Проверяем, есть ли данные в таблице с заполненными полями авторов
SELECT id, created_by, updated_by, created_at, updated_at
FROM chessboard 
WHERE created_by IS NOT NULL OR updated_by IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 3. Проверяем последние записи (включая NULL поля)
SELECT id, created_by, updated_by, created_at, updated_at
FROM chessboard 
ORDER BY created_at DESC
LIMIT 5;

-- 4. Тестируем вставку с полями авторов
-- (Этот запрос нужно выполнить с реальным UUID пользователя)
-- INSERT INTO chessboard (material, unit_id, project_id, created_by, updated_by)
-- VALUES ('test-material-id', 'test-unit-id', 'test-project-id', 'test-user-id', 'test-user-id');

-- 5. Проверяем, что поля существуют и имеют правильный тип
SELECT 
  column_name,
  data_type,
  is_nullable,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'chessboard' 
  AND table_schema = 'public'
  AND column_name IN ('created_by', 'updated_by');
