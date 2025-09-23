-- СОЗДАНИЕ ТАБЛИЦ ДЛЯ DEEPSEEK AI ИНТЕГРАЦИИ
-- Этот файл создает таблицы для настроек и статистики использования Deepseek API

-- ===============================
-- ТАБЛИЦА НАСТРОЕК DEEPSEEK
-- ===============================

-- Удаляем таблицу если существует
DROP TABLE IF EXISTS deepseek_settings CASCADE;

-- Создаем таблицу настроек Deepseek
CREATE TABLE deepseek_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT NOT NULL, -- API ключ для доступа к Deepseek
  base_url TEXT NOT NULL DEFAULT 'https://api.deepseek.com', -- Базовый URL API
  model TEXT NOT NULL DEFAULT 'deepseek-chat', -- Модель для использования
  enabled BOOLEAN NOT NULL DEFAULT false, -- Включен ли Deepseek
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7, -- Температура генерации (0.0-1.0)
  max_tokens INTEGER NOT NULL DEFAULT 1000, -- Максимальное количество токенов
  system_prompt TEXT, -- Кастомный системный промпт (NULLABLE)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Создаем индексы
CREATE INDEX idx_deepseek_settings_enabled ON deepseek_settings(enabled);
CREATE INDEX idx_deepseek_settings_updated_at ON deepseek_settings(updated_at);

-- Добавляем комментарии к таблице и полям
COMMENT ON TABLE deepseek_settings IS 'Настройки для интеграции с Deepseek AI API';
COMMENT ON COLUMN deepseek_settings.api_key IS 'API ключ для доступа к Deepseek (начинается с sk-)';
COMMENT ON COLUMN deepseek_settings.base_url IS 'Базовый URL для API запросов';
COMMENT ON COLUMN deepseek_settings.model IS 'Модель AI для использования (deepseek-chat, deepseek-reasoner)';
COMMENT ON COLUMN deepseek_settings.enabled IS 'Включена ли интеграция с Deepseek (false = локальный ML)';
COMMENT ON COLUMN deepseek_settings.temperature IS 'Температура генерации для контроля креативности (0.0-1.0)';
COMMENT ON COLUMN deepseek_settings.max_tokens IS 'Максимальное количество токенов в ответе от AI';
COMMENT ON COLUMN deepseek_settings.system_prompt IS 'Кастомный системный промпт для анализа материалов (опционально)';

-- ===============================
-- ТАБЛИЦА СТАТИСТИКИ ИСПОЛЬЗОВАНИЯ
-- ===============================

-- Удаляем таблицу если существует
DROP TABLE IF EXISTS deepseek_usage_stats CASCADE;

-- Создаем таблицу статистики использования
CREATE TABLE deepseek_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requests_count INTEGER NOT NULL DEFAULT 0, -- Общее количество запросов
  tokens_input INTEGER NOT NULL DEFAULT 0, -- Количество входящих токенов
  tokens_output INTEGER NOT NULL DEFAULT 0, -- Количество исходящих токенов
  total_cost DECIMAL(10,6) NOT NULL DEFAULT 0, -- Общая стоимость в USD
  successful_requests INTEGER NOT NULL DEFAULT 0, -- Количество успешных запросов
  failed_requests INTEGER NOT NULL DEFAULT 0, -- Количество неудачных запросов
  last_request_at TIMESTAMPTZ, -- Время последнего запроса
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Создаем индексы
CREATE INDEX idx_deepseek_usage_stats_last_request ON deepseek_usage_stats(last_request_at);
CREATE INDEX idx_deepseek_usage_stats_updated_at ON deepseek_usage_stats(updated_at);

-- Добавляем комментарии к таблице и полям
COMMENT ON TABLE deepseek_usage_stats IS 'Статистика использования Deepseek AI API для контроля расходов';
COMMENT ON COLUMN deepseek_usage_stats.requests_count IS 'Общее количество запросов к API';
COMMENT ON COLUMN deepseek_usage_stats.tokens_input IS 'Количество входящих токенов (промпты)';
COMMENT ON COLUMN deepseek_usage_stats.tokens_output IS 'Количество исходящих токенов (ответы)';
COMMENT ON COLUMN deepseek_usage_stats.total_cost IS 'Общая стоимость использования в USD';
COMMENT ON COLUMN deepseek_usage_stats.successful_requests IS 'Количество успешных запросов';
COMMENT ON COLUMN deepseek_usage_stats.failed_requests IS 'Количество неудачных запросов';
COMMENT ON COLUMN deepseek_usage_stats.last_request_at IS 'Время последнего запроса к API';

-- ===============================
-- СОЗДАНИЕ ФУНКЦИЙ ОБНОВЛЕНИЯ TIMESTAMP
-- ===============================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Создаем триггеры для автоматического обновления updated_at
CREATE TRIGGER update_deepseek_settings_updated_at
  BEFORE UPDATE ON deepseek_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deepseek_usage_stats_updated_at
  BEFORE UPDATE ON deepseek_usage_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- ВСТАВКА НАЧАЛЬНЫХ ДАННЫХ
-- ===============================

-- Создаем запись с настройками по умолчанию (если её нет)
INSERT INTO deepseek_settings (
  api_key,
  base_url,
  model,
  enabled,
  temperature,
  max_tokens,
  system_prompt
) VALUES (
  '', -- пустой API ключ (нужно заполнить в настройках)
  'https://api.deepseek.com',
  'deepseek-chat',
  false, -- по умолчанию отключен
  0.7,
  1000,
  NULL -- без кастомного промпта
) ON CONFLICT DO NOTHING;

-- Создаем запись статистики (если её нет)
INSERT INTO deepseek_usage_stats (
  requests_count,
  tokens_input,
  tokens_output,
  total_cost,
  successful_requests,
  failed_requests
) VALUES (
  0, 0, 0, 0, 0, 0
) ON CONFLICT DO NOTHING;

-- Выводим информацию о созданных таблицах
\echo 'Таблицы Deepseek созданы успешно:'
\echo '- deepseek_settings (настройки API)'
\echo '- deepseek_usage_stats (статистика использования)'
\echo ''
\echo 'Поля в deepseek_settings:'
\echo '- api_key (TEXT, обязательное)'
\echo '- base_url (TEXT, по умолчанию https://api.deepseek.com)'
\echo '- model (TEXT, по умолчанию deepseek-chat)'
\echo '- enabled (BOOLEAN, по умолчанию false)'
\echo '- temperature (DECIMAL, по умолчанию 0.7)'
\echo '- max_tokens (INTEGER, по умолчанию 1000)'
\echo '- system_prompt (TEXT, NULLABLE - кастомный промпт)'
\echo ''
\echo 'Готово! Теперь можно использовать настройки Deepseek в приложении.'