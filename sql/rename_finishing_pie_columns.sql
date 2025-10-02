-- Переименование столбцов в таблице finishing_pie

-- Переименовать столбцы
ALTER TABLE finishing_pie RENAME COLUMN section_id TO documentation_tag_id;
ALTER TABLE finishing_pie RENAME COLUMN project_code_id TO version_id;

-- Удалить старые внешние ключи
ALTER TABLE finishing_pie DROP CONSTRAINT IF EXISTS finishing_pie_section_id_fkey;
ALTER TABLE finishing_pie DROP CONSTRAINT IF EXISTS finishing_pie_project_code_id_fkey;

-- Добавить новые внешние ключи с правильными названиями
ALTER TABLE finishing_pie
ADD CONSTRAINT finishing_pie_documentation_tag_id_fkey
  FOREIGN KEY (documentation_tag_id) REFERENCES documentation_tags(id) ON DELETE SET NULL;

ALTER TABLE finishing_pie
ADD CONSTRAINT finishing_pie_version_id_fkey
  FOREIGN KEY (version_id) REFERENCES documentation_versions(id) ON DELETE SET NULL;

-- Обновить комментарии к столбцам
COMMENT ON COLUMN finishing_pie.documentation_tag_id IS 'Раздел документации (FK на documentation_tags.id)';
COMMENT ON COLUMN finishing_pie.version_id IS 'Версия шифра проекта (FK на documentation_versions.id)';
