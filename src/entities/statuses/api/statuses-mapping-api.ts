import { supabase } from '@/lib/supabase'

export interface StatusMapping {
  id: string
  entity_type: string
  entity_id: string
  status_id: string
  assigned_at: string
  assigned_by?: string | null
  comment?: string | null
  is_current: boolean
  metadata?: Record<string, unknown> | null
}

export interface StatusMappingWithDetails extends StatusMapping {
  status?: {
    id: string
    name: string
    color?: string
  }
}

export interface AddStatusMappingRequest {
  entity_type: string
  entity_id: string
  status_id: string
  assigned_by?: string | null
  comment?: string | null
  metadata?: Record<string, unknown> | null
}

export const statusesMappingApi = {
  // Добавление статуса к любой сущности
  async addStatus(request: AddStatusMappingRequest): Promise<string> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('statuses_mapping')
      .insert({
        entity_type: request.entity_type,
        entity_id: request.entity_id,
        status_id: request.status_id,
        assigned_by: request.assigned_by || null,
        comment: request.comment || null,
        metadata: request.metadata || null,
        is_current: true,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to add status mapping:', error)
      throw error
    }

    return data.id
  },

  // Получение текущего статуса сущности
  async getCurrentStatus(
    entityType: string,
    entityId: string,
  ): Promise<StatusMappingWithDetails | null> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('statuses_mapping')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
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

    // Получаем данные статуса отдельным запросом
    const { data: statusData } = await supabase
      .from('statuses')
      .select('id, name, color')
      .eq('id', data.status_id)
      .single()

    return {
      ...data,
      status: statusData ? { id: statusData.id, name: statusData.name, color: statusData.color } : undefined
    } as StatusMappingWithDetails
  },

  // Получение истории статусов сущности
  async getStatusHistory(
    entityType: string,
    entityId: string,
  ): Promise<StatusMappingWithDetails[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('statuses_mapping')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('assigned_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch status history:', error)
      throw error
    }

    // Получаем статусы отдельным запросом
    const statusIds = [...new Set((data || []).map((item: any) => item.status_id))]
    let statusesMap: Record<string, { id: string; name: string; color?: string }> = {}

    if (statusIds.length > 0) {
      const { data: statuses } = await supabase
        .from('statuses')
        .select('id, name, color')
        .in('id', statusIds)

      statusesMap = (statuses || []).reduce((acc: any, s: any) => {
        acc[s.id] = { id: s.id, name: s.name, color: s.color }
        return acc
      }, {})
    }

    return (data || []).map((item: any) => ({
      ...item,
      status: statusesMap[item.status_id]
    })) as StatusMappingWithDetails[]
  },

  // Удаление статуса (soft delete - просто снимаем флаг is_current)
  async removeCurrentStatus(entityType: string, entityId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { error } = await supabase
      .from('statuses_mapping')
      .update({ is_current: false })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('is_current', true)

    if (error) {
      console.error('Failed to remove current status:', error)
      throw error
    }
  },

  // Обновление комментария к статусу
  async updateStatusComment(mappingId: string, comment: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { error } = await supabase
      .from('statuses_mapping')
      .update({ comment })
      .eq('id', mappingId)

    if (error) {
      console.error('Failed to update status comment:', error)
      throw error
    }
  },

  // Массовое добавление статусов
  async addStatusBatch(requests: AddStatusMappingRequest[]): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const mappings = requests.map((req) => ({
      entity_type: req.entity_type,
      entity_id: req.entity_id,
      status_id: req.status_id,
      assigned_by: req.assigned_by || null,
      comment: req.comment || null,
      metadata: req.metadata || null,
      is_current: true,
    }))

    const { error } = await supabase.from('statuses_mapping').insert(mappings)

    if (error) {
      console.error('Failed to add status mappings batch:', error)
      throw error
    }
  },

  // Получение всех сущностей с определенным статусом
  async getEntitiesByStatus(
    statusId: string,
    entityType?: string,
  ): Promise<StatusMappingWithDetails[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    let query = supabase
      .from('statuses_mapping')
      .select('*')
      .eq('status_id', statusId)
      .eq('is_current', true)

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    const { data, error } = await query.order('assigned_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch entities by status:', error)
      throw error
    }

    // Получаем данные статуса отдельным запросом
    const { data: statusData } = await supabase
      .from('statuses')
      .select('id, name, color')
      .eq('id', statusId)
      .single()

    const status = statusData ? { id: statusData.id, name: statusData.name, color: statusData.color } : undefined

    return (data || []).map((item: any) => ({
      ...item,
      status
    })) as StatusMappingWithDetails[]
  },
}
