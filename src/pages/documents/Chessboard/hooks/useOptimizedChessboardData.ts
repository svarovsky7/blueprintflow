// Оптимизированный хук для работы с 20K+ записями Chessboard
// Устраняет N+1 запросы и реализует эффективную серверную пагинацию

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { AppliedFilters } from '../types'

// Типы для оптимизированного API
interface OptimizedChessboardRow {
  id: string
  material: string // UUID ссылка на materials
  unit_id: string // UUID ссылка на units
  created_at: string
  updated_at: string
  cost_category_code: string | null
  color: string | null
  material_type: string
  mapping_data: any[]
  documentation_data: any[]
  floor_data: any[]
  rates_data: any[]
  total_count: number
}

interface PagedResult {
  data: OptimizedChessboardRow[]
  totalCount: number
  pageSize: number
  currentPage: number
  totalPages: number
}

interface UseOptimizedChessboardDataProps {
  appliedFilters: AppliedFilters
  pageSize?: number
  currentPage?: number
  enabled?: boolean
}

// Главный хук для получения данных страницы
export function useOptimizedChessboardData({
  appliedFilters,
  pageSize = 100,
  currentPage = 1,
  enabled = true
}: UseOptimizedChessboardDataProps) {

  const queryKey = [
    'chessboard-optimized',
    appliedFilters.project_id,
    currentPage,
    pageSize,
    appliedFilters.documentation_section_ids,
    appliedFilters.documentation_code_ids,
    appliedFilters.cost_category_ids,
    appliedFilters.detail_cost_category_ids,
    appliedFilters.block_ids,
    appliedFilters.search_material
  ]

  return useQuery({
    queryKey,
    queryFn: async (): Promise<PagedResult> => {
      if (!appliedFilters.project_id) {
        return {
          data: [],
          totalCount: 0,
          pageSize,
          currentPage,
          totalPages: 0
        }
      }


      const startTime = performance.now()

      const offset = (currentPage - 1) * pageSize

      // Вызываем оптимизированную функцию PostgreSQL
      const { data, error } = await supabase
        .rpc('get_chessboard_page', {
          p_project_id: appliedFilters.project_id,
          p_page_size: pageSize,
          p_offset: offset,
          p_documentation_section_ids: appliedFilters.documentation_section_ids || null,
          p_documentation_code_ids: appliedFilters.documentation_code_ids || null,
          p_cost_category_ids: appliedFilters.cost_category_ids || null,
          p_detail_cost_category_ids: appliedFilters.detail_cost_category_ids || null,
          p_block_ids: appliedFilters.block_ids || null,
          p_search_material: appliedFilters.search_material || null
        })

      const endTime = performance.now()
      const duration = endTime - startTime

      if (error) {
        throw error
      }

      const totalCount = data?.[0]?.total_count || 0
      const totalPages = Math.ceil(totalCount / pageSize)


      return {
        data: data || [],
        totalCount,
        pageSize,
        currentPage,
        totalPages
      }
    },
    enabled: enabled && !!appliedFilters.project_id,
    staleTime: 30000, // 30 секунд - кеширование для быстрого переключения страниц
    gcTime: 300000 // 5 минут - сохранение в памяти
  })
}

// Хук для получения статистики фильтрации (для UI индикаторов)
export function useChessboardFilterStats({
  appliedFilters,
  enabled = true
}: {
  appliedFilters: AppliedFilters
  enabled?: boolean
}) {

  return useQuery({
    queryKey: ['chessboard-filter-stats', appliedFilters.project_id, appliedFilters],
    queryFn: async () => {
      if (!appliedFilters.project_id) {
        return {
          total_records: 0,
          documentation_filtered: 0,
          cost_category_filtered: 0,
          final_filtered: 0
        }
      }

      const { data, error } = await supabase
        .rpc('get_chessboard_filter_stats', {
          p_project_id: appliedFilters.project_id,
          p_documentation_section_ids: appliedFilters.documentation_section_ids || null,
          p_documentation_code_ids: appliedFilters.documentation_code_ids || null,
          p_cost_category_ids: appliedFilters.cost_category_ids || null,
          p_detail_cost_category_ids: appliedFilters.detail_cost_category_ids || null,
          p_block_ids: appliedFilters.block_ids || null
        })

      if (error) {
        console.error('Error loading filter stats:', error)
        throw error
      }

      return data?.[0] || {
        total_records: 0,
        documentation_filtered: 0,
        cost_category_filtered: 0,
        final_filtered: 0
      }
    },
    enabled: enabled && !!appliedFilters.project_id,
    staleTime: 60000 // 1 минута кеширования для статистики
  })
}

