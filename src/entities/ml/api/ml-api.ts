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
    maxSuggestions: 5,

    // Настройки точности сопоставления
    algorithm: 'balanced',
    keywordBonus: 0.3,
    exactMatchBonus: 0.2,
    prefixBonus: 0.25,
    similarityWeight: 0.6,
    minWordLength: 3,
    ignoredTerms: ['м3', 'м2', 'кг', 'шт', 'п.м.', 'компл.', 'м.п.', 'т']
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
 * УЛУЧШЕННЫЙ similarity-based поиск номенклатуры с настройками точности
 */
const getSimilarityBasedSuggestions = async (
  request: MLPredictionRequest
): Promise<NomenclatureSuggestion[]> => {
  if (!supabase) throw new Error('Supabase not initialized')

  const { materialName } = request
  const searchTerm = materialName.toLowerCase().trim()
  const config = await getMLConfig()

  if (searchTerm.length < 2) return []

  console.log('🔍 ML: Starting enhanced search for:', searchTerm, 'with algorithm:', config.algorithm) // LOG: начало улучшенного поиска
  console.log('🔍 ML: Current config:', JSON.stringify(config, null, 2)) // LOG: текущая конфигурация ML

  // Расширяем поиск для лучшего охвата
  console.log('🔍 ML: Executing Supabase query with term:', searchTerm) // LOG: выполнение запроса Supabase

  // УЛУЧШЕННЫЙ поиск: ищем как по полному термину, так и по ключевым словам
  const searchWords = searchTerm.split(/[\s\-.,()]+/).filter(word => word.length >= 2)
  console.log('🔍 ML: Search words extracted:', searchWords) // LOG: извлеченные слова для поиска

  // Стратегия 1: Точный поиск по полному термину
  let { data: matches, error } = await supabase
    .from('nomenclature')
    .select('id, name')
    .ilike('name', `%${searchTerm}%`)
    .limit(100)

  console.log('🔍 ML: Exact search results:', matches?.length || 0) // LOG: результаты точного поиска

  // Стратегия 2: Если точный поиск не дал результатов, ищем по ключевым словам
  if ((!matches || matches.length === 0) && searchWords.length > 0) {
    console.log('🔍 ML: Trying keyword-based search...') // LOG: поиск по ключевым словам

    // Ищем по основному материалу (первое значимое слово)
    const mainMaterial = searchWords[0]
    const { data: keywordMatches, error: keywordError } = await supabase
      .from('nomenclature')
      .select('id, name')
      .ilike('name', `%${mainMaterial}%`)
      .limit(200) // Больше результатов для фильтрации

    console.log(`🔍 ML: Keyword search for "${mainMaterial}":`, keywordMatches?.length || 0) // LOG: результаты поиска по ключевому слову

    if (keywordMatches && keywordMatches.length > 0) {
      matches = keywordMatches
      error = keywordError
    }
  }

  // Стратегия 3: Если всё ещё нет результатов, пробуем синонимы
  if ((!matches || matches.length === 0)) {
    console.log('🔍 ML: Trying synonyms search...') // LOG: поиск по синонимам
    const synonymSearchTerms = ['пенопласт', 'полистирол', 'пенополистирол']

    for (const synonym of synonymSearchTerms) {
      if (searchTerm.includes(synonym) || searchTerm.includes('псб') || searchTerm.includes('пенопо')) {
        const { data: synonymMatches, error: synonymError } = await supabase
          .from('nomenclature')
          .select('id, name')
          .or(`name.ilike.%пенопласт%,name.ilike.%пенополистирол%,name.ilike.%полистирол%`)
          .limit(150)

        console.log(`🔍 ML: Synonym search results:`, synonymMatches?.length || 0) // LOG: результаты поиска по синонимам

        if (synonymMatches && synonymMatches.length > 0) {
          matches = synonymMatches
          error = synonymError
          break
        }
      }
    }
  }

  console.log('🔍 ML: Supabase query result:', {
    matches: matches?.length || 0,
    error: error?.message || 'none',
    searchTerm,
    sampleData: matches?.slice(0, 3)?.map(m => m.name) || []
  }) // LOG: результат запроса Supabase

  if (error) {
    console.error('🔍 ML: Search failed:', error) // LOG: ошибка поиска
    return []
  }

  if (!matches || matches.length === 0) {
    console.log('🔍 ML: No matches found for:', searchTerm) // LOG: совпадений не найдено

    // ДИАГНОСТИКА: Попробуем простой запрос без фильтров
    console.log('🔍 ML: Diagnostic - trying simple count query...') // LOG: диагностический запрос
    const { count, error: countError } = await supabase
      .from('nomenclature')
      .select('*', { count: 'exact', head: true })
      .limit(1)

    console.log('🔍 ML: Diagnostic result:', { count, countError: countError?.message }) // LOG: результат диагностики

    return []
  }

  console.log('🔍 ML: Found matches:', matches.length) // LOG: найдено совпадений

  // Очищаем поисковый термин от игнорируемых терминов
  const cleanedSearchTerm = cleanTermForMatching(searchTerm, config.ignoredTerms)
  const cleanedSearchWords = cleanedSearchTerm.split(/\s+/).filter(word => word.length >= config.minWordLength)

  console.log('🔍 ML: Original term:', searchTerm) // LOG: оригинальный поисковый термин
  console.log('🔍 ML: Cleaned search term:', cleanedSearchTerm, 'words:', cleanedSearchWords) // LOG: очищенный поисковый термин

  // ИСПРАВЛЕНИЕ: Если после очистки термин стал слишком коротким, используем оригинальный
  const effectiveSearchTerm = cleanedSearchTerm.length < 3 ? searchTerm : cleanedSearchTerm
  console.log('🔍 ML: Effective search term:', effectiveSearchTerm) // LOG: эффективный поисковый термин

  // Вычисляем similarity с учетом настроек
  const suggestions = matches.map((nom, index) => {
    const nomLower = nom.name.toLowerCase()
    const cleanedNomName = cleanTermForMatching(nomLower, config.ignoredTerms)

    // Базовый similarity score с помощью Levenshtein
    const rawSimilarity = calculateStringSimilarity(effectiveSearchTerm, cleanedNomName)
    const similarity = rawSimilarity * config.similarityWeight

    let totalBonus = 0
    let bonusBreakdown = []

    // Бонус за точное совпадение префикса
    if (cleanedNomName.startsWith(effectiveSearchTerm) || nomLower.startsWith(searchTerm)) {
      totalBonus += config.prefixBonus
      bonusBreakdown.push(`prefix:${Math.round(config.prefixBonus * 100)}%`)
    }

    // Бонус за точное вхождение
    if (cleanedNomName.includes(effectiveSearchTerm) || nomLower.includes(searchTerm)) {
      totalBonus += config.exactMatchBonus
      bonusBreakdown.push(`exact:${Math.round(config.exactMatchBonus * 100)}%`)
    }

    // Расширенный анализ ключевых слов для материалов
    const keywordScore = calculateKeywordScore(searchWords, cleanedNomName, config)
    const keywordBonus = keywordScore * config.keywordBonus
    totalBonus += keywordBonus
    bonusBreakdown.push(`keywords:${Math.round(keywordScore * 100)}%*${Math.round(config.keywordBonus * 100)}%=${Math.round(keywordBonus * 100)}%`)

    // Применяем алгоритм настройки точности
    let finalScore = similarity + totalBonus
    const beforeAlgorithm = finalScore
    finalScore = applyAlgorithmSettings(finalScore, config.algorithm)

    const finalConfidence = Math.max(0.1, Math.min(0.95, finalScore))

    // Детальный лог для первых 3 результатов
    if (index < 3) {
      console.log(`🔍 ML: [${index + 1}] "${nom.name}"`) // LOG: детали расчета для топ результатов
      console.log(`   Original: "${searchTerm}" vs "${nomLower}"`) // LOG: оригинальные строки
      console.log(`   Effective: "${effectiveSearchTerm}" vs "${cleanedNomName}"`) // LOG: эффективные строки для расчета
      console.log(`   Raw similarity: ${Math.round(rawSimilarity * 100)}%`) // LOG: сырое сходство
      console.log(`   Weighted similarity: ${Math.round(similarity * 100)}% (weight: ${Math.round(config.similarityWeight * 100)}%)`) // LOG: взвешенное сходство
      console.log(`   Bonuses: ${bonusBreakdown.join(', ')}`) // LOG: бонусы
      console.log(`   Before algorithm: ${Math.round(beforeAlgorithm * 100)}%`) // LOG: до применения алгоритма
      console.log(`   After ${config.algorithm}: ${Math.round(finalScore * 100)}%`) // LOG: после применения алгоритма
      console.log(`   Final confidence: ${Math.round(finalConfidence * 100)}%`) // LOG: итоговая уверенность
    }

    return {
      id: nom.id,
      name: nom.name,
      confidence: finalConfidence,
      reasoning: `${config.algorithm.toUpperCase()}: ${Math.round(rawSimilarity * 100)}% sim * ${Math.round(config.similarityWeight * 100)}% + ${Math.round(totalBonus * 100)}% bonus → ${Math.round(finalConfidence * 100)}%`
    }
  })
  .filter(suggestion => suggestion.confidence >= config.confidenceThreshold)
  .sort((a, b) => b.confidence - a.confidence)
  .slice(0, config.maxSuggestions)

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
 * Очистка термина от игнорируемых единиц измерения и символов
 */
const cleanTermForMatching = (term: string, ignoredTerms: string[]): string => {
  let cleaned = term.toLowerCase()

  // Удаляем игнорируемые термины
  ignoredTerms.forEach(ignored => {
    const regex = new RegExp(`\\b${ignored.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    cleaned = cleaned.replace(regex, '')
  })

  // Удаляем размеры в формате NxNxN, NxN
  cleaned = cleaned.replace(/\b\d+(\.\d+)?[x×]\d+(\.\d+)?([x×]\d+(\.\d+)?)?\b/g, '')

  // Удаляем отдельные числа с единицами измерения
  cleaned = cleaned.replace(/\b\d+(\.\d+)?\s*(мм|см|м|кг|г|т|л|шт\.?)\b/g, '')

  // Очищаем лишние пробелы
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  return cleaned
}

/**
 * Вычисление score по ключевым словам для материалов
 */
const calculateKeywordScore = (searchWords: string[], nomName: string, config: any): number => {
  if (searchWords.length === 0) return 0

  let matchedWords = 0
  let partialMatches = 0
  let matchDetails: string[] = []

  searchWords.forEach(searchWord => {
    if (nomName.includes(searchWord)) {
      matchedWords++
      matchDetails.push(`"${searchWord}":exact`)
    } else {
      // Ищем частичные совпадения для сложных материалов
      const partialMatch = findPartialMatch(searchWord, nomName)
      if (partialMatch) {
        partialMatches++
        matchDetails.push(`"${searchWord}":partial`)
      } else {
        matchDetails.push(`"${searchWord}":none`)
      }
    }
  })

  // Полное совпадение слова = 1.0, частичное = 0.5
  const totalScore = (matchedWords + partialMatches * 0.5) / searchWords.length

  // LOG: детали анализа ключевых слов (только для первого номенклатурного элемента в процессе)
  if (searchWords.length > 0 && (matchedWords > 0 || partialMatches > 0)) {
    console.log(`🔍 ML: Keyword analysis for "${nomName.substring(0, 40)}...": ${matchDetails.join(', ')} → score: ${Math.round(totalScore * 100)}%`) // LOG: анализ ключевых слов
  }

  return Math.min(1.0, totalScore)
}

/**
 * Поиск частичных совпадений для сложных терминов материалов
 */
const findPartialMatch = (searchWord: string, nomName: string): boolean => {
  // РАСШИРЕННЫЕ специальные правила для материалов
  const materialRules: { [key: string]: string[] } = {
    'пенополистирол': ['пенополистир', 'псб', 'псбс', 'пс', 'пенопласт', 'полистир', 'ппс', 'pps'],
    'псб': ['псбс', 'пенополистирол', 'пенопласт', 'полистир', 'ппс'],
    'псбс': ['псб', 'пенополистирол', 'пенопласт', 'полистир', 'ппс'],
    'пенопласт': ['пенополистирол', 'псб', 'псбс', 'полистир', 'ппс', 'пс'],
    'экструдированный': ['экстр', 'xps', 'эппс'],
    'минеральный': ['минвата', 'минплита', 'базальт', 'каменная вата'],
    'керамзитобетон': ['керамзит', 'легкий бетон'],
    'железобетон': ['жб', 'ж/б', 'бетон'],
    'гипсокартон': ['гкл', 'гипс'],
    'утеплитель': ['теплоизоляция', 'изоляция'],
  }

  // Ищем в правилах
  for (const [material, synonyms] of Object.entries(materialRules)) {
    if (searchWord.includes(material) || material.includes(searchWord)) {
      return synonyms.some(synonym => nomName.includes(synonym))
    }
  }

  // СПЕЦИАЛЬНАЯ обработка числовых обозначений ПСБ
  if (searchWord.includes('псб') || searchWord.includes('псбс')) {
    // Извлекаем числовые значения из поискового термина
    const searchNumbers = searchWord.match(/\d+/g) || []
    const nomNumbers = nomName.match(/\d+/g) || []

    // Сравниваем числа (например, 35 из "псб-с-35" и "псбс 35")
    const hasMatchingNumbers = searchNumbers.some(searchNum =>
      nomNumbers.some(nomNum => Math.abs(parseInt(searchNum) - parseInt(nomNum)) <= 5)
    )

    if (hasMatchingNumbers) {
      console.log(`🔍 ML: Number match found: search="${searchWord}" contains numbers [${searchNumbers.join(', ')}], nom="${nomName}" contains [${nomNumbers.join(', ')}]`) // LOG: совпадение чисел
      return true
    }
  }

  // Ищем частичное вхождение (минимум 4 символа)
  if (searchWord.length >= 4) {
    const substrings = []
    for (let i = 0; i <= searchWord.length - 4; i++) {
      substrings.push(searchWord.substring(i, i + 4))
    }
    return substrings.some(substr => nomName.includes(substr))
  }

  return false
}

/**
 * Применение настроек алгоритма для корректировки итогового score
 */
const applyAlgorithmSettings = (score: number, algorithm: 'strict' | 'balanced' | 'fuzzy'): number => {
  switch (algorithm) {
    case 'strict':
      // Строгий алгоритм - снижает score для неточных совпадений
      return score > 0.7 ? score : score * 0.8

    case 'fuzzy':
      // Мягкий алгоритм - повышает score для расширенного поиска
      return Math.min(0.95, score * 1.2)

    case 'balanced':
    default:
      // Сбалансированный алгоритм - без корректировок
      return score
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