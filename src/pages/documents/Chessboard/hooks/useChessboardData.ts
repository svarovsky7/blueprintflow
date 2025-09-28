import { useMemo, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AppliedFilters, ViewRow, DbRow, RowData } from '../types'

interface UseChessboardDataProps {
  appliedFilters: AppliedFilters
  enabled?: boolean
}

// Проверяет, нужен ли INNER JOIN для chessboard_mapping
function needsInnerJoinForMapping(appliedFilters: AppliedFilters): boolean {
  return !!(
    appliedFilters.block_ids?.length ||
    appliedFilters.cost_category_ids?.length ||
    appliedFilters.detail_cost_category_ids?.length
  )
}

// Генерирует правильный SELECT запрос с учетом фильтров
function buildSelectQuery(appliedFilters: AppliedFilters): string {
  const useInnerJoin = needsInnerJoinForMapping(appliedFilters)
  const joinType = useInnerJoin ? 'inner' : 'left'


  return `
    id,
    material,
    color,
    created_at,
    updated_at,
    unit_id,

    materials!chessboard_material_fkey(name),
    units!chessboard_unit_id_fkey(name),

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
      nomenclature_id,
      supplier_name,
      nomenclature!chessboard_nomenclature_mapping_nomenclature_id_fkey(name)
    )
  `
}

