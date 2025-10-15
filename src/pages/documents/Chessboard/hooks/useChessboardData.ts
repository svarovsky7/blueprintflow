import { useMemo, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AppliedFilters, ChessboardFilters, ViewRow, DbRow, RowData } from '../types'
import { formatFloorsForDisplay } from '../utils/floors'

interface UseChessboardDataProps {
  appliedFilters: AppliedFilters
  filters?: ChessboardFilters
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
    material_type,
    color,
    created_at,
    updated_at,
    unit_id,

    materials!chessboard_material_fkey(name),
    units!chessboard_unit_id_fkey(id, name),

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
      conversion_coefficient,
      nomenclature!chessboard_nomenclature_mapping_nomenclature_id_fkey(
        name,
        nomenclature_supplier_mapping!nomenclature_supplier_mapping_nomenclature_id_fkey(
          supplier_id,
          supplier_names!nomenclature_supplier_mapping_supplier_id_fkey(
            unit_id,
            units!supplier_names_unit_id_fkey(name)
          )
        )
      )
    )
  `
}

// Универсальная функция для применения серверных фильтров
function applyServerSideFilters(query: any, appliedFilters: AppliedFilters) {
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

export const useChessboardData = ({ appliedFilters, filters, enabled = true }: UseChessboardDataProps) => {
  // PERFORMANCE MONITORING: Отслеживание рендеров только при превышении лимита
  const renderCountRef = useRef(0)
  renderCountRef.current += 1

  if (renderCountRef.current > 10) {
  }

  // Состояние для хранения результата batch processing
  const [filteredRawData, setFilteredRawData] = useState<any[] | null>(null)

  // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Создаем стабильные строки с упрощенными зависимостями
  const stableFilterStrings = useMemo(() => {
    const blockIds = appliedFilters.block_ids ? [...appliedFilters.block_ids].sort().join(',') : 'no-blocks'
    const costCategoryIds = appliedFilters.cost_category_ids ? [...appliedFilters.cost_category_ids].sort().join(',') : 'no-cost-categories'
    const detailCategoryIds = appliedFilters.detail_cost_category_ids ? [...appliedFilters.detail_cost_category_ids].sort().join(',') : 'no-detail-categories'
    const docSectionIds = appliedFilters.documentation_section_ids ? [...appliedFilters.documentation_section_ids].sort().join(',') : 'no-doc-sections'
    const docCodeIds = appliedFilters.documentation_code_ids ? [...appliedFilters.documentation_code_ids].sort().join(',') : 'no-doc-codes'

    return {
      projectId: appliedFilters.project_id || 'no-project',
      blockIds,
      costCategoryIds,
      detailCategoryIds,
      docSectionIds,
      docCodeIds,
      materialSearch: appliedFilters.material_search || 'no-search',
    }
  }, [
    appliedFilters.project_id,
    appliedFilters.block_ids?.join(',') || '',
    appliedFilters.cost_category_ids?.join(',') || '',
    appliedFilters.detail_cost_category_ids?.join(',') || '',
    appliedFilters.documentation_section_ids?.join(',') || '',
    appliedFilters.documentation_code_ids?.join(',') || '',
    appliedFilters.material_search,
  ])

  // Стабилизируем queryKey используя мемоизированные строки
  const stableQueryKey = useMemo(() => {
    const newQueryKey = [
      'chessboard-data',
      stableFilterStrings.projectId,
      stableFilterStrings.blockIds,
      stableFilterStrings.costCategoryIds,
      stableFilterStrings.detailCategoryIds,
      stableFilterStrings.docSectionIds,
      stableFilterStrings.docCodeIds,
      stableFilterStrings.materialSearch,
    ]

    if (renderCountRef.current <= 3 || renderCountRef.current > 10) {
    }

    return newQueryKey
  }, [stableFilterStrings])

  // Основной запрос данных шахматки
  const {
    data: rawData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: stableQueryKey,
    queryFn: async () => {
      const queryStartTime = performance.now()

      if (!appliedFilters.project_id) {
        return []
      }

      const startTime = performance.now()

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
        appliedFilters.documentation_code_ids?.length ||
        (appliedFilters.documentation_version_ids && Object.keys(appliedFilters.documentation_version_ids).length > 0)
      ) {

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
          if (appliedFilters.documentation_code_ids.length > 100) {
          }
          docQuery = docQuery.in('documentation_versions.documentation_id', appliedFilters.documentation_code_ids)
        }

        if (appliedFilters.documentation_section_ids?.length) {
          if (appliedFilters.documentation_section_ids.length > 100) {
          }
          docQuery = docQuery.in('documentation_versions.documentations.tag_id', appliedFilters.documentation_section_ids)
        }

        // Применяем фильтры по версиям документов
        if (appliedFilters.documentation_version_ids && Object.keys(appliedFilters.documentation_version_ids).length > 0) {
          const versionIds = Object.values(appliedFilters.documentation_version_ids)
          docQuery = docQuery.in('version_id', versionIds)
        }

        // Выполняем подзапрос для получения chessboard_id
        const { data: docIds, error: docError } = await docQuery

        if (docError) {
          console.error('Error filtering by documentation:', docError)
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
            if (totalBatches > 10) {
            }

            for (let i = 0; i < chessboardIds.length; i += batchSize) {
              const batch = chessboardIds.slice(i, i + batchSize)
              const batchNumber = Math.floor(i/batchSize) + 1

              const batchStartTime = performance.now()
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

              const batchEndTime = performance.now()
              const batchDuration = batchEndTime - batchStartTime

              if (batchDuration > 1000) {
              }

              if (batchError) {
                // Проверяем, связана ли ошибка с длиной URL
                if (batchError.message?.includes('URI') || batchError.message?.includes('414')) {
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
              throw error
            }

            const endTime = performance.now()
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
          throw error
        }

        const endTime = performance.now()
        const executionTime = Math.round(endTime - queryStartTime)


        if (executionTime > 3000) {
        }
        setFilteredRawData(null)
        return data as DbRow[]
      }
    },
    enabled: enabled && !!appliedFilters.project_id,
  })

  // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Используем стабильные строки вместо дублирования логики
  const stableDocQueryKey = useMemo(
    () => [
      'chessboard-documentation',
      stableFilterStrings.projectId,
      stableFilterStrings.docCodeIds,
      stableFilterStrings.docSectionIds,
      rawData?.length || 0
    ],
    [stableFilterStrings, rawData?.length]
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

  // Стабилизируем queryKey для этажей используя стабильные строки
  const stableFloorsQueryKey = useMemo(
    () => [
      'chessboard-floors',
      stableFilterStrings.projectId,
      stableQueryKey.join('|'),
      rawData?.length || 0, // Добавляем зависимость от количества основных данных
    ],
    [stableFilterStrings, stableQueryKey, rawData?.length]
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
    enabled: enabled && !!appliedFilters.project_id && !!rawData?.length,
  })

  // Стабилизируем queryKey для расценок используя стабильные строки
  const stableRatesQueryKey = useMemo(
    () => [
      'chessboard-rates',
      stableFilterStrings.projectId,
      stableQueryKey.join('|'),
      rawData?.length || 0
    ],
    [stableFilterStrings, stableQueryKey, rawData?.length]
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
      const allRatesData: any[] = []

      // Загружаем данные расценок батчами
      for (let i = 0; i < chessboardIds.length; i += batchSize) {
        const batch = chessboardIds.slice(i, i + batchSize)
        const { data: batchData, error: ratesError } = await supabase
          .from('chessboard_rates_mapping')
          .select(
            `
            chessboard_id,
            work_set_rate_id,
            work_set_rate:work_set_rate_id(
              id,
              work_name_id,
              work_set_id,
              base_rate,
              unit_id,
              work_names:work_name_id(id, name),
              work_sets:work_set_id(id, name),
              units:unit_id(name)
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

    if (dataToProcess.length > 1000) {
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
      const workName = rateMapping?.work_set_rate?.work_names?.name || ''
      const workNameId = rateMapping?.work_set_rate?.work_name_id || ''
      const rateId = rateMapping?.work_set_rate_id || '' // ID расценки из work_set_rates
      const workUnit = rateMapping?.work_set_rate?.units?.name || ''
      const workSetId = rateMapping?.work_set_rate?.work_set_id || '' // UUID из work_sets
      const workSet = rateMapping?.work_set_rate?.work_sets?.name || '' // Название рабочего набора

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
        const pdValue = parseFloat(fd.quantityPd) || 0
        const specValue = parseFloat(fd.quantitySpec) || 0
        const rdValue = parseFloat(fd.quantityRd) || 0

        totalQuantityPd += pdValue
        totalQuantitySpec += specValue
        totalQuantityRd += rdValue

        if (pdValue > 0 || specValue > 0 || rdValue > 0) {
        }

        if (fd.floor_number !== null) {
          floorNumbers.push(fd.floor_number)
          floorQuantities[fd.floor_number] = {
            quantityPd: String(fd.quantityPd || ''),
            quantitySpec: String(fd.quantitySpec || ''),
            quantityRd: String(fd.quantityRd || ''),
          }
        }
      })

      // Формируем диапазон этажей с группировкой последовательных
      const sortedFloors = floorNumbers.sort((a, b) => a - b)
      const floorsRange = formatFloorsForDisplay(sortedFloors)

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

        workSet: workSet,
        workSetId: String(workSetId || ''), // ID записи rates для work_set
        workName: workName,
        workNameId: String(workNameId || ''), // ID из work_names
        rateId: String(rateId || ''), // ID расценки для сохранения в mapping
        workUnit: workUnit,
        location: mapping?.location?.name || '',
        locationId: String(mapping?.location_id || ''),

        // Материал и единицы измерения из реальных данных
        material: row.materials?.name || '',
        materialType: (row.material_type as 'База' | 'Доп' | 'ИИ') || 'База',
        quantityPd: String(totalQuantityPd || 0),
        quantitySpec: String(totalQuantitySpec || 0),
        quantityRd: String(totalQuantityRd || 0),

        // Новые поля для пересчета количества
        conversionCoefficient: String(nomenclatureMapping?.conversion_coefficient || ''),
        convertedQuantity: (() => {
          // Расчет: если quantityRd != 0, то quantityRd × coefficient, иначе quantitySpec × coefficient
          const coeff = Number(nomenclatureMapping?.conversion_coefficient || 0)
          if (coeff === 0) return '0'

          const baseQuantity = totalQuantityRd !== 0 ? totalQuantityRd : totalQuantitySpec
          const result = baseQuantity * coeff

          // Показываем только если != 0, форматируем до 2 знаков, убираем trailing zeros
          return result !== 0 ? result.toFixed(2).replace(/\.?0+$/, '') : '0'
        })(),
        unitNomenclature: (() => {
          // Получаем unit через nomenclature → nomenclature_supplier_mapping → supplier_names → units
          const mapping = nomenclatureMapping?.nomenclature?.nomenclature_supplier_mapping
          if (Array.isArray(mapping) && mapping.length > 0) {
            return mapping[0]?.supplier_names?.units?.name || ''
          }
          return ''
        })(),
        unitNomenclatureId: (() => {
          const mapping = nomenclatureMapping?.nomenclature?.nomenclature_supplier_mapping
          if (Array.isArray(mapping) && mapping.length > 0) {
            return mapping[0]?.supplier_names?.unit_id || ''
          }
          return ''
        })(),

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

  if (renderCountRef.current > 10) {
  }

  // Загрузка версий документов для выбранного проекта
  const { data: documentVersions = [] } = useQuery({
    queryKey: ['document-versions', filters?.project, filters?.documentationCode ? [...filters.documentationCode].sort().join(',') : ''],
    queryFn: async () => {
      if (!filters?.project || !filters?.documentationCode?.length || !supabase) return []

      const { data, error } = await supabase
        .from('documentation_versions')
        .select('id, documentation_id, version_number, issue_date, status')
        .in('documentation_id', filters.documentationCode)
        .order('version_number', { ascending: false })

      if (error) {
        console.error('Ошибка загрузки версий документов:', error)
        return []
      }

      return data || []
    },
    enabled: !!filters?.project && !!filters?.documentationCode?.length,
  })

  // Загрузка информации о документации для модального окна версий
  const { data: documentationInfo = [] } = useQuery({
    queryKey: ['documentation-info', filters?.project, filters?.documentationCode ? [...filters.documentationCode].sort().join(',') : ''],
    queryFn: async () => {
      if (!filters?.project || !filters?.documentationCode?.length || !supabase) return []

      const { data, error } = await supabase
        .from('documentations')
        .select(`
          id,
          code,
          project_name,
          tag_id,
          documentation_tags:documentation_tags!inner(
            id,
            name,
            tag_number
          )
        `)
        .in('id', filters.documentationCode)

      if (error) {
        console.error('Ошибка загрузки информации о документации:', error)
        return []
      }

      return data || []
    },
    enabled: !!filters?.project && !!filters?.documentationCode?.length,
  })

  return {
    data: transformedData,
    rawData,
    isLoading,
    error,
    refetch,
    statistics,
    documentVersions,
    documentationInfo,
  }
}
