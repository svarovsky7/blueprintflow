import type { AppliedFilters } from '@/pages/documents/Chessboard/types';

// Проверяет, нужен ли INNER JOIN для chessboard_mapping
function needsInnerJoinForMapping(appliedFilters: AppliedFilters): boolean {
  return !!(
    appliedFilters.block_ids?.length ||
    appliedFilters.cost_category_ids?.length ||
    appliedFilters.detail_cost_category_ids?.length
  )
}

// Генерирует правильный SELECT запрос с учетом фильтров
export function buildSelectQuery(appliedFilters: AppliedFilters): string {
  const useInnerJoin = needsInnerJoinForMapping(appliedFilters)
  const joinType = useInnerJoin ? 'inner' : 'left'


  return `
    id,
    material,
    material_type,
    color,
    created_at,
    updated_at,
    unit_id,
    type_id,

    materials!chessboard_material_fkey(name),
    units!chessboard_unit_id_fkey(id, name),
    chessboard_types!chessboard_type_id_fkey(id, name),

    chessboard_mapping!${joinType}(
      cost_category_id,
      cost_type_id,
      location_id,
      block_id,
      cost_categories!chessboard_mapping_cost_category_id_fkey(name, number),
      detail_cost_categories!chessboard_mapping_cost_type_id_fkey(name),
      location!chessboard_mapping_location_id_fkey(name),
      blocks!chessboard_mapping_block_id_fkey(name)
    ),

    chessboard_nomenclature_mapping!left(
      supplier_names_id,
      conversion_coefficient,
      supplier_names!chessboard_nomenclature_mapping_supplier_names_id_fkey(
        id,
        name,
        unit_id,
        units!supplier_names_unit_id_fkey(name),
        nomenclature_supplier_mapping!nomenclature_supplier_mapping_supplier_id_fkey(
          nomenclature_id,
          nomenclature!nomenclature_supplier_mapping_nomenclature_id_fkey(
            id,
            name
          )
        )
      )
    )
  `
}

// Универсальная функция для применения серверных фильтров
export function applyServerSideFilters(query: any, appliedFilters: AppliedFilters) {
  // Логируем какие фильтры применяются
  const filtersToApply = []

  if (appliedFilters.block_ids?.length) {
    if (appliedFilters.block_ids.length > 100) {
    }
    query = query.in('chessboard_mapping.block_id', appliedFilters.block_ids)
    filtersToApply.push(`blocks: ${appliedFilters.block_ids.length}`)
  }

  if (appliedFilters.cost_category_ids?.length) {
    if (appliedFilters.cost_category_ids.length > 100) {
    }
    query = query.in('chessboard_mapping.cost_category_id', appliedFilters.cost_category_ids)
    filtersToApply.push(`cost_categories: ${appliedFilters.cost_category_ids.length}`)
  }

  if (appliedFilters.detail_cost_category_ids?.length) {
    if (appliedFilters.detail_cost_category_ids.length > 100) {
    }
    query = query.in('chessboard_mapping.cost_type_id', appliedFilters.detail_cost_category_ids)
    filtersToApply.push(`detail_categories: ${appliedFilters.detail_cost_category_ids.length}`)
  }

  if (appliedFilters.material_search) {
    query = query.ilike('materials.name', `%${appliedFilters.material_search}%`)
    filtersToApply.push(`material_search: "${appliedFilters.material_search}"`)
  }

  if (filtersToApply.length > 0) {
  }

  return query
}
