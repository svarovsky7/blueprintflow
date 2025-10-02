-- Добавление столбцов статусов в таблицу finishing_pie

ALTER TABLE finishing_pie
ADD COLUMN IF NOT EXISTS status_finishing_pie uuid REFERENCES statuses(id),
ADD COLUMN IF NOT EXISTS status_type_calculation uuid REFERENCES statuses(id);

COMMENT ON COLUMN finishing_pie.status_finishing_pie IS 'Статус документа "Тип пирога отделки"';
COMMENT ON COLUMN finishing_pie.status_type_calculation IS 'Статус документа "Расчет по типам"';
