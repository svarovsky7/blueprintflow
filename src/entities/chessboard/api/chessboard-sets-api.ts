import { supabase } from '@/lib/supabase'
import type {
  ChessboardSet,
  ChessboardSetStatus,
  ChessboardSetFilters,
  CreateChessboardSetRequest,
  UpdateChessboardSetRequest,
  ChessboardSetTableRow,
  ChessboardSetSearchFilters,
  ChessboardSetStatusHistory,
  AddChessboardSetStatusRequest,
  ChessboardSetWithCurrentStatus,
} from '../types'

export const chessboardSetsApi = {
  // Получение статусов комплектов из общей таблицы statuses
  async getStatuses(): Promise<ChessboardSetStatus[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    // Получаем все активные статусы
    const { data, error } = await supabase
      .from('statuses')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Failed to fetch statuses:', error)
      throw error
    }

    // Фильтруем статусы, у которых applicable_pages содержит "Шахматка" или "documents/chessboard"
    const filtered = (data || []).filter((status) => {
      if (!status.applicable_pages) return false
      if (Array.isArray(status.applicable_pages)) {
        // Поддерживаем оба формата: "Шахматка" и "documents/chessboard"
        return (
          status.applicable_pages.includes('Шахматка') ||
          status.applicable_pages.includes('documents/chessboard')
        )
      }
      return false
    })

    return filtered
  },

  // Создание нового комплекта
  async createSet(request: CreateChessboardSetRequest): Promise<ChessboardSet> {
    if (!supabase) throw new Error('Supabase client not initialized')

    // Получить текущего пользователя
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const currentUserId = user?.id || null

    // Проверяем, существует ли уже комплект с такими же фильтрами
    const existingSet = await this.findSetByFilters(request.filters)
    if (existingSet) {
      throw new Error(
        `Комплект с таким набором фильтров уже существует (№${existingSet.set_number})`,
      )
    }

    // Генерируем уникальный номер комплекта
    const setNumber = await this.generateSetNumber()

    // Определяем первичный документ из массива documents для обратной совместимости
    const primaryDocument =
      request.filters.documents && request.filters.documents.length > 0
        ? request.filters.documents[0]
        : null

    // Создаем комплект без поля status_id (теперь статус хранится в таблице маппинга)
    const newSet = {
      set_number: setNumber,
      name: request.name || null,
      project_id: request.filters.project_id,
      // Используем первичный документ для обратной совместимости
      documentation_id:
        primaryDocument?.documentation_id || request.filters.documentation_id || null,
      version_id: primaryDocument?.version_id || request.filters.version_id || null,
      tag_id: request.filters.tag_id || null,
      block_ids: request.filters.block_ids || null,
      cost_category_ids: request.filters.cost_category_ids || null,
      cost_type_ids: request.filters.cost_type_ids || null,
      created_by: currentUserId,
    }

    const { data, error } = await supabase
      .from('chessboard_sets')
      .insert([newSet])
      .select(
        `
        *,
        project:projects(id, name),
        documentation:documentations(id, code, project_name),
        version:documentation_versions(id, version_number, issue_date),
        tag:documentation_tags(id, name, tag_number)
      `,
      )
      .single()

    if (error) {
      console.error('Failed to create chessboard set:', error)
      throw error
    }

    // Если передан массив документов, создаем записи в таблице маппинга
    if (request.filters.documents && request.filters.documents.length > 0 && data) {
      try {
        const documentsMapping = request.filters.documents.map((doc, index) => ({
          set_id: data.id,
          documentation_id: doc.documentation_id,
          version_id: doc.version_id,
          order_index: index,
        }))

        const { error: mappingError } = await supabase
          .from('chessboard_sets_documents_mapping')
          .insert(documentsMapping)

        if (mappingError) {
          console.error('Failed to create documents mapping:', mappingError)
          // Не прерываем создание комплекта, если не удалось создать маппинг
        }
      } catch (mappingError) {
        console.error('Error creating documents mapping:', mappingError)
      }
    }

    // Если указан статус, добавляем его в таблицу маппинга
    if (request.status_id && data) {
      try {
        await this.addStatusToSet({
          chessboard_set_id: data.id,
          status_id: request.status_id,
          comment: 'Начальный статус при создании комплекта',
        })

        // Добавляем информацию о статусе в возвращаемый объект
        const status = await this.getCurrentStatus(data.id)
        if (status) {
          const dataWithStatus = data as ChessboardSet
          dataWithStatus.status = {
            id: status.status_id,
            name: status.status_name,
            color: status.status_color,
          }
        }
      } catch (statusError) {
        console.error('Failed to add initial status:', statusError)
        // Не прерываем создание комплекта, если не удалось добавить статус
      }
    }

    return data as ChessboardSet
  },

  // Получение комплектов с фильтрацией
  async getSets(filters?: ChessboardSetSearchFilters): Promise<ChessboardSetTableRow[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    // Загружаем основные данные комплектов
    let query = supabase
      .from('chessboard_sets')
      .select(
        `
        *,
        project:projects(id, name),
        tag:documentation_tags(id, name)
      `,
      )
      .order('created_at', { ascending: false })

    // Применяем фильтры
    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id)
    }
    if (filters?.tag_id) {
      query = query.eq('tag_id', filters.tag_id)
    }
    if (filters?.search) {
      query = query.or(`set_number.ilike.%${filters.search}%,name.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch chessboard sets:', error)
      throw error
    }

    // Загружаем документы для всех комплектов одним запросом
    const setIds = (data || []).map((set) => set.id)
    let documentsMap: Record<string, any[]> = {}

    if (setIds.length > 0) {
      const { data: docsData } = await supabase
        .from('chessboard_sets_documents_mapping')
        .select('set_id, documentation_id, version_id, order_index, documentations(id, code, project_name), documentation_versions(id, version_number, issue_date)')
        .in('set_id', setIds)
        .order('order_index', { ascending: true })

      // Группируем документы по комплектам
      if (docsData && docsData.length > 0) {
        documentsMap = docsData.reduce((acc: Record<string, any[]>, doc: any) => {
          if (!acc[doc.set_id]) acc[doc.set_id] = []
          acc[doc.set_id].push({
            documentation_id: doc.documentation_id,
            version_id: doc.version_id,
            order_index: doc.order_index,
            code: doc.documentations?.code,
            project_name: doc.documentations?.project_name,
            version_number: doc.documentation_versions?.version_number,
            issue_date: doc.documentation_versions?.issue_date,
          })
          return acc
        }, {})
      }
    }

    // Фильтруем комплекты по коду документа если указан
    let documentFilteredData = data || []
    if (filters?.documentation_code) {
      const filteredSetIds = Object.entries(documentsMap)
        .filter(([_, docs]) =>
          docs.some((doc: any) => doc.code === filters.documentation_code)
        )
        .map(([setId]) => setId)

      documentFilteredData = documentFilteredData.filter((set) => filteredSetIds.includes(set.id))
    }

    // Получаем статусы для всех комплектов одним запросом (после фильтрации по документам)
    const filteredSetIds = documentFilteredData.map((set) => set.id)
    let statusesMap: Record<string, { id: string; name: string; color?: string }> = {}

    if (filteredSetIds.length > 0) {
      const { data: statusMappings } = await supabase
        .from('statuses_mapping')
        .select('entity_id, status_id')
        .eq('entity_type', 'chessboard_set')
        .in('entity_id', filteredSetIds)
        .eq('is_current', true)

      // Получаем статусы отдельным запросом
      const statusIds = [...new Set((statusMappings || []).map((m: any) => m.status_id))]
      let statusesData: any[] = []

      if (statusIds.length > 0) {
        const { data: statuses } = await supabase
          .from('statuses')
          .select('id, name, color')
          .in('id', statusIds)

        statusesData = statuses || []
      }

      // Объединяем данные на клиенте
      const mappingsWithStatuses = (statusMappings || []).map((m: any) => ({
        entity_id: m.entity_id,
        status: statusesData.find((s: any) => s.id === m.status_id)
      }))

      statusesMap = mappingsWithStatuses.reduce(
        (acc, mapping) => {
          if (mapping.status && !Array.isArray(mapping.status)) {
            acc[mapping.entity_id] = mapping.status
          }
          return acc
        },
        {} as Record<string, { id: string; name: string; color?: string }>,
      )
    }

    // Загружаем справочники для отображения названий
    // Собираем все уникальные ID (после фильтрации по документам)
    const allBlockIds = new Set<string>()
    const allCategoryIds = new Set<string>()
    const allTypeIds = new Set<string>()

    documentFilteredData.forEach((set) => {
      if (set.block_ids) {
        set.block_ids.forEach((id: string) => allBlockIds.add(id))
      }
      if (set.cost_category_ids) {
        set.cost_category_ids.forEach((id: string) => allCategoryIds.add(id))
      }
      if (set.cost_type_ids) {
        set.cost_type_ids.forEach((id: string) => allTypeIds.add(id))
      }
    })

    // Загружаем названия блоков
    let blocksMap: Record<string, string> = {}
    if (allBlockIds.size > 0) {
      const { data: blocksData } = await supabase
        .from('blocks')
        .select('id, name')
        .in('id', Array.from(allBlockIds))

      blocksMap = (blocksData || []).reduce(
        (acc, block) => {
          acc[block.id] = block.name
          return acc
        },
        {} as Record<string, string>,
      )
    }

    // Загружаем названия категорий затрат
    let categoriesMap: Record<string, string> = {}
    if (allCategoryIds.size > 0) {
      const { data: categoriesData } = await supabase
        .from('cost_categories')
        .select('id, name')
        .in('id', Array.from(allCategoryIds))

      categoriesMap = (categoriesData || []).reduce(
        (acc, category) => {
          acc[category.id] = category.name
          return acc
        },
        {} as Record<string, string>,
      )
    }

    // Загружаем названия видов затрат
    let typesMap: Record<string, string> = {}
    if (allTypeIds.size > 0) {
      const { data: typesData } = await supabase
        .from('detail_cost_categories')
        .select('id, name')
        .in('id', Array.from(allTypeIds))

      typesMap = (typesData || []).reduce(
        (acc, type) => {
          acc[type.id] = type.name
          return acc
        },
        {} as Record<string, string>,
      )
    }

    // Фильтр по статусу и категории затрат (применяется после фильтрации по документам)
    let filteredData = documentFilteredData
    if (filters?.status_id) {
      filteredData = filteredData.filter((set) => statusesMap[set.id]?.id === filters.status_id)
    }
    if (filters?.cost_category_id) {
      filteredData = filteredData.filter((set) => {
        if (!set.cost_category_ids || set.cost_category_ids.length === 0) return false
        // Приводим все элементы массива к числам для корректного сравнения
        const categoryIds = set.cost_category_ids.map((id: any) =>
          typeof id === 'string' ? parseInt(id, 10) : id
        )
        return categoryIds.includes(filters.cost_category_id!)
      })
    }

    // Преобразуем в формат для таблицы
    return filteredData.map((set) => {
      const status = statusesMap[set.id]

      // Получаем документы комплекта из documentsMap
      const setDocuments = documentsMap[set.id] || []
      const firstDoc = setDocuments.length > 0 ? setDocuments[0] : null
      const docCodes = setDocuments
        .map((d: any) => d.code)
        .filter(Boolean)
        .join(', ')

      // Формируем списки названий
      const blockNames = set.block_ids
        ? set.block_ids
            .map((id: string) => blocksMap[id])
            .filter(Boolean)
            .join(', ')
        : ''
      const categoryNames = set.cost_category_ids
        ? set.cost_category_ids
            .map((id: string) => categoriesMap[id])
            .filter(Boolean)
            .join(', ')
        : ''
      const typeNames = set.cost_type_ids
        ? set.cost_type_ids
            .map((id: string) => typesMap[id])
            .filter(Boolean)
            .join(', ')
        : ''

      return {
        id: set.id,
        set_number: set.set_number,
        name: set.name,
        project_name: set.project?.name || '',
        documentation_code: docCodes || firstDoc?.code || '',
        version_number: firstDoc?.version_number || 0,
        tag_name: (set.tag as any)?.name || '',
        block_names: blockNames || 'Все',
        cost_category_names: categoryNames || 'Все',
        cost_type_names: typeNames || 'Все',
        status_id: status?.id || undefined, // UUID статуса
        status_name: status?.name || '',
        status_color: status?.color || '#888888',
        created_at: set.created_at,
        updated_at: set.updated_at,
        // Добавляем исходные данные для копирования
        tag_id: set.tag_id,
        block_ids: set.block_ids,
        cost_category_ids: set.cost_category_ids,
        cost_type_ids: set.cost_type_ids,
        documents: setDocuments,
        project_id: set.project_id, // Для работы с ВОР
      }
    })
  },

  // Получение комплекта по ID
  async getSetById(id: string): Promise<ChessboardSet | null> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('chessboard_sets_with_documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Failed to fetch chessboard set:', error)
      throw error
    }

    // Получаем текущий статус из таблицы маппинга
    const currentStatus = await this.getCurrentStatus(id)
    if (currentStatus) {
      const dataWithStatus = data as ChessboardSet
      dataWithStatus.status = {
        id: currentStatus.status_id,
        name: currentStatus.status_name,
        color: currentStatus.status_color,
      }
    }

    return data as ChessboardSet
  },

  // Обновление комплекта
  async updateSet(id: string, request: UpdateChessboardSetRequest): Promise<ChessboardSet> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (request.name !== undefined) {
      updates.name = request.name
    }

    // Обновляем основные данные комплекта
    const { data, error } = await supabase
      .from('chessboard_sets')
      .update(updates)
      .eq('id', id)
      .select(
        `
        *,
        project:projects(id, name),
        documentation:documentations(id, code, project_name),
        version:documentation_versions(id, version_number, issue_date),
        tag:documentation_tags(id, name, tag_number)
      `,
      )
      .single()

    if (error) {
      console.error('Failed to update chessboard set:', error)
      throw error
    }

    // Если нужно обновить статус, делаем это через таблицу маппинга
    if (request.status_id !== undefined) {
      await this.addStatusToSet({
        chessboard_set_id: id,
        status_id: request.status_id,
        comment: 'Статус обновлен',
      })

      // Получаем обновленный статус
      const currentStatus = await this.getCurrentStatus(id)
      if (currentStatus) {
        const dataWithStatus = data as ChessboardSet
        dataWithStatus.status = {
          id: currentStatus.status_id,
          name: currentStatus.status_name,
          color: currentStatus.status_color,
        }
      }
    }

    return data as ChessboardSet
  },

  // Удаление комплекта
  async deleteSet(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { error } = await supabase.from('chessboard_sets').delete().eq('id', id)

    if (error) {
      console.error('Failed to delete chessboard set:', error)
      throw error
    }
  },

  // Генерация уникального номера комплекта
  async generateSetNumber(): Promise<string> {
    if (!supabase) throw new Error('Supabase client not initialized')

    // Получаем текущую дату для формирования номера
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    const prefix = `SET-${year}${month}${day}`

    // Находим последний номер комплекта за сегодня
    const { data, error } = await supabase
      .from('chessboard_sets')
      .select('set_number')
      .like('set_number', `${prefix}%`)
      .order('set_number', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Failed to generate set number:', error)
      throw error
    }

    let nextNumber = 1
    if (data && data.length > 0) {
      const lastNumber = data[0].set_number
      const numberPart = lastNumber.split('-').pop()
      if (numberPart) {
        nextNumber = parseInt(numberPart, 10) + 1
      }
    }

    return `${prefix}-${String(nextNumber).padStart(3, '0')}`
  },

  // Получение фильтров комплекта для применения в Шахматке
  getFiltersFromSet(set: ChessboardSet): ChessboardSetFilters {
    return {
      project_id: set.project_id,
      documentation_id: set.documentation_id,
      version_id: set.version_id,
      tag_id: set.tag_id,
      block_ids: set.block_ids,
      cost_category_ids: set.cost_category_ids,
      cost_type_ids: set.cost_type_ids,
    }
  },

  // Поиск комплекта по набору фильтров
  async findSetByFilters(filters: Partial<ChessboardSetFilters>): Promise<ChessboardSet | null> {
    if (!supabase || !filters.project_id) return null

    try {
      // Получаем все комплекты проекта - фильтрацию делаем вручную для точного совпадения
      const { data, error } = await supabase
        .from('chessboard_sets')
        .select('*')
        .eq('project_id', filters.project_id)

      if (error) {
        console.error('Failed to find set by filters:', error)
        return null
      }

      // Фильтруем по массивам вручную для точного совпадения
      const matchedSet = (data || []).find((set) => {
        // Вспомогательная функция для сравнения массивов
        const arraysEqual = (arr1: any[] | null | undefined, arr2: any[] | null | undefined): boolean => {
          // Оба null/undefined - совпадают
          if ((arr1 == null || arr1.length === 0) && (arr2 == null || arr2.length === 0)) {
            return true
          }
          // Один пустой, другой нет - не совпадают
          if ((arr1 == null || arr1.length === 0) || (arr2 == null || arr2.length === 0)) {
            return false
          }
          // Разные длины - не совпадают
          if (arr1.length !== arr2.length) {
            return false
          }
          // Проверяем все элементы
          return arr1.every((id) => arr2.includes(id))
        }

        // Проверяем tag_id (раздел) - ВАЖНО: undefined в фильтре != null в комплекте
        const tagIdMatch =
          filters.tag_id === undefined
            ? set.tag_id == null // Если tag_id не передан - комплект должен иметь null
            : filters.tag_id === set.tag_id // Если tag_id передан - должен совпадать точно

        // Проверяем block_ids
        const blockIdsMatch = arraysEqual(filters.block_ids, set.block_ids)

        // Проверяем cost_category_ids
        const categoryIdsMatch = arraysEqual(filters.cost_category_ids, set.cost_category_ids)

        // Проверяем cost_type_ids
        const typeIdsMatch = arraysEqual(filters.cost_type_ids, set.cost_type_ids)

        return tagIdMatch && blockIdsMatch && categoryIdsMatch && typeIdsMatch
      })

      if (matchedSet) {
        // ВСЕГДА проверяем документы комплекта для точного совпадения
        const { data: setDocuments } = await supabase
          .from('chessboard_sets_documents_mapping')
          .select('documentation_id')
          .eq('set_id', matchedSet.id)

        const setDocIds = (setDocuments || []).map(d => d.documentation_id)
        const filterDocIds = filters.documentation_ids || []

        // Точное совпадение: оба пустые ИЛИ оба заполнены одинаково
        const docsMatch =
          filterDocIds.length === setDocIds.length &&
          filterDocIds.every(id => setDocIds.includes(id))

        if (!docsMatch) {
          return null // Документы не совпадают - комплект не подходит
        }

        // Получаем текущий статус
        const currentStatus = await this.getCurrentStatus(matchedSet.id)
        if (currentStatus) {
          const setWithStatus = matchedSet as ChessboardSet
          setWithStatus.status = {
            id: currentStatus.status_id,
            name: currentStatus.status_name,
            color: currentStatus.status_color,
          }
        }
      }

      return matchedSet || null
    } catch (error) {
      console.error('Error finding set by filters:', error)
      return null
    }
  },

  // Методы для работы с таблицей маппинга статусов

  // Добавление нового статуса комплекту (использует универсальную таблицу statuses_mapping)
  async addStatusToSet(request: AddChessboardSetStatusRequest): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    // ШАГО 1: Снимаем флаг is_current со всех предыдущих записей этого комплекта
    // Это необходимо для избежания конфликта с уникальным индексом idx_statuses_mapping_unique_current
    const { error: updateError } = await supabase
      .from('statuses_mapping')
      .update({ is_current: false })
      .eq('entity_type', 'chessboard_set')
      .eq('entity_id', request.chessboard_set_id)
      .eq('is_current', true)

    if (updateError) {
      console.error('Failed to update previous status:', updateError)
      throw updateError
    }

    // ШАГ 2: Вставляем новую запись с is_current = true
    const { error: insertError } = await supabase.from('statuses_mapping').insert({
      entity_type: 'chessboard_set',
      entity_id: request.chessboard_set_id,
      status_id: request.status_id,
      comment: request.comment || null,
      assigned_by: request.assigned_by || null,
      is_current: true,
    })

    if (insertError) {
      console.error('Failed to add status to set:', insertError)
      throw insertError
    }
  },

  // Получение истории статусов комплекта (использует универсальную таблицу statuses_mapping)
  async getSetStatusHistory(setId: string): Promise<ChessboardSetStatusHistory[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('statuses_mapping')
      .select('*')
      .eq('entity_type', 'chessboard_set')
      .eq('entity_id', setId)
      .order('assigned_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch status history:', error)
      throw error
    }

    // Получаем статусы отдельным запросом
    const statusIds = [...new Set((data || []).map((item: any) => item.status_id))]
    let statusesMap: Record<string, { name: string; color?: string }> = {}

    if (statusIds.length > 0) {
      const { data: statuses } = await supabase
        .from('statuses')
        .select('id, name, color')
        .in('id', statusIds)

      statusesMap = (statuses || []).reduce((acc: any, s: any) => {
        acc[s.id] = { name: s.name, color: s.color }
        return acc
      }, {})
    }

    return (data || []).map((item) => ({
      status_id: item.status_id,
      status_name: statusesMap[item.status_id]?.name || '',
      status_color: statusesMap[item.status_id]?.color,
      assigned_at: item.assigned_at,
      assigned_by: item.assigned_by,
      comment: item.comment,
      is_current: item.is_current,
    }))
  },

  // Получение текущего статуса комплекта (использует универсальную таблицу statuses_mapping)
  async getCurrentStatus(setId: string): Promise<ChessboardSetStatusHistory | null> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('statuses_mapping')
      .select('*')
      .eq('entity_type', 'chessboard_set')
      .eq('entity_id', setId)
      .eq('is_current', true)
      .maybeSingle()

    if (error) {
      console.error('Failed to fetch current status:', error)
      throw error
    }

    if (!data) return null

    // Получаем данные статуса отдельным запросом
    const { data: statusData } = await supabase
      .from('statuses')
      .select('id, name, color')
      .eq('id', data.status_id)
      .single()

    return {
      status_id: data.status_id,
      status_name: statusData?.name || '',
      status_color: statusData?.color,
      assigned_at: data.assigned_at,
      assigned_by: data.assigned_by,
      comment: data.comment,
      is_current: data.is_current,
    }
  },

  // Получение комплектов с текущими статусами из представления
  async getSetsWithCurrentStatus(
    filters?: ChessboardSetSearchFilters,
  ): Promise<ChessboardSetWithCurrentStatus[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    let query = supabase
      .from('chessboard_sets_with_status')
      .select('*')
      .order('status_assigned_at', { ascending: false, nullsFirst: false })

    // Применяем фильтры
    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id)
    }
    if (filters?.documentation_id) {
      query = query.eq('documentation_id', filters.documentation_id)
    }
    if (filters?.status_id) {
      query = query.eq('status_id', filters.status_id)
    }
    if (filters?.tag_id) {
      query = query.eq('tag_id', filters.tag_id)
    }
    if (filters?.search) {
      query = query.or(`set_number.ilike.%${filters.search}%,name.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch sets with current status:', error)
      throw error
    }

    return (data || []).map((item) => ({
      id: item.id,
      set_number: item.set_number,
      name: item.name,
      project_id: item.project_id,
      documentation_id: item.documentation_id,
      version_id: item.version_id,
      tag_id: item.tag_id,
      block_ids: item.block_ids,
      cost_category_ids: item.cost_category_ids,
      cost_type_ids: item.cost_type_ids,
      created_at: item.created_at,
      updated_at: item.updated_at,
      current_status: item.status_id
        ? {
            status_id: item.status_id,
            status_name: item.status_name,
            status_color: item.status_color,
            assigned_at: item.status_assigned_at,
            assigned_by: item.status_assigned_by,
            comment: item.status_comment,
          }
        : undefined,
    }))
  },
}
