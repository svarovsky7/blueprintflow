import { useMemo, useState } from 'react'
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

  console.log(`🔧 Using ${joinType.toUpperCase()} JOIN for chessboard_mapping due to filters`) // LOG

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
    query = query.in('chessboard_mapping.block_id', appliedFilters.block_ids)
    filtersToApply.push(`blocks: ${appliedFilters.block_ids.length}`)
  }

  if (appliedFilters.cost_category_ids?.length) {
    query = query.in('chessboard_mapping.cost_category_id', appliedFilters.cost_category_ids)
    filtersToApply.push(`cost_categories: ${appliedFilters.cost_category_ids.length}`)
  }

  if (appliedFilters.detail_cost_category_ids?.length) {
    query = query.in('chessboard_mapping.cost_type_id', appliedFilters.detail_cost_category_ids)
    filtersToApply.push(`detail_categories: ${appliedFilters.detail_cost_category_ids.length}`)
  }

  if (appliedFilters.material_search) {
    query = query.ilike('materials.name', `%${appliedFilters.material_search}%`)
    filtersToApply.push(`material_search: "${appliedFilters.material_search}"`)
  }

  if (filtersToApply.length > 0) {
    console.log(`🔧 Applying server-side filters: ${filtersToApply.join(', ')}`) // LOG: применение серверных фильтров
  }

  return query
}

