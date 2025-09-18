// Public API exports for ML entity

// Types
export type {
  NomenclatureSuggestion,
  MLPredictionRequest,
  MLPredictionResponse,
  MaterialEmbedding,
  NomenclatureEmbedding,
  MLConfig,
  MLMetrics
} from './model/types'

// API functions
export {
  predictNomenclature,
  getMLConfig,
  saveMLConfig,
  getMLMetrics,
  updateMLMetrics,
  searchNomenclature
} from './api/ml-api'

// React hooks and components
export { useMLNomenclature } from './lib/useMLNomenclature'
export { MLNomenclatureSelect } from './lib/MLNomenclatureSelect'