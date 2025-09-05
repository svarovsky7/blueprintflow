import { supabase } from '@/lib/supabase'
import type {
  ChessboardSet,
  ChessboardSetStatus,
  ChessboardSetFilters,
  CreateChessboardSetRequest,
  UpdateChessboardSetRequest,
  ChessboardSetTableRow,
  ChessboardSetSearchFilters
} from '../types'

export const chessboardSetsApi = {
  // Получение всех статусов комплектов
  async getStatuses(): Promise<ChessboardSetStatus[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('chessboard_set_statuses')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error('Failed to fetch chessboard set statuses:', error)
      throw error
    }

    return data || []
  },

  // Создание нового комплекта
  async createSet(request: CreateChessboardSetRequest): Promise<ChessboardSet> {
    if (!supabase) throw new Error('Supabase client not initialized')

    // Генерируем уникальный номер комплекта
    const setNumber = await this.generateSetNumber()

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
      status_id: request.status_id,
    }

    const { data, error } = await supabase
      .from('chessboard_sets')
      .insert([newSet])
      .select(`
        *,
        project:projects(id, name),
        documentation:documentations(id, code, project_name),
        version:documentation_versions(id, version_number, issue_date),
        tag:documentation_tags(id, name, tag_number),
        status:chessboard_set_statuses(id, name, color, description)
      `)
      .single()

    if (error) {
      console.error('Failed to create chessboard set:', error)
      throw error
    }

    return data as ChessboardSet
  },

  // Получение комплектов с фильтрацией
  async getSets(filters?: ChessboardSetSearchFilters): Promise<ChessboardSetTableRow[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    let query = supabase
      .from('chessboard_sets')
      .select(`
        *,
        project:projects(id, name),
        documentation:documentations(id, code, project_name),
        version:documentation_versions(id, version_number, issue_date),
        tag:documentation_tags(id, name, tag_number),
        status:chessboard_set_statuses(id, name, color, description)
      `)
      .order('created_at', { ascending: false })

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
      console.error('Failed to fetch chessboard sets:', error)
      throw error
    }

    // Преобразуем в формат для таблицы
    return (data || []).map(set => ({
      id: set.id,
      set_number: set.set_number,
      name: set.name,
      project_name: set.project?.name || '',
      documentation_code: set.documentation?.code || '',
      version_number: set.version?.version_number || 0,
      tag_name: set.tag?.name || '',
      block_names: '', // TODO: загрузить названия блоков по ID
      cost_category_names: '', // TODO: загрузить названия категорий по ID  
      cost_type_names: '', // TODO: загрузить названия типов по ID
      status_name: set.status?.name || '',
      status_color: set.status?.color || '#888888',
      created_at: set.created_at,
      updated_at: set.updated_at,
    }))
  },

  // Получение комплекта по ID
  async getSetById(id: string): Promise<ChessboardSet | null> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('chessboard_sets')
      .select(`
        *,
        project:projects(id, name),
        documentation:documentations(id, code, project_name),
        version:documentation_versions(id, version_number, issue_date),
        tag:documentation_tags(id, name, tag_number),
        status:chessboard_set_statuses(id, name, color, description)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Failed to fetch chessboard set:', error)
      throw error
    }

    return data as ChessboardSet
  },

  // Обновление комплекта
  async updateSet(id: string, request: UpdateChessboardSetRequest): Promise<ChessboardSet> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const updates: any = {
      updated_at: new Date().toISOString()
    }

    if (request.name !== undefined) {
      updates.name = request.name
    }
    if (request.status_id !== undefined) {
      updates.status_id = request.status_id
    }

    const { data, error } = await supabase
      .from('chessboard_sets')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        project:projects(id, name),
        documentation:documentations(id, code, project_name),
        version:documentation_versions(id, version_number, issue_date),
        tag:documentation_tags(id, name, tag_number),
        status:chessboard_set_statuses(id, name, color, description)
      `)
      .single()

    if (error) {
      console.error('Failed to update chessboard set:', error)
      throw error
    }

    return data as ChessboardSet
  },

  // Удаление комплекта
  async deleteSet(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { error } = await supabase
      .from('chessboard_sets')
      .delete()
      .eq('id', id)

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
  }
}