export const useChessboardData = ({ appliedFilters, enabled = true }: UseChessboardDataProps) => {
  // Состояние для хранения результата batch processing
  const [filteredRawData, setFilteredRawData] = useState<any[] | null>(null)

  // ИСПРАВЛЕНИЕ: Стабилизируем queryKey для предотвращения бесконечного рендеринга
  const stableQueryKey = useMemo(() => {
    return [
      'chessboard-data',
      appliedFilters.project_id || 'no-project',
      appliedFilters.block_ids?.join(',') || 'no-blocks',
      appliedFilters.cost_category_ids?.join(',') || 'no-cost-categories',
      appliedFilters.detail_cost_category_ids?.join(',') || 'no-detail-categories',
      appliedFilters.documentation_section_ids?.join(',') || 'no-doc-sections',
      appliedFilters.documentation_code_ids?.join(',') || 'no-doc-codes',
      appliedFilters.material_search || 'no-search',
    ]
  }, [
    appliedFilters.project_id,
    appliedFilters.block_ids?.join(','),
    appliedFilters.cost_category_ids?.join(','),
    appliedFilters.detail_cost_category_ids?.join(','),
    appliedFilters.documentation_section_ids?.join(','),
    appliedFilters.documentation_code_ids?.join(','),
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
      if (!appliedFilters.project_id) {
        return []
      }

      console.log('🔄 Chessboard query started:', { // LOG: запрос шахматки
        project_id: appliedFilters.project_id,
        filters: {
          blocks: appliedFilters.block_ids?.length || 0,
          cost_categories: appliedFilters.cost_category_ids?.length || 0,
          detail_categories: appliedFilters.detail_cost_category_ids?.length || 0,
          doc_sections: appliedFilters.documentation_section_ids?.length || 0,
          doc_codes: appliedFilters.documentation_code_ids?.length || 0,
          material_search: !!appliedFilters.material_search
        }
      })
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
        console.log('🔧 Using INNER JOIN approach to filter existing chessboard records only') // LOG: исправленный подход

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
          docQuery = docQuery.in('documentation_versions.documentation_id', appliedFilters.documentation_code_ids)
        }

        if (appliedFilters.documentation_section_ids?.length) {
          docQuery = docQuery.in('documentation_versions.documentations.tag_id', appliedFilters.documentation_section_ids)
        }

        // Выполняем подзапрос для получения chessboard_id
        const { data: docIds, error: docError } = await docQuery

        if (docError) {
          console.error('❌ Error filtering by documentation:', docError)
        } else if (docIds && docIds.length > 0) {
          console.log(`✅ INNER JOIN documentation filter returned ${docIds.length} records from documentation_mapping`) // LOG: количество записей из маппинга

          // Отладочная информация: показать разделы в результате
          const sections = new Set()
          docIds.forEach(item => {
            const tagName = item.documentation_versions?.documentations?.documentation_tags?.name
            if (tagName) sections.add(tagName)
          })
          console.log(`📋 Sections found in result: ${Array.from(sections).join(', ')}`) // LOG: разделы в результате

          // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Убираем дубликаты chessboard_id (одна запись может иметь несколько версий документов)
          const chessboardIds = [...new Set(docIds.map((d) => d.chessboard_id))]
          console.log(`🔢 Unique chessboard IDs after deduplication: ${chessboardIds.length} (was ${docIds.length})`) // LOG: уникальные ID после дедупликации

          // Если ID слишком много, используем батчинг
          if (chessboardIds.length > 200) {
            // Выполняем запросы батчами по 200 ID для предотвращения переполнения URL
            const batchSize = 200
            let allResults: any[] = []
            const totalBatches = Math.ceil(chessboardIds.length / batchSize)
            console.log(`🔄 Starting batch processing: ${chessboardIds.length} IDs in ${totalBatches} batches of ${batchSize}`) // LOG

            for (let i = 0; i < chessboardIds.length; i += batchSize) {
              const batch = chessboardIds.slice(i, i + batchSize)
              const batchNumber = Math.floor(i/batchSize) + 1

              // LOG: мониторинг размера батча и потенциальной длины URL
              const estimatedUrlLength = 500 + batch.length * 40 // приблизительная оценка
              console.log(`🔍 Batch ${batchNumber}: ${batch.length} IDs, estimated URL length: ${estimatedUrlLength}`) // LOG

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
              console.log(`⏱️ Batch ${batchNumber} completed in ${Math.round(batchDuration)}ms, returned ${batchData?.length || 0} records`) // LOG

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

            console.log(`✅ Batch processing completed: ${allResults.length} records from ${totalBatches} batches`) // LOG
            console.log('💾 Saving batch results to filteredRawData state') // LOG: сохранение результатов batch processing
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

            console.log('✅ Chessboard query completed (small batch):', { // LOG: успешный запрос
              records_found: data?.length || 0,
              execution_time_ms: executionTime,
              chessboard_ids_filtered: chessboardIds.length
            })

            console.log('💾 Saving small batch results to filteredRawData state') // LOG: сохранение результатов малого батча
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
        const executionTime = Math.round(endTime - startTime)

        console.log('✅ Chessboard query completed:', { // LOG: успешный запрос
          records_found: data?.length || 0,
          execution_time_ms: executionTime,
          performance: executionTime < 1000 ? 'excellent' : executionTime < 3000 ? 'good' : 'slow'
        })

        console.log('🧹 Clearing filteredRawData state (no documentation filters)') // LOG: очистка состояния при отсутствии фильтра документации
        setFilteredRawData(null)
        return data as DbRow[]
      }
    },
    enabled: enabled && !!appliedFilters.project_id,
  })

  // ИСПРАВЛЕНИЕ: Стабилизируем queryKey для документации БЕЗ циклической зависимости
  const stableDocQueryKey = useMemo(
    () => [
      'chessboard-documentation',
      appliedFilters.project_id || 'no-project',
      filteredRawData ? `filtered-${filteredRawData.length}` : `raw-${rawData?.length || 0}`,
    ],
    [appliedFilters.project_id, filteredRawData?.length, rawData?.length],
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

      console.log('📄 Documentation query started with:', { // LOG: запрос документации
        dataSource: filteredRawData ? 'filteredRawData (batch result)' : 'rawData (normal query)',
        idsCount: chessboardIds.length,
        hasDocumentationFilter: !!(appliedFilters.documentation_section_ids?.length || appliedFilters.documentation_code_ids?.length)
      })

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
        .in('chessboard_id', chessboardIds)

      if (error) {
        console.error('Error loading documentation data:', error)
        return []
      }

      return data || []
    },
    enabled: enabled && !!appliedFilters.project_id && !!(filteredRawData || rawData),
  })

  // ИСПРАВЛЕНИЕ: Стабилизируем queryKey для этажей БЕЗ циклической зависимости
  const stableFloorsQueryKey = useMemo(
    () => ['chessboard-floors', appliedFilters.project_id || 'no-project'],
    [appliedFilters.project_id],
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
    enabled: enabled && !!appliedFilters.project_id && !!rawData,
  })

  // ИСПРАВЛЕНИЕ: Стабилизируем queryKey для расценок БЕЗ циклической зависимости
  const stableRatesQueryKey = useMemo(
    () => ['chessboard-rates', appliedFilters.project_id || 'no-project'],
    [appliedFilters.project_id],
  )

  // Отдельный запрос для данных расценок
  const { data: ratesData } = useQuery({
    queryKey: stableRatesQueryKey,
    queryFn: async () => {
      if (!appliedFilters.project_id || !rawData?.length) {
        return []
      }

      const chessboardIds = rawData.map((row) => row.id)

      const { data, error } = await supabase
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
        .in('chessboard_id', chessboardIds)

      if (error) {
        console.error('Error loading rates data:', error)
        return []
      }

      return data || []
    },
    enabled: enabled && !!appliedFilters.project_id && !!rawData,
  })

  // ИСПРАВЛЕНИЕ: Оптимизируем зависимости useMemo для стабильности
  const transformedData = useMemo((): RowData[] => {
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: используем правильный источник данных
    const dataToProcess = filteredRawData || rawData
    if (!dataToProcess) return []

    console.log('🔄 TransformedData processing:', { // LOG: обработка transformedData
      dataToProcessLength: dataToProcess.length,
      dataSource: filteredRawData ? 'filteredRawData (batch result)' : 'rawData (normal query)',
      hasDocumentationFilter: !!(appliedFilters.documentation_section_ids?.length || appliedFilters.documentation_code_ids?.length)
    })

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

  return {
    data: transformedData,
    rawData,
    isLoading,
    error,
    refetch,
    statistics,
  }
}
