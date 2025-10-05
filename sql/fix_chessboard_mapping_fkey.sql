-- Исправление foreign key constraint в chessboard_mapping для detail_cost_categories
-- Проблема: После переименования detail_cost_categories foreign key может быть неправильным

-- 1. Проверить текущие foreign keys в chessboard_mapping
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'chessboard_mapping'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'cost_type_id';

-- 2. Пересоздать foreign key constraint если он ссылается на старую таблицу
DO $$
BEGIN
    -- Удалить все foreign keys для cost_type_id
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chessboard_mapping_cost_type_id_fkey'
        AND table_name = 'chessboard_mapping'
    ) THEN
        ALTER TABLE chessboard_mapping DROP CONSTRAINT chessboard_mapping_cost_type_id_fkey;
        RAISE NOTICE 'Удалён старый constraint chessboard_mapping_cost_type_id_fkey';
    END IF;

    -- Создать новый constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chessboard_mapping_cost_type_id_fkey'
        AND table_name = 'chessboard_mapping'
    ) THEN
        ALTER TABLE chessboard_mapping
        ADD CONSTRAINT chessboard_mapping_cost_type_id_fkey
        FOREIGN KEY (cost_type_id) REFERENCES detail_cost_categories(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Создан новый constraint chessboard_mapping_cost_type_id_fkey';
    ELSE
        RAISE NOTICE 'Constraint уже существует';
    END IF;
END $$;

-- 3. Проверить результат
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'chessboard_mapping'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'cost_type_id';
