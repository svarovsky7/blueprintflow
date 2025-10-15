// ============================================================================
// PUBLIC API для entities/rates
// ============================================================================

// Экспортируем все функции из api/
export * from './api'

// Экспортируем все типы из model/types
export type {
  WorkSet,
  WorkSetRate,
  WorkSetRateWithRelations,
  WorkSetRateExcelRow,
  WorkSetRateFormData,
  // Старые типы (deprecated)
  Rate,
  RateWithRelations,
  RateExcelRow,
  RateFormData,
} from './model/types'

// Для обратной совместимости (deprecated)
export { ratesApi } from './api/rates-api'
