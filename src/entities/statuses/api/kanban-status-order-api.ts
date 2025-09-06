import { supabase } from '@/lib/supabase'

export interface KanbanStatusOrder {
  id: string
  kanban_page: string
  status_id: string
  order_position: number
  created_at: string
  updated_at: string
}

export const kanbanStatusOrderApi = {
  // Получить порядок статусов для канбан-страницы
  async getStatusOrder(kanbanPage: string): Promise<KanbanStatusOrder[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('kanban_status_order')
      .select('*')
      .eq('kanban_page', kanbanPage)
      .order('order_position', { ascending: true })

    if (error) {
      console.error('Failed to fetch kanban status order:', error)
      throw error
    }

    return data || []
  },

  // Сохранить порядок статусов для канбан-страницы
  async saveStatusOrder(kanbanPage: string, statusIds: string[]): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    // Удаляем старый порядок
    const { error: deleteError } = await supabase
      .from('kanban_status_order')
      .delete()
      .eq('kanban_page', kanbanPage)

    if (deleteError) {
      console.error('Failed to delete old status order:', deleteError)
      throw deleteError
    }

    // Создаем новый порядок
    if (statusIds.length > 0) {
      const orderRecords = statusIds.map((statusId, index) => ({
        kanban_page: kanbanPage,
        status_id: statusId,
        order_position: index,
      }))

      const { error: insertError } = await supabase
        .from('kanban_status_order')
        .insert(orderRecords)

      if (insertError) {
        console.error('Failed to insert new status order:', insertError)
        throw insertError
      }
    }
  },

  // Обновить позицию статуса
  async updateStatusPosition(
    kanbanPage: string,
    statusId: string,
    newPosition: number
  ): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    // Получаем текущий порядок
    const currentOrder = await this.getStatusOrder(kanbanPage)
    
    // Находим текущую позицию статуса
    const currentIndex = currentOrder.findIndex(item => item.status_id === statusId)
    if (currentIndex === -1) {
      // Если статуса нет, добавляем его
      const { error } = await supabase
        .from('kanban_status_order')
        .insert({
          kanban_page: kanbanPage,
          status_id: statusId,
          order_position: newPosition,
        })
      
      if (error) throw error
      return
    }

    // Перестраиваем порядок
    const statusIds = currentOrder.map(item => item.status_id)
    statusIds.splice(currentIndex, 1)
    statusIds.splice(newPosition, 0, statusId)

    // Сохраняем новый порядок
    await this.saveStatusOrder(kanbanPage, statusIds)
  },
}