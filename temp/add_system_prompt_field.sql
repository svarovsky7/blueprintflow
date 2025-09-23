-- ДОБАВЛЕНИЕ ПОЛЯ system_prompt В ТАБЛИЦУ deepseek_settings
-- Этот скрипт добавляет отсутствующее поле system_prompt

-- Проверяем существование поля (для безопасности)
DO $$
BEGIN
  -- Добавляем поле system_prompt если его нет
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'deepseek_settings'
    AND column_name = 'system_prompt'
  ) THEN
    ALTER TABLE deepseek_settings
    ADD COLUMN system_prompt TEXT;

    -- Добавляем комментарий к полю
    COMMENT ON COLUMN deepseek_settings.system_prompt
    IS 'Кастомный системный промпт для анализа материалов (опционально)';

    RAISE NOTICE 'Поле system_prompt добавлено в таблицу deepseek_settings';
  ELSE
    RAISE NOTICE 'Поле system_prompt уже существует в таблице deepseek_settings';
  END IF;
END $$;

-- Проверяем результат
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'deepseek_settings'
AND column_name = 'system_prompt';