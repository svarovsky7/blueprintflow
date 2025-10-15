// ============================================================================
// PUBLIC API для entities/rates
// ============================================================================

// Work Sets API
export {
  getAllWorkSets,
  getWorkSetById,
  getWorkSetByName,
  createWorkSet,
  updateWorkSet,
  deleteWorkSet,
  getOrCreateWorkSet,
  bulkGetOrCreateWorkSets,
  deactivateWorkSet,
  activateWorkSet,
} from './work-sets-api'

// Work Set Rates API
export {
  getAllWorkSetRates,
  getWorkSetRateById,
  createWorkSetRate,
  updateWorkSetRate,
  deleteWorkSetRate,
  bulkCreateWorkSetRates,
  getWorkSetsByCategory,
  getWorkNamesByWorkSet,
  getWorkSetRatesByFilters,
  addRateCategoryMapping,
  removeRateCategoryMappings,
  updateRateCategoryMappings,
  deactivateWorkSetRate,
  activateWorkSetRate,
} from './work-set-rates-api'

// Work Set Rates Form API (high-level API for forms)
export {
  createWorkSetRateFromForm,
  updateWorkSetRateFromForm,
  bulkCreateWorkSetRatesFromForm,
  bulkUpdateWorkSetRatesFromForm,
  bulkDeleteWorkSetRates,
  deleteWorkSetRateById,
} from './work-set-rates-form-api'
