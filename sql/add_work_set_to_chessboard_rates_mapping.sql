-- Добавление поля work_set в таблицу chessboard_rates_mapping

-- Добавить столбец work_set как UUID со ссылкой на таблицу rates
ALTER TABLE chessboard_rates_mapping
ADD COLUMN work_set UUID;

-- Добавить внешний ключ на таблицу rates
ALTER TABLE chessboard_rates_mapping
ADD CONSTRAINT chessboard_rates_mapping_work_set_fkey
FOREIGN KEY (work_set) REFERENCES rates(id) ON DELETE SET NULL;

-- Добавить комментарий к столбцу
COMMENT ON COLUMN chessboard_rates_mapping.work_set IS 'Рабочий набор (FK на rates.id)';