import { supabase } from '@/lib/supabase'
import type {
  MLPredictionRequest,
  MLPredictionResponse,
  NomenclatureSuggestion,
  MLConfig,
  MLMetrics
} from '../model/types'

// ===============================
// DEEPSEEK AI ИНТЕГРАЦИЯ
// ===============================
// ПАТТЕРН ДЛЯ КОПИРОВАНИЯ: Импорты для интеграции Deepseek AI в ML компоненты
import {
  deepseekApi,
  mlModeApi,
  type DeepseekMaterialRequest,
  type MLMode
} from '@/entities/api-settings'

/**
 * Получение конфигурации ML
 */
export const getMLConfig = async (): Promise<MLConfig> => {
  // LOG: получение конфигурации ML из localStorage
  const defaultConfig: MLConfig = {
    enabled: true,
    confidenceThreshold: 0.3,
    maxSuggestions: 15,

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
 * ===============================
 * ОСНОВНАЯ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ПРЕДЛОЖЕНИЙ НОМЕНКЛАТУРЫ
 * ===============================
 * ПАТТЕРН ДЛЯ КОПИРОВАНИЯ: Главная функция с поддержкой AI/ML режимов
 * Автоматически выбирает между Deepseek AI и локальным ML алгоритмом
 */
export const predictNomenclature = async (
  request: MLPredictionRequest,
  signal?: AbortSignal
): Promise<MLPredictionResponse> => {
  const startTime = Date.now()
  const config = await getMLConfig()

  // LOG: Детальная диагностика AbortSignal в predictNomenclature
  console.log('🔍 ML Nomenclature DEBUG: AbortSignal status:', {
    hasSignal: !!signal,
    aborted: signal?.aborted || false,
    materialName: request.materialName
  })

  if (!config.enabled) {
    // LOG: ML отключен, используем fallback
    return getFallbackSuggestions(request, startTime)
  }

  try {
    // ===============================
    // ВЫБОР МЕЖДУ AI И ML РЕЖИМАМИ
    // ===============================
    // ПАТТЕРН ДЛЯ КОПИРОВАНИЯ: Проверка режима работы AI/ML
    const mlModeConfig = await mlModeApi.getCurrentMode()
    const currentMode = mlModeConfig.mode

    console.log('🔄 ML Prediction: Режим', currentMode, 'для материала:', request.materialName)
    console.log('🔍 DEBUG: Полная конфигурация режима:', mlModeConfig) // DEBUG LOG: полная конфигурация
    console.log('🔍 DEBUG: localStorage ml-mode-config:', localStorage.getItem('ml-mode-config')) // DEBUG LOG: содержимое localStorage

    // Если выбран Deepseek AI режим
    if (currentMode === 'deepseek') {
      // Проверяем доступность Deepseek
      const deepseekAvailable = await mlModeApi.isDeepseekAvailable()

      if (deepseekAvailable) {
        try {
          // Используем Deepseek AI для анализа материала
          console.log('🤖 AI Mode: Запуск Deepseek анализа материала')
          const aiResult = await predictWithDeepseek(request, signal) // ИСПРАВЛЕНИЕ: Передаем signal

          // Если AI дал результаты - возвращаем их
          if (aiResult.suggestions.length > 0) {
            console.log('🤖 AI Mode: Deepseek вернул', aiResult.suggestions.length, 'предложений')
            return {
              ...aiResult,
              processingTime: Date.now() - startTime,
              modelUsed: 'deepseek'
            }
          }
        } catch (aiError) {
          // Проверяем тип ошибки - AbortError не требует fallback
          if (aiError instanceof Error && aiError.name === 'AbortError') {
            console.log('🤖 AI Mode: Запрос отменен пользователем (AbortError)') // LOG: информация об отмене запроса
            throw aiError // Передаем AbortError без fallback
          }

          console.error('🤖 AI Mode: Ошибка Deepseek, переключаемся на локальный ML:', aiError)

          // Если auto_fallback включен, переходим на локальный ML
          if (mlModeConfig.auto_fallback) {
            console.log('🔄 AI Mode: Автофоллбэк на локальный ML')
            // Продолжаем выполнение с локальным ML ниже
          } else {
            // Возвращаем ошибку без fallback
            return getFallbackSuggestions(request, startTime, 'Ошибка Deepseek AI')
          }
        }
      } else {
        console.warn('🤖 AI Mode: Deepseek недоступен, используем локальный ML')
      }
    }

    // ===============================
    // ЛОКАЛЬНЫЙ ML АЛГОРИТМ
    // ===============================
    console.log('🔬 ML Mode: Запуск локального алгоритма')

    // Сначала пробуем простой similarity поиск
    const suggestions = await getSimilarityBasedSuggestions(request)

    if (suggestions.length > 0) {
      console.log('🔬 ML Mode: Локальный ML вернул', suggestions.length, 'предложений')
      return {
        suggestions: suggestions.slice(0, config.maxSuggestions),
        processingTime: Date.now() - startTime,
        modelUsed: 'similarity'
      }
    }

    // Если similarity не дал результатов, используем fallback
    console.log('🔬 ML Mode: Нет результатов, используем fallback')
    return getFallbackSuggestions(request, startTime)

  } catch (error) {
    console.error('❌ ML prediction error:', error) // LOG: ошибка ML предсказания
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
    const bonusBreakdown = []

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
  const matchDetails: string[] = []

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

/**
 * НОВАЯ ФУНКЦИЯ: ML предсказание поставщиков по названию материала
 */
export const predictSuppliers = async (
  request: MLPredictionRequest,
  signal?: AbortSignal
): Promise<MLPredictionResponse> => {
  const startTime = Date.now()
  const config = await getMLConfig()

  // LOG: Детальная диагностика AbortSignal в predictSuppliers
  console.log('🔍 ML Suppliers DEBUG: AbortSignal status:', {
    hasSignal: !!signal,
    aborted: signal?.aborted || false,
    materialName: request.materialName
  })

  if (!config.enabled) {
    return {
      suggestions: [],
      processingTime: Date.now() - startTime,
      modelUsed: 'fallback (ML disabled)'
    }
  }

  try {
    // ===============================
    // ВЫБОР МЕЖДУ AI И ML РЕЖИМАМИ (ПОСТАВЩИКИ)
    // ===============================
    // ПАТТЕРН ДЛЯ КОПИРОВАНИЯ: Проверка режима работы AI/ML для поставщиков
    const mlModeConfig = await mlModeApi.getCurrentMode()
    const currentMode = mlModeConfig.mode

    console.log('🔄 ML Suppliers: Режим', currentMode, 'для материала:', request.materialName)
    console.log('🔍 DEBUG Suppliers: Полная конфигурация режима:', mlModeConfig) // DEBUG LOG

    // Если выбран Deepseek AI режим
    if (currentMode === 'deepseek') {
      // Проверяем доступность Deepseek
      const deepseekAvailable = await mlModeApi.isDeepseekAvailable()

      if (deepseekAvailable) {
        try {
          // Используем Deepseek AI для анализа материала и поиска поставщиков
          console.log('🤖 AI Mode Suppliers: Запуск Deepseek анализа поставщиков')
          const aiResult = await predictWithDeepseek(request, signal) // ИСПРАВЛЕНИЕ: Передаем signal

          // Если AI дал результаты - возвращаем их
          if (aiResult.suggestions.length > 0) {
            console.log('🤖 AI Mode Suppliers: Deepseek вернул', aiResult.suggestions.length, 'предложений поставщиков')
            return {
              ...aiResult,
              processingTime: Date.now() - startTime,
              modelUsed: 'deepseek'
            }
          }
        } catch (aiError) {
          // Проверяем тип ошибки - AbortError не требует fallback
          if (aiError instanceof Error && aiError.name === 'AbortError') {
            console.log('🤖 AI Mode Suppliers: Запрос отменен пользователем (AbortError)') // LOG: информация об отмене запроса
            throw aiError // Передаем AbortError без fallback
          }

          console.error('🤖 AI Mode Suppliers: Ошибка Deepseek, переключаемся на локальный ML:', aiError)

          // Если auto_fallback включен, переходим на локальный ML
          if (mlModeConfig.auto_fallback) {
            console.log('🔄 AI Mode Suppliers: Автофоллбэк на локальный ML')
            // Продолжаем выполнение с локальным ML ниже
          } else {
            // Возвращаем ошибку без fallback
            return {
              suggestions: [],
              processingTime: Date.now() - startTime,
              modelUsed: 'fallback',
              fallbackReason: 'Ошибка Deepseek AI для поставщиков'
            }
          }
        }
      } else {
        console.warn('🤖 AI Mode Suppliers: Deepseek недоступен, используем локальный ML')
      }
    }

    // ===============================
    // ЛОКАЛЬНЫЙ ML АЛГОРИТМ (ПОСТАВЩИКИ)
    // ===============================
    console.log('🔄 Local ML Suppliers: Используем локальный алгоритм поиска поставщиков')

    // Ищем поставщиков по названию материала
    const suggestions = await getSupplierBasedSuggestions(request)

    if (suggestions.length > 0) {
      return {
        suggestions: suggestions.slice(0, config.maxSuggestions),
        processingTime: Date.now() - startTime,
        modelUsed: 'supplier-similarity'
      }
    }

    return {
      suggestions: [],
      processingTime: Date.now() - startTime,
      modelUsed: 'fallback (no matches)'
    }

  } catch (error) {
    // Проверяем тип ошибки - AbortError пробрасываем выше
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('🤖 ML Suppliers: Запрос отменен пользователем (AbortError)') // LOG: информация об отмене запроса
      throw error // Пробрасываем AbortError без fallback
    }

    console.error('ML supplier prediction error:', error)
    return {
      suggestions: [],
      processingTime: Date.now() - startTime,
      modelUsed: 'fallback (error)'
    }
  }
}

/**
 * НОВАЯ ФУНКЦИЯ: Получение номенклатуры по выбранному поставщику
 */
export const getNomenclatureBySupplier = async (supplierId: string): Promise<any[]> => {
  if (!supabase) throw new Error('Supabase not initialized')

  try {
    console.log('🔍 ML: Getting nomenclature for supplier:', supplierId) // LOG: получение номенклатуры по поставщику

    const { data, error } = await supabase
      .from('nomenclature_supplier_mapping')
      .select(`
        nomenclature:nomenclature!inner(
          id,
          name
        )
      `)
      .eq('supplier_id', supplierId)

    if (error) {
      console.error('🔍 Error fetching nomenclature by supplier:', error)
      return []
    }

    // Возвращаем уникальные номенклатуры
    const uniqueNomenclatures = new Map()
    data?.forEach(item => {
      const nom = item.nomenclature
      if (nom && !uniqueNomenclatures.has(nom.id)) {
        uniqueNomenclatures.set(nom.id, nom)
      }
    })

    const result = Array.from(uniqueNomenclatures.values())
    console.log('🔍 ML: Found nomenclatures for supplier:', result.length) // LOG: найдено номенклатур

    return result

  } catch (error) {
    console.error('🔍 Exception in getNomenclatureBySupplier:', error)
    return []
  }
}

/**
 * НОВАЯ ФУНКЦИЯ: ML поиск поставщиков с настройками точности
 */
const getSupplierBasedSuggestions = async (
  request: MLPredictionRequest
): Promise<NomenclatureSuggestion[]> => {
  if (!supabase) throw new Error('Supabase not initialized')

  const { materialName } = request
  const searchTerm = materialName.toLowerCase().trim()
  const config = await getMLConfig()

  if (searchTerm.length < 2) return []

  console.log('🔍 ML: Starting supplier search for:', searchTerm, 'with algorithm:', config.algorithm) // LOG: начало поиска поставщиков

  // УЛУЧШЕННЫЙ поиск поставщиков: ищем как по полному термину, так и по ключевым словам
  const supplierSearchWords = searchTerm.split(/[\s\-.,()]+/).filter(word => word.length >= 2)
  console.log('🔍 ML: Supplier search words extracted:', supplierSearchWords) // LOG: извлеченные слова для поиска поставщиков

  // Стратегия 1: Точный поиск по полному термину
  let { data: matches, error } = await supabase
    .from('supplier_names')
    .select('id, name')
    .ilike('name', `%${searchTerm}%`)
    .limit(100)

  console.log('🔍 ML: Exact supplier search results:', matches?.length || 0) // LOG: результаты точного поиска поставщиков

  // Стратегия 2: Если точный поиск не дал результатов, ищем по ключевым словам
  if ((!matches || matches.length === 0) && supplierSearchWords.length > 0) {
    console.log('🔍 ML: Trying supplier keyword-based search...') // LOG: поиск поставщиков по ключевым словам

    const mainMaterial = supplierSearchWords[0]
    const { data: keywordMatches, error: keywordError } = await supabase
      .from('supplier_names')
      .select('id, name')
      .ilike('name', `%${mainMaterial}%`)
      .limit(200)

    console.log(`🔍 ML: Supplier keyword search for "${mainMaterial}":`, keywordMatches?.length || 0) // LOG: результаты поиска поставщиков по ключевому слову

    if (keywordMatches && keywordMatches.length > 0) {
      matches = keywordMatches
      error = keywordError
    }
  }

  // Стратегия 3: Поиск по синонимам для материалов
  if ((!matches || matches.length === 0)) {
    console.log('🔍 ML: Trying supplier synonyms search...') // LOG: поиск поставщиков по синонимам

    if (searchTerm.includes('пенопо') || searchTerm.includes('псб') || searchTerm.includes('пенопласт')) {
      const { data: synonymMatches, error: synonymError } = await supabase
        .from('supplier_names')
        .select('id, name')
        .or(`name.ilike.%пенопласт%,name.ilike.%пенополистирол%,name.ilike.%полистирол%`)
        .limit(150)

      console.log(`🔍 ML: Supplier synonym search results:`, synonymMatches?.length || 0) // LOG: результаты поиска поставщиков по синонимам

      if (synonymMatches && synonymMatches.length > 0) {
        matches = synonymMatches
        error = synonymError
      }
    }
  }

  if (error) {
    console.error('🔍 ML: Supplier search failed:', error) // LOG: поиск поставщиков не удался
    return []
  }

  if (!matches || matches.length === 0) {
    console.log('🔍 ML: No supplier matches found for:', searchTerm) // LOG: совпадений поставщиков не найдено
    return []
  }

  console.log('🔍 ML: Found supplier matches:', matches.length) // LOG: найдено совпадений поставщиков

  // Очищаем поисковый термин от игнорируемых терминов
  const cleanedSearchTerm = cleanTermForMatching(searchTerm, config.ignoredTerms)
  const cleanedSearchWords = cleanedSearchTerm.split(/\s+/).filter(word => word.length >= config.minWordLength)

  console.log('🔍 ML: Original term:', searchTerm) // LOG: оригинальный поисковый термин
  console.log('🔍 ML: Cleaned search term:', cleanedSearchTerm, 'words:', cleanedSearchWords) // LOG: очищенный поисковый термин

  const effectiveSearchTerm = cleanedSearchTerm.length < 3 ? searchTerm : cleanedSearchTerm
  console.log('🔍 ML: Effective search term:', effectiveSearchTerm) // LOG: эффективный поисковый термин

  // Вычисляем similarity с учетом настроек для поставщиков
  const suggestions = matches.map((supplier, index) => {
    const supplierLower = supplier.name.toLowerCase()
    const cleanedSupplierName = cleanTermForMatching(supplierLower, config.ignoredTerms)

    // Базовый similarity score с помощью Levenshtein
    const rawSimilarity = calculateStringSimilarity(effectiveSearchTerm, cleanedSupplierName)
    const similarity = rawSimilarity * config.similarityWeight

    let totalBonus = 0
    const bonusBreakdown = []

    // Бонус за точное совпадение префикса
    if (cleanedSupplierName.startsWith(effectiveSearchTerm) || supplierLower.startsWith(searchTerm)) {
      totalBonus += config.prefixBonus
      bonusBreakdown.push(`prefix:${Math.round(config.prefixBonus * 100)}%`)
    }

    // Бонус за точное вхождение
    if (cleanedSupplierName.includes(effectiveSearchTerm) || supplierLower.includes(searchTerm)) {
      totalBonus += config.exactMatchBonus
      bonusBreakdown.push(`exact:${Math.round(config.exactMatchBonus * 100)}%`)
    }

    // Расширенный анализ ключевых слов для материалов в названиях поставщиков
    const keywordScore = calculateKeywordScore(supplierSearchWords, cleanedSupplierName, config)
    const keywordBonus = keywordScore * config.keywordBonus
    totalBonus += keywordBonus
    bonusBreakdown.push(`keywords:${Math.round(keywordScore * 100)}%*${Math.round(config.keywordBonus * 100)}%=${Math.round(keywordBonus * 100)}%`)

    // Применяем алгоритм настройки точности
    let finalScore = similarity + totalBonus
    const beforeAlgorithm = finalScore
    finalScore = applyAlgorithmSettings(finalScore, config.algorithm)

    const finalConfidence = Math.max(0.1, Math.min(0.95, finalScore))

    const algorithmAdjustment = finalScore - beforeAlgorithm

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 ML: Supplier "${supplier.name}" (${index + 1}/${matches.length}):`, {
        similarity: Math.round(similarity * 100) + '%',
        bonuses: bonusBreakdown.join(' + '),
        algorithm: config.algorithm + (algorithmAdjustment !== 0 ? ` (${algorithmAdjustment > 0 ? '+' : ''}${Math.round(algorithmAdjustment * 100)}%)` : ''),
        confidence: Math.round(finalConfidence * 100) + '%'
      })
    }

    return {
      id: supplier.id,
      name: supplier.name,
      confidence: finalConfidence,
      reasoning: `${Math.round(similarity * 100)}% similarity + [${bonusBreakdown.join(', ')}] via ${config.algorithm} algorithm`
    }
  })

  // Фильтруем по порогу уверенности и сортируем
  const filteredSuggestions = suggestions
    .filter(s => s.confidence >= config.confidenceThreshold)
    .sort((a, b) => b.confidence - a.confidence)

  console.log('🔍 ML: Supplier suggestions above threshold:', filteredSuggestions.length) // LOG: предложений поставщиков выше порога

  return filteredSuggestions
}

/**
 * ===============================
 * DEEPSEEK AI PREDICTION
 * ===============================
 * ПАТТЕРН ДЛЯ КОПИРОВАНИЯ: Функция для использования Deepseek AI вместо локального ML
 * Адаптирует ML запрос к формату Deepseek и обрабатывает ответ
 */
async function predictWithDeepseek(request: MLPredictionRequest, externalSignal?: AbortSignal): Promise<MLPredictionResponse> {
  console.log('🤖 Deepseek: Начало анализа материала:', request.materialName)
  console.log('🔍 DEEPSEEK DEBUG: External signal status:', {
    hasSignal: !!externalSignal,
    aborted: externalSignal?.aborted || false
  })

  try {
    // Получаем ML конфигурацию для максимального количества результатов
    const mlConfig = await getMLConfig()

    const maxSuggestions = mlConfig?.maxSuggestions || 15
    console.log(`🔍 Deepseek: Максимум результатов из ML конфига: ${maxSuggestions}`) // LOG: количество результатов

    // Преобразуем ML запрос в формат Deepseek
    const deepseekRequest: DeepseekMaterialRequest = {
      material_name: request.materialName,
      context: request.context ? {
        project_type: request.context.projectId ? 'строительный' : undefined,
        cost_category: request.context.categoryId,
        cost_type: request.context.typeId,
        location: undefined // можно добавить если нужно
      } : undefined,
      preferences: {
        prefer_eco_friendly: false,
        budget_conscious: true,
        quality_priority: true,
        max_suggestions: maxSuggestions // Передаем максимальное количество результатов
      }
    }

    console.log('🤖 Deepseek: Отправляем запрос:', deepseekRequest)

    // ИСПРАВЛЕНИЕ AbortError: Передаем externalSignal в Deepseek API
    const deepseekResponse = await deepseekApi.analyzeMaterial(deepseekRequest, externalSignal)

    console.log('🤖 Deepseek: Получен ответ с', deepseekResponse.recommendations.length, 'рекомендациями')
    console.log('🔍 Deepseek: Анализ материала:', deepseekResponse.material_analysis)

    // Преобразуем ответ Deepseek в формат ML с расширенной информацией
    const suggestions: NomenclatureSuggestion[] = await Promise.all(
      deepseekResponse.recommendations.map(async (rec) => {
        // Пытаемся найти ID номенклатуры в базе данных
        let nomenclatureId = rec.nomenclature_id

        // Если ID не найден, пробуем поиск по названию
        if (!nomenclatureId || nomenclatureId.startsWith('ai-suggestion-') || nomenclatureId.startsWith('fallback-')) {
          const searchResults = await searchNomenclatureByName(rec.nomenclature_name)
          nomenclatureId = searchResults.length > 0 ? searchResults[0].id : rec.nomenclature_id
        }

        // НОВЫЙ АЛГОРИТМ: Используем только данные от AI (этап 3)
        // AI уже проанализировал предотобранные ML записи, дополнительный поиск не нужен
        let fullMaterialName = rec.supplier_name || rec.nomenclature_name || 'Не указано'

        console.log(`🎯 AI Выбор: Материал "${fullMaterialName}" рекомендован AI из предотобранных записей`) // LOG: AI выбор из предотобранных записей

        // Проверяем что название не является служебным fallback-текстом
        const fallbackTexts = [
          'Требуется уточнение поставщика',
          'Не указано',
          'Уточняется',
          'Материал не найден'
        ]

        if (fallbackTexts.some(fallback => fullMaterialName.includes(fallback))) {
          console.log(`⚠️ Обнаружен fallback текст, используем исходный материал: ${deepseekRequest.material_name}`)
          // Если AI вернул служебный текст, используем исходное название материала
          fullMaterialName = deepseekRequest.material_name
        }

        // Формируем расширенное обоснование с анализом цен и качества
        let enhancedReasoning = `AI: ${rec.reasoning}`

        if (rec.price_analysis) {
          enhancedReasoning += `\n💰 Цена: ${rec.price_analysis}`
        }

        if (rec.quality_score) {
          enhancedReasoning += `\n⭐ Качество: ${rec.quality_score}/10`
        }

        if (rec.characteristics_match) {
          enhancedReasoning += `\n📊 Характеристики: ${rec.characteristics_match}`
        }

        return {
          id: nomenclatureId,
          name: fullMaterialName, // Используем полное название материала из БД
          confidence: Math.max(0.1, Math.min(0.95, rec.confidence)), // Ограничиваем confidence
          reasoning: enhancedReasoning,
          // РАСШИРЕННЫЕ ПОЛЯ ДЛЯ TOOLTIP И UI
          tooltip_info: rec.tooltip_info, // Для показа при наведении
          price_analysis: rec.price_analysis, // Анализ цен
          quality_score: rec.quality_score, // Оценка качества
          supplier_name: rec.supplier_name // Название поставщика от AI
        }
      })
    )

    console.log('🤖 Deepseek: Преобразованы предложения:', suggestions.length)

    return {
      suggestions,
      processingTime: deepseekResponse.usage_stats.processing_time_ms,
      modelUsed: 'deepseek'
    }

  } catch (error) {
    // Проверяем тип ошибки - AbortError нормальная ситуация при отмене запроса
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('🤖 Deepseek: Запрос отменен пользователем (AbortError)') // LOG: информация об отмене запроса
    } else {
      console.error('🤖 Deepseek: Ошибка анализа материала:', error)
    }
    throw error
  }
}

/**
 * ===============================
 * ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ DEEPSEEK
 * ===============================
 */

/**
 * ПОИСК МАТЕРИАЛА В ТАБЛИЦЕ SUPPLIER_NAMES
 * Находит полное название материала в таблице supplier_names по частичному совпадению
 * В таблице supplier_names поле name содержит названия материалов у поставщиков
 */
async function searchMaterialInSuppliers(materialName: string): Promise<Array<{ id?: string; name: string }>> {
  if (!supabase || !materialName) return []

  try {
    // Очищаем и анализируем название материала
    const cleanedName = materialName.trim().toLowerCase()

    // Извлекаем ключевые слова для более точного поиска
    const keywords = cleanedName
      .replace(/[^\w\sа-яё]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 3)
      .filter(word => !['для', 'при', 'под', 'над', 'без', 'про', 'или'].includes(word))

    // Стратегия 1: Точное совпадение (без учета регистра)
    const { data: exactMatch, error: exactError } = await supabase
      .from('supplier_names')
      .select('name')
      .ilike('name', cleanedName)
      .limit(1)

    if (!exactError && exactMatch && exactMatch.length > 0) {
      return exactMatch
    }

    // Стратегия 2: Поиск по началу названия
    const { data: startsWith, error: startsError } = await supabase
      .from('supplier_names')
      .select('name')
      .ilike('name', `${cleanedName}%`)
      .limit(3)

    if (!startsError && startsWith && startsWith.length > 0) {
      return startsWith
    }

    // Стратегия 3: Поиск по ключевым словам (более точный)
    if (keywords.length > 0) {
      // Ищем материалы, содержащие все ключевые слова
      const keywordQueries = keywords.map(keyword => `%${keyword}%`)

      for (const keyword of keywordQueries) {
        const { data: keywordMatch, error: keywordError } = await supabase
          .from('supplier_names')
          .select('name')
          .ilike('name', keyword)
          .limit(5)

        if (!keywordError && keywordMatch && keywordMatch.length > 0) {
          // Фильтруем результаты по релевантности
          const relevantResults = keywordMatch.filter(item => {
            const itemLower = item.name.toLowerCase()
            // Проверяем, содержит ли результат хотя бы 2 ключевых слова из исходного запроса
            const matchingKeywords = keywords.filter(kw => itemLower.includes(kw))
            return matchingKeywords.length >= Math.min(2, keywords.length)
          })

          if (relevantResults.length > 0) {
            return relevantResults
          }
        }
      }
    }

    // Стратегия 4: Широкий поиск по одному ключевому слову (только для последней попытки)
    if (keywords.length > 0) {
      const mainKeyword = keywords[0] // Самое важное слово

      const { data: broadMatch, error: broadError } = await supabase
        .from('supplier_names')
        .select('name')
        .ilike('name', `%${mainKeyword}%`)
        .limit(10)

      if (!broadError && broadMatch && broadMatch.length > 0) {
        // Возвращаем только первые 3 результата для избежания нерелевантных
        return broadMatch.slice(0, 3)
      }
    }

    return []
  } catch (error) {
    console.error('Ошибка поиска материала в supplier_names:', error) // LOG: ошибка поиска материала
    return []
  }
}

/**
 * ПОИСК НОМЕНКЛАТУРЫ ПО НАЗВАНИЮ
 * Используется для сопоставления AI предложений с базой данных
 */
async function searchNomenclatureByName(name: string): Promise<Array<{ id: string; name: string }>> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('nomenclature')
      .select('id, name')
      .ilike('name', `%${name}%`)
      .limit(5)

    if (error) {
      console.error('🤖 Deepseek: Ошибка поиска номенклатуры:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('🤖 Deepseek: Исключение при поиске номенклатуры:', error)
    return []
  }
}

// ===============================
// НОВЫЕ ФУНКЦИИ ПОИСКА ДЛЯ ТЕСТИРОВАНИЯ AI
// ===============================

/**
 * Векторный поиск в таблице supplier_names
 * Эмулирует векторный поиск через текстовое сходство
 */
export async function vectorSearchSupplierNames(
  materialName: string,
  limit: number = 20
): Promise<Array<{ id: string; name: string; confidence: number }>> {
  if (!supabase || !materialName) return []

  try {
    console.log('🔍 Векторный поиск в supplier_names для:', materialName) // LOG: векторный поиск

    // Получаем все записи для векторного анализа
    const { data, error } = await supabase
      .from('supplier_names')
      .select('id, name')
      .limit(1000) // Берем больше записей для векторного анализа

    if (error) {
      console.error('Ошибка получения данных supplier_names:', error) // LOG: ошибка получения данных
      return []
    }

    if (!data || data.length === 0) {
      console.log('Таблица supplier_names пуста или недоступна') // LOG: пустая таблица
      return []
    }

    // Простая эмуляция векторного поиска через текстовое сходство
    const searchTerms = materialName.toLowerCase().split(/\s+/)

    const results = data
      .map(item => {
        const itemName = item.name.toLowerCase()
        let confidence = 0

        // Рассчитываем confidence на основе совпадений
        searchTerms.forEach(term => {
          if (itemName.includes(term)) {
            confidence += 0.3
          }
          if (itemName.startsWith(term)) {
            confidence += 0.2
          }
          if (itemName.endsWith(term)) {
            confidence += 0.1
          }
        })

        // Бонус за точное совпадение
        if (itemName === materialName.toLowerCase()) {
          confidence = 1.0
        }

        return {
          id: item.id,
          name: item.name,
          confidence: Math.min(confidence, 1.0)
        }
      })
      .filter(item => item.confidence > 0.1) // Фильтруем по минимальной уверенности
      .sort((a, b) => b.confidence - a.confidence) // Сортируем по убыванию confidence
      .slice(0, limit)

    console.log(`🎯 Векторный поиск: найдено ${results.length} результатов`) // LOG: результаты векторного поиска
    return results

  } catch (error) {
    console.error('Ошибка векторного поиска в supplier_names:', error) // LOG: ошибка векторного поиска
    return []
  }
}

/**
 * Улучшенный семантический поиск в таблице supplier_names
 * Использует интеллектуальный анализ терминов, синонимы и морфологию
 */
export async function keywordSearchSupplierNames(
  materialName: string,
  limit: number = 20
): Promise<Array<{ id: string; name: string; matchedKeywords: string[]; relevanceScore: number; matchType: string }>> {
  if (!supabase || !materialName) return []

  try {
    console.log('🔍 Семантический поиск в supplier_names для:', materialName) // LOG: семантический поиск

    // Словарь синонимов и альтернативных названий
    const synonyms: Record<string, string[]> = {
      'теплоизоляция': ['утеплитель', 'изоляция', 'термоизоляция', 'теплоизолятор'],
      'минеральная': ['минвата', 'каменная', 'базальтовая', 'стекловата'],
      'плита': ['плиты', 'листы', 'панели', 'блоки'],
      'кирпич': ['кирпичи', 'блоки', 'камни'],
      'бетон': ['раствор', 'смесь', 'состав'],
      'арматура': ['армирование', 'сталь', 'прутки', 'стержни'],
      'гипс': ['гипсовый', 'штукатурка', 'шпатлевка'],
      'цемент': ['портландцемент', 'вяжущее'],
      'металл': ['стальной', 'железный', 'металлический'],
      'пластик': ['пластиковый', 'полимер', 'ПВХ'],
      'дерево': ['деревянный', 'древесина', 'брус', 'доска'],
      'стекло': ['стеклянный', 'остекление']
    }

    // Технические термины и их варианты
    const technicalTerms: Record<string, string[]> = {
      'фасад': ['фасадный', 'наружный', 'внешний'],
      'кровля': ['кровельный', 'крыша', 'покрытие'],
      'фундамент': ['фундаментный', 'основание'],
      'стена': ['стеновой', 'перегородка'],
      'пол': ['напольный', 'покрытие'],
      'потолок': ['потолочный', 'подвесной']
    }

    // Обработка входного запроса
    const processedQuery = materialName.toLowerCase()
      .replace(/[^\wа-яё\s]/g, ' ') // Убираем спецсимволы
      .replace(/\s+/g, ' ') // Убираем лишние пробелы
      .trim()

    // Извлекаем ключевые термины
    const originalKeywords = processedQuery
      .split(/\s+/)
      .filter(word => word.length >= 2)
      .filter(word => !['мм', 'см', 'м', 'кг', 'шт', 'т', 'гр', 'л', 'м2', 'м3', 'шт'].includes(word))

    // Расширяем поиск синонимами
    const expandedKeywords = new Set<string>()
    originalKeywords.forEach(keyword => {
      expandedKeywords.add(keyword)

      // Добавляем синонимы
      if (synonyms[keyword]) {
        synonyms[keyword].forEach(synonym => expandedKeywords.add(synonym))
      }

      // Добавляем технические термины
      if (technicalTerms[keyword]) {
        technicalTerms[keyword].forEach(term => expandedKeywords.add(term))
      }

      // Добавляем морфологические варианты
      if (keyword.endsWith('ый') || keyword.endsWith('ой')) {
        expandedKeywords.add(keyword.slice(0, -2)) // убираем окончание
      }
      if (keyword.endsWith('ая') || keyword.endsWith('яя')) {
        expandedKeywords.add(keyword.slice(0, -2))
      }
    })

    const allKeywords = Array.from(expandedKeywords)
    console.log('🔍 Расширенные ключевые слова:', allKeywords) // LOG: расширенные ключевые слова

    if (allKeywords.length === 0) {
      return []
    }

    // Получаем все записи для детального анализа
    const { data, error } = await supabase
      .from('supplier_names')
      .select('id, name')
      .limit(2000) // Берем больше записей для качественного анализа

    if (error) {
      console.error('Ошибка получения данных supplier_names:', error) // LOG: ошибка получения данных
      return []
    }

    if (!data || data.length === 0) {
      console.log('Таблица supplier_names пуста') // LOG: пустая таблица
      return []
    }

    // Интеллектуальный анализ релевантности
    const results = data
      .map(item => {
        const itemName = item.name.toLowerCase()
        const itemWords = itemName.split(/\s+/)

        let relevanceScore = 0
        const matchedKeywords: string[] = []
        let matchType = 'partial'

        // Проверяем точное совпадение всей фразы
        if (itemName.includes(processedQuery)) {
          relevanceScore += 10
          matchType = 'exact'
          matchedKeywords.push('точное совпадение')
        }

        // Анализируем совпадения по словам
        originalKeywords.forEach(keyword => {
          if (itemName.includes(keyword)) {
            relevanceScore += 3
            matchedKeywords.push(keyword)

            // Бонус за совпадение в начале названия
            if (itemName.startsWith(keyword)) {
              relevanceScore += 1
            }

            // Бонус за точное совпадение слова (не части слова)
            if (itemWords.includes(keyword)) {
              relevanceScore += 1
            }
          }
        })

        // Проверяем синонимы и расширенные термины
        allKeywords.forEach(keyword => {
          if (keyword !== originalKeywords.find(ok => ok === keyword) && itemName.includes(keyword)) {
            relevanceScore += 1.5
            if (!matchedKeywords.includes(keyword)) {
              matchedKeywords.push(`${keyword} (синоним)`)
            }
          }
        })

        // Бонус за количество совпадающих слов
        const matchRatio = matchedKeywords.length / originalKeywords.length
        relevanceScore += matchRatio * 2

        // Штраф за длину - более короткие названия обычно точнее
        const lengthPenalty = Math.max(0, (itemName.length - 50) / 100)
        relevanceScore -= lengthPenalty

        return {
          id: item.id,
          name: item.name,
          matchedKeywords,
          relevanceScore,
          matchType,
          matchRatio
        }
      })
      .filter(item => item.relevanceScore > 0.5) // Минимальный порог релевантности
      .sort((a, b) => {
        // Сортируем по типу совпадения, затем по релевантности
        if (a.matchType === 'exact' && b.matchType !== 'exact') return -1
        if (b.matchType === 'exact' && a.matchType !== 'exact') return 1
        return b.relevanceScore - a.relevanceScore
      })
      .slice(0, limit)

    console.log(`🎯 Семантический поиск: найдено ${results.length} результатов`) // LOG: результаты семантического поиска

    // Возвращаем результаты в нужном формате
    return results.map(item => ({
      id: item.id,
      name: item.name,
      matchedKeywords: item.matchedKeywords,
      relevanceScore: Math.round(item.relevanceScore * 10) / 10,
      matchType: item.matchType
    }))

  } catch (error) {
    console.error('Ошибка семантического поиска в supplier_names:', error) // LOG: ошибка семантического поиска
    return []
  }
}

/**
 * ФУНКЦИЯ 3: Поиск поставщиков методом из режима редактирования (getSupplierBasedSuggestions)
 */
export const editingModeSearchSupplierNames = async (materialName: string): Promise<Array<{
  id: string
  name: string
  confidence: number
}>> => {
  if (!materialName || materialName.trim().length < 2) {
    return []
  }

  try {
    const request: MLPredictionRequest = {
      materialName: materialName.trim()
    }

    const suggestions = await getSupplierBasedSuggestions(request)

    // Если результатов меньше 60, делаем дополнительный расширенный поиск
    if (suggestions.length < 60) {
      console.log(`🔍 Режим редактирования: найдено ${suggestions.length} результатов, нужно минимум 60. Запускаем расширенный поиск...`) // LOG: расширенный поиск

      const additionalResults = await getAdditionalSupplierResults(materialName.trim(), suggestions)

      // Объединяем результаты, убираем дубликаты по id
      const existingIds = new Set(suggestions.map(s => s.id))
      const uniqueAdditional = additionalResults.filter(result => !existingIds.has(result.id))

      const allResults = [...suggestions, ...uniqueAdditional]
      console.log(`🔍 Расширенный поиск завершен: итого ${allResults.length} результатов`) // LOG: результаты расширенного поиска

      return allResults.map(suggestion => ({
        id: suggestion.id,
        name: suggestion.name,
        confidence: suggestion.confidence
      }))
    }

    return suggestions.map(suggestion => ({
      id: suggestion.id,
      name: suggestion.name,
      confidence: suggestion.confidence
    }))
  } catch (error) {
    console.error('Editing mode supplier search error:', error)
    return []
  }
}

/**
 * Дополнительный поиск поставщиков для режима редактирования
 * Используется когда основной поиск дает меньше 60 результатов
 */
const getAdditionalSupplierResults = async (
  materialName: string,
  existingResults: NomenclatureSuggestion[]
): Promise<NomenclatureSuggestion[]> => {
  if (!supabase) return []

  try {
    console.log('🔍 Дополнительный поиск для:', materialName) // LOG: дополнительный поиск

    const searchTerm = materialName.toLowerCase()
    const additionalResults: NomenclatureSuggestion[] = []

    // Стратегия 1: Поиск по первому слову материала
    const firstWord = searchTerm.split(/[\s\-.,()]+/)[0]
    if (firstWord && firstWord.length >= 2) {
      const { data: firstWordResults } = await supabase
        .from('supplier_names')
        .select('id, name')
        .ilike('name', `%${firstWord}%`)
        .limit(80)

      if (firstWordResults) {
        firstWordResults.forEach(item => {
          additionalResults.push({
            id: item.id,
            name: item.name,
            confidence: 0.3, // Базовая уверенность для расширенного поиска
            reasoning: `Дополнительный поиск по слову "${firstWord}"`
          })
        })
      }
    }

    // Стратегия 2: Поиск по общим строительным материалам
    const materialSynonyms = {
      'пеноплэкс': ['пенопласт', 'полистирол', 'пенополистирол', 'псб', 'xps'],
      'утеплитель': ['теплоизоляция', 'изоляция', 'термоизоляция'],
      'минеральная': ['минвата', 'каменная', 'базальтовая', 'стекловата'],
      'плита': ['плиты', 'листы', 'панели', 'блоки'],
      'кирпич': ['блок', 'камень', 'керамический'],
      'бетон': ['раствор', 'смесь', 'цемент'],
      'арматура': ['стержни', 'прутки', 'сталь'],
      'кран': ['вентиль', 'клапан', 'фитинг', 'шаровой']
    }

    for (const [material, synonyms] of Object.entries(materialSynonyms)) {
      if (searchTerm.includes(material)) {
        for (const synonym of synonyms) {
          const { data: synonymResults } = await supabase
            .from('supplier_names')
            .select('id, name')
            .ilike('name', `%${synonym}%`)
            .limit(20)

          if (synonymResults) {
            synonymResults.forEach(item => {
              additionalResults.push({
                id: item.id,
                name: item.name,
                confidence: 0.25,
                reasoning: `Поиск по синониму "${synonym}" для "${material}"`
              })
            })
          }
        }
        break // Берем только первое совпадение по материалу
      }
    }

    // Стратегия 3: Если все еще мало результатов, берем случайные релевантные записи
    if (additionalResults.length < 40) {
      const { data: randomResults } = await supabase
        .from('supplier_names')
        .select('id, name')
        .limit(60)
        .order('id', { ascending: false }) // Берем последние добавленные

      if (randomResults) {
        randomResults.forEach(item => {
          additionalResults.push({
            id: item.id,
            name: item.name,
            confidence: 0.15,
            reasoning: 'Расширенная выборка для достижения минимума 60 результатов'
          })
        })
      }
    }

    // Убираем дубликаты, если они попали из разных стратегий
    const uniqueResults: NomenclatureSuggestion[] = []
    const seenIds = new Set()

    additionalResults.forEach(result => {
      if (!seenIds.has(result.id)) {
        seenIds.add(result.id)
        uniqueResults.push(result)
      }
    })

    console.log(`🔍 Дополнительный поиск нашел ${uniqueResults.length} уникальных результатов`) // LOG: результаты дополнительного поиска
    return uniqueResults

  } catch (error) {
    console.error('Ошибка дополнительного поиска:', error) // LOG: ошибка дополнительного поиска
    return []
  }
}

/**
 * ФУНКЦИЯ 4: Адаптивный гибридный поиск поставщиков (4-й алгоритм)
 * Основан на анализе MCP агента - автоматически адаптируется к типу материала
 */
export const adaptiveHybridSearchSupplierNames = async (materialName: string): Promise<Array<{
  id: string
  name: string
  confidence: number
  matchDetails: {
    materialTokens: string[]
    sizeTokens: string[]
    brandTokens: string[]
    articleTokens: string[]
    matchType: 'EXACT' | 'PARTIAL' | 'SEMANTIC' | 'BRAND' | 'SIZE'
    score: number
    explanation: string
  }
}>> => {
  if (!materialName || materialName.trim().length < 2) {
    return []
  }

  if (!supabase) throw new Error('Supabase not initialized')

  try {
    const query = materialName.toLowerCase().trim()
    console.log('🤖 Адаптивный поиск для:', query) // LOG: адаптивный поиск

    // 1. КЛАССИФИКАЦИЯ ЗАПРОСА
    const classification = classifyMaterialQuery(query)
    console.log('📊 Классификация:', classification) // LOG: классификация запроса

    // 2. ИНТЕЛЛЕКТУАЛЬНАЯ ТОКЕНИЗАЦИЯ
    const tokens = intelligentTokenize(query)
    console.log('🔤 Токены:', tokens) // LOG: токенизация

    // 3. АДАПТИВНЫЙ ПОИСК
    const searchResults = await performAdaptiveSearch(tokens, classification)
    console.log('🎯 Найдено записей:', searchResults.length) // LOG: результаты поиска

    // 4. УМНОЕ РАНЖИРОВАНИЕ
    const rankedResults = intelligentRanking(searchResults, tokens, classification)
    console.log('📈 Ранжирование завершено') // LOG: ранжирование

    return rankedResults.slice(0, 60) // Ограничиваем топ-60

  } catch (error) {
    console.error('Ошибка адаптивного поиска:', error)
    return []
  }
}

// Классификация типа материала
function classifyMaterialQuery(query: string): 'SIMPLE' | 'TECHNICAL' | 'MIXED' {
  const technicalPatterns = [
    /\b[A-Z]{2,}-[A-Z0-9]+\b/, // Артикулы типа BVR-R
    /\bDN\d+\b/i, // Размеры труб
    /\b\d+[xхX]\d+([xхX]\d+)?\b/, // Размеры 1200x600x20
    /\b[А-Я]{2,}\s+\d+\b/, // Серии типа ПСБС 25
    /\b\d{6,}\b/, // Длинные артикулы
  ]

  const simpleMaterials = [
    'пеноплэкс', 'пенопласт', 'утеплитель', 'изоляция', 'плита', 'плиты',
    'теплоизоляция', 'минеральная', 'базальтовая', 'каменная', 'стекловата', 'вата',
    'бетон', 'цемент', 'кирпич', 'блок', 'арматура', 'краска', 'труба', 'кран'
  ]

  const hasTechnical = technicalPatterns.some(pattern => pattern.test(query))
  const hasSimple = simpleMaterials.some(material => query.includes(material))

  if (hasSimple && !hasTechnical) return 'SIMPLE'
  if (hasTechnical && !hasSimple) return 'TECHNICAL'
  return 'MIXED'
}

// Интеллектуальная токенизация
function intelligentTokenize(query: string) {
  const tokens = {
    material: [] as string[],
    size: [] as string[],
    brand: [] as string[],
    article: [] as string[],
    all: query.split(/[\s\-.,()]+/).filter(t => t.length > 1)
  }

  // Расширенный список материалов (строительные материалы)
  const materials = [
    // Основные категории
    'кран', 'пеноплэкс', 'пенопласт', 'шаровой', 'резьбовой',
    // Теплоизоляция
    'теплоизоляция', 'утеплитель', 'изоляция', 'минеральная', 'плита', 'плиты',
    'базальтовая', 'каменная', 'стекловата', 'вата',
    // Строительные материалы
    'бетон', 'цемент', 'раствор', 'кирпич', 'блок', 'блоки',
    'арматура', 'металл', 'сталь', 'железо', 'алюминий',
    // Отделочные материалы
    'краска', 'грунтовка', 'штукатурка', 'шпаклевка', 'клей',
    'плитка', 'керамика', 'ламинат', 'паркет', 'линолеум',
    // Трубы и фитинги
    'труба', 'трубы', 'фитинг', 'фитинги', 'муфта', 'тройник',
    'полиэтилен', 'полипропилен', 'металлопластик',
    // Крепеж
    'винт', 'болт', 'гайка', 'шуруп', 'саморез', 'дюбель', 'анкер'
  ]

  materials.forEach(mat => {
    if (query.toLowerCase().includes(mat)) tokens.material.push(mat)
  })

  // Размеры (расширенное определение)
  const sizes = query.match(/\b(DN\d+|\d+[xхX]\d+([xхX]\d+)?|\d+\s*мм|\d+\s*см|\d+\s*м)\b/gi) || []
  tokens.size.push(...sizes)

  // Бренды (расширенный список)
  const brands = [
    'ридан', 'пеноплэкс', 'технониколь', 'rockwool', 'isover',
    'ursa', 'knauf', 'paroc', 'baswool', 'термолайф',
    'эковер', 'izovol', 'изовол', 'изомин', 'izomin'
  ]
  brands.forEach(brand => {
    if (query.toLowerCase().includes(brand)) tokens.brand.push(brand)
  })

  // Артикулы
  const articles = query.match(/\b[A-Z]{2,}-[A-Z0-9]+\b/g) || []
  tokens.article.push(...articles)

  return tokens
}

// Адаптивный поиск
async function performAdaptiveSearch(tokens: any, classification: string) {
  const results = []

  // Стратегия 1: Точный поиск по артикулам
  if (tokens.article.length > 0) {
    for (const article of tokens.article) {
      const { data } = await supabase!
        .from('supplier_names')
        .select('id, name')
        .ilike('name', `%${article}%`)
        .limit(80)
      if (data) results.push(...data.map((item: any) => ({...item, matchType: 'EXACT', baseScore: 10})))
    }
  }

  // Стратегия 2: Поиск по материалу + размеру
  if (tokens.material.length > 0 && tokens.size.length > 0) {
    for (const material of tokens.material) {
      for (const size of tokens.size) {
        const { data } = await supabase!
          .from('supplier_names')
          .select('id, name')
          .and(`name.ilike.%${material}%, name.ilike.%${size}%`)
          .limit(50)
        if (data) results.push(...data.map((item: any) => ({...item, matchType: 'PARTIAL', baseScore: 8})))
      }
    }
  }

  // Стратегия 3: Поиск по бренду
  if (tokens.brand.length > 0) {
    for (const brand of tokens.brand) {
      const { data } = await supabase!
        .from('supplier_names')
        .select('id, name')
        .ilike('name', `%${brand}%`)
        .limit(60)
      if (data) results.push(...data.map((item: any) => ({...item, matchType: 'BRAND', baseScore: 7})))
    }
  }

  // Стратегия 4: Поиск по всем значимым словам (fallback)
  // Если предыдущие стратегии не дали результатов или дали мало результатов
  if (results.length < 10) {
    const significantWords = tokens.all.filter((word: string) =>
      word.length >= 3 && // Минимум 3 символа
      !['для', 'из', 'под', 'при', 'без', 'над', 'про', 'или'].includes(word.toLowerCase()) // Исключаем служебные слова
    )

    for (const word of significantWords) {
      const { data } = await supabase!
        .from('supplier_names')
        .select('id, name')
        .ilike('name', `%${word}%`)
        .limit(25)
      if (data) results.push(...data.map((item: any) => ({...item, matchType: 'PARTIAL', baseScore: 5})))
    }
  }

  // Стратегия 5: Семантический поиск
  const semanticTerms = getSemanticTerms(tokens)
  for (const term of semanticTerms) {
    const { data } = await supabase!
      .from('supplier_names')
      .select('id, name')
      .ilike('name', `%${term}%`)
      .limit(40)
    if (data) results.push(...data.map((item: any) => ({...item, matchType: 'SEMANTIC', baseScore: 6})))
  }

  // Удаляем дубликаты по ID
  const uniqueResults = results.filter((item, index, arr) =>
    arr.findIndex(i => i.id === item.id) === index
  )

  return uniqueResults
}

// Получение семантических терминов
function getSemanticTerms(tokens: any): string[] {
  const synonyms: Record<string, string[]> = {
    // Теплоизоляция
    'пеноплэкс': ['пенополистирол', 'полистирол', 'пенопласт', 'экструдированный', 'xps'],
    'теплоизоляция': ['утеплитель', 'изоляция', 'теплоизолятор', 'термоизоляция'],
    'минеральная': ['базальтовая', 'каменная', 'rockwool', 'роквул'],
    'плита': ['плиты', 'панель', 'панели', 'лист', 'листы'],
    'вата': ['стекловата', 'минвата', 'базальтовата'],
    // Краны и арматура
    'кран': ['вентиль', 'затвор', 'клапан', 'запорный'],
    'шаровой': ['шар', 'ball', 'сферический'],
    'резьбовой': ['резьба', 'thread', 'муфтовый'],
    // Размеры
    '100': ['сто', '100мм', '10см'],
    'мм': ['миллиметр', 'миллиметры', 'mm'],
    // Дополнительные категории
    'бетон': ['железобетон', 'ж/б', 'жб', 'цементный'],
    'труба': ['трубы', 'трубопровод', 'трубная']
  }

  const terms = new Set<string>()

  for (const token of tokens.all) {
    if (synonyms[token]) {
      synonyms[token].forEach(syn => terms.add(syn))
    }
  }

  return Array.from(terms)
}

// Умное ранжирование
function intelligentRanking(results: any[], tokens: any, classification: string) {
  return results.map(item => {
    const name = item.name.toLowerCase()
    let score = item.baseScore || 1
    const explanation = []

    // Бонусы за точные совпадения
    if (tokens.article.some((art: string) => name.includes(art.toLowerCase()))) {
      score += 20
      explanation.push('артикул')
    }

    if (tokens.size.some((size: string) => name.includes(size.toLowerCase()))) {
      score += 10
      explanation.push('размер')
    }

    if (tokens.brand.some((brand: string) => name.includes(brand.toLowerCase()))) {
      score += 8
      explanation.push('бренд')
    }

    if (tokens.material.some((mat: string) => name.includes(mat.toLowerCase()))) {
      score += 5
      explanation.push('материал')
    }

    // Бонус за начало строки
    if (tokens.all.some((token: string) => name.startsWith(token.toLowerCase()))) {
      score += 3
      explanation.push('префикс')
    }

    const confidence = Math.min(0.95, Math.max(0.1, score / 40))

    return {
      id: item.id,
      name: item.name,
      confidence,
      matchDetails: {
        materialTokens: tokens.material,
        sizeTokens: tokens.size,
        brandTokens: tokens.brand,
        articleTokens: tokens.article,
        matchType: item.matchType,
        score,
        explanation: explanation.join(', ') || 'общее совпадение'
      }
    }
  }).sort((a, b) => b.confidence - a.confidence)
}

/**
 * Комбинированный поиск для тестирования AI
 * Выполняет все четыре варианта поиска и возвращает форматированные результаты
 */
export async function testSearchSupplierNames(
  materialName: string
): Promise<{
  vectorResults: Array<{ id: string; name: string; confidence: number }>
  keywordResults: Array<{ id: string; name: string; matchedKeywords: string[]; relevanceScore: number; matchType: string }>
  editingResults: Array<{ id: string; name: string; confidence: number }>
  adaptiveResults: Array<{ id: string; name: string; confidence: number; matchDetails: any }>
  formattedText: string
}> {
  if (!materialName) {
    return {
      vectorResults: [],
      keywordResults: [],
      editingResults: [],
      adaptiveResults: [],
      formattedText: 'Укажите название материала для поиска'
    }
  }

  try {
    console.log('🔍 Запуск комбинированного поиска для:', materialName) // LOG: комбинированный поиск

    // Выполняем все четыре варианта поиска параллельно
    const [vectorResults, keywordResults, editingResults, adaptiveResults] = await Promise.all([
      vectorSearchSupplierNames(materialName, 60),
      keywordSearchSupplierNames(materialName, 60),
      editingModeSearchSupplierNames(materialName),
      adaptiveHybridSearchSupplierNames(materialName)
    ])

    // Формируем текст для отображения
    let formattedText = `🎯 Результаты поиска для: "${materialName}"\n\n`

    // 1. Результаты векторного поиска
    formattedText += `📊 1. ВЕКТОРНЫЙ ПОИСК (${vectorResults.length} результатов):\n`
    if (vectorResults.length > 0) {
      vectorResults.forEach((item, index) => {
        formattedText += `   ${index + 1}. ${item.name} (${Math.round(item.confidence * 100)}%)\n`
      })
    } else {
      formattedText += '   Результатов не найдено\n'
    }

    formattedText += '\n'

    // 2. Результаты семантического поиска
    formattedText += `🔍 2. СЕМАНТИЧЕСКИЙ ПОИСК (${keywordResults.length} результатов):\n`
    if (keywordResults.length > 0) {
      keywordResults.forEach((item, index) => {
        // Преобразуем релевантность в проценты (как в векторном поиске)
        const confidencePercent = Math.min(100, Math.round((item.relevanceScore / 10) * 100))
        formattedText += `   ${index + 1}. ${item.name} (${confidencePercent}%)\n`
      })
    } else {
      formattedText += '   Результатов не найдено\n'
    }

    formattedText += '\n'

    // 3. Результаты поиска из режима редактирования
    formattedText += `⚙️ 3. РЕЖИМ РЕДАКТИРОВАНИЯ (${editingResults.length} результатов):\n`
    if (editingResults.length > 0) {
      editingResults.forEach((item, index) => {
        formattedText += `   ${index + 1}. ${item.name} (${Math.round(item.confidence * 100)}%)\n`
      })
    } else {
      formattedText += '   Результатов не найдено\n'
    }

    formattedText += '\n'

    // 4. Результаты адаптивного гибридного поиска
    formattedText += `🤖 4. АДАПТИВНЫЙ ГИБРИДНЫЙ ПОИСК (${adaptiveResults.length} результатов):\n`
    if (adaptiveResults.length > 0) {
      adaptiveResults.forEach((item, index) => {
        const explanation = item.matchDetails?.explanation || 'общее совпадение'
        formattedText += `   ${index + 1}. ${item.name} (${Math.round(item.confidence * 100)}%) - ${explanation}\n`
      })
    } else {
      formattedText += '   Результатов не найдено\n'
    }

    // Добавляем итоговую статистику
    const totalUnique = new Set([
      ...vectorResults.map(r => r.id),
      ...keywordResults.map(r => r.id),
      ...editingResults.map(r => r.id),
      ...adaptiveResults.map(r => r.id)
    ]).size

    formattedText += `\n📈 ИТОГО: ${totalUnique} уникальных поставщиков найдено`

    console.log(`🎯 Комбинированный поиск завершен: векторный=${vectorResults.length}, семантический=${keywordResults.length}, режим_редактирования=${editingResults.length}, адаптивный=${adaptiveResults.length}`) // LOG: результаты комбинированного поиска

    return {
      vectorResults,
      keywordResults,
      editingResults,
      adaptiveResults,
      formattedText
    }

  } catch (error) {
    console.error('Ошибка комбинированного поиска:', error) // LOG: ошибка комбинированного поиска
    return {
      vectorResults: [],
      keywordResults: [],
      editingResults: [],
      adaptiveResults: [],
      formattedText: `❌ Ошибка поиска: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    }
  }
}

/**
 * ===============================
 * ФУНКЦИЯ ПОИСКА НОМЕНКЛАТУРЫ ПОСТАВЩИКА ПО МАТЕРИАЛУ
 * ===============================
 * Адаптированная функция для поиска номенклатуры поставщика по названию материала
 * Использует тот же движок, что и predictSuppliers, но работает с таблицей supplier_names
 * Возвращает 30 наиболее релевантных вариантов номенклатуры поставщика
 */
export const predictNomenclatureSuppliers = async (
  request: MLPredictionRequest,
  signal?: AbortSignal
): Promise<MLPredictionResponse> => {
  const startTime = Date.now()
  const config = await getMLConfig()

  console.log('🔍 ML NomenclatureSuppliers DEBUG: AbortSignal status:', {
    hasSignal: !!signal,
    aborted: signal?.aborted || false,
    materialName: request.materialName
  })

  if (!config.enabled) {
    return getFallbackNomenclatureSuppliersResults(request, startTime)
  }

  try {
    // Выбор между AI и ML режимами
    const mlModeConfig = await mlModeApi.getCurrentMode()
    const currentMode = mlModeConfig.mode

    console.log('🔄 ML NomenclatureSuppliers: Режим', currentMode, 'для материала:', request.materialName)

    // Если выбран Deepseek AI режим
    if (currentMode === 'deepseek') {
      const deepseekAvailable = await mlModeApi.isDeepseekAvailable()

      if (deepseekAvailable) {
        console.log('🤖 ML NomenclatureSuppliers: Используем Deepseek AI для поиска номенклатуры поставщика')
        return await predictNomenclatureSuppliersWithDeepseek(request, signal)
      } else {
        console.log('🤖 ML NomenclatureSuppliers: Deepseek недоступен, переключаемся на локальный ML')
      }
    }

    // Локальный ML режим для номенклатуры поставщика
    console.log('🧠 ML NomenclatureSuppliers: Используем локальный ML алгоритм для поиска номенклатуры поставщика')
    const suggestions = await getNomenclatureSupplierSuggestions(request, config)

    return {
      suggestions,
      processingTime: Date.now() - startTime,
      modelUsed: 'local-nomenclature-suppliers'
    }

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('🤖 ML NomenclatureSuppliers: Запрос отменен (AbortError)')
    } else {
      console.error('🤖 ML NomenclatureSuppliers: Ошибка предсказания:', error)
    }
    throw error
  }
}

/**
 * Локальный ML алгоритм для поиска номенклатуры поставщика
 * Адаптирован из getSupplierBasedSuggestions для работы с supplier_names
 */
const getNomenclatureSupplierSuggestions = async (
  request: MLPredictionRequest,
  config: MLConfig
): Promise<NomenclatureSuggestion[]> => {
  if (!supabase) throw new Error('Supabase is not configured')

  console.log('🔍 ML NomenclatureSuppliers: Поиск в supplier_names для материала:', request.materialName)

  // Получаем все записи из supplier_names (номенклатура поставщика)
  const { data: supplierNames, error } = await supabase
    .from('supplier_names')
    .select('id, name')
    .limit(3000) // Увеличенный лимит для лучшего поиска

  if (error) {
    console.error('Ошибка получения supplier_names:', error)
    throw error
  }

  if (!supplierNames || supplierNames.length === 0) {
    console.log('Таблица supplier_names пуста')
    return []
  }

  console.log(`🔍 ML NomenclatureSuppliers: Загружено ${supplierNames.length} записей номенклатуры поставщика`)

  // Адаптированный алгоритм поиска для номенклатуры поставщика
  const searchTerm = request.materialName.toLowerCase().trim()
  const supplierSearchWords = searchTerm
    .replace(/[^\wа-яё\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= config.minWordLength)
    .filter(word => !config.ignoredTerms.includes(word))

  console.log('🔍 ML NomenclatureSuppliers: Поисковые слова:', supplierSearchWords)

  if (supplierSearchWords.length === 0) {
    console.log('Нет значимых слов для поиска номенклатуры поставщика')
    return []
  }

  const effectiveSearchTerm = supplierSearchWords.join(' ')

  // Фильтрация и ранжирование номенклатуры поставщика
  const matches = supplierNames.filter(supplier => {
    const supplierLower = supplier.name.toLowerCase()
    return supplierSearchWords.some(word => supplierLower.includes(word))
  })

  console.log(`🔍 ML NomenclatureSuppliers: Найдено ${matches.length} совпадений`)

  // Создаем предложения с расчетом уверенности
  const suggestions = matches.map((supplier, index) => {
    const supplierLower = supplier.name.toLowerCase()
    const cleanedSupplierName = cleanTermForMatching(supplierLower, config.ignoredTerms)

    // Базовый similarity score
    const rawSimilarity = calculateStringSimilarity(effectiveSearchTerm, cleanedSupplierName)
    const similarity = rawSimilarity * config.similarityWeight

    let totalBonus = 0
    const bonusBreakdown = []

    // Бонус за точное совпадение префикса
    if (cleanedSupplierName.startsWith(effectiveSearchTerm) || supplierLower.startsWith(searchTerm)) {
      totalBonus += config.prefixBonus
      bonusBreakdown.push(`prefix:${Math.round(config.prefixBonus * 100)}%`)
    }

    // Бонус за точное вхождение
    if (cleanedSupplierName.includes(effectiveSearchTerm) || supplierLower.includes(searchTerm)) {
      totalBonus += config.exactMatchBonus
      bonusBreakdown.push(`exact:${Math.round(config.exactMatchBonus * 100)}%`)
    }

    // Расширенный анализ ключевых слов
    const keywordScore = calculateKeywordScore(supplierSearchWords, cleanedSupplierName, config)
    const keywordBonus = keywordScore * config.keywordBonus
    totalBonus += keywordBonus
    bonusBreakdown.push(`keywords:${Math.round(keywordScore * 100)}%*${Math.round(config.keywordBonus * 100)}%=${Math.round(keywordBonus * 100)}%`)

    // Применяем алгоритм настройки точности
    let finalScore = similarity + totalBonus
    const beforeAlgorithm = finalScore
    finalScore = applyAlgorithmSettings(finalScore, config.algorithm)

    const finalConfidence = Math.max(0.1, Math.min(0.95, finalScore))

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 ML NomenclatureSuppliers: "${supplier.name}" (${index + 1}/${matches.length}):`, {
        similarity: Math.round(similarity * 100) + '%',
        bonuses: bonusBreakdown.join(' + '),
        algorithm: config.algorithm,
        confidence: Math.round(finalConfidence * 100) + '%'
      })
    }

    return {
      id: supplier.id,
      name: supplier.name,
      confidence: finalConfidence,
      reasoning: `${Math.round(similarity * 100)}% similarity + [${bonusBreakdown.join(', ')}] via ${config.algorithm} algorithm`
    }
  })

  // Фильтруем по порогу уверенности и сортируем
  const filteredSuggestions = suggestions
    .filter(s => s.confidence >= config.confidenceThreshold)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 30) // Ограничиваем 30 результатами

  console.log('🔍 ML NomenclatureSuppliers: Финальных предложений:', filteredSuggestions.length)

  return filteredSuggestions
}

/**
 * Deepseek AI для поиска номенклатуры поставщика
 */
async function predictNomenclatureSuppliersWithDeepseek(
  request: MLPredictionRequest,
  externalSignal?: AbortSignal
): Promise<MLPredictionResponse> {
  console.log('🤖 Deepseek NomenclatureSuppliers: Начало анализа материала:', request.materialName)

  try {
    const mlConfig = await getMLConfig()
    const maxSuggestions = Math.min(30, mlConfig?.maxSuggestions || 15) // Ограничиваем 30

    // Формируем запрос для Deepseek
    const deepseekRequest: DeepseekMaterialRequest = {
      material_name: request.materialName,
      context: request.context ? {
        project_type: request.context.projectId ? 'строительный' : undefined,
        cost_category: request.context.categoryId,
        cost_type: request.context.typeId,
        location: undefined
      } : undefined,
      preferences: {
        prefer_eco_friendly: false,
        budget_conscious: true,
        quality_priority: true,
        max_suggestions: maxSuggestions
      }
    }

    console.log('🤖 Deepseek NomenclatureSuppliers: Отправляем запрос:', deepseekRequest)

    const deepseekResponse = await deepseekApi.analyzeMaterial(deepseekRequest, externalSignal)

    console.log('🤖 Deepseek NomenclatureSuppliers: Получен ответ с', deepseekResponse.recommendations.length, 'рекомендациями')

    // Преобразуем ответ Deepseek в формат ML
    const suggestions: NomenclatureSuggestion[] = deepseekResponse.recommendations.map((rec, index) => {
      // Используем supplier_name как основное название (номенклатура поставщика)
      const nomenclatureSupplierName = rec.supplier_name || rec.nomenclature_name || 'Не указано'

      // Проверяем на fallback тексты
      const fallbackTexts = [
        'Требуется уточнение поставщика',
        'Не указано',
        'Уточняется',
        'Материал не найден'
      ]

      let finalName = nomenclatureSupplierName
      if (fallbackTexts.some(fallback => nomenclatureSupplierName.includes(fallback))) {
        finalName = request.materialName
      }

      // Формируем расширенное обоснование
      let enhancedReasoning = `AI: ${rec.reasoning}`
      if (rec.price_analysis) enhancedReasoning += `\n💰 Цена: ${rec.price_analysis}`
      if (rec.quality_score) enhancedReasoning += `\n⭐ Качество: ${rec.quality_score}/10`

      return {
        id: rec.nomenclature_id || `ai-nomenclature-supplier-${index}`,
        name: finalName,
        confidence: Math.max(0.1, Math.min(0.95, rec.confidence)),
        reasoning: enhancedReasoning,
        tooltip_info: rec.tooltip_info,
        price_analysis: rec.price_analysis,
        quality_score: rec.quality_score,
        supplier_name: rec.supplier_name
      }
    })

    console.log('🤖 Deepseek NomenclatureSuppliers: Преобразованы предложения:', suggestions.length)

    return {
      suggestions,
      processingTime: deepseekResponse.usage_stats.processing_time_ms,
      modelUsed: 'deepseek-nomenclature-suppliers'
    }

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('🤖 Deepseek NomenclatureSuppliers: Запрос отменен пользователем (AbortError)')
    } else {
      console.error('🤖 Deepseek NomenclatureSuppliers: Ошибка анализа материала:', error)
    }
    throw error
  }
}

/**
 * Fallback результаты для номенклатуры поставщика
 */
const getFallbackNomenclatureSuppliersResults = async (
  request: MLPredictionRequest,
  startTime: number
): Promise<MLPredictionResponse> => {
  console.log('🔄 ML NomenclatureSuppliers: Возвращаем fallback результаты (ML отключен)')

  return {
    suggestions: [],
    processingTime: Date.now() - startTime,
    modelUsed: 'fallback-nomenclature-suppliers'
  }
}