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

    console.log('Fetching statuses for Chessboard page from statuses table...')

    // Получаем все активные статусы
    const { data, error } = await supabase
      .from('statuses')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    console.log('Statuses query result:', { data, error })

    if (error) {
      console.error('Failed to fetch statuses:', error)
      throw error
    }

    // Фильтруем статусы, у которых applicable_pages содержит "Шахматка" или "documents/chessboard"
    const filtered = (data || []).filter((status) => {
      console.log(`Checking status "${status.name}":`, {
        applicable_pages: status.applicable_pages,
        isArray: Array.isArray(status.applicable_pages),
        includesChessboard:
          Array.isArray(status.applicable_pages) &&
          (status.applicable_pages.includes('Шахматка') ||
            status.applicable_pages.includes('documents/chessboard')),
      })

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

    console.log(
      `Found ${filtered.length} statuses for Chessboard page out of ${data?.length || 0} total active statuses`,
    )

    return filtered
  },

  // Создание нового комплекта
  async createSet(request: CreateChessboardSetRequest): Promise<ChessboardSet> {
    if (!supabase) throw new Error('Supabase client not initialized')

    // Проверяем, существует ли уже комплект с такими же фильтрами
    const existingSet = await this.findSetByFilters(request.filters)
    if (existingSet) {
      throw new Error(`Комплект с таким набором фильтров уже существует (№${existingSet.set_number})`)
    }

    // Генерируем уникальный номер комплекта
    const setNumber = await this.generateSetNumber()

    // Создаем комплект без поля status_id (теперь статус хранится в таблице маппинга)
    const newSet = {
      set_number: setNumber,
      name: request.name || null,
      project_id: request.filters.project_id,
      documentation_id: request.filters.documentation_id,
      version_id: request.filters.version_id,
      tag_id: request.filters.tag_id || null,
      block_ids: request.filters.block_ids || null,
      cost_category_ids: request.filters.cost_category_ids || null,
      cost_type_ids: request.filters.cost_type_ids || null,
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

    // Используем представление с документами для получения полной информации
    let query = supabase
      .from('chessboard_sets_with_documents')
      .select('*')
      .order('created_at', { ascending: false })

    // Применяем фильтры
    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id)
    }
    if (filters?.documentation_id) {
      query = query.eq('documentation_id', filters.documentation_id)
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

    // Получаем статусы для всех комплектов одним запросом
    const setIds = (data || []).map((set) => set.id)
    let statusesMap: Record<string, { id: string; name: string; color?: string }> = {}

    if (setIds.length > 0) {
      const { data: statusMappings } = await supabase
        .from('statuses_mapping')
        .select(
          `
          entity_id,
          status:statuses(id, name, color)
        `,
        )
        .eq('entity_type', 'chessboard_set')
        .in('entity_id', setIds)
        .eq('is_current', true)

      statusesMap = (statusMappings || []).reduce(
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
    // Собираем все уникальные ID
    const allBlockIds = new Set<string>()
    const allCategoryIds = new Set<string>()
    const allTypeIds = new Set<string>()

    ;(data || []).forEach((set) => {
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
      
      blocksMap = (blocksData || []).reduce((acc, block) => {
        acc[block.id] = block.name
        return acc
      }, {} as Record<string, string>)
    }

    // Загружаем названия категорий затрат
    let categoriesMap: Record<string, string> = {}
    if (allCategoryIds.size > 0) {
      const { data: categoriesData } = await supabase
        .from('cost_categories')
        .select('id, name')
        .in('id', Array.from(allCategoryIds))
      
      categoriesMap = (categoriesData || []).reduce((acc, category) => {
        acc[category.id] = category.name
        return acc
      }, {} as Record<string, string>)
    }

    // Загружаем названия видов затрат
    let typesMap: Record<string, string> = {}
    if (allTypeIds.size > 0) {
      const { data: typesData } = await supabase
        .from('detail_cost_categories')
        .select('id, name')
        .in('id', Array.from(allTypeIds))
      
      typesMap = (typesData || []).reduce((acc, type) => {
        acc[type.id] = type.name
        return acc
      }, {} as Record<string, string>)
    }

    // Фильтр по статусу если указан
    let filteredData = data || []
    if (filters?.status_id) {
      filteredData = filteredData.filter((set) => statusesMap[set.id]?.id === filters.status_id)
    }

    // Преобразуем в формат для таблицы
    return filteredData.map((set) => {
      const status = statusesMap[set.id]
      
      // Обработка документов - берем первый для обратной совместимости отображения
      const firstDoc = set.documents && set.documents.length > 0 ? set.documents[0] : null
      const docCodes = set.documents ? set.documents.map((d: any) => d.code).filter(Boolean).join(', ') : ''
      
      // Формируем списки названий
      const blockNames = set.block_ids 
        ? set.block_ids.map((id: string) => blocksMap[id]).filter(Boolean).join(', ') 
        : ''
      const categoryNames = set.cost_category_ids
        ? set.cost_category_ids.map((id: string) => categoriesMap[id]).filter(Boolean).join(', ')
        : ''
      const typeNames = set.cost_type_ids
        ? set.cost_type_ids.map((id: string) => typesMap[id]).filter(Boolean).join(', ')
        : ''
      
      return {
        id: set.id,
        set_number: set.set_number,
        name: set.name,
        project_name: set.project?.name || '',
        documentation_code: docCodes || firstDoc?.code || '',
        version_number: firstDoc?.version_number || 0,
        tag_name: set.tag?.name || '',
        block_names: blockNames || 'Все',
        cost_category_names: categoryNames || 'Все',
        cost_type_names: typeNames || 'Все',
        status_name: status?.name || '',
        status_color: status?.color || '#888888',
        created_at: set.created_at,
        updated_at: set.updated_at,
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
      let query = supabase.from('chessboard_sets').select('*').eq('project_id', filters.project_id)

      // Добавляем фильтры
      if (filters.documentation_id) {
        query = query.eq('documentation_id', filters.documentation_id)
      }
      if (filters.version_id) {
        query = query.eq('version_id', filters.version_id)
      }
      if (filters.tag_id !== undefined) {
        if (filters.tag_id === null) {
          query = query.is('tag_id', null)
        } else {
          query = query.eq('tag_id', filters.tag_id)
        }
      }

      // Для массивов проверяем точное совпадение
      const { data, error } = await query

      if (error) {
        console.error('Failed to find set by filters:', error)
        return null
      }

      // Фильтруем по массивам вручную для точного совпадения
      const matchedSet = (data || []).find((set) => {
        // Проверяем block_ids
        const blockIdsMatch =
          (!filters.block_ids && !set.block_ids) ||
          (filters.block_ids &&
            set.block_ids &&
            filters.block_ids.length === set.block_ids.length &&
            filters.block_ids.every((id) => set.block_ids?.includes(id)))

        // Проверяем cost_category_ids
        const categoryIdsMatch =
          (!filters.cost_category_ids && !set.cost_category_ids) ||
          (filters.cost_category_ids &&
            set.cost_category_ids &&
            filters.cost_category_ids.length === set.cost_category_ids.length &&
            filters.cost_category_ids.every((id) => set.cost_category_ids?.includes(id)))

        // Проверяем cost_type_ids
        const typeIdsMatch =
          (!filters.cost_type_ids && !set.cost_type_ids) ||
          (filters.cost_type_ids &&
            set.cost_type_ids &&
            filters.cost_type_ids.length === set.cost_type_ids.length &&
            filters.cost_type_ids.every((id) => set.cost_type_ids?.includes(id)))

        return blockIdsMatch && categoryIdsMatch && typeIdsMatch
      })

      if (matchedSet) {
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

    const { error } = await supabase.from('statuses_mapping').insert({
      entity_type: 'chessboard_set',
      entity_id: request.chessboard_set_id,
      status_id: request.status_id,
      comment: request.comment || null,
      assigned_by: request.assigned_by || null,
      is_current: true,
    })

    if (error) {
      console.error('Failed to add status to set:', error)
      throw error
    }
  },

  // Получение истории статусов комплекта (использует универсальную таблицу statuses_mapping)
  async getSetStatusHistory(setId: string): Promise<ChessboardSetStatusHistory[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('statuses_mapping')
      .select(
        `
        *,
        status:statuses(id, name, color)
      `,
      )
      .eq('entity_type', 'chessboard_set')
      .eq('entity_id', setId)
      .order('assigned_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch status history:', error)
      throw error
    }

    return (data || []).map((item) => ({
      status_id: item.status_id,
      status_name: item.status?.name || '',
      status_color: item.status?.color,
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
      .select(
        `
        *,
        status:statuses(id, name, color)
      `,
      )
      .eq('entity_type', 'chessboard_set')
      .eq('entity_id', setId)
      .eq('is_current', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Статус не найден
      }
      console.error('Failed to fetch current status:', error)
      throw error
    }

    if (!data) return null

    return {
      status_id: data.status_id,
      status_name: data.status?.name || '',
      status_color: data.status?.color,
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
