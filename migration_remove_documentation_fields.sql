-- Удаление полей project_id и block_id из таблицы documentations
-- Эти данные теперь хранятся в таблице documentations_projects_mapping

-- Удаляем внешние ключи если они существуют
ALTER TABLE documentations 
DROP CONSTRAINT IF EXISTS documentations_project_id_fkey;

ALTER TABLE documentations 
DROP CONSTRAINT IF EXISTS documentations_block_id_fkey;

-- Удаляем колонки
ALTER TABLE documentations 
DROP COLUMN IF EXISTS project_id;

ALTER TABLE documentations 
DROP COLUMN IF EXISTS block_id;

-- Проверяем что данные в таблице маппинга существуют
-- SELECT COUNT(*) FROM documentations_projects_mapping;