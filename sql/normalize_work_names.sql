-- Миграция: Нормализация work_names - вынос в отдельную таблицу
-- Дата: 2025-10-06
-- Описание: Создание таблицы work_names и обновление связей через rates_detail_cost_categories_mapping

-- ============================================================
-- Шаг 1: Создать таблицу work_names
-- ============================================================
CREATE TABLE work_names (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE work_names IS 'Справочник уникальных наименований работ';
COMMENT ON COLUMN work_names.name IS 'Уникальное наименование работы';

-- ============================================================
-- Шаг 2: Заполнить work_names уникальными значениями из rates
-- ============================================================
INSERT INTO work_names (name, created_at, updated_at)
SELECT DISTINCT
  work_name,
  NOW(),
  NOW()
FROM rates
WHERE work_name IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Шаг 3: Добавить work_name_id в rates_detail_cost_categories_mapping
-- ============================================================
ALTER TABLE rates_detail_cost_categories_mapping
ADD COLUMN work_name_id UUID;

-- ============================================================
-- Шаг 4: Заполнить work_name_id в mapping на основе rates
-- ============================================================
UPDATE rates_detail_cost_categories_mapping AS rdccm
SET work_name_id = (
  SELECT wn.id
  FROM rates r
  JOIN work_names wn ON wn.name = r.work_name
  WHERE r.id = rdccm.rate_id
  LIMIT 1
);

-- ============================================================
-- Шаг 5: Сделать work_name_id обязательным
-- ============================================================
ALTER TABLE rates_detail_cost_categories_mapping
ALTER COLUMN work_name_id SET NOT NULL;

-- ============================================================
-- Шаг 6: Добавить FK на work_names
-- ============================================================
ALTER TABLE rates_detail_cost_categories_mapping
ADD CONSTRAINT fk_rates_mapping_work_name
FOREIGN KEY (work_name_id)
REFERENCES work_names(id)
ON DELETE CASCADE;

-- ============================================================
-- Шаг 7: Изменить структуру rates - добавить work_name_id
-- ============================================================
ALTER TABLE rates
ADD COLUMN work_name_id UUID;

-- Заполнить work_name_id в rates
UPDATE rates r
SET work_name_id = (
  SELECT wn.id
  FROM work_names wn
  WHERE wn.name = r.work_name
);

-- Сделать обязательным
ALTER TABLE rates
ALTER COLUMN work_name_id SET NOT NULL;

-- Добавить FK
ALTER TABLE rates
ADD CONSTRAINT fk_rates_work_name
FOREIGN KEY (work_name_id)
REFERENCES work_names(id)
ON DELETE RESTRICT;

-- ============================================================
-- Шаг 8: Удалить старый unique constraint и текстовое поле work_name
-- ============================================================
-- Сначала удаляем unique constraint
ALTER TABLE rates
DROP CONSTRAINT IF EXISTS rates_work_name_key;

-- Затем удаляем текстовое поле
ALTER TABLE rates
DROP COLUMN work_name;

-- ============================================================
-- Шаг 9: Создать индексы для производительности
-- ============================================================
CREATE INDEX idx_rates_work_name_id ON rates(work_name_id);
CREATE INDEX idx_rates_mapping_work_name_id ON rates_detail_cost_categories_mapping(work_name_id);
CREATE INDEX idx_work_names_name ON work_names(name);

-- ============================================================
-- Шаг 10: Комментарии
-- ============================================================
COMMENT ON COLUMN rates.work_name_id IS 'FK на work_names - наименование работы';
COMMENT ON COLUMN rates_detail_cost_categories_mapping.work_name_id IS 'FK на work_names - связь наименования с категориями затрат';
