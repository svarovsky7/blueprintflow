import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AppliedFilters, ViewRow, DbRow, RowData } from '../types'

interface UseChessboardDataProps {
  appliedFilters: AppliedFilters
  enabled?: boolean
}

export const useChessboardData = ({ appliedFilters, enabled = true }: UseChessboardDataProps) => {
  // Основной запрос данных шахматки
  const {
    data: rawData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['chessboard-data', JSON.stringify(appliedFilters)],
    queryFn: async () => {
      if (!appliedFilters.project_id) {
        return []
      }


      // Строим запрос с серверной фильтрацией для производительности
      let query = supabase
        .from('chessboard')
        .select(`
          id,
          material,
          color,
          created_at,
          updated_at,
          unit_id,

          materials!chessboard_material_fkey(name),
          units!chessboard_unit_id_fkey(name),

          chessboard_mapping!left(
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
        `)
        .eq('project_id', appliedFilters.project_id)

      // Применяем серверные фильтры для производительности
      if (appliedFilters.block_ids?.length) {
        query = query.in('chessboard_mapping.block_id', appliedFilters.block_ids)
      }

      if (appliedFilters.cost_category_ids?.length) {
        query = query.in('chessboard_mapping.cost_category_id', appliedFilters.cost_category_ids)
      }

      if (appliedFilters.detail_cost_category_ids?.length) {
        query = query.in('chessboard_mapping.cost_type_id', appliedFilters.detail_cost_category_ids)
      }

      if (appliedFilters.material_search) {
        query = query.ilike('materials.name', `%${appliedFilters.material_search}%`)
      }

      // Фильтрация по документации требует подзапроса из-за сложной связи
      if (appliedFilters.documentation_section_ids?.length || appliedFilters.documentation_code_ids?.length) {
        // Получаем ID chessboard записей, которые соответствуют фильтрам документации
        let docQuery = supabase
          .from('chessboard_documentation_mapping')
          .select('chessboard_id')

        if (appliedFilters.documentation_code_ids?.length) {
          docQuery = docQuery
            .select(`
              chessboard_id,
              documentation_versions!fk_chessboard_documentation_mapping_version(
                documentation_id
              )
            `)
            .in('documentation_versions.documentation_id', appliedFilters.documentation_code_ids)
        }

        if (appliedFilters.documentation_section_ids?.length) {
          docQuery = docQuery
            .select(`
              chessboard_id,
              documentation_versions!fk_chessboard_documentation_mapping_version(
                documentations!documentation_versions_documentation_id_fkey(
                  tag_id
                )
              )
            `)
            .in('documentation_versions.documentations.tag_id', appliedFilters.documentation_section_ids)
        }

        // Выполняем подзапрос для получения chessboard_id
        const { data: docIds, error: docError } = await docQuery

        if (docError) {
          console.error('Error filtering by documentation:', docError)
        } else if (docIds && docIds.length > 0) {
          // Применяем фильтр только к найденным ID с батчингом для избежания длинных URL
          const chessboardIds = docIds.map(d => d.chessboard_id)

          // Если ID слишком много, используем батчинг
          if (chessboardIds.length > 500) {
            // Выполняем запросы батчами по 500 ID (соответствует основному лимиту)
            const batchSize = 500
            let allResults: any[] = []

            for (let i = 0; i < chessboardIds.length; i += batchSize) {
              const batch = chessboardIds.slice(i, i + batchSize)
              const batchQuery = supabase
                .from('chessboard')
                .select(`
                  id,
                  material,
                  color,
                  created_at,
                  updated_at,
                  unit_id,

                  materials!chessboard_material_fkey(name),
                  units!chessboard_unit_id_fkey(name),

                  chessboard_mapping!left(
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
                `)
                .eq('project_id', appliedFilters.project_id)
                .in('id', batch)
                .limit(500)
                .order('created_at', { ascending: false })
                .order('id', { ascending: false })

              const { data: batchData, error: batchError } = await batchQuery

              if (batchError) {
                console.error('Error in batch query:', batchError)
                continue
              }

              if (batchData) {
                allResults = [...allResults, ...batchData]
              }
            }

            return allResults as DbRow[]
          } else {
            // Если ID не слишком много, используем обычный запрос
            query = query.in('id', chessboardIds)
          }
        } else {
          // Если документация не найдена, возвращаем пустой результат
          return []
        }
      }

      query = query
        .limit(500) // ОПТИМИЗАЦИЯ: увеличен с 100 до 500 для лучшей производительности с индексами
        .order('created_at', { ascending: false })
        .order('id', { ascending: false }) // Стабильная сортировка

      const { data, error } = await query

      if (error) {
        console.error('Error loading chessboard data:', error)
        throw error
      }


      return data as DbRow[]
    },
    enabled: enabled && !!appliedFilters.project_id,
  })

  // Отдельный запрос для данных документации
  const {
    data: documentationData,
  } = useQuery({
    queryKey: ['chessboard-documentation', appliedFilters.project_id],
    queryFn: async () => {
      if (!appliedFilters.project_id || !rawData?.length) {
        return []
      }

      const chessboardIds = rawData.map(row => row.id)

      const { data, error } = await supabase
        .from('chessboard_documentation_mapping')
        .select(`
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
        `)
        .in('chessboard_id', chessboardIds)

      if (error) {
        console.error('Error loading documentation data:', error)
        return []
      }


      return data || []
    },
    enabled: enabled && !!appliedFilters.project_id && !!rawData?.length,
  })

  // Отдельный запрос для данных этажей с батчингом
  const {
    data: floorsData,
  } = useQuery({
    queryKey: ['chessboard-floors', appliedFilters.project_id],
    queryFn: async () => {
      if (!appliedFilters.project_id || !rawData?.length) {
        return []
      }

      const chessboardIds = rawData.map(row => row.id)
      const batchSize = 500 // Батчинг для производительности (соответствует основному лимиту)
      let allFloorsData: any[] = []

      // Загружаем данные этажей батчами
      for (let i = 0; i < chessboardIds.length; i += batchSize) {
        const batch = chessboardIds.slice(i, i + batchSize)
        const { data: batchData, error: floorsError } = await supabase
          .from('chessboard_floor_mapping')
          .select(
            'chessboard_id, floor_number, location_id, "quantityPd", "quantitySpec", "quantityRd"'
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

  // Отдельный запрос для данных расценок
  const {
    data: ratesData,
  } = useQuery({
    queryKey: ['chessboard-rates', appliedFilters.project_id],
    queryFn: async () => {
      if (!appliedFilters.project_id || !rawData?.length) {
        return []
      }

      const chessboardIds = rawData.map(row => row.id)

      const { data, error } = await supabase
        .from('chessboard_rates_mapping')
        .select(`
          chessboard_id,
          rates!chessboard_rates_mapping_rate_id_fkey(
            id,
            work_name,
            work_set,
            base_rate
          )
        `)
        .in('chessboard_id', chessboardIds)

      if (error) {
        console.error('Error loading rates data:', error)
        return []
      }


      return data || []
    },
    enabled: enabled && !!appliedFilters.project_id && !!rawData?.length,
  })

  // Преобразование данных с использованием реальных связей БД
  const transformedData = useMemo((): RowData[] => {
    if (!rawData) return []

    // ДИАГНОСТИКА: логирование размера данных для отладки бесконечных рендеров
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Chessboard Data Transform:', {
        rawDataLength: rawData.length,
        timestamp: Date.now(),
        projectId: appliedFilters.project_id
      }) // LOG: диагностика преобразования данных шахматки

      if (rawData.length > 1000) {
        console.warn('⚠️ LARGE DATA SET detected in chessboard transform:', rawData.length)
      }
    }

    // ОПТИМИЗАЦИЯ: создаем индексы для O(1) поиска вместо O(n) для каждой строки
    const docMappingIndex = new Map()
    documentationData?.forEach(doc => {
      docMappingIndex.set(doc.chessboard_id, doc)
    })

    const floorsByChessboardId = new Map()
    floorsData?.forEach(fd => {
      if (!floorsByChessboardId.has(fd.chessboard_id)) {
        floorsByChessboardId.set(fd.chessboard_id, [])
      }
      floorsByChessboardId.get(fd.chessboard_id).push(fd)
    })

    const ratesMappingIndex = new Map()
    ratesData?.forEach(rate => {
      ratesMappingIndex.set(rate.chessboard_id, rate)
    })

    return rawData.map((row: any, index: number) => {
      // Извлекаем данные из маппингов
      const mapping = Array.isArray(row.chessboard_mapping) ? row.chessboard_mapping[0] : row.chessboard_mapping
      const nomenclatureMapping = Array.isArray(row.chessboard_nomenclature_mapping) ? row.chessboard_nomenclature_mapping[0] : row.chessboard_nomenclature_mapping

      // ОПТИМИЗАЦИЯ: используем индексы для O(1) поиска вместо find/filter
      const docMapping = docMappingIndex.get(row.id)
      const documentation = docMapping?.documentation_versions?.documentations
      const docTag = documentation?.documentation_tags

      const rowFloorsData = floorsByChessboardId.get(row.id) || []

      const rateMapping = ratesMappingIndex.get(row.id)
      const workName = rateMapping?.rates?.work_name || ''
      const rateId = rateMapping?.rates?.id || ''

      // ОПТИМИЗАЦИЯ: агрегируем количества и формируем данные этажей в одном проходе
      let totalQuantityPd = 0
      let totalQuantitySpec = 0
      let totalQuantityRd = 0
      const floorNumbers: number[] = []
      const floorQuantities: Record<number, { quantityPd: string; quantitySpec: string; quantityRd: string }> = {}

      rowFloorsData.forEach((fd: any) => {
        totalQuantityPd += parseFloat(fd.quantityPd) || 0
        totalQuantitySpec += parseFloat(fd.quantitySpec) || 0
        totalQuantityRd += parseFloat(fd.quantityRd) || 0

        if (fd.floor_number !== null) {
          floorNumbers.push(fd.floor_number)
          floorQuantities[fd.floor_number] = {
            quantityPd: String(fd.quantityPd || ''),
            quantitySpec: String(fd.quantitySpec || ''),
            quantityRd: String(fd.quantityRd || '')
          }
        }
      })

      // Формируем диапазон этажей
      const sortedFloors = floorNumbers.sort((a, b) => a - b)
      const floorsRange = sortedFloors.length > 0 ?
        (sortedFloors.length === 1 ? String(sortedFloors[0]) : `${Math.min(...sortedFloors)}-${Math.max(...sortedFloors)}`)
        : ''

      return {
        id: row.id,
        project: '', // Только реальные данные
        projectId: appliedFilters.project_id,

        // Данные документации из отдельного запроса
        documentationSection: docTag ? docTag.name : '',
        documentationCode: documentation?.code || '',
        documentationProjectName: documentation?.project_name || '',
        documentationVersion: docMapping?.documentation_versions?.version_number ? String(docMapping.documentation_versions.version_number) : '',

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
        location: mapping?.location?.name || '',
        locationId: String(mapping?.location_id || ''),

        // Материал и единицы измерения из реальных данных
        material: row.materials?.name || '',
        quantityPd: String(totalQuantityPd || 0),
        quantitySpec: String(totalQuantitySpec || 0),
        quantityRd: String(totalQuantityRd || 0),

        // Этажи для отображения ссылок
        floors: floorsRange,

        // Номенклатура и поставщик из реальных маппингов
        nomenclature: nomenclatureMapping?.nomenclature?.name || '',
        nomenclatureId: nomenclatureMapping?.nomenclature_id || '',
        supplier: nomenclatureMapping?.supplier_name || '',

        unit: row.units?.name || '',
        unitId: row.unit_id || '',
        comments: '', // Только реальные комментарии

        color: row.color || '',

        // Добавляем данные этажей для модального окна
        floorQuantities: Object.keys(floorQuantities).length > 0 ? floorQuantities : undefined,
      }
    })
  }, [rawData, documentationData, floorsData, ratesData, appliedFilters.project_id])

  // Статистика данных
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

    // ДИАГНОСТИКА: отслеживание вычисления статистики для больших данных
    if (process.env.NODE_ENV === 'development') {
      const startTime = Date.now()
      console.log('🔍 Chessboard Statistics Calculation Start:', {
        dataLength: transformedData.length,
        timestamp: startTime
      }) // LOG: начало вычисления статистики шахматки

      if (transformedData.length > 1000) {
        console.warn('⚠️ EXPENSIVE STATISTICS CALCULATION for large data:', transformedData.length)
      }
    }

    // ОПТИМИЗАЦИЯ: одиночный проход для всех статистик вместо множественных reduce
    const stats = transformedData.reduce((acc, row) => {
      acc.totalQuantityPd += parseFloat(row.quantityPd) || 0
      acc.totalQuantitySpec += parseFloat(row.quantitySpec) || 0
      acc.totalQuantityRd += parseFloat(row.quantityRd) || 0

      if (row.material) acc.materials.add(row.material)
      if (row.nomenclatureCode) acc.nomenclatures.add(row.nomenclatureCode)

      return acc
    }, {
      totalQuantityPd: 0,
      totalQuantitySpec: 0,
      totalQuantityRd: 0,
      materials: new Set(),
      nomenclatures: new Set()
    })

    const result = {
      totalRows: transformedData.length,
      totalQuantityPd: stats.totalQuantityPd,
      totalQuantitySpec: stats.totalQuantitySpec,
      totalQuantityRd: stats.totalQuantityRd,
      uniqueMaterials: stats.materials.size,
      uniqueNomenclature: stats.nomenclatures.size,
    }

    // ДИАГНОСТИКА: логирование завершения вычисления статистики
    if (process.env.NODE_ENV === 'development') {
      const endTime = Date.now()
      console.log('🔍 Chessboard Statistics Calculation End:', {
        calculationTime: endTime - (Date.now() - 50), // примерное время
        totalRows: result.totalRows,
        uniqueMaterials: result.uniqueMaterials
      }) // LOG: завершение вычисления статистики шахматки
    }

    return result
  }, [transformedData])

  return {
    data: transformedData,
    rawData,
    isLoading,
    error,
    refetch,
    statistics,
  }
}