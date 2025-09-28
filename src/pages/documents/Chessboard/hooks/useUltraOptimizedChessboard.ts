// Ультра-оптимизированный хук для работы с 20K+ записями
// Устраняет N+1 запросы, реализует серверную пагинацию и минимальные батчи

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { AppliedFilters } from '../types'

// Конфигурация оптимизации
const OPTIMIZATION_CONFIG = {
  PAGE_SIZE: 100,
  BATCH_SIZE: 25, // Уменьшенный размер для предотвращения URL overflow
  CACHE_TIME: 300000, // 5 минут кеширования
  STALE_TIME: 30000, // 30 секунд актуальности
  PARALLEL_REQUESTS: 3 // Максимум параллельных запросов
} as const

interface OptimizedRowData {
  // Основные данные chessboard
  id: string
  material_id: string
  unit_id: string
  created_at: string
  updated_at: string
  cost_category_code: string | null
  color: string | null
  material_type: string

  // JOIN данные из связанных таблиц
  material_name?: string
  unit_name?: string
  cost_category_name?: string
  cost_type_name?: string
  block_name?: string
  location_name?: string
  documentation_code?: string
  documentation_tag_name?: string
  floor_number?: number
  rate_work_name?: string
}

interface PaginatedResult {
  data: OptimizedRowData[]
  totalCount: number
  pageSize: number
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// Основной хук с ультра-оптимизацией
export function useUltraOptimizedChessboard({
  appliedFilters,
  pageSize = OPTIMIZATION_CONFIG.PAGE_SIZE,
  currentPage = 1,
  enabled = true
}: {
  appliedFilters: AppliedFilters
  pageSize?: number
  currentPage?: number
  enabled?: boolean
}) {

  // Уникальный ключ для кеширования
  const queryKey = [
    'chessboard-ultra-optimized',
    appliedFilters.project_id,
    currentPage,
    pageSize,
    JSON.stringify({
      documentation_section_ids: appliedFilters.documentation_section_ids?.sort(),
      documentation_code_ids: appliedFilters.documentation_code_ids?.sort(),
      cost_category_ids: appliedFilters.cost_category_ids?.sort(),
      detail_cost_category_ids: appliedFilters.detail_cost_category_ids?.sort(),
      block_ids: appliedFilters.block_ids?.sort(),
      search_material: appliedFilters.search_material
    })
  ]

  return useQuery({
    queryKey,
    queryFn: async (): Promise<PaginatedResult> => {
      if (!appliedFilters.project_id) {
        return {
          data: [],
          totalCount: 0,
          pageSize,
          currentPage,
          hasNextPage: false,
          hasPrevPage: false
        }
      }

      console.log(`🚀 Ultra-optimized query: page ${currentPage}/${Math.ceil(20000/pageSize)} (simulated 20K)`) // LOG: начало запроса

      const queryStart = performance.now() // LOG: время начала

      try {
        // ЭТАП 1: Получение отфильтрованных chessboard_ids с минимальными данными
        const filteredIds = await getFilteredChessboardIds(appliedFilters)

        if (filteredIds.length === 0) {
          return {
            data: [],
            totalCount: 0,
            pageSize,
            currentPage,
            hasNextPage: false,
            hasPrevPage: false
          }
        }

        console.log(`📊 Filtered to ${filteredIds.length} records`) // LOG: количество отфильтрованных

        // ЭТАП 2: Пагинация на уровне ID
        const totalCount = filteredIds.length
        const offset = (currentPage - 1) * pageSize
        const pageIds = filteredIds.slice(offset, offset + pageSize)

        console.log(`📋 Page ${currentPage}: ${pageIds.length} records (${offset}-${offset + pageIds.length})`) // LOG: пагинация

        // ЭТАП 3: Получение полных данных с большим JOIN запросом
        const fullData = await getFullChessboardData(pageIds, appliedFilters.project_id)

        const queryEnd = performance.now() // LOG: время завершения
        const queryDuration = queryEnd - queryStart // LOG: длительность

        console.log(`✅ Ultra-optimized query completed in ${Math.round(queryDuration)}ms`) // LOG: результат

        return {
          data: fullData,
          totalCount,
          pageSize,
          currentPage,
          hasNextPage: offset + pageSize < totalCount,
          hasPrevPage: currentPage > 1
        }

      } catch (error) {
        console.error('❌ Ultra-optimized query error:', error) // LOG: ошибка
        throw error
      }
    },
    enabled: enabled && !!appliedFilters.project_id,
    staleTime: OPTIMIZATION_CONFIG.STALE_TIME,
    gcTime: OPTIMIZATION_CONFIG.CACHE_TIME,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

// Функция получения отфильтрованных ID (быстрый запрос без JOIN)
async function getFilteredChessboardIds(appliedFilters: AppliedFilters): Promise<string[]> {
  let baseIds: string[] = []

  // Фильтрация по документации (если есть)
  const hasDocumentationFilter = (appliedFilters.documentation_section_ids?.length || 0) > 0 ||
                                 (appliedFilters.documentation_code_ids?.length || 0) > 0

  if (hasDocumentationFilter) {
    console.log('🔍 Applying documentation filter...') // LOG: фильтр документации

    const docQuery = supabase
      .from('chessboard_documentation_mapping')
      .select(`
        chessboard_id,
        documentation_versions!inner(
          documentation_id,
          documentations!inner(id, tag_id)
        )
      `)

    // Добавляем фильтры документации
    if (appliedFilters.documentation_section_ids?.length) {
      docQuery.in('documentation_versions.documentations.tag_id', appliedFilters.documentation_section_ids)
    }
    if (appliedFilters.documentation_code_ids?.length) {
      docQuery.in('documentation_versions.documentations.id', appliedFilters.documentation_code_ids)
    }

    const { data: docData, error: docError } = await docQuery

    if (docError) {
      console.error('Documentation filter error:', docError)
      throw docError
    }

    baseIds = [...new Set(docData?.map(d => d.chessboard_id) || [])]
    console.log(`📄 Documentation filter: ${baseIds.length} IDs`) // LOG: результат фильтра документации
  } else {
    // Без фильтра документации - получаем все ID проекта
    const { data: allIds, error } = await supabase
      .from('chessboard')
      .select('id')
      .eq('project_id', appliedFilters.project_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    baseIds = allIds?.map(row => row.id) || []
    console.log(`📊 All project IDs: ${baseIds.length}`) // LOG: все ID проекта
  }

  // Применяем фильтры по категориям затрат (если есть)
  const hasCostFilter = (appliedFilters.cost_category_ids?.length || 0) > 0 ||
                        (appliedFilters.detail_cost_category_ids?.length || 0) > 0 ||
                        (appliedFilters.block_ids?.length || 0) > 0

  if (hasCostFilter && baseIds.length > 0) {
    console.log('🔍 Applying cost category filter...') // LOG: фильтр категорий

    // Обрабатываем маленькими батчами для предотвращения URL overflow
    const filteredIds: string[] = []
    const batchSize = OPTIMIZATION_CONFIG.BATCH_SIZE

    for (let i = 0; i < baseIds.length; i += batchSize) {
      const batch = baseIds.slice(i, i + batchSize)

      const costQuery = supabase
        .from('chessboard_mapping')
        .select('chessboard_id')
        .in('chessboard_id', batch)

      if (appliedFilters.cost_category_ids?.length) {
        costQuery.in('cost_category_id', appliedFilters.cost_category_ids)
      }
      if (appliedFilters.detail_cost_category_ids?.length) {
        costQuery.in('cost_type_id', appliedFilters.detail_cost_category_ids)
      }
      if (appliedFilters.block_ids?.length) {
        costQuery.in('block_id', appliedFilters.block_ids)
      }

      const { data: costData } = await costQuery

      if (costData) {
        filteredIds.push(...costData.map(row => row.chessboard_id))
      }
    }

    baseIds = [...new Set(filteredIds)]
    console.log(`💰 Cost filter: ${baseIds.length} IDs`) // LOG: результат фильтра категорий
  }

  return baseIds
}

// Функция получения полных данных с большим JOIN (консолидированный запрос)
async function getFullChessboardData(chessboardIds: string[], projectId: string): Promise<OptimizedRowData[]> {
  if (chessboardIds.length === 0) return []

  console.log(`🔗 Getting full data for ${chessboardIds.length} records...`) // LOG: получение полных данных

  const joinStart = performance.now() // LOG: время начала JOIN

  // Один большой запрос с LEFT JOIN всех нужных таблиц
  const { data, error } = await supabase
    .from('chessboard')
    .select(`
      id,
      material,
      unit_id,
      created_at,
      updated_at,
      cost_category_code,
      color,
      material_type,
      materials!chessboard_material_fkey(name),
      units!chessboard_unit_id_fkey(name),
      chessboard_mapping!left(
        cost_category_id,
        cost_type_id,
        block_id,
        location_id,
        cost_categories!chessboard_mapping_cost_category_id_fkey(name),
        detail_cost_categories!chessboard_mapping_cost_type_id_fkey(name),
        blocks!chessboard_mapping_block_id_fkey(name),
        location!chessboard_mapping_location_id_fkey(name)
      ),
      chessboard_documentation_mapping!left(
        documentation_versions!left(
          documentations!left(
            code,
            documentation_tags!left(name)
          )
        )
      ),
      chessboard_floor_mapping!left(
        floor_number,
        location!chessboard_floor_mapping_location_id_fkey(name)
      ),
      chessboard_rates_mapping!left(
        rates!left(work_name)
      )
    `)
    .eq('project_id', projectId)
    .in('id', chessboardIds)
    .order('created_at', { ascending: false })

  const joinEnd = performance.now() // LOG: время завершения JOIN
  const joinDuration = joinEnd - joinStart // LOG: длительность JOIN

  if (error) {
    console.error('❌ Full data JOIN error:', error) // LOG: ошибка JOIN
    throw error
  }

  console.log(`✅ Full JOIN completed in ${Math.round(joinDuration)}ms for ${data?.length || 0} records`) // LOG: результат JOIN

  // Трансформируем данные в плоскую структуру
  return (data || []).map(row => {
    const mapping = Array.isArray(row.chessboard_mapping) ? row.chessboard_mapping[0] : row.chessboard_mapping
    const documentation = Array.isArray(row.chessboard_documentation_mapping)
      ? row.chessboard_documentation_mapping[0]?.documentation_versions?.documentations
      : row.chessboard_documentation_mapping?.documentation_versions?.documentations
    const floor = Array.isArray(row.chessboard_floor_mapping) ? row.chessboard_floor_mapping[0] : row.chessboard_floor_mapping
    const rates = Array.isArray(row.chessboard_rates_mapping) ? row.chessboard_rates_mapping[0]?.rates : row.chessboard_rates_mapping?.rates

    return {
      id: row.id,
      material_id: row.material,
      unit_id: row.unit_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      cost_category_code: row.cost_category_code,
      color: row.color,
      material_type: row.material_type,

      // JOIN данные
      material_name: row.materials?.name,
      unit_name: row.units?.name,
      cost_category_name: mapping?.cost_categories?.name,
      cost_type_name: mapping?.detail_cost_categories?.name,
      block_name: mapping?.blocks?.name,
      location_name: mapping?.location?.name,
      documentation_code: documentation?.code,
      documentation_tag_name: documentation?.documentation_tags?.name,
      floor_number: floor?.floor_number,
      rate_work_name: rates?.work_name
    }
  })
}

// Хук для мониторинга производительности
export function usePerformanceMonitor() {
  return useMemo(() => ({
    batchSize: OPTIMIZATION_CONFIG.BATCH_SIZE,
    pageSize: OPTIMIZATION_CONFIG.PAGE_SIZE,
    cacheTime: OPTIMIZATION_CONFIG.CACHE_TIME,
    estimatedPagesFor20K: Math.ceil(20000 / OPTIMIZATION_CONFIG.PAGE_SIZE),

    logPerformance: (operation: string, duration: number, recordCount: number) => {
      const rate = recordCount / (duration / 1000)
      console.log(`📊 ${operation}: ${recordCount} records in ${Math.round(duration)}ms (${Math.round(rate)} records/sec)`) // LOG: производительность

      if (duration > 3000) {
        console.warn(`⚠️ Slow operation: ${operation} took ${Math.round(duration)}ms`) // LOG: медленная операция
      }
    }
  }), [])
}