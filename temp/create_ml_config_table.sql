-- Создание таблицы конфигурации ML системы
CREATE TABLE IF NOT EXISTS ml_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  confidence_threshold REAL DEFAULT 0.3,
  max_suggestions INTEGER DEFAULT 15,
  model_endpoint TEXT,
  api_key TEXT,

  -- Настройки точности сопоставления
  algorithm TEXT DEFAULT 'balanced' CHECK (algorithm IN ('strict', 'balanced', 'fuzzy')),
  keyword_bonus REAL DEFAULT 0.2,
  exact_match_bonus REAL DEFAULT 0.3,
  prefix_bonus REAL DEFAULT 0.1,
  similarity_weight REAL DEFAULT 0.4,
  min_word_length INTEGER DEFAULT 3,
  ignored_terms TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создаем триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_ml_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ml_config_updated_at
  BEFORE UPDATE ON ml_config
  FOR EACH ROW
  EXECUTE FUNCTION update_ml_config_updated_at();

-- Вставляем запись по умолчанию если таблица пустая
INSERT INTO ml_config (
  enabled,
  confidence_threshold,
  max_suggestions,
  algorithm,
  keyword_bonus,
  exact_match_bonus,
  prefix_bonus,
  similarity_weight,
  min_word_length,
  ignored_terms
)
SELECT
  true,
  0.3,
  15,
  'balanced',
  0.2,
  0.3,
  0.1,
  0.4,
  3,
  ARRAY['и', 'или', 'на', 'для', 'по', 'от', 'до', 'с', 'в', 'к', 'у', 'о', 'а', 'но', 'да', 'нет', 'не', 'тип', 'типа', 'вид', 'виды', 'шт', 'кг', 'м', 'мм', 'см', 'м2', 'м3']
WHERE NOT EXISTS (SELECT 1 FROM ml_config);