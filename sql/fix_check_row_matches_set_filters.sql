-- Исправление функции check_row_matches_set_filters
-- Проблема: функция пытается обратиться к полям cost_category_id и detail_cost_category_id
-- в таблице chessboard, но эти поля находятся в таблице chessboard_mapping

CREATE OR REPLACE FUNCTION public.check_row_matches_set_filters(
  p_chessboard_row public.chessboard, 
  p_set public.chessboard_sets
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_cost_category_id INTEGER;
  v_detail_cost_category_id INTEGER;
  v_block_id UUID;
BEGIN
  -- Проверка project_id (обязательное поле)
  IF p_set.project_id IS NULL OR p_chessboard_row.project_id != p_set.project_id THEN
    RETURN FALSE;
  END IF;

  -- Получить данные из chessboard_mapping для этой строки
  SELECT 
    block_id,
    cost_category_id,
    cost_type_id
  INTO 
    v_block_id,
    v_cost_category_id,
    v_detail_cost_category_id
  FROM chessboard_mapping
  WHERE chessboard_id = p_chessboard_row.id
  LIMIT 1;

  -- Проверка block_ids
  IF p_set.block_ids IS NOT NULL THEN
    IF v_block_id IS NULL OR NOT (v_block_id = ANY(p_set.block_ids)) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Проверка cost_category_ids
  IF p_set.cost_category_ids IS NOT NULL THEN
    IF v_cost_category_id IS NULL OR NOT (v_cost_category_id = ANY(p_set.cost_category_ids)) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Проверка cost_type_ids (detail_cost_category)
  IF p_set.cost_type_ids IS NOT NULL THEN
    IF v_detail_cost_category_id IS NULL OR NOT (v_detail_cost_category_id = ANY(p_set.cost_type_ids)) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Если все проверки прошли, возвращаем TRUE
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.check_row_matches_set_filters(p_chessboard_row public.chessboard, p_set public.chessboard_sets) IS 'Проверяет, соответствует ли строка chessboard фильтрам комплекта. Возвращает TRUE если строка попадает под все установленные фильтры. Исправлено: теперь получает cost_category_id и detail_cost_category_id из chessboard_mapping';

