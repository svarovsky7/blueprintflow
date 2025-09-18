import { supabase } from '@/lib/supabase'
import type {
  MLPredictionRequest,
  MLPredictionResponse,
  NomenclatureSuggestion,
  MLConfig,
  MLMetrics
} from '../model/types'

/**
 * Получение конфигурации ML
 */
export const getMLConfig = async (): Promise<MLConfig> => {
  // LOG: получение конфигурации ML из localStorage
  const defaultConfig: MLConfig = {
    enabled: true,
    confidenceThreshold: 0.3,
    maxSuggestions: 5
  }

  try {
    const saved = localStorage.getItem('ml-config')
    return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig
  } catch {
    return defaultConfig
  }
}

/**
 * Сохранение конфигурации ML
 */
export const saveMLConfig = async (config: Partial<MLConfig>): Promise<void> => {
  // LOG: сохранение конфигурации ML
  const current = await getMLConfig()
  const updated = { ...current, ...config }
  localStorage.setItem('ml-config', JSON.stringify(updated))
}

/**
 * Основная функция для получения предложений номенклатуры
 */
export const predictNomenclature = async (
  request: MLPredictionRequest
): Promise<MLPredictionResponse> => {
  const startTime = Date.now()
  const config = await getMLConfig()

  if (!config.enabled) {
    // LOG: ML отключен, используем fallback
    return getFallbackSuggestions(request, startTime)
  }

  try {
    // Сначала пробуем простой similarity поиск
    const suggestions = await getSimilarityBasedSuggestions(request)

    if (suggestions.length > 0) {
      return {
        suggestions: suggestions.slice(0, config.maxSuggestions),
        processingTime: Date.now() - startTime,
        modelUsed: 'similarity'
      }
    }

    // Если similarity не дал результатов, используем fallback
    return getFallbackSuggestions(request, startTime)

  } catch (error) {
    console.error('ML prediction error:', error) // LOG: ошибка ML предсказания
    return getFallbackSuggestions(request, startTime, 'Ошибка ML модели')
  }
}

/**
 * УПРОЩЕННЫЙ similarity-based поиск номенклатуры
 */
const getSimilarityBasedSuggestions = async (
  request: MLPredictionRequest
): Promise<NomenclatureSuggestion[]> => {
  if (!supabase) throw new Error('Supabase not initialized')

  const { materialName } = request
  const searchTerm = materialName.toLowerCase().trim()

  if (searchTerm.length < 2) return []

  console.log('🔍 ML: Starting simplified search for:', searchTerm) // LOG: начало упрощенного поиска

  // УПРОЩЕНИЕ: Единый простой ILIKE поиск вместо сложной многоступенчатой логики
  const { data: matches, error } = await supabase
    .from('nomenclature')
    .select('id, name')
    .ilike('name', `%${searchTerm}%`)
    .limit(50) // Увеличиваем лимит для лучшего выбора

  if (error) {
    console.error('🔍 ML: Search failed:', error) // LOG: ошибка поиска
    return []
  }

  if (!matches || matches.length === 0) {
    console.log('🔍 ML: No matches found for:', searchTerm) // LOG: совпадений не найдено
    return []
  }

  console.log('🔍 ML: Found matches:', matches.length) // LOG: найдено совпадений

  // Разбиваем поисковый термин на слова для анализа
  const words = searchTerm.split(/\s+/).filter(word => word.length >= 2)

  // Вычисляем similarity и сортируем по релевантности
  const suggestions = matches.map(nom => {
    const similarity = calculateStringSimilarity(searchTerm, nom.name.toLowerCase())
    const nomLower = nom.name.toLowerCase()

    // Бонусы за точные совпадения
    let bonus = 0
    if (nomLower.startsWith(searchTerm)) bonus += 0.3
    if (nomLower.includes(searchTerm)) bonus += 0.2

    // Проверяем совпадение слов
    if (words.length > 0) {
      const matchedWords = words.filter(word => nomLower.includes(word)).length
      bonus += (matchedWords / words.length) * 0.2
    }

    const finalConfidence = Math.max(0.1, Math.min(0.95, similarity + bonus))

    return {
      id: nom.id,
      name: nom.name,
      confidence: finalConfidence,
      reasoning: `ML: ${Math.round(similarity * 100)}% similarity${bonus > 0 ? ` + ${Math.round(bonus * 100)}% bonus` : ''}`
    }
  })
  .filter(suggestion => suggestion.confidence > 0.3) // Слегка повышаем порог
  .sort((a, b) => b.confidence - a.confidence) // Сортируем по убыванию confidence
  .slice(0, 10) // Ограничиваем топ-10 результатов

  console.log('🔍 ML: Returning suggestions:', suggestions.length, 'avg confidence:',
    suggestions.length > 0 ? Math.round(suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length * 100) + '%' : 'N/A') // LOG: возвращаем предложения

  return suggestions
}