// Хук для экспорта данных (получает все ID без пагинации)
export function useChessboardExportIds({
  appliedFilters,
  enabled = false // По умолчанию отключен, включается только при экспорте
}: {
  appliedFilters: AppliedFilters
  enabled?: boolean
}) {

  return useQuery({
    queryKey: ['chessboard-export-ids', appliedFilters],
    queryFn: async (): Promise<string[]> => {
      if (!appliedFilters.project_id) {
        return []
      }


      const startTime = performance.now()

      const { data, error } = await supabase
        .rpc('get_chessboard_ids_filtered', {
          p_project_id: appliedFilters.project_id,
          p_documentation_section_ids: appliedFilters.documentation_section_ids || null,
          p_documentation_code_ids: appliedFilters.documentation_code_ids || null,
          p_cost_category_ids: appliedFilters.cost_category_ids || null,
          p_detail_cost_category_ids: appliedFilters.detail_cost_category_ids || null,
          p_block_ids: appliedFilters.block_ids || null,
          p_search_material: appliedFilters.search_material || null
        })

      const endTime = performance.now()
      const duration = endTime - startTime

      if (error) {
        throw error
      }


      return data || []
    },
    enabled: enabled && !!appliedFilters.project_id,
    staleTime: 0, // Всегда получаем свежие данные для экспорта
    gcTime: 0 // Не кешируем данные экспорта
  })
}

// Трансформация оптимизированных данных в формат для таблицы
export function useTransformedChessboardData(pagedResult: PagedResult | undefined) {
  return useMemo(() => {
    if (!pagedResult?.data) return []


    return pagedResult.data.map((row) => {
      // Извлекаем данные из JSON полей
      const mapping = Array.isArray(row.mapping_data) ? row.mapping_data[0] : null
      const documentation = Array.isArray(row.documentation_data) ? row.documentation_data[0] : null
      const floor = Array.isArray(row.floor_data) ? row.floor_data[0] : null
      const rates = Array.isArray(row.rates_data) ? row.rates_data[0] : null

      return {
        key: row.id,
        id: row.id,
        material: row.material, // UUID материала
        unit_id: row.unit_id, // UUID единицы измерения
        created_at: row.created_at,
        updated_at: row.updated_at,
        cost_category_code: row.cost_category_code,
        color: row.color,
        material_type: row.material_type,

        // Mapping данные
        cost_category_id: mapping?.cost_category_id,
        cost_category_name: mapping?.cost_category_name,
        cost_category_number: mapping?.cost_category_number,
        cost_type_id: mapping?.cost_type_id,
        cost_type_name: mapping?.cost_type_name,
        block_id: mapping?.block_id,
        block_name: mapping?.block_name,
        location_id: mapping?.location_id,
        location_name: mapping?.location_name,

        // Документация
        documentation_id: documentation?.documentation_id,
        documentation_code: documentation?.code,
        documentation_project_name: documentation?.project_name,
        documentation_tag_name: documentation?.tag_name,
        documentation_version: documentation?.version_number,

        // Этажи
        floor_number: floor?.floor_number,
        floor_location_name: floor?.location_name,
        quantityPd: floor?.quantityPd,
        quantitySpec: floor?.quantitySpec,
        quantityRd: floor?.quantityRd,

        // Расценки
        rate_id: rates?.rate_id,
        work_name: rates?.work_name,
        work_set: rates?.work_set,
        base_rate: rates?.base_rate,
        rate_unit_name: rates?.unit_name
      }
    })
  }, [pagedResult?.data])
}

// Хелпер для работы с пагинацией
export function usePaginationHelpers(
  totalCount: number,
  pageSize: number,
  currentPage: number
) {
  return useMemo(() => {
    const totalPages = Math.ceil(totalCount / pageSize)
    const hasNextPage = currentPage < totalPages
    const hasPrevPage = currentPage > 1
    const startIndex = (currentPage - 1) * pageSize + 1
    const endIndex = Math.min(currentPage * pageSize, totalCount)

    return {
      totalPages,
      hasNextPage,
      hasPrevPage,
      startIndex,
      endIndex,
      isFirstPage: currentPage === 1,
      isLastPage: currentPage === totalPages
    }
  }, [totalCount, pageSize, currentPage])
}