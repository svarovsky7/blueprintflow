import { supabase } from '@/lib/supabase'
import { CHESSBOARD_STATUS_COLORS, PAGE_FORMATS } from '@/shared/constants/statusColors'

export interface Status {
  id: string
  name: string
  color?: string
  is_active: boolean
  applicable_pages: string[]
  created_at: string
  updated_at: string
}

export const statusesApi = {
  // Получение всех статусов
  async getAllStatuses(): Promise<Status[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('statuses')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Failed to fetch statuses:', error)
      throw error
    }

    return data || []
  },

  // Получение активных статусов с фильтрацией по applicable_pages
  async getStatuses(pageKey?: string): Promise<Status[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('statuses')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Failed to fetch statuses:', error)
      throw error
    }

    // Если передан pageKey, фильтруем по applicable_pages
    if (pageKey && data) {
      return data.filter(
        (status) => status.applicable_pages && status.applicable_pages.includes(pageKey)
      )
    }

    return data || []
  },

  // Инициализация статусов для Шахматки
  async initializeChessboardStatuses(): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const defaultStatuses = [
      {
        name: 'Черновик',
        color: CHESSBOARD_STATUS_COLORS.DRAFT,
        applicable_pages: [PAGE_FORMATS.CHESSBOARD],
      },
      {
        name: 'На проверке',
        color: CHESSBOARD_STATUS_COLORS.REVIEW,
        applicable_pages: [PAGE_FORMATS.CHESSBOARD],
      },
      {
        name: 'Утвержден',
        color: CHESSBOARD_STATUS_COLORS.APPROVED,
        applicable_pages: [PAGE_FORMATS.CHESSBOARD],
      },
      {
        name: 'Отклонен',
        color: CHESSBOARD_STATUS_COLORS.REJECTED,
        applicable_pages: [PAGE_FORMATS.CHESSBOARD],
      },
      {
        name: 'Архив',
        color: CHESSBOARD_STATUS_COLORS.ARCHIVE,
        applicable_pages: [PAGE_FORMATS.CHESSBOARD],
      },
    ]

    for (const status of defaultStatuses) {
      // Проверяем, существует ли статус
      const { data: existing } = await supabase
        .from('statuses')
        .select('id, applicable_pages')
        .eq('name', status.name)
        .single()

      if (existing) {
        // Обновляем applicable_pages, добавляя PAGE_FORMATS.CHESSBOARD если его там нет
        const pages = existing.applicable_pages || []
        if (!pages.includes(PAGE_FORMATS.CHESSBOARD)) {
          pages.push(PAGE_FORMATS.CHESSBOARD)
          await supabase.from('statuses').update({ applicable_pages: pages }).eq('id', existing.id)
        }
      } else {
        // Создаем новый статус
        await supabase.from('statuses').insert({
          name: status.name,
          color: status.color,
          is_active: true,
          applicable_pages: status.applicable_pages,
        })
      }
    }
  },
}
