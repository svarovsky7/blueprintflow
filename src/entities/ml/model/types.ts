export interface NomenclatureSuggestion {
  id: string
  name: string
  confidence: number // 0-1, где 1 = 100% уверенности
  reasoning?: string // Объяснение, почему этот вариант подходит
}

export interface MLPredictionRequest {
  materialName: string
  context?: {
    projectId?: string
    categoryId?: string
    typeId?: string
  }
}

export interface MLPredictionResponse {
  suggestions: NomenclatureSuggestion[]
  processingTime: number // время обработки в мс
  modelUsed: 'similarity' | 'embedding' | 'llm' | 'fallback'
  fallbackReason?: string // причина использования fallback
}

export interface MaterialEmbedding {
  materialName: string
  embedding: number[]
  lastUpdated: string
}

export interface NomenclatureEmbedding {
  nomenclatureId: string
  nomenclatureName: string
  embedding: number[]
  lastUpdated: string
}

export interface MLConfig {
  enabled: boolean
  confidenceThreshold: number // минимальный порог уверенности для показа предложений
  maxSuggestions: number
  modelEndpoint?: string
  apiKey?: string
}

export interface MLMetrics {
  totalPredictions: number
  successfulPredictions: number
  averageConfidence: number
  averageProcessingTime: number
  modelUsageStats: Record<string, number>
}