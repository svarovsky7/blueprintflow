export interface NomenclatureSuggestion {
  id: string
  name: string
  confidence: number // 0-1, где 1 = 100% уверенности
  reasoning?: string // Объяснение, почему этот вариант подходит

  // РАСШИРЕННЫЕ ПОЛЯ ДЛЯ AI АНАЛИЗА (Deepseek)
  tooltip_info?: string // Краткая справка для показа при наведении
  price_analysis?: string // Анализ цен и выгоды
  quality_score?: number // Оценка качества (1-10)
  supplier_name?: string // Рекомендуемый поставщик
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
  modelUsed: 'similarity' | 'embedding' | 'llm' | 'deepseek' | 'fallback'
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

  // Настройки точности сопоставления
  algorithm: 'strict' | 'balanced' | 'fuzzy' // Режим сопоставления
  keywordBonus: number // Бонус за совпадающие ключевые слова (0-1)
  exactMatchBonus: number // Бонус за точное совпадение части строки (0-1)
  prefixBonus: number // Бонус за совпадение в начале строки (0-1)
  similarityWeight: number // Вес алгоритма Levenshtein (0-1)
  minWordLength: number // Минимальная длина слова для поиска
  ignoredTerms: string[] // Игнорируемые термины при сопоставлении
}

export interface MLMetrics {
  totalPredictions: number
  successfulPredictions: number
  averageConfidence: number
  averageProcessingTime: number
  modelUsageStats: Record<string, number>
}