// Универсальная функция для применения серверных фильтров
function applyServerSideFilters(query: any, appliedFilters: AppliedFilters) {
  // Логируем какие фильтры применяются
  const filtersToApply = []

  if (appliedFilters.block_ids?.length) {
    if (appliedFilters.block_ids.length > 100) { // LOG: защита от URL overflow для блоков
      console.warn(`⚠️ Block filter: ${appliedFilters.block_ids.length} IDs > 100, consider pagination`) // LOG
    }
    query = query.in('chessboard_mapping.block_id', appliedFilters.block_ids)
    filtersToApply.push(`blocks: ${appliedFilters.block_ids.length}`)
  }

  if (appliedFilters.cost_category_ids?.length) {
    if (appliedFilters.cost_category_ids.length > 100) { // LOG: защита от URL overflow для категорий затрат
      console.warn(`⚠️ Cost category filter: ${appliedFilters.cost_category_ids.length} IDs > 100, consider pagination`) // LOG
    }
    query = query.in('chessboard_mapping.cost_category_id', appliedFilters.cost_category_ids)
    filtersToApply.push(`cost_categories: ${appliedFilters.cost_category_ids.length}`)
  }

  if (appliedFilters.detail_cost_category_ids?.length) {
    if (appliedFilters.detail_cost_category_ids.length > 100) { // LOG: защита от URL overflow для видов затрат
      console.warn(`⚠️ Detail cost category filter: ${appliedFilters.detail_cost_category_ids.length} IDs > 100, consider pagination`) // LOG
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

export const useChessboardData = ({ appliedFilters, enabled = true }: UseChessboardDataProps) => {
  // PERFORMANCE MONITORING: Отслеживание рендеров только при превышении лимита
  const renderCountRef = useRef(0)
  renderCountRef.current += 1

  // LOG: предупреждение только при слишком частых рендерах
  if (renderCountRef.current > 10) {
    console.warn(`⚠️ useChessboardData render #${renderCountRef.current} - слишком много рендеров!`) // LOG
  }

  // Состояние для хранения результата batch processing
  const [filteredRawData, setFilteredRawData] = useState<any[] | null>(null)

  // ИСПРАВЛЕНИЕ: Стабилизируем queryKey для предотвращения бесконечного рендеринга
  const stableQueryKey = useMemo(() => {
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Предварительно стабилизируем массивы только один раз
    const stableBlockIds = appliedFilters.block_ids ? [...appliedFilters.block_ids].sort().join(',') : 'no-blocks'
    const stableCostCategoryIds = appliedFilters.cost_category_ids ? [...appliedFilters.cost_category_ids].sort().join(',') : 'no-cost-categories'
    const stableDetailCategoryIds = appliedFilters.detail_cost_category_ids ? [...appliedFilters.detail_cost_category_ids].sort().join(',') : 'no-detail-categories'
    const stableDocSectionIds = appliedFilters.documentation_section_ids ? [...appliedFilters.documentation_section_ids].sort().join(',') : 'no-doc-sections'
    const stableDocCodeIds = appliedFilters.documentation_code_ids ? [...appliedFilters.documentation_code_ids].sort().join(',') : 'no-doc-codes'

    const newQueryKey = [
      'chessboard-data',
      appliedFilters.project_id || 'no-project',
      stableBlockIds,
      stableCostCategoryIds,
      stableDetailCategoryIds,
      stableDocSectionIds,
      stableDocCodeIds,
      appliedFilters.material_search || 'no-search',
    ]

    // LOG: QueryKey только при первых 3 рендерах или при проблемах (> 10)
    if (renderCountRef.current <= 3 || renderCountRef.current > 10) {
      console.log(`🔑 QueryKey generated for render #${renderCountRef.current}:`, newQueryKey) // LOG
    }

    return newQueryKey
  }, [
    appliedFilters.project_id,
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Используем JSON.stringify для стабильного сравнения массивов
    JSON.stringify(appliedFilters.block_ids?.slice().sort() || []),
    JSON.stringify(appliedFilters.cost_category_ids?.slice().sort() || []),
    JSON.stringify(appliedFilters.detail_cost_category_ids?.slice().sort() || []),
    JSON.stringify(appliedFilters.documentation_section_ids?.slice().sort() || []),
    JSON.stringify(appliedFilters.documentation_code_ids?.slice().sort() || []),
    appliedFilters.material_search,
  ])

  // Основной запрос данных шахматки
  const {
    data: rawData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: stableQueryKey,
    queryFn: async () => {
      const queryStartTime = performance.now() // LOG: время начала основного запроса

      if (!appliedFilters.project_id) {
        return []
      }

      const startTime = performance.now() // LOG: замер времени

      // Строим запрос с серверной фильтрацией для производительности
      let query = supabase
        .from('chessboard')
        .select(buildSelectQuery(appliedFilters))
        .eq('project_id', appliedFilters.project_id)

      // Применяем серверные фильтры для производительности
      query = applyServerSideFilters(query, appliedFilters)

      // Фильтрация по документации требует подзапроса из-за сложной связи
      if (
        appliedFilters.documentation_section_ids?.length ||
        appliedFilters.documentation_code_ids?.length
      ) {
        console.log('📄 Starting documentation filtering with:', {
          section_ids: appliedFilters.documentation_section_ids,
          code_ids: appliedFilters.documentation_code_ids
        }) // LOG: параметры фильтрации документации

        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Правильный запрос с INNER JOIN для фильтрации только существующих chessboard записей

        let docQuery = supabase
          .from('chessboard_documentation_mapping')
          .select(`
            chessboard_id,
            chessboard!inner(project_id),
            documentation_versions!inner(
              documentation_id,
              documentations!inner(
                id, code, tag_id,
                documentation_tags!inner(id, name)
              )
            )
          `)
          .eq('chessboard.project_id', appliedFilters.project_id) // Фильтрация по проекту для производительности

        // Применяем фильтры по документации
        if (appliedFilters.documentation_code_ids?.length) {
          if (appliedFilters.documentation_code_ids.length > 100) { // LOG: защита от URL overflow для документов
            console.warn(`⚠️ Documentation filter: ${appliedFilters.documentation_code_ids.length} IDs > 100, consider pagination`) // LOG
          }
          docQuery = docQuery.in('documentation_versions.documentation_id', appliedFilters.documentation_code_ids)
        }

        if (appliedFilters.documentation_section_ids?.length) {
          if (appliedFilters.documentation_section_ids.length > 100) { // LOG: защита от URL overflow для разделов документации
            console.warn(`⚠️ Documentation section filter: ${appliedFilters.documentation_section_ids.length} IDs > 100, consider pagination`) // LOG
          }
          docQuery = docQuery.in('documentation_versions.documentations.tag_id', appliedFilters.documentation_section_ids)
        }

        // Выполняем подзапрос для получения chessboard_id
        const { data: docIds, error: docError } = await docQuery

        if (docError) {
          console.error('❌ Error filtering by documentation:', docError)
        } else if (docIds && docIds.length > 0) {

          // Отладочная информация: показать разделы в результате
          const sections = new Set()
          docIds.forEach(item => {
            const tagName = item.documentation_versions?.documentations?.documentation_tags?.name
            if (tagName) sections.add(tagName)
          })

          // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Убираем дубликаты chessboard_id (одна запись может иметь несколько версий документов)
          const chessboardIds = [...new Set(docIds.map((d) => d.chessboard_id))]

          // Если ID слишком много, используем батчинг
          if (chessboardIds.length > 50) {
            // Выполняем запросы батчами по 50 ID для предотвращения переполнения URL
            const batchSize = 50
            let allResults: any[] = []
            const totalBatches = Math.ceil(chessboardIds.length / batchSize)
            // LOG: предупреждение только для больших батчей
            if (totalBatches > 10) {
              console.warn(`⚠️ Large batch processing: ${totalBatches} batches for ${chessboardIds.length} IDs`) // LOG
            }

            for (let i = 0; i < chessboardIds.length; i += batchSize) {
              const batch = chessboardIds.slice(i, i + batchSize)
              const batchNumber = Math.floor(i/batchSize) + 1

              const batchStartTime = performance.now() // LOG: время начала батча
              let batchQuery = supabase
                .from('chessboard')
                .select(buildSelectQuery(appliedFilters))
                .eq('project_id', appliedFilters.project_id)
                .in('id', batch)

              // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Применяем серверные фильтры к batch запросу
              batchQuery = applyServerSideFilters(batchQuery, appliedFilters)

              batchQuery = batchQuery
                .limit(1000)
                .order('created_at', { ascending: false })
                .order('id', { ascending: false })

              const { data: batchData, error: batchError } = await batchQuery

              const batchEndTime = performance.now() // LOG: время завершения батча
              const batchDuration = batchEndTime - batchStartTime // LOG: длительность батча

              // LOG: логируем только медленные батчи
              if (batchDuration > 1000) {
                console.warn(`⏱️ Slow batch ${batchNumber}: ${Math.round(batchDuration)}ms, ${batchData?.length || 0} records`) // LOG
              }

              if (batchError) {
                console.error('❌ Error in batch query:', batchError) // LOG
                // Проверяем, связана ли ошибка с длиной URL
                if (batchError.message?.includes('URI') || batchError.message?.includes('414')) {
                  console.warn('⚠️ URL length error detected, consider reducing batch size further') // LOG
                }
                continue
              }

              if (batchData) {
                allResults = [...allResults, ...batchData]
              }
            }

            setFilteredRawData(allResults as DbRow[])
            return allResults as DbRow[]
          } else {
            // Если ID не слишком много, используем обычный запрос
            query = query.in('id', chessboardIds)

            // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Применяем серверные фильтры к малому batch запросу
            query = applyServerSideFilters(query, appliedFilters)

            query = query
              .limit(1000)
              .order('created_at', { ascending: false })
              .order('id', { ascending: false })

            const { data, error } = await query

            if (error) {
              console.error('❌ Chessboard query failed:', error) // LOG: ошибка запроса
              throw error
            }

            const endTime = performance.now() // LOG: замер времени
            const executionTime = Math.round(endTime - startTime)

            setFilteredRawData(data as DbRow[])
            return data as DbRow[]
          }
        } else {
          // Если документация не найдена, возвращаем пустой результат
          return []
        }
      } else {
        // Если нет фильтра по документации, выполняем обычный запрос
        query = query
          .limit(1000) // ОПТИМИЗАЦИЯ: увеличен с 500 до 1000 для лучшей производительности с большими данными
          .order('created_at', { ascending: false })
          .order('id', { ascending: false }) // Стабильная сортировка

        const { data, error } = await query

        if (error) {
          console.error('❌ Chessboard query failed:', error) // LOG: ошибка запроса
          throw error
        }

        const endTime = performance.now() // LOG: замер времени
        const executionTime = Math.round(endTime - queryStartTime)

        // LOG: отчет о производительности для оценки времени загрузки таблицы
        console.log(`⚡ Chessboard table loaded in ${executionTime}ms, records: ${data?.length || 0}`) // LOG: время загрузки таблицы

        // LOG: предупреждение только при медленных запросах
        if (executionTime > 3000) {
          console.warn(`⚠️ Slow query: ${executionTime}ms for ${data?.length || 0} records`) // LOG
        }
        setFilteredRawData(null)
        return data as DbRow[]
      }
    },
    enabled: enabled && !!appliedFilters.project_id,
  })

  // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Убираем циклическую зависимость - НЕ зависим от rawData или filteredRawData
  const stableDocQueryKey = useMemo(
    () => [
      'chessboard-documentation',
      appliedFilters.project_id || 'no-project',
      // ИСПРАВЛЕНИЕ: Используем только appliedFilters для стабильности, без зависимости от данных
      appliedFilters.documentation_code_ids ? [...appliedFilters.documentation_code_ids].sort().join(',') : 'no-doc-codes',
      appliedFilters.documentation_section_ids ? [...appliedFilters.documentation_section_ids].sort().join(',') : 'no-doc-sections',
    ],
    [
      appliedFilters.project_id,
      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Используем JSON.stringify для стабильного сравнения
      JSON.stringify(appliedFilters.documentation_code_ids?.slice().sort() || []),
      JSON.stringify(appliedFilters.documentation_section_ids?.slice().sort() || [])
    ],
  )

  // Отдельный запрос для данных документации
  const { data: documentationData } = useQuery({
    queryKey: stableDocQueryKey,
    queryFn: async () => {
      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: используем правильный источник данных
      const dataSource = filteredRawData || rawData
      if (!appliedFilters.project_id || !dataSource?.length) {
        return []
      }

      const chessboardIds = dataSource.map((row) => row.id)

      // КРИТИЧНО: Защита от URL overflow через батчинг
      if (chessboardIds.length > 200) {
        console.warn(`⚠️ Documentation query: ${chessboardIds.length} IDs > 200, using batching`) // LOG: предупреждение о батчинге
      }

      // ИСПРАВЛЕНИЕ: Батчинг для предотвращения URL overflow
      const BATCH_SIZE = 200
      const allDocumentationData: any[] = []

      for (let i = 0; i < chessboardIds.length; i += BATCH_SIZE) {
        const batch = chessboardIds.slice(i, i + BATCH_SIZE)

        const { data, error } = await supabase
          .from('chessboard_documentation_mapping')
          .select(
            `
            chessboard_id,
            version_id,
            documentation_versions!fk_chessboard_documentation_mapping_version(
              version_number,
              documentation_id,
              documentations!documentation_versions_documentation_id_fkey(
                code,
                project_name,
                tag_id,
                documentation_tags!documentation_codes_tag_id_fkey(tag_number, name)
              )
            )
          `,
          )
          .in('chessboard_id', batch)

        if (error) {
          console.error(`❌ Documentation batch ${Math.floor(i/BATCH_SIZE) + 1} failed:`, error) // LOG: ошибка батча
          continue // Продолжаем с другими батчами
        }

        if (data?.length) {
          allDocumentationData.push(...data)
        }
      }
      return allDocumentationData
    },
    enabled: enabled && !!appliedFilters.project_id && !!(filteredRawData || rawData),
  })

  // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Стабилизируем queryKey для этажей БЕЗ циклической зависимости
  const stableFloorsQueryKey = useMemo(
    () => [
      'chessboard-floors',
      appliedFilters.project_id || 'no-project',
      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Не зависим от rawData для предотвращения бесконечного рендеринга
      stableQueryKey.join('|') // Используем стабильный ключ основного запроса
    ],
    [appliedFilters.project_id, stableQueryKey.join('|')], // ИСПРАВЛЕНИЕ: убираем зависимость от rawData
  )

  // Отдельный запрос для данных этажей с батчингом
  const { data: floorsData } = useQuery({
    queryKey: stableFloorsQueryKey,
    queryFn: async () => {
      if (!appliedFilters.project_id || !rawData?.length) {
        return []
      }

      const chessboardIds = rawData.map((row) => row.id)
      const batchSize = 200 // Батчинг для производительности и предотвращения переполнения URL
      let allFloorsData: any[] = []

      // Загружаем данные этажей батчами
      for (let i = 0; i < chessboardIds.length; i += batchSize) {
        const batch = chessboardIds.slice(i, i + batchSize)
        const { data: batchData, error: floorsError } = await supabase
          .from('chessboard_floor_mapping')
          .select(
            'chessboard_id, floor_number, location_id, "quantityPd", "quantitySpec", "quantityRd"',
          )
          .in('chessboard_id', batch)
          .order('floor_number', { ascending: true })

        if (floorsError) {
          console.error('Error loading floors data batch:', floorsError)
          continue
        }

        if (batchData) {
          allFloorsData = [...allFloorsData, ...batchData]
        }
      }

      return allFloorsData
    },
    enabled: enabled && !!appliedFilters.project_id,
  })

  // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Стабилизируем queryKey для расценок БЕЗ циклической зависимости
  const stableRatesQueryKey = useMemo(
    () => [
      'chessboard-rates',
      appliedFilters.project_id || 'no-project',
      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Не зависим от rawData для предотвращения бесконечного рендеринга
      stableQueryKey.join('|') // Используем стабильный ключ основного запроса
    ],
    [appliedFilters.project_id, stableQueryKey.join('|')], // ИСПРАВЛЕНИЕ: убираем зависимость от rawData
  )

  // Отдельный запрос для данных расценок
  const { data: ratesData } = useQuery({
    queryKey: stableRatesQueryKey,
    queryFn: async () => {
      if (!appliedFilters.project_id || !rawData?.length) {
        return []
      }

      const chessboardIds = rawData.map((row) => row.id)
      const batchSize = 200 // Батчинг для производительности и предотвращения переполнения URL
      let allRatesData: any[] = []

      // Загружаем данные расценок батчами
      for (let i = 0; i < chessboardIds.length; i += batchSize) {
        const batch = chessboardIds.slice(i, i + batchSize)
        const { data: batchData, error: ratesError } = await supabase
          .from('chessboard_rates_mapping')
          .select(
            `
            chessboard_id,
            rates!chessboard_rates_mapping_rate_id_fkey(
              id,
              work_name,
              work_set,
              base_rate,
              unit:units(name)
            )
          `,
          )
          .in('chessboard_id', batch)

        if (ratesError) {
          console.error('Error loading rates batch:', ratesError)
          continue
        }

        if (batchData) {
          allRatesData.push(...batchData)
        }
      }

      const data = allRatesData
      const error = null

      if (error) {
        console.error('Error loading rates data:', error)
        return []
      }

      return data || []
    },
    enabled: enabled && !!appliedFilters.project_id,
  })

  // ИСПРАВЛЕНИЕ: Оптимизируем зависимости useMemo для стабильности
  const transformedData = useMemo((): RowData[] => {
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: используем правильный источник данных
    const dataToProcess = filteredRawData || rawData
    if (!dataToProcess) return []

    // LOG: критическое предупреждение только для больших объемов
    if (dataToProcess.length > 1000) {
      console.warn(`⚠️ Processing large dataset: ${dataToProcess.length} rows`) // LOG: предупреждение о больших данных
    }

    // ОПТИМИЗАЦИЯ: создаем индексы для O(1) поиска вместо O(n) для каждой строки
    const docMappingIndex = new Map()
    documentationData?.forEach((doc) => {
      docMappingIndex.set(doc.chessboard_id, doc)
    })

    const floorsByChessboardId = new Map()
    floorsData?.forEach((fd) => {
      if (!floorsByChessboardId.has(fd.chessboard_id)) {
        floorsByChessboardId.set(fd.chessboard_id, [])
      }
      floorsByChessboardId.get(fd.chessboard_id).push(fd)
    })

    const ratesMappingIndex = new Map()
    ratesData?.forEach((rate) => {
      ratesMappingIndex.set(rate.chessboard_id, rate)
    })

    return dataToProcess.map((row: any, index: number) => {
      // Извлекаем данные из маппингов
      const mapping = Array.isArray(row.chessboard_mapping)
        ? row.chessboard_mapping[0]
        : row.chessboard_mapping
      const nomenclatureMapping = Array.isArray(row.chessboard_nomenclature_mapping)
        ? row.chessboard_nomenclature_mapping[0]
        : row.chessboard_nomenclature_mapping

      // ОПТИМИЗАЦИЯ: используем индексы для O(1) поиска вместо find/filter
      const docMapping = docMappingIndex.get(row.id)
      const documentation = docMapping?.documentation_versions?.documentations
      const docTag = documentation?.documentation_tags


      const rowFloorsData = floorsByChessboardId.get(row.id) || []

      const rateMapping = ratesMappingIndex.get(row.id)
      const workName = rateMapping?.rates?.work_name || ''
      const rateId = rateMapping?.rates?.id || ''
      const workUnit = rateMapping?.rates?.unit?.name || ''

      // ОПТИМИЗАЦИЯ: агрегируем количества и формируем данные этажей в одном проходе
      let totalQuantityPd = 0
      let totalQuantitySpec = 0
      let totalQuantityRd = 0
      const floorNumbers: number[] = []
      const floorQuantities: Record<
        number,
        { quantityPd: string; quantitySpec: string; quantityRd: string }
      > = {}

      rowFloorsData.forEach((fd: any) => {
        totalQuantityPd += parseFloat(fd.quantityPd) || 0
        totalQuantitySpec += parseFloat(fd.quantitySpec) || 0
        totalQuantityRd += parseFloat(fd.quantityRd) || 0

        if (fd.floor_number !== null) {
          floorNumbers.push(fd.floor_number)
          floorQuantities[fd.floor_number] = {
            quantityPd: String(fd.quantityPd || ''),
            quantitySpec: String(fd.quantitySpec || ''),
            quantityRd: String(fd.quantityRd || ''),
          }
        }
      })

      // Формируем диапазон этажей
      const sortedFloors = floorNumbers.sort((a, b) => a - b)
      const floorsRange =
        sortedFloors.length > 0
          ? sortedFloors.length === 1
            ? String(sortedFloors[0])
            : `${Math.min(...sortedFloors)}-${Math.max(...sortedFloors)}`
          : ''

      return {
        id: row.id,
        project: '', // Только реальные данные
        projectId: appliedFilters.project_id,

        // Данные документации из отдельного запроса
        documentationSection: docTag ? docTag.name : '',
        documentationCode: documentation?.code || '',
        documentationProjectName: documentation?.project_name || '',
        documentationVersion: docMapping?.documentation_versions?.version_number
          ? String(docMapping.documentation_versions.version_number)
          : '',
        documentationVersionId: docMapping?.version_id || '',
        documentationCodeId: documentation?.id || '', // ID документа для компонента VersionSelect

        // Данные корпуса и локации из реальных маппингов
        block: mapping?.blocks?.name || '',
        blockId: mapping?.block_id || '',
        floors: floorsRange || '',

        // Категории затрат из реальных маппингов
        costCategory: mapping?.cost_categories ? mapping.cost_categories.name : '',
        costCategoryId: String(mapping?.cost_category_id || ''),
        costType: mapping?.detail_cost_categories?.name || '',
        costTypeId: String(mapping?.cost_type_id || ''),

        workName: workName,
        rateId: String(rateId || ''), // ID расценки для сохранения в mapping
        workUnit: workUnit,
        location: mapping?.location?.name || '',
        locationId: String(mapping?.location_id || ''),

        // Материал и единицы измерения из реальных данных
        material: row.materials?.name || '',
        materialType: (row.material_type || 'База') as 'База' | 'Доп' | 'ИИ',
        quantityPd: String(totalQuantityPd || 0),
        quantitySpec: String(totalQuantitySpec || 0),
        quantityRd: String(totalQuantityRd || 0),

        // Номенклатура и поставщик из реальных маппингов
        nomenclature: nomenclatureMapping?.nomenclature?.name || '',
        nomenclatureId: nomenclatureMapping?.nomenclature_id || '',
        supplier: nomenclatureMapping?.supplier_name || '',
        nomenclatureSupplier: nomenclatureMapping?.supplier_name || '', // Исправлено: добавлено поле для ML компонента

        unit: row.units?.name || '',
        unitId: row.unit_id || '',
        comments: '', // Только реальные комментарии

        color: row.color || '',

        // Добавляем данные этажей для модального окна
        floorQuantities: Object.keys(floorQuantities).length > 0 ? floorQuantities : undefined,
      }
    })
  }, [
    rawData, // Основные данные
    filteredRawData, // Отфильтрованные данные batch processing
    documentationData,
    floorsData,
    ratesData,
    appliedFilters.project_id,
  ]) // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: добавлен filteredRawData для правильного отслеживания изменений

  // ИСПРАВЛЕНИЕ: Оптимизируем зависимости statistics
  const statistics = useMemo(() => {
    if (!transformedData.length) {
      return {
        totalRows: 0,
        totalQuantityPd: 0,
        totalQuantitySpec: 0,
        totalQuantityRd: 0,
        uniqueMaterials: 0,
        uniqueNomenclature: 0,
      }
    }


    // ОПТИМИЗАЦИЯ: одиночный проход для всех статистик вместо множественных reduce
    const stats = transformedData.reduce(
      (acc, row) => {
        acc.totalQuantityPd += parseFloat(row.quantityPd) || 0
        acc.totalQuantitySpec += parseFloat(row.quantitySpec) || 0
        acc.totalQuantityRd += parseFloat(row.quantityRd) || 0

        if (row.material) acc.materials.add(row.material)
        if (row.nomenclatureCode) acc.nomenclatures.add(row.nomenclatureCode)

        return acc
      },
      {
        totalQuantityPd: 0,
        totalQuantitySpec: 0,
        totalQuantityRd: 0,
        materials: new Set(),
        nomenclatures: new Set(),
      },
    )

    const result = {
      totalRows: transformedData.length,
      totalQuantityPd: stats.totalQuantityPd,
      totalQuantitySpec: stats.totalQuantitySpec,
      totalQuantityRd: stats.totalQuantityRd,
      uniqueMaterials: stats.materials.size,
      uniqueNomenclature: stats.nomenclatures.size,
    }


    return result
  }, [transformedData]) // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: используем полный массив для правильного отслеживания изменений

  // LOG: финальный отчет только при проблемах с производительностью
  if (renderCountRef.current > 10) {
    console.log('📊 useChessboardData final state:', { // LOG
      renderCount: renderCountRef.current,
      isLoading,
      rawDataLength: rawData?.length || 0,
      transformedDataLength: transformedData.length,
      performance: 'WARNING: Too many renders'
    }) // LOG
  }

  return {
    data: transformedData,
    rawData,
    isLoading,
    error,
    refetch,
    statistics,
  }
}
