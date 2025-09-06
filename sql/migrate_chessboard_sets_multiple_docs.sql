-- Миграция для поддержки множественных документов в комплектах шахматки
-- Позволяет включать до 10 разных шифров проектов с индивидуальными версиями

-- 1. Создаем новую таблицу маппинга для связи комплектов с документами
CREATE TABLE IF NOT EXISTS public.chessboard_sets_documents_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    set_id uuid NOT NULL REFERENCES public.chessboard_sets(id) ON DELETE CASCADE,
    documentation_id uuid NOT NULL REFERENCES public.documentations(id) ON DELETE CASCADE,
    version_id uuid NOT NULL REFERENCES public.documentation_versions(id) ON DELETE CASCADE,
    order_index integer NOT NULL DEFAULT 0, -- Порядок документа в комплекте
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    
    -- Уникальное ограничение: один документ с версией может быть в комплекте только один раз
    CONSTRAINT unique_set_doc_version UNIQUE (set_id, documentation_id, version_id)
);

-- Индекс для быстрого поиска документов комплекта
CREATE INDEX idx_set_documents_mapping_set_id ON public.chessboard_sets_documents_mapping(set_id);
CREATE INDEX idx_set_documents_mapping_doc_id ON public.chessboard_sets_documents_mapping(documentation_id);

-- Комментарии к таблице
COMMENT ON TABLE public.chessboard_sets_documents_mapping IS 'Маппинг комплектов шахматки с документами и их версиями';
COMMENT ON COLUMN public.chessboard_sets_documents_mapping.order_index IS 'Порядок документа в комплекте для сортировки';

-- 2. Мигрируем существующие данные из chessboard_sets в новую таблицу маппинга
INSERT INTO public.chessboard_sets_documents_mapping (set_id, documentation_id, version_id, order_index)
SELECT 
    id as set_id,
    documentation_id,
    version_id,
    0 as order_index
FROM public.chessboard_sets
WHERE documentation_id IS NOT NULL AND version_id IS NOT NULL;

-- 3. Создаем представление для удобного получения данных комплекта с документами
CREATE OR REPLACE VIEW public.chessboard_sets_with_documents AS
SELECT 
    cs.id,
    cs.set_number,
    cs.name,
    cs.description,
    cs.project_id,
    cs.tag_id,
    cs.block_ids,
    cs.cost_category_ids,
    cs.cost_type_ids,
    cs.created_by,
    cs.created_at,
    cs.updated_at,
    -- Агрегируем документы в JSON массив
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'documentation_id', csdm.documentation_id,
                'version_id', csdm.version_id,
                'order_index', csdm.order_index,
                'code', d.code,
                'project_name', d.project_name,
                'version_number', dv.version_number,
                'issue_date', dv.issue_date
            ) ORDER BY csdm.order_index, d.code
        ) FILTER (WHERE csdm.id IS NOT NULL),
        '[]'::jsonb
    ) as documents
FROM public.chessboard_sets cs
LEFT JOIN public.chessboard_sets_documents_mapping csdm ON cs.id = csdm.set_id
LEFT JOIN public.documentations d ON csdm.documentation_id = d.id
LEFT JOIN public.documentation_versions dv ON csdm.version_id = dv.id
GROUP BY cs.id;

COMMENT ON VIEW public.chessboard_sets_with_documents IS 'Комплекты шахматки с полной информацией о документах';

-- 4. Функция для проверки уникальности набора документов в комплекте
CREATE OR REPLACE FUNCTION check_unique_document_set(
    p_project_id uuid,
    p_tag_id integer,
    p_block_ids uuid[],
    p_cost_category_ids integer[],
    p_cost_type_ids integer[],
    p_documents jsonb -- Массив объектов [{documentation_id, version_id}, ...]
) RETURNS uuid AS $$
DECLARE
    v_existing_set_id uuid;
    v_doc_array uuid[][];
BEGIN
    -- Преобразуем JSON в массив для сравнения
    SELECT array_agg(ARRAY[
        (doc->>'documentation_id')::uuid,
        (doc->>'version_id')::uuid
    ] ORDER BY doc->>'documentation_id', doc->>'version_id')
    INTO v_doc_array
    FROM jsonb_array_elements(p_documents) as doc;
    
    -- Ищем существующий комплект с таким же набором документов и фильтров
    SELECT cs.id INTO v_existing_set_id
    FROM public.chessboard_sets cs
    WHERE cs.project_id = p_project_id
        AND COALESCE(cs.tag_id, -1) = COALESCE(p_tag_id, -1)
        AND COALESCE(cs.block_ids, ARRAY[]::uuid[]) = COALESCE(p_block_ids, ARRAY[]::uuid[])
        AND COALESCE(cs.cost_category_ids, ARRAY[]::integer[]) = COALESCE(p_cost_category_ids, ARRAY[]::integer[])
        AND COALESCE(cs.cost_type_ids, ARRAY[]::integer[]) = COALESCE(p_cost_type_ids, ARRAY[]::integer[])
        AND EXISTS (
            -- Проверяем, что набор документов совпадает
            SELECT 1
            FROM (
                SELECT array_agg(ARRAY[documentation_id, version_id] ORDER BY documentation_id, version_id) as docs
                FROM public.chessboard_sets_documents_mapping
                WHERE set_id = cs.id
            ) sub
            WHERE sub.docs = v_doc_array
        );
    
    RETURN v_existing_set_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_unique_document_set IS 'Проверка уникальности набора документов и фильтров для комплекта';

-- 5. Триггер для ограничения количества документов в комплекте (максимум 10)
CREATE OR REPLACE FUNCTION check_document_count_limit() RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM public.chessboard_sets_documents_mapping WHERE set_id = NEW.set_id) >= 10 THEN
        RAISE EXCEPTION 'Комплект не может содержать более 10 документов';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_document_count_limit
    BEFORE INSERT ON public.chessboard_sets_documents_mapping
    FOR EACH ROW
    EXECUTE FUNCTION check_document_count_limit();

-- 6. После успешной миграции можно будет удалить старые поля (выполнять отдельно после проверки)
-- ALTER TABLE public.chessboard_sets DROP COLUMN IF EXISTS documentation_id;
-- ALTER TABLE public.chessboard_sets DROP COLUMN IF EXISTS version_id;
-- DROP INDEX IF EXISTS idx_chessboard_sets_unique_filters;

-- Примечание: Удаление старых полей следует выполнять только после полной миграции и тестирования