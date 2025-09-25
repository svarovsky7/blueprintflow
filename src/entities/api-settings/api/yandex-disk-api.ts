// ЯНДЕКС ДИСК API
// Этот файл содержит функции для работы с Яндекс Диском
// Перенесено из src/entities/disk/api/disk-api.ts для новой структуры

import { supabase } from '@/lib/supabase'
import type { YandexDiskSettings } from '../types'

/**
 * API для работы с настройками Яндекс Диска
 * Используется для хранения OAuth токена, базового пути и настроек публикации
 */
export const yandexDiskApi = {
  /**
   * ПОЛУЧЕНИЕ НАСТРОЕК ЯНДЕКС ДИСКА
   * Загружает настройки из таблицы yandex_disk_settings
   * Возвращает null если настройки не найдены
   */
  async getSettings(): Promise<YandexDiskSettings | null> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase.from('yandex_disk_settings').select('*').single()

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to fetch Yandex Disk settings:', error)
      throw error
    }

    return data as YandexDiskSettings | null
  },

  /**
   * СОХРАНЕНИЕ НАСТРОЕК ЯНДЕКС ДИСКА
   * Создает новые настройки или обновляет существующие
   * Использует upsert логику для автоматического выбора INSERT/UPDATE
   */
  async upsertSettings(input: Partial<YandexDiskSettings>): Promise<YandexDiskSettings> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data: existing } = await supabase.from('yandex_disk_settings').select('id').single()

    const query = supabase.from('yandex_disk_settings')
    const { data, error } = existing
      ? await query.update(input).eq('id', existing.id).select().single()
      : await query.insert(input).select().single()

    if (error) {
      console.error('Failed to upsert Yandex Disk settings:', error)
      throw error
    }

    return data as YandexDiskSettings
  },

  /**
   * ПРОВЕРКА ПОДКЛЮЧЕНИЯ К ЯНДЕКС ДИСКУ
   * Тестирует валидность OAuth токена путем запроса информации о диске
   * Возвращает true если токен действителен, false в противном случае
   */
  async testConnection(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://cloud-api.yandex.net/v1/disk', {
        headers: {
          Authorization: `OAuth ${token}`,
        },
      })

      return response.ok
    } catch (error) {
      console.error('Yandex Disk connection test failed:', error)
      return false
    }
  },

  /**
   * ПОЛУЧЕНИЕ ИНФОРМАЦИИ О ДИСКЕ
   * Возвращает информацию о доступном месте на диске
   * Используется для отображения статистики использования
   */
  async getDiskInfo(token: string): Promise<{
    total_space: number
    used_space: number
    free_space: number
  } | null> {
    try {
      const response = await fetch('https://cloud-api.yandex.net/v1/disk', {
        headers: {
          Authorization: `OAuth ${token}`,
        },
      })

      if (!response.ok) return null

      const data = await response.json()
      return {
        total_space: data.total_space,
        used_space: data.used_space,
        free_space: data.total_space - data.used_space,
      }
    } catch (error) {
      console.error('Failed to get disk info:', error)
      return null
    }
  },
}

// ОБРАТНАЯ СОВМЕСТИМОСТЬ: Экспорт под старым именем
// Это позволяет FileUpload.tsx продолжать работать без изменений
export const diskApi = yandexDiskApi