/**
 * Fallback поиск (классический текстовый поиск)
 */
const getFallbackSuggestions = async (
  request: MLPredictionRequest,
  startTime: number,
  reason?: string
): Promise<MLPredictionResponse> => {
  if (!supabase) throw new Error('Supabase not initialized')

  const { materialName } = request
  const searchTerm = materialName.toLowerCase().trim()

  // LOG: fallback поиск номенклатуры
  const { data: nomenclatures, error } = await supabase
    .from('nomenclature')
    .select('id, name')
    .ilike('name', `%${searchTerm}%`)
    .limit(5)

  if (error) throw error

  const suggestions: NomenclatureSuggestion[] = (nomenclatures || []).map(nom => ({
    id: nom.id,
    name: nom.name,
    confidence: 0.5, // фиксированная confidence для fallback
    reasoning: 'Классический текстовый поиск'
  }))

  return {
    suggestions,
    processingTime: Date.now() - startTime,
    modelUsed: 'fallback',
    fallbackReason: reason || 'ML недоступен'
  }
}

/**
 * Простая функция для вычисления схожести строк
 */
const calculateStringSimilarity = (str1: string, str2: string): number => {
  // Используем алгоритм Levenshtein distance
  const matrix: number[][] = []
  const len1 = str1.length
  const len2 = str2.length

  // Инициализация матрицы
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Заполнение матрицы
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  const maxLen = Math.max(len1, len2)
  const distance = matrix[len1][len2]
  return maxLen === 0 ? 1 : (maxLen - distance) / maxLen
}

/**
 * Получение метрик использования ML
 */
export const getMLMetrics = async (): Promise<MLMetrics> => {
  // LOG: получение метрик ML из localStorage
  const defaultMetrics: MLMetrics = {
    totalPredictions: 0,
    successfulPredictions: 0,
    averageConfidence: 0,
    averageProcessingTime: 0,
    modelUsageStats: {}
  }

  try {
    const saved = localStorage.getItem('ml-metrics')
    return saved ? JSON.parse(saved) : defaultMetrics
  } catch {
    return defaultMetrics
  }
}

/**
 * Сохранение метрик использования ML
 */
export const updateMLMetrics = async (
  response: MLPredictionResponse,
  successful: boolean
): Promise<void> => {
  // LOG: обновление метрик ML
  const metrics = await getMLMetrics()

  metrics.totalPredictions++
  if (successful) metrics.successfulPredictions++

  // Обновляем среднее время обработки
  const currentAvg = metrics.averageProcessingTime
  const count = metrics.totalPredictions
  metrics.averageProcessingTime = (currentAvg * (count - 1) + response.processingTime) / count

  // Обновляем среднюю confidence
  if (response.suggestions.length > 0) {
    const avgConfidence = response.suggestions.reduce((sum, s) => sum + s.confidence, 0) / response.suggestions.length
    const successCount = metrics.successfulPredictions
    metrics.averageConfidence = (metrics.averageConfidence * (successCount - 1) + avgConfidence) / successCount
  }

  // Обновляем статистику использования моделей
  metrics.modelUsageStats[response.modelUsed] = (metrics.modelUsageStats[response.modelUsed] || 0) + 1

  localStorage.setItem('ml-metrics', JSON.stringify(metrics))
}

/**
 * Server-side поиск номенклатуры для больших объемов данных
 */
export const searchNomenclature = async (searchTerm: string, limit: number = 50): Promise<Array<{ id: string; name: string }>> => {
  if (!supabase) throw new Error('Supabase not initialized')

  if (!searchTerm || searchTerm.length < 1) return []

  const trimmedTerm = searchTerm.trim()

  console.log('🔍 Server search for nomenclature:', trimmedTerm) // LOG: серверный поиск номенклатуры

  try {
    // УПРОЩЕНИЕ: Простой ILIKE поиск вместо сложного OR синтаксиса
    const { data, error } = await supabase
      .from('nomenclature')
      .select('id, name')
      .ilike('name', `%${trimmedTerm}%`)
      .order('name')
      .limit(limit)

    if (error) {
      console.error('🔍 Nomenclature search error:', error) // LOG: ошибка поиска номенклатуры
      throw error
    }

    console.log('🔍 Found nomenclature items:', data?.length || 0) // LOG: найдено элементов номенклатуры
    return data || []
  } catch (error) {
    console.error('🔍 Nomenclature search failed:', error) // LOG: поиск номенклатуры не удался
    return []
  }
}