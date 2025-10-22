-- Тест структуры таблицы chessboard
-- Проверяем, есть ли поля created_by и updated_by

-- 1. Проверяем структуру таблицы
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chessboard' 
  AND table_schema = 'public'
  AND column_name IN ('created_by', 'updated_by')
ORDER BY column_name;

-- 2. Проверяем, есть ли триггеры
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'chessboard'
  AND trigger_name LIKE '%created_by%' OR trigger_name LIKE '%updated_by%';

-- 3. Тестируем функцию get_current_user_id
SELECT get_current_user_id() as current_user_id;

-- 4. Проверяем, что функция exec_sql работает
SELECT exec_sql('SET LOCAL app.current_user_id = ''test-user-id''');

-- 5. Проверяем текущее значение
SELECT current_setting('app.current_user_id', true) as app_current_user_id;
