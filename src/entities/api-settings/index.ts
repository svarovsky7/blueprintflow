// API SETTINGS ENTITY
// Центральная точка экспорта для всех API настроек
// Обеспечивает обратную совместимость с существующим кодом

// Экспорт типов
export type {
  YandexDiskSettings,
  DeepseekSettings,
  DeepseekUsageStats,
  DeepseekMaterialRequest,
  DeepseekMaterialResponse,
  MLMode,
  MLModeConfig,
  // Обратная совместимость
  DiskSettings,
} from './types'

// Экспорт API функций
export { yandexDiskApi } from './api/yandex-disk-api'
export { deepseekApi, mlModeApi } from './api/deepseek-api'

// ОБРАТНАЯ СОВМЕСТИМОСТЬ
// Экспорт под старыми именами для существующего кода
export { yandexDiskApi as diskApi } from './api/yandex-disk-api'

/**
 * МИГРАЦИОННЫЕ ХЕЛПЕРЫ
 * Функции для упрощения перехода с старой структуры на новую
 */

/**
 * Получить настройки диска (старое API)
 * @deprecated Используйте yandexDiskApi.getSettings()
 */
export const getDiskSettings = () => {
  console.warn('getDiskSettings is deprecated. Use yandexDiskApi.getSettings() instead')
  const { yandexDiskApi } = require('./api/yandex-disk-api')
  return yandexDiskApi.getSettings()
}

/**
 * Сохранить настройки диска (старое API)
 * @deprecated Используйте yandexDiskApi.upsertSettings()
 */
export const saveDiskSettings = (settings: any) => {
  console.warn('saveDiskSettings is deprecated. Use yandexDiskApi.upsertSettings() instead')
  const { yandexDiskApi } = require('./api/yandex-disk-api')
  return yandexDiskApi.upsertSettings(settings)
}
