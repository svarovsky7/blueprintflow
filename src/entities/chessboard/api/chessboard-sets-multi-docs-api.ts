import { supabase } from '@/lib/supabase'
import type {
  ChessboardSet,
  ChessboardSetDocument,
  ChessboardSetFilters,
  CreateChessboardSetRequest,
  ChessboardSetSearchFilters,
} from '../types'

// API для работы с комплектами с множественными документами
export const chessboardSetsMultiDocsApi = {
  // Создание нового комплекта с множественными документами
  async createSetWithMultipleDocs(request: CreateChessboardSetRequest): Promise<ChessboardSet> {
    if (!supabase) throw new Error('Supabase client not initialized')

    // Валидация количества документов
    if (!request.filters.documents || request.filters.documents.length === 0) {
      throw new Error('Комплект должен содержать хотя бы один документ')
    }

    // Проверяем уникальность набора документов и фильтров
    const existingSet = await this.findSetByMultiDocFilters(request.filters)
    if (existingSet) {
      throw new Error(`Комплект с таким набором документов и фильтров уже существует (№${existingSet.set_number})`)
    }

    // Генерируем уникальный номер комплекта
    const setNumber = await this.generateSetNumber()

    try {
      // Начинаем транзакцию
      // 1. Создаем основную запись комплекта
      const { data: setData, error: setError } = await supabase
        .from('chessboard_sets')
        .insert({
          set_number: setNumber,
          name: request.name || null,
          project_id: request.filters.project_id,
          tag_id: request.filters.tag_id || null,
          block_ids: request.filters.block_ids || null,
          cost_category_ids: request.filters.cost_category_ids || null,
          cost_type_ids: request.filters.cost_type_ids || null,
        })
        .select()
        .single()

      if (setError) throw setError

      // 2. Добавляем документы в маппинг
      const documentMappings = request.filters.documents.map((doc, index) => ({
        set_id: setData.id,
        documentation_id: doc.documentation_id,
        version_id: doc.version_id,
        order_index: doc.order_index ?? index,
      }))

      const { error: mappingError } = await supabase
        .from('chessboard_sets_documents_mapping')
        .insert(documentMappings)

      if (mappingError) {
        // Откатываем создание комплекта при ошибке
        await supabase.from('chessboard_sets').delete().eq('id', setData.id)
        throw mappingError
      }

      // 3. Добавляем статус если указан
      if (request.status_id) {
        await supabase.from('statuses_mapping').insert({
          entity_type: 'chessboard_set',
          entity_id: setData.id,
          status_id: request.status_id,
          comment: 'Начальный статус при создании комплекта',
          is_current: true,
        })
      }

      // 4. Получаем полные данные созданного комплекта
      return await this.getSetWithDocuments(setData.id)
    } catch (error) {
      console.error('Failed to create chessboard set with documents:', error)
      throw error
    }
  },

  // Получение комплекта с документами
  async getSetWithDocuments(setId: string): Promise<ChessboardSet> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('chessboard_sets_with_documents')
      .select('*')
      .eq('id', setId)
      .single()

    if (error) {
      console.error('Failed to fetch set with documents:', error)
      throw error
    }

    // Преобразуем JSONB поле documents в массив
    const documents = data.documents as ChessboardSetDocument[]
    
    return {
      ...data,
      documents: documents || [],
    } as ChessboardSet
  },

  // Поиск комплекта по набору фильтров с множественными документами
  async findSetByMultiDocFilters(filters: ChessboardSetFilters): Promise<ChessboardSet | null> {
    if (!supabase || !filters.project_id || !filters.documents?.length) return null

    try {
      // Сортируем документы для сравнения
      const sortedDocs = [...filters.documents].sort((a, b) => {
        if (a.documentation_id !== b.documentation_id) {
          return a.documentation_id.localeCompare(b.documentation_id)
        }
        return a.version_id.localeCompare(b.version_id)
      })

      // Получаем все комплекты проекта
      const { data: sets, error } = await supabase
        .from('chessboard_sets_with_documents')
        .select('*')
        .eq('project_id', filters.project_id)

      if (error) throw error

      // Ищем точное совпадение
      for (const set of sets || []) {
        const setDocs = (set.documents as ChessboardSetDocument[] || []).sort((a, b) => {
          if (a.documentation_id !== b.documentation_id) {
            return a.documentation_id.localeCompare(b.documentation_id)
          }
          return a.version_id.localeCompare(b.version_id)
        })

        // Проверяем совпадение документов
        if (setDocs.length !== sortedDocs.length) continue
        
        const docsMatch = sortedDocs.every((doc, index) => 
          doc.documentation_id === setDocs[index].documentation_id &&
          doc.version_id === setDocs[index].version_id
        )

        if (!docsMatch) continue

        // Проверяем остальные фильтры
        const tagMatch = (set.tag_id ?? null) === (filters.tag_id ?? null)
        const blockIdsMatch = JSON.stringify(set.block_ids || []) === JSON.stringify(filters.block_ids || [])
        const categoryIdsMatch = JSON.stringify(set.cost_category_ids || []) === JSON.stringify(filters.cost_category_ids || [])
        const typeIdsMatch = JSON.stringify(set.cost_type_ids || []) === JSON.stringify(filters.cost_type_ids || [])

        if (tagMatch && blockIdsMatch && categoryIdsMatch && typeIdsMatch) {
          // Загружаем статус комплекта
          const { data: statusMapping } = await supabase
            .from('statuses_mapping')
            .select('status:statuses(id, name, color)')
            .eq('entity_type', 'chessboard_set')
            .eq('entity_id', set.id)
            .eq('is_current', true)
            .single()
          
          if (statusMapping?.status) {
            set.status = statusMapping.status
          }
          
          return set as ChessboardSet
        }
      }

      return null
    } catch (error) {
      console.error('Error finding set by multi-doc filters:', error)
      return null
    }
  },

  // Обновление документов в комплекте
  async updateSetDocuments(setId: string, documents: ChessboardSetDocument[]): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    // Валидация количества документов
    if (!documents || documents.length === 0) {
      throw new Error('Комплект должен содержать хотя бы один документ')
    }

    try {
      // 1. Удаляем старые маппинги
      const { error: deleteError } = await supabase
        .from('chessboard_sets_documents_mapping')
        .delete()
        .eq('set_id', setId)

      if (deleteError) throw deleteError

      // 2. Добавляем новые маппинги
      const documentMappings = documents.map((doc, index) => ({
        set_id: setId,
        documentation_id: doc.documentation_id,
        version_id: doc.version_id,
        order_index: doc.order_index ?? index,
      }))

      const { error: insertError } = await supabase
        .from('chessboard_sets_documents_mapping')
        .insert(documentMappings)

      if (insertError) throw insertError

      // 3. Обновляем updated_at в основной таблице
      await supabase
        .from('chessboard_sets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', setId)

    } catch (error) {
      console.error('Failed to update set documents:', error)
      throw error
    }
  },

  // Добавление документа в комплект
  async addDocumentToSet(setId: string, document: ChessboardSetDocument): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    // Получаем текущее количество документов для order_index
    const { count, error: countError } = await supabase
      .from('chessboard_sets_documents_mapping')
      .select('*', { count: 'exact', head: true })
      .eq('set_id', setId)

    if (countError) throw countError

    // Добавляем документ
    const { error } = await supabase
      .from('chessboard_sets_documents_mapping')
      .insert({
        set_id: setId,
        documentation_id: document.documentation_id,
        version_id: document.version_id,
        order_index: document.order_index ?? (count || 0),
      })

    if (error) throw error
  },

  // Удаление документа из комплекта
  async removeDocumentFromSet(setId: string, documentationId: string, versionId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    // Проверяем, что останется хотя бы один документ
    const { count, error: countError } = await supabase
      .from('chessboard_sets_documents_mapping')
      .select('*', { count: 'exact', head: true })
      .eq('set_id', setId)

    if (countError) throw countError
    if ((count || 0) <= 1) {
      throw new Error('Комплект должен содержать хотя бы один документ')
    }

    // Удаляем документ
    const { error } = await supabase
      .from('chessboard_sets_documents_mapping')
      .delete()
      .eq('set_id', setId)
      .eq('documentation_id', documentationId)
      .eq('version_id', versionId)

    if (error) throw error
  },

  // Генерация уникального номера комплекта
  async generateSetNumber(): Promise<string> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('chessboard_sets')
      .select('set_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to get last set number:', error)
      throw error
    }

    // Если нет комплектов, начинаем с 001
    if (!data) {
      return 'SET-001'
    }

    // Парсим номер и увеличиваем
    const match = data.set_number.match(/SET-(\d+)/)
    if (match) {
      const nextNumber = parseInt(match[1], 10) + 1
      return `SET-${nextNumber.toString().padStart(3, '0')}`
    }

    return 'SET-001'
  },

  // Получение списка комплектов с документами
  async getSetsWithDocuments(filters?: ChessboardSetSearchFilters): Promise<ChessboardSet[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    let query = supabase
      .from('chessboard_sets_with_documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id)
    }

    if (filters?.search) {
      query = query.or(`set_number.ilike.%${filters.search}%,name.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch sets with documents:', error)
      throw error
    }

    return (data || []).map(set => ({
      ...set,
      documents: set.documents || [],
    })) as ChessboardSet[]
  },
}