// DEEPSEEK AI API ИНТЕГРАЦИЯ
// Этот файл содержит функции для работы с Deepseek AI API
//
// ВАЖНО: Все блоки кода в этом файле снабжены подробными комментариями
// для упрощения копирования и переноса функционала на другие страницы портала
//
// Deepseek API совместим с OpenAI API форматом, что упрощает интеграцию

import { supabase } from '@/lib/supabase'
import type {
  DeepseekSettings,
  DeepseekUsageStats,
  DeepseekMaterialRequest,
  DeepseekMaterialResponse,
  MLMode,
  MLModeConfig,
} from '../types'

/**
 * ===============================
 * БАЗОВЫЕ НАСТРОЙКИ DEEPSEEK API
 * ===============================
 */

// Базовая конфигурация Deepseek API
const DEEPSEEK_CONFIG = {
  BASE_URL: 'https://api.deepseek.com',
  DEFAULT_MODEL: 'deepseek-chat' as const,
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 4000, // УВЕЛИЧЕНО: для поддержки 15 результатов без обрезания JSON
  TIMEOUT_MS: 90000, // 90 секунд таймаут для AI анализа + обработки
}

/**
 * API для работы с настройками Deepseek
 * Управляет конфигурацией AI модели и статистикой использования
 */
export const deepseekApi = {
  /**
   * ===============================
   * УПРАВЛЕНИЕ НАСТРОЙКАМИ
   * ===============================
   */

  /**
   * ПОЛУЧЕНИЕ НАСТРОЕК DEEPSEEK
   * Загружает настройки из таблицы deepseek_settings
   * Возвращает настройки по умолчанию если не найдены
   */
  async getSettings(): Promise<DeepseekSettings> {
    if (!supabase) throw new Error('Supabase client not initialized')

    try {
      // Используем явный список полей вместо * для совместимости с БД без system_prompt
      const { data, error } = await supabase
        .from('deepseek_settings')
        .select(
          'id, api_key, base_url, model, enabled, temperature, max_tokens, created_at, updated_at',
        )
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch Deepseek settings:', error)
        throw error
      }

      // Возвращаем настройки по умолчанию если не найдены
      if (!data) {
        return {
          id: '',
          api_key: '',
          base_url: DEEPSEEK_CONFIG.BASE_URL,
          model: DEEPSEEK_CONFIG.DEFAULT_MODEL,
          enabled: false,
          temperature: DEEPSEEK_CONFIG.DEFAULT_TEMPERATURE,
          max_tokens: DEEPSEEK_CONFIG.DEFAULT_MAX_TOKENS,
          system_prompt: undefined, // Добавляем поле для совместимости
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }

      // ИСПРАВЛЕНИЕ: поле system_prompt отсутствует в схеме БД
      // Возвращаем undefined вместо попытки запроса несуществующего поля
      const systemPrompt: string | undefined = undefined

      return {
        ...data,
        system_prompt: systemPrompt,
      } as DeepseekSettings
    } catch (error) {
      console.error('Error getting Deepseek settings:', error)
      throw error
    }
  },

  /**
   * СОХРАНЕНИЕ НАСТРОЕК DEEPSEEK
   * Создает новые настройки или обновляет существующие
   * Автоматически валидирует API ключ при сохранении
   */
  async upsertSettings(input: Partial<DeepseekSettings>): Promise<DeepseekSettings> {
    if (!supabase) throw new Error('Supabase client not initialized')

    try {
      const { data: existing } = await supabase.from('deepseek_settings').select('id').single()

      // Исключаем system_prompt из данных для сохранения (если поле не существует в БД)
      const { system_prompt, ...inputWithoutPrompt } = input

      // Добавляем timestamp обновления
      const dataToSave = {
        ...inputWithoutPrompt,
        updated_at: new Date().toISOString(),
      }

      const query = supabase.from('deepseek_settings')
      const { data, error } = existing
        ? await query.update(dataToSave).eq('id', existing.id).select().single()
        : await query
            .insert({
              ...dataToSave,
              created_at: new Date().toISOString(),
            })
            .select()
            .single()

      if (error) {
        console.error('Failed to upsert Deepseek settings:', error)
        throw error
      }

      // ИСПРАВЛЕНИЕ: поле system_prompt отсутствует в схеме БД
      // Не пытаемся сохранить system_prompt так как поле не существует
      if (system_prompt !== undefined) {
        console.log('⚠️ system_prompt игнорируется - поле отсутствует в схеме БД') // LOG: информация о том, что поле игнорируется
      }

      // Возвращаем данные с system_prompt = undefined (поле отсутствует в БД)
      return {
        ...data,
        system_prompt: undefined,
      } as DeepseekSettings
    } catch (error) {
      console.error('Error upserting Deepseek settings:', error)
      throw error
    }
  },

  /**
   * ===============================
   * ПРОВЕРКА ПОДКЛЮЧЕНИЯ
   * ===============================
   */

  /**
   * ТЕСТ ПОДКЛЮЧЕНИЯ К DEEPSEEK API
   * Проверяет валидность API ключа и доступность сервиса
   * Возвращает объект с результатом проверки и дополнительной информацией
   */
  async testConnection(
    apiKey: string,
    baseUrl?: string,
    externalSignal?: AbortSignal,
  ): Promise<{
    success: boolean
    error?: string
    model_info?: any
    latency_ms?: number
  }> {
    const startTime = Date.now()

    // Создаем объединенный AbortSignal для test connection
    const combinedSignal = this.createCombinedSignal(externalSignal, DEEPSEEK_CONFIG.TIMEOUT_MS)

    try {
      // Используем простой запрос для проверки подключения
      const response = await fetch(`${baseUrl || DEEPSEEK_CONFIG.BASE_URL}/v1/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: combinedSignal, // ИСПРАВЛЕНИЕ: Используем объединенный signal
      })

      const latency = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
          latency_ms: latency,
        }
      }

      const data = await response.json()

      return {
        success: true,
        model_info: data,
        latency_ms: latency,
      }
    } catch (error) {
      const latency = Date.now() - startTime
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency_ms: latency,
      }
    }
  },

  /**
   * ===============================
   * АНАЛИЗ МАТЕРИАЛОВ
   * ===============================
   */

  /**
   * АНАЛИЗ МАТЕРИАЛА ЧЕРЕЗ DEEPSEEK AI
   * Основная функция для получения рекомендаций по материалам
   *
   * ПАТТЕРН ДЛЯ КОПИРОВАНИЯ: Этот блок можно копировать на другие страницы
   * для интеграции Deepseek в любые компоненты, работающие с материалами
   */
  async analyzeMaterial(
    request: DeepseekMaterialRequest,
    externalSignal?: AbortSignal,
  ): Promise<DeepseekMaterialResponse> {
    // Получаем текущие настройки Deepseek
    const settings = await this.getSettings()

    if (!settings.enabled) {
      throw new Error('Deepseek не включен в настройках')
    }

    if (!settings.api_key) {
      throw new Error('API ключ Deepseek не настроен')
    }

    // Базовая проверка валидности ключа
    if (!settings.api_key.startsWith('sk-')) {
      throw new Error('Невалидный API ключ Deepseek (должен начинаться с sk-)')
    }

    const startTime = Date.now()

    // ИСПРАВЛЕНИЕ AbortError: Создаем объединенный AbortSignal
    const combinedSignal = this.createCombinedSignal(externalSignal, DEEPSEEK_CONFIG.TIMEOUT_MS)

    // LOG: Отслеживание AbortSignal состояния
    console.log('🔍 DEEPSEEK AbortSignal DEBUG:', {
      hasExternalSignal: !!externalSignal,
      externalAborted: externalSignal?.aborted || false,
      timeoutMs: DEEPSEEK_CONFIG.TIMEOUT_MS,
      combinedAborted: combinedSignal.aborted,
    })

    try {
      // Формируем промпт для анализа материала
      const systemPrompt = this.buildSystemPrompt(settings)
      const userPrompt = await this.buildUserPrompt(request)

      console.log('🤖 Deepseek: Отправляем запрос для анализа материала:', request.material_name)

      // LOG: запуск замера времени выполнения Deepseek запроса
      const fetchStartTime = Date.now()
      console.log(`🚀 Deepseek: Начало запроса (${new Date().toISOString()})`) // LOG: начало Deepseek запроса

      // Отправляем запрос к Deepseek API
      const response = await fetch(`${settings.base_url}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: settings.temperature,
          max_tokens: settings.max_tokens,
          stream: false,
        }),
        signal: combinedSignal, // ИСПРАВЛЕНИЕ: Используем объединенный signal
      })

      // LOG: завершение замера времени выполнения
      const fetchEndTime = Date.now()
      const fetchDuration = fetchEndTime - fetchStartTime
      console.log(`✅ Deepseek: Запрос завершен за ${fetchDuration}мс (status: ${response.status})`) // LOG: завершение Deepseek запроса

      if (!response.ok) {
        const errorText = await response.text()
        if (response.status === 401) {
          throw new Error('Неавторизованный доступ: проверьте API ключ Deepseek')
        } else if (response.status === 403) {
          throw new Error('Доступ запрещен: проверьте права доступа API ключа')
        } else if (response.status === 429) {
          throw new Error('Превышен лимит запросов Deepseek API')
        } else {
          throw new Error(`Deepseek API error: ${response.status} ${errorText}`)
        }
      }

      // LOG: начало обработки JSON ответа
      const jsonStartTime = Date.now()
      const contentLength = response.headers.get('content-length')
      console.log(`🔍 Deepseek: Ответ размер ${contentLength || 'неизвестен'} байт`) // LOG: размер ответа

      // ИСПРАВЛЕНИЕ ПРОИЗВОДИТЕЛЬНОСТИ: Упрощенное чтение без условной логики
      let text: string
      let textReadTime: number

      // Определяем размер ответа
      const contentLengthValue = contentLength ? parseInt(contentLength) : 0
      const isLargeResponse = contentLengthValue > 5000000 // 5MB threshold для больших ответов

      if (isLargeResponse) {
        console.log(
          `🔍 Deepseek: Большой ответ ${contentLengthValue} байт, используем потоковое чтение`,
        ) // LOG: потоковое чтение

        // Используем ArrayBuffer для больших ответов (более эффективно)
        const buffer = await response.arrayBuffer()
        text = new TextDecoder('utf-8').decode(buffer)
        textReadTime = Date.now() - jsonStartTime
        console.log(
          `🔍 Deepseek: ArrayBuffer прочитан за ${textReadTime}мс, размер: ${text.length} символов`,
        ) // LOG: чтение ArrayBuffer
      } else {
        // КРИТИЧНОЕ ИСПРАВЛЕНИЕ: Для маленьких ответов используем ArrayBuffer напрямую
        console.log(
          `🔍 Deepseek: Маленький ответ ${contentLengthValue || 'unknown'} байт, используем ArrayBuffer для надежности`,
        ) // LOG: оптимизированное чтение

        try {
          // ИСПРАВЛЕНИЕ: Используем ArrayBuffer вместо text() чтобы избежать browser bugs
          const buffer = await response.arrayBuffer()
          text = new TextDecoder('utf-8').decode(buffer)
          textReadTime = Date.now() - jsonStartTime
          console.log(
            `🔍 Deepseek: ArrayBuffer прочитан за ${textReadTime}мс, размер: ${text.length} символов`,
          ) // LOG: чтение ArrayBuffer
        } catch (bufferError) {
          console.error(`🔍 Deepseek: Ошибка чтения ArrayBuffer:`, bufferError) // LOG: ошибка чтения
          throw new Error(`Не удалось прочитать ответ: ${bufferError.message}`)
        }
      }

      const jsonParseStartTime = Date.now()
      let data
      try {
        data = JSON.parse(text)
      } catch (jsonError) {
        console.error('🔍 Deepseek: Ошибка JSON парсинга в основном потоке:', {
          error: jsonError,
          textLength: text.length,
          firstChars: text.substring(0, 500),
          lastChars: text.substring(text.length - 500),
        })
        throw new Error(`Ошибка парсинга JSON ответа Deepseek: ${jsonError.message}`)
      }
      const jsonProcessingTime = Date.now() - jsonParseStartTime
      console.log(`🔍 Deepseek: JSON спарсен за ${jsonProcessingTime}мс`) // LOG: время JSON парсинга

      const processingTime = Date.now() - startTime
      console.log('🤖 Deepseek: Получен ответ за', processingTime, 'мс')

      // Парсим ответ от AI
      const aiResponse = data.choices[0]?.message?.content
      if (!aiResponse) {
        throw new Error('Пустой ответ от Deepseek')
      }

      // LOG: начало парсинга AI ответа
      const aiParseStartTime = Date.now()

      const analysisResult = await this.parseAIResponse(aiResponse, request.material_name)
      const parseTime = Date.now() - aiParseStartTime
      console.log(`🔍 Deepseek: AI ответ спарсен за ${parseTime}мс`) // LOG: время парсинга AI ответа

      // Статистика использования
      const usageStats = {
        tokens_input: data.usage?.prompt_tokens || 0,
        tokens_output: data.usage?.completion_tokens || 0,
        processing_time_ms: processingTime,
      }

      // LOG: начало обновления статистики
      const statsStartTime = Date.now()
      await this.updateUsageStats(usageStats.tokens_input, usageStats.tokens_output, true)
      const statsTime = Date.now() - statsStartTime
      console.log(`🔍 Deepseek: Статистика обновлена за ${statsTime}мс`) // LOG: время обновления статистики

      console.log('🤖 Deepseek: Анализ завершен:', {
        material: request.material_name,
        recommendations_count: analysisResult.recommendations.length,
        found_online: analysisResult.material_analysis?.found_online,
        processing_time: processingTime,
      })

      // ОТЛАДКА: Сохраняем ответ в debug таблицу для анализа
      try {
        await this.saveDebugResponse({
          materialName: request.material_name,
          maxSuggestions: request.preferences?.max_suggestions || 5,
          rawResponse: aiResponse,
          rawResponseLength: aiResponse.length,
          cleanedResponse: analysisResult.debugInfo?.cleanedResponse,
          cleanedResponseLength: analysisResult.debugInfo?.cleanedResponseLength,
          jsonExtractionMethod: analysisResult.debugInfo?.jsonExtractionMethod,
          jsonFixApplied: analysisResult.debugInfo?.jsonFixApplied,
          jsonErrorPosition: analysisResult.debugInfo?.jsonErrorPosition,
          jsonErrorMessage: analysisResult.debugInfo?.jsonErrorMessage,
          fallbackUsed: analysisResult.debugInfo?.fallbackUsed,
          responseTimeMs: processingTime,
          parsedRecommendations: analysisResult.recommendations,
          recommendationsCount: analysisResult.recommendations.length,
          processingTimeMs: processingTime,
          success: true,
          mlMode: 'deepseek',
        })
      } catch (debugError) {
        console.warn('Ошибка сохранения debug данных:', debugError) // LOG: ошибка debug сохранения
      }

      return {
        material_analysis: analysisResult.material_analysis,
        recommendations: analysisResult.recommendations,
        usage_stats: usageStats,
      }
    } catch (error) {
      const processingTime = Date.now() - startTime

      // ОТЛАДКА: Сохраняем информацию об ошибке
      try {
        await this.saveDebugResponse({
          materialName: request.material_name,
          maxSuggestions: request.preferences?.max_suggestions || 5,
          rawResponse: null,
          rawResponseLength: 0,
          parsedRecommendations: [],
          recommendationsCount: 0,
          processingTimeMs: processingTime,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          mlMode: 'deepseek',
        })
      } catch (debugError) {
        console.warn('Ошибка сохранения debug ошибки:', debugError) // LOG: ошибка debug сохранения ошибки
      }

      // Проверяем тип ошибки
      if (error instanceof Error && error.name === 'AbortError') {
        // ДЕТАЛЬНАЯ ДИАГНОСТИКА AbortError
        console.log('🔍 DEEPSEEK AbortError ДЕТАЛИ:', {
          errorName: error.name,
          errorMessage: error.message,
          processingTime,
          externalSignalAborted: externalSignal?.aborted || false,
          combinedSignalAborted: combinedSignal.aborted,
          reason: externalSignal?.aborted ? 'React Query cancellation' : 'Timeout (30s)',
        })
        throw error // Передаем AbortError без дополнительной обработки
      }

      console.error('🤖 Deepseek: Ошибка анализа материала:', error)

      // Обновляем статистику с ошибкой только для реальных ошибок
      await this.updateUsageStats(0, 0, false)

      throw error
    }
  },

  /**
   * ===============================
   * ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
   * ===============================
   */

  /**
   * ПОСТРОЕНИЕ СИСТЕМНОГО ПРОМПТА ДЛЯ РАСШИРЕННОГО АНАЛИЗА
   * Определяет роль и поведение AI ассистента с интернет-поиском
   * Поддерживает кастомные промпты из настроек
   *
   * ПАТТЕРН ДЛЯ КОПИРОВАНИЯ: Промпт для анализа материалов с полным исследованием
   */
  buildSystemPrompt(settings: DeepseekSettings): string {
    // Если в настройках задан кастомный промпт - используем его
    if (settings.system_prompt?.trim()) {
      console.log('🤖 Deepseek: Используется кастомный системный промпт') // LOG: информация о кастомном промпте
      return settings.system_prompt.trim()
    }

    // Стандартный полноценный промпт
    return `Ты эксперт по строительным материалам, поставщикам, ценам и качеству материалов.

ТВОЯ РАСШИРЕННАЯ ЗАДАЧА:
1. 🔍 АНАЛИЗ МАТЕРИАЛА: Проанализируй технические характеристики материала
2. 📊 ПОИСК СООТВЕТСТВИЙ: Найди точные совпадения в предоставленном списке поставщиков
3. 💰 ЦЕНОВОЙ АНАЛИЗ: Оцени соотношение цена/качество
4. ⭐ КАЧЕСТВЕННАЯ ОЦЕНКА: Оцени качество на основе характеристик
5. 🎯 РЕКОМЕНДАЦИИ: Подбери лучшие варианты по соотношению цена/качество

КРИТЕРИИ ПРИОРИТЕТА:
1. 🏷️ НАЗВАНИЕ: Точность совпадения названия материала (50%)
2. 💰 ЦЕНА: Оптимальное соотношение цена/качество (30%)
3. ⭐ КАЧЕСТВО: Технические характеристики и надежность (20%)

ОБЯЗАТЕЛЬНЫЙ АНАЛИЗ:
✅ Определи технические характеристики и сферу применения
✅ Найди точные совпадения в предоставленном списке поставщиков
✅ Оцени качество материала на основе характеристик
✅ Проверь соответствие проекту и техническим требованиям

ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "material_analysis": {
    "found_online": true,
    "characteristics": "краткое описание характеристик",
    "applications": "сферы применения",
    "market_price_range": "диапазон цен руб/единица"
  },
  "recommendations": [
    {
      "nomenclature_name": "точное название из номенклатуры",
      "supplier_name": "рекомендуемый поставщик",
      "confidence": 0.95,
      "price_analysis": "сравнение цен, почему выгодно",
      "quality_score": 8.5,
      "characteristics_match": "как характеристики подходят",
      "reasoning": "детальное обоснование выбора",
      "tooltip_info": "краткая справка для показа при наведении"
    }
  ]
}

⚠️ КРИТИЧЕСКИ ВАЖНО: Верни ровно столько рекомендаций, сколько указано в предпочтениях пользователя!
⚠️ ВАЖНО: Ответ должен быть валидным JSON без лишнего текста!
⚠️ Если пользователь просит 15 результатов - верни ровно 15, а не 1-5
⚠️ Используй всех доступных поставщиков из списка для увеличения количества вариантов

ТРЕБОВАНИЯ К ФОРМАТУ:
- confidence от 0 до 1 (точность совпадения)
- quality_score от 1 до 10 (оценка качества)
- Обязательно заполни tooltip_info для каждой рекомендации
- Учитывай региональных поставщиков и логистику
- Стремись к дешевым, но качественным вариантам

ЕДИНЫЙ КАЧЕСТВЕННЫЙ ФОРМАТ ДЛЯ ВСЕХ КОЛИЧЕСТВ:
✅ Всегда включай material_analysis для полноты анализа
✅ Все поля должны быть информативными и полными
✅ Reasoning: до 100 символов для подробного обоснования
✅ Price_analysis: до 100 символов для ценового анализа
✅ Characteristics_match: до 100 символов для анализа соответствия
✅ Tooltip_info: до 120 символов для детальной справки

ОБЯЗАТЕЛЬНО: ВЕРНИ ВАЛИДНЫЙ JSON БЕЗ ОБРЫВОВ И НЕЗАВЕРШЕННЫХ СТРОК`
  },

  /**
   * УЛУЧШЕННАЯ ML ВЕКТОРИЗАЦИЯ ДЛЯ ОТБОРА РЕЛЕВАНТНЫХ ЗАПИСЕЙ
   * Реализует этап 1: ML векторный отбор наиболее подходящих записей из supplier_names
   */
  async selectRelevantSuppliers(
    materialName: string,
    targetCount: number = 300,
  ): Promise<string[]> {
    try {
      console.log(
        `🔍 ML Векторизация: Отбор ${targetCount} релевантных поставщиков для: ${materialName}`,
      )

      // Извлекаем ключевые слова для векторного анализа
      const keywords = this.extractMaterialKeywords(materialName)
      console.log(`🔍 ML: Ключевые слова для векторизации: ${keywords.join(', ')}`)

      // Этап 1: Полнотекстовый поиск (наиболее релевантные)
      const { data: exactMatches } = await supabase
        .from('supplier_names')
        .select('name')
        .textSearch('name', materialName, { type: 'websearch' })
        .limit(Math.min(150, Math.floor(targetCount * 0.5))) // 50% от целевого количества

      // Этап 2: Поиск по ключевым словам с весами релевантности
      const keywordResults = await Promise.all(
        keywords.map(async (keyword, index) => {
          const weight = 1 / (index + 1) // Убывающий вес для ключевых слов
          const limit = Math.floor(targetCount * 0.15 * weight) // Распределяем оставшиеся 50%

          const { data } = await supabase
            .from('supplier_names')
            .select('name')
            .ilike('name', `%${keyword}%`)
            .limit(Math.max(20, limit))

          return { data: data || [], keyword, weight }
        }),
      )

      // Этап 3: Векторное объединение с учетом весов
      const relevanceMap = new Map<string, number>()

      // Добавляем точные совпадения с максимальным весом
      exactMatches?.forEach((item) => {
        relevanceMap.set(item.name, 1.0)
      })

      // Добавляем результаты по ключевым словам с весами
      keywordResults.forEach(({ data, keyword, weight }) => {
        data.forEach((item) => {
          const currentWeight = relevanceMap.get(item.name) || 0
          const newWeight = Math.max(currentWeight, weight * 0.7) // Максимум от текущего веса
          relevanceMap.set(item.name, newWeight)
        })
      })

      // Этап 4: Сортировка по релевантности и отбор топ-N
      const sortedSuppliers = Array.from(relevanceMap.entries())
        .sort(([, weightA], [, weightB]) => weightB - weightA) // Сортируем по убыванию веса
        .slice(0, targetCount)
        .map(([name]) => name)

      console.log(
        `🎯 ML Векторизация: Отобрано ${sortedSuppliers.length} записей с весами релевантности`,
      )

      // Если недостаточно записей, добавляем дополнительные
      if (sortedSuppliers.length < targetCount * 0.7) {
        console.log('🔍 ML: Добавляем дополнительные записи для достижения целевого количества')

        const { data: additionalSuppliers } = await supabase
          .from('supplier_names')
          .select('name')
          .order('name')
          .limit(targetCount - sortedSuppliers.length)

        if (additionalSuppliers) {
          const existingNames = new Set(sortedSuppliers)
          const newSuppliers = additionalSuppliers
            .map((s) => s.name)
            .filter((name) => !existingNames.has(name))

          sortedSuppliers.push(...newSuppliers)
        }
      }

      return sortedSuppliers.slice(0, targetCount)
    } catch (error) {
      console.error('🔴 ML Векторизация: Ошибка отбора релевантных поставщиков:', error)

      // Fallback: базовый поиск
      const { data: fallbackSuppliers } = await supabase
        .from('supplier_names')
        .select('name')
        .limit(targetCount)

      return fallbackSuppliers?.map((s) => s.name) || []
    }
  },

  /**
   * ПОСТРОЕНИЕ ПОЛЬЗОВАТЕЛЬСКОГО ПРОМПТА С ПРЕДОТОБРАННЫМИ ЗАПИСЯМИ
   * Этап 2: AI анализ только релевантных записей от ML векторизации
   */
  async buildUserPrompt(request: DeepseekMaterialRequest): Promise<string> {
    const maxSuggestions = request.preferences?.max_suggestions || 5
    console.log(
      `🔍 Deepseek: Формируем промпт с предотобранными записями для ${maxSuggestions} результатов`,
    )

    let prompt = `Материал для анализа: "${request.material_name}"\n\n`

    if (request.context) {
      prompt += 'Контекст проекта:\n'
      if (request.context.project_type) prompt += `- Тип проекта: ${request.context.project_type}\n`
      if (request.context.cost_category)
        prompt += `- Категория затрат: ${request.context.cost_category}\n`
      if (request.context.cost_type) prompt += `- Тип затрат: ${request.context.cost_type}\n`
      if (request.context.location) prompt += `- Местоположение: ${request.context.location}\n`
      prompt += '\n'
    }

    if (request.preferences) {
      prompt += 'Предпочтения:\n'
      if (request.preferences.prefer_eco_friendly) prompt += '- Приоритет экологичным материалам\n'
      if (request.preferences.budget_conscious) prompt += '- Учитывать бюджет\n'
      if (request.preferences.quality_priority) prompt += '- Приоритет качеству\n'
      if (request.preferences.max_suggestions) {
        prompt += `- ⚠️ КРИТИЧЕСКИ ВАЖНО: Верни ровно ${request.preferences.max_suggestions} рекомендаций без исключений!\n`
        prompt += `- ⚠️ КАЧЕСТВЕННЫЙ ФОРМАТ: используй полные информативные поля для каждой рекомендации\n`
        prompt += `- ⚠️ ОБЯЗАТЕЛЬНО: завершай JSON корректно без обрывов и незавершенных строк\n`
      }
      prompt += '\n'
    }

    // НОВЫЙ АЛГОРИТМ: Используем ML предотобранные записи
    try {
      console.log('🤖 Deepseek: Запуск ML векторизации для отбора релевантных поставщиков')

      // Определяем размер выборки на основе количества запрашиваемых результатов
      const targetSupplierCount = Math.min(500, Math.max(100, maxSuggestions * 20))

      // Этап 1: ML векторный отбор наиболее релевантных записей
      const relevantSuppliers = await this.selectRelevantSuppliers(
        request.material_name,
        targetSupplierCount,
      )

      if (relevantSuppliers.length > 0) {
        prompt += `ПРЕДОТОБРАННЫЕ ML ВЕКТОРИЗАЦИЕЙ РЕЛЕВАНТНЫЕ ПОСТАВЩИКИ (${relevantSuppliers.length} записей):\n`
        prompt += relevantSuppliers.map((name) => `- ${name}`).join('\n')
        prompt += '\n\n'
        console.log(`🎯 Deepseek: Используем ${relevantSuppliers.length} предотобранных ML записей`)
      }

      // Дополнительно загружаем связанную номенклатуру для контекста
      const { data: nomenclature } = await supabase
        .from('nomenclature')
        .select('name')
        .ilike('name', `%${request.material_name}%`)
        .limit(20)

      if (nomenclature && nomenclature.length > 0) {
        prompt += 'РЕФЕРЕНСНАЯ НОМЕНКЛАТУРА ДЛЯ СРАВНЕНИЯ:\n'
        prompt += nomenclature.map((n) => `- ${n.name}`).join('\n')
        prompt += '\n\n'
      }
    } catch (error) {
      console.error('🔴 Deepseek: Ошибка ML векторизации, используем fallback:', error)

      // Fallback к старому алгоритму в случае ошибки
      const { data: fallbackSuppliers } = await supabase
        .from('supplier_names')
        .select('name')
        .limit(200)

      if (fallbackSuppliers && fallbackSuppliers.length > 0) {
        prompt += 'ДОСТУПНЫЕ ПОСТАВЩИКИ (fallback режим):\n'
        prompt += fallbackSuppliers.map((s) => `- ${s.name}`).join('\n')
        prompt += '\n\n'
      }
    }

    prompt +=
      'ЗАДАЧА: Проанализируй запрашиваемый материал и подбери наиболее подходящие варианты ТОЛЬКО из предоставленного списка предотобранных поставщиков. Не изобретай новые названия - используй точные названия из списка выше.'

    return prompt
  },

  /**
   * ИЗВЛЕЧЕНИЕ КЛЮЧЕВЫХ СЛОВ ИЗ НАЗВАНИЯ МАТЕРИАЛА
   * Выделяет важные термины для умного поиска поставщиков
   */
  extractMaterialKeywords(materialName: string): string[] {
    // Очищаем название от служебных символов и приводим к нижнему регистру
    const cleaned = materialName
      .toLowerCase()
      .replace(/[^\w\sа-яё]/g, ' ') // Убираем все кроме букв, цифр и пробелов
      .replace(/\s+/g, ' ') // Убираем лишние пробелы
      .trim()

    // УЛУЧШЕННЫЙ список стоп-слов (общие слова, которые не помогают в поиске)
    const stopWords = new Set([
      'и',
      'в',
      'на',
      'с',
      'по',
      'для',
      'от',
      'до',
      'из',
      'к',
      'о',
      'у',
      'за',
      'под',
      'над',
      'при',
      'без',
      'мм',
      'см',
      'м',
      'кг',
      'г',
      'шт',
      'л',
      'м2',
      'м3',
      'кв',
      'куб',
      'штук',
      'литр',
      'метр',
      'мета',
      'гост',
      'ту',
      'сту',
      'дин',
      'din',
      'iso',
      'производства',
      'серия',
      'артикул',
      'код',
      'тип',
      'типа',
      'класс',
      'марка',
      'размер',
      'длина',
      'ширина',
      'высота',
      'толщина',
      'диаметр',
    ])

    // Разбиваем на слова и фильтруем
    const words = cleaned
      .split(' ')
      .filter((word) => word.length >= 3) // Минимум 3 символа
      .filter((word) => !stopWords.has(word)) // Убираем стоп-слова
      .filter((word) => !/^\d+$/.test(word)) // Убираем чисто числовые значения

    // РАСШИРЕННЫЙ список важных категорий материалов для лучшего поиска
    const materialCategories = [
      // Основные конструкционные материалы
      'арматура',
      'бетон',
      'железобетон',
      'кирпич',
      'блок',
      'плита',
      'панель',
      'профиль',
      'труба',
      'лист',
      'балка',
      'ригель',
      'колонна',
      'плиты',
      'сваи',
      'фундамент',
      'перекрытие',

      // Изоляционные материалы
      'теплоизоляция',
      'утеплитель',
      'изоляция',
      'гидроизоляция',
      'пароизоляция',
      'звукоизоляция',
      'минвата',
      'пенопласт',
      'пенополистирол',
      'базальт',
      'стекловата',
      'эковата',

      // Связующие и отделочные материалы
      'цемент',
      'раствор',
      'смесь',
      'клей',
      'герметик',
      'краска',
      'грунт',
      'шпаклевка',
      'штукатурка',
      'мастика',
      'затирка',
      'шпатлевка',
      'эмаль',
      'лак',
      'пропитка',

      // Кровельные материалы
      'кровля',
      'черепица',
      'мембрана',
      'рубероид',
      'битум',
      'ондулин',
      'металлочерепица',
      'профнастил',
      'шифер',
      'гибкая',
      'фальцевая',

      // Столярные изделия
      'стекло',
      'окно',
      'дверь',
      'рама',
      'створка',
      'фурнитура',
      'стеклопакет',
      'подоконник',
      'наличник',
      'откос',
      'порог',
      'коробка',
      'полотно',

      // Материалы по типу
      'сталь',
      'алюминий',
      'пластик',
      'дерево',
      'металл',
      'композит',
      'полимер',
      'керамика',
      'стеклопластик',
      'фиброцемент',
      'гипсокартон',
      'осб',
      'дсп',
      'мдф',
      'фанера',
    ]

    // Добавляем найденные категории с повышенным приоритетом
    const categories = words.filter((word) =>
      materialCategories.some((cat) => word.includes(cat) || cat.includes(word)),
    )

    // Объединяем обычные слова и категории, убираем дубли
    const allKeywords = [...new Set([...categories, ...words])]

    // УЛУЧШЕНО: возвращаем топ-8 наиболее релевантных ключевых слов для лучшего поиска
    return allKeywords.slice(0, 8)
  },

  /**
   * ПАРСИНГ РАСШИРЕННОГО ОТВЕТА ОТ AI
   * Извлекает структурированные рекомендации и анализ из текстового ответа
   *
   * ПАТТЕРН ДЛЯ КОПИРОВАНИЯ: Обработка расширенного AI анализа с интернет-поиском
   */
  async parseAIResponse(
    aiResponse: string,
    originalMaterial: string,
  ): Promise<{
    material_analysis?: DeepseekMaterialResponse['material_analysis']
    recommendations: DeepseekMaterialResponse['recommendations']
    debugInfo?: {
      cleanedResponse: string
      cleanedResponseLength: number
      jsonExtractionMethod: string
      jsonFixApplied: boolean
      jsonErrorPosition?: number
      jsonErrorMessage?: string
      fallbackUsed: boolean
    }
  }> {
    // Инициализируем отладочную информацию
    const debugInfo = {
      cleanedResponse: '',
      cleanedResponseLength: 0,
      jsonExtractionMethod: 'direct',
      jsonFixApplied: false,
      fallbackUsed: false,
    }

    try {
      // LOG: детальное исследование ответа AI
      console.log('🔍 AI Response Analysis:', {
        totalLength: aiResponse.length,
        firstChars: aiResponse.substring(0, 100),
        lastChars: aiResponse.substring(aiResponse.length - 100),
        containsBraces: aiResponse.includes('{') && aiResponse.includes('}'),
      })

      // Очищаем ответ от markdown блоков и лишних символов
      let cleanResponse = aiResponse.trim()

      // Удаляем markdown блоки ```json и ```
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '')
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/```\s*$/, '')
      }

      // Сохраняем очищенный ответ в debug
      debugInfo.cleanedResponse = cleanResponse
      debugInfo.cleanedResponseLength = cleanResponse.length

      console.log('🔍 Cleaned response:', {
        originalLength: aiResponse.length,
        cleanedLength: cleanResponse.length,
        startsWithBrace: cleanResponse.startsWith('{'),
        endsWithBrace: cleanResponse.endsWith('}'),
      })

      // Пытаемся извлечь JSON из очищенного ответа
      let jsonString = cleanResponse

      // Если не начинается с {, ищем JSON в тексте
      if (!jsonString.startsWith('{')) {
        debugInfo.jsonExtractionMethod = 'regex'
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          console.error('🤖 Deepseek: JSON не найден в ответе AI')
          throw new Error('Не найден JSON в ответе AI')
        }
        jsonString = jsonMatch[0]
      }

      console.log('🔍 Extracted JSON string:', {
        length: jsonString.length,
        preview: jsonString.substring(0, 200) + '...',
        ending: jsonString.substring(jsonString.length - 200),
      })

      // УЛУЧШЕННАЯ ОБРАБОТКА НЕПОЛНОГО JSON
      if (!jsonString.endsWith('}')) {
        console.warn('🤖 Deepseek: JSON не завершен, попробуем исправить')
        debugInfo.jsonFixApplied = true
        debugInfo.jsonExtractionMethod = 'manual_fix'

        // Ищем последнюю корректную позицию перед ошибкой
        const lastValidPos = jsonString.length

        // УМНАЯ ОБРЕЗКА для неполных строк JSON
        // Ищем последнюю корректную позицию перед обрывом строки
        let cutPosition = jsonString.length

        // Проверяем, обрывается ли строка посередине (есть открытая кавычка без закрытия)
        let quoteCount = 0
        let lastQuotePos = -1
        let inStringFirst = false // ИСПРАВЛЕНО: уникальное имя для первого цикла
        let escapeNextFirst = false // ИСПРАВЛЕНО: уникальное имя для первого цикла

        for (let i = 0; i < jsonString.length; i++) {
          const char = jsonString[i]

          if (escapeNextFirst) {
            escapeNextFirst = false
            continue
          }

          if (char === '\\') {
            escapeNextFirst = true
            continue
          }

          if (char === '"') {
            quoteCount++
            lastQuotePos = i
            inStringFirst = !inStringFirst
          }
        }

        // Если строка оборвалась внутри кавычек (нечетное количество кавычек)
        if (quoteCount % 2 !== 0 && lastQuotePos > 0) {
          // Обрезаем до начала последней незакрытой строки
          cutPosition = jsonString.lastIndexOf(',', lastQuotePos)
          if (cutPosition === -1) {
            cutPosition = jsonString.lastIndexOf('{', lastQuotePos)
          }
          if (cutPosition === -1) {
            cutPosition = jsonString.lastIndexOf('[', lastQuotePos)
          }
          console.log(`🔧 Обрезаем до позиции ${cutPosition} из-за незакрытой строки`)
          jsonString = jsonString.substring(0, cutPosition)
        } else {
          // Ищем последнюю корректную запятую или скобку
          const lastComma = jsonString.lastIndexOf(',')
          const lastBrace = jsonString.lastIndexOf('}')
          const lastBracket = jsonString.lastIndexOf(']')

          if (lastComma > lastBrace && lastComma > lastBracket) {
            // Обрезаем до последней запятой
            jsonString = jsonString.substring(0, lastComma)
            console.log('🔧 Обрезаем до последней запятой')
          } else if (lastBrace > lastBracket) {
            // Обрезаем до последней закрывающей скобки объекта
            jsonString = jsonString.substring(0, lastBrace + 1)
            console.log('🔧 Обрезаем до последней закрывающей скобки объекта')
          }
        }

        // Подсчитываем открытые скобки для корректного завершения
        let braceCount = 0
        let bracketCount = 0
        let inStringState = false // ИСПРАВЛЕНО: используем другое имя переменной
        let escapeNextChar = false // ИСПРАВЛЕНО: используем другое имя переменной

        for (let i = 0; i < jsonString.length; i++) {
          const char = jsonString[i]

          if (escapeNextChar) {
            escapeNextChar = false
            continue
          }

          if (char === '\\') {
            escapeNextChar = true
            continue
          }

          if (char === '"' && !escapeNextChar) {
            inStringState = !inStringState
            continue
          }

          if (!inStringState) {
            if (char === '{') braceCount++
            else if (char === '}') braceCount--
            else if (char === '[') bracketCount++
            else if (char === ']') bracketCount--
          }
        }

        // Добавляем недостающие закрывающие скобки
        while (bracketCount > 0) {
          jsonString += ']'
          bracketCount--
        }
        while (braceCount > 0) {
          jsonString += '}'
          braceCount--
        }

        console.log('🔍 JSON исправлен, новая длина:', jsonString.length)
      }

      // УЛУЧШЕННАЯ ОЧИСТКА JSON
      // Убираем критичные ошибки синтаксиса
      jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1') // убираем trailing запятые
      jsonString = jsonString.replace(/:\s*(\d+(?:\.\d+)?)\]/g, ': $1') // исправляем "score": 7.8] -> "score": 7.8
      jsonString = jsonString.replace(/\]\s*}/g, '}') // убираем лишние ] перед }

      console.log('🔧 JSON после минимальной очистки:', {
        length: jsonString.length,
        lastChars: jsonString.substring(jsonString.length - 100),
      })

      // Проверяем на очевидные проблемы с JSON перед парсингом
      if (jsonString.length > 100000) {
        console.warn('🤖 Deepseek: Очень большой JSON ответ:', jsonString.length, 'символов')
      }

      let parsed
      try {
        parsed = JSON.parse(jsonString)
      } catch (jsonError) {
        // Сохраняем информацию об ошибке
        debugInfo.jsonErrorMessage = jsonError.message
        debugInfo.fallbackUsed = true

        if (jsonError.message.includes('position')) {
          const match = jsonError.message.match(/position (\d+)/)
          if (match) {
            debugInfo.jsonErrorPosition = parseInt(match[1])
          }
        }

        console.error('🤖 Deepseek: Ошибка парсинга JSON:', {
          error: jsonError,
          jsonLength: jsonString.length,
          lastChars: jsonString.substring(jsonString.length - 100),
        })

        // УЛУЧШЕННАЯ FALLBACK ЛОГИКА
        console.log('🔧 Используем fallback из-за ошибки JSON парсинга')

        // Пытаемся извлечь хотя бы частичные данные из поврежденного JSON
        let partialRecommendations = []
        try {
          // Ищем массив recommendations в тексте
          const recMatch = jsonString.match(/"recommendations":\s*\[([\s\S]*?)(?:\]|\}|$)/i)
          if (recMatch) {
            // Пытаемся найти хотя бы одну рекомендацию
            const recText = recMatch[1]
            const nomenclatureMatches = recText.match(/"nomenclature_name":\s*"([^"]+)"/g) || []
            const supplierMatches = recText.match(/"supplier_name":\s*"([^"]+)"/g) || []
            const confidenceMatches = recText.match(/"confidence":\s*([0-9.]+)/g) || []

            const maxRecs = Math.min(
              Math.max(nomenclatureMatches.length, supplierMatches.length),
              5,
            )
            for (let i = 0; i < maxRecs; i++) {
              const nomenclature =
                nomenclatureMatches[i]?.match(/"([^"]+)"/)?.[1] ||
                `${originalMaterial} (вариант ${i + 1})`
              const supplier =
                supplierMatches[i]?.match(/"([^"]+)"/)?.[1] || 'Требуется уточнение поставщика'
              const confidence = parseFloat(confidenceMatches[i]?.match(/([0-9.]+)/)?.[1] || '0.5')

              partialRecommendations.push({
                nomenclature_name: nomenclature,
                supplier_name: supplier,
                confidence: confidence,
                reasoning: 'Частично восстановлено из поврежденного JSON',
                price_analysis: 'Цена уточняется',
                quality_score: 6.0,
                characteristics_match: 'Частичное соответствие',
                tooltip_info: `${nomenclature} (${supplier})`,
              })
            }
          }
        } catch (extractError) {
          console.warn('Не удалось извлечь частичные данные:', extractError)
        }

        // Если не удалось извлечь ничего, создаем базовый fallback
        if (partialRecommendations.length === 0) {
          partialRecommendations = [
            {
              nomenclature_name: originalMaterial,
              supplier_name: 'Требуется уточнение поставщика',
              confidence: 0.5,
              reasoning: 'Исходный материал из запроса',
              price_analysis: 'Цена уточняется',
              quality_score: 5.0,
              characteristics_match: 'Соответствует запросу',
              tooltip_info: `Материал: ${originalMaterial}`,
            },
          ]
        }

        // Создаем улучшенную fallback структуру
        const simpleFallback = {
          material_analysis: {
            found_online: false,
            characteristics: 'Анализ прерван из-за ошибки парсинга ответа AI',
            applications: originalMaterial,
            market_price_range: 'Требуется уточнение',
          },
          recommendations: partialRecommendations,
        }

        console.log('🔧 Используем fallback JSON структуру с исходным материалом')
        parsed = simpleFallback
      }

      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error('Неверный формат ответа AI')
      }

      // Извлекаем анализ материала (опционально)
      const materialAnalysis = parsed.material_analysis
        ? {
            found_online: Boolean(parsed.material_analysis.found_online),
            characteristics:
              parsed.material_analysis.characteristics || 'Характеристики не найдены',
            applications: parsed.material_analysis.applications || 'Сферы применения не определены',
            market_price_range: parsed.material_analysis.market_price_range || 'Цены не найдены',
          }
        : undefined

      // Валидируем и дополняем рекомендации с расширенными полями
      const recommendations = parsed.recommendations.map((rec: any, index: number) => ({
        nomenclature_id: rec.nomenclature_id || `ai-suggestion-${Date.now()}-${index}`,
        nomenclature_name: rec.nomenclature_name || 'Не указано',
        supplier_name: rec.supplier_name || null,
        confidence: Math.max(0, Math.min(1, rec.confidence || 0.5)),

        // РАСШИРЕННЫЕ ПОЛЯ ДЛЯ AI АНАЛИЗА
        price_analysis: rec.price_analysis || 'Анализ цен недоступен',
        quality_score: rec.quality_score ? Math.max(1, Math.min(10, rec.quality_score)) : undefined,
        characteristics_match:
          rec.characteristics_match || 'Соответствие характеристик не определено',
        reasoning: rec.reasoning || 'Рекомендация от AI',
        tooltip_info: rec.tooltip_info || rec.nomenclature_name, // Fallback на название

        alternative_names: Array.isArray(rec.alternative_names) ? rec.alternative_names : [],
      }))

      return {
        material_analysis: materialAnalysis,
        recommendations,
        debugInfo,
      }
    } catch (error) {
      console.error('🤖 Deepseek: Ошибка парсинга ответа AI:', error)

      // Fallback: возвращаем базовую рекомендацию
      debugInfo.fallbackUsed = true
      return {
        recommendations: [
          {
            nomenclature_id: `fallback-${Date.now()}`,
            nomenclature_name: originalMaterial,
            confidence: 0.3,
            reasoning: 'Не удалось обработать ответ AI, возвращен исходный материал',
            tooltip_info: `Материал: ${originalMaterial}`,
            alternative_names: [],
          },
        ],
        debugInfo,
      }
    }
  },

  /**
   * ===============================
   * СТАТИСТИКА ИСПОЛЬЗОВАНИЯ
   * ===============================
   */

  /**
   * ПОЛУЧЕНИЕ СТАТИСТИКИ ИСПОЛЬЗОВАНИЯ
   * Загружает данные о расходе токенов, количестве запросов и стоимости
   */
  async getUsageStats(): Promise<DeepseekUsageStats | null> {
    if (!supabase) throw new Error('Supabase client not initialized')

    try {
      const { data, error } = await supabase.from('deepseek_usage_stats').select('*').single()

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch Deepseek usage stats:', error)
        throw error
      }

      return data as DeepseekUsageStats | null
    } catch (error) {
      console.error('Error getting Deepseek usage stats:', error)
      return null
    }
  },

  /**
   * ОБНОВЛЕНИЕ СТАТИСТИКИ ИСПОЛЬЗОВАНИЯ
   * Увеличивает счетчики токенов, запросов и рассчитывает стоимость
   */
  async updateUsageStats(
    inputTokens: number,
    outputTokens: number,
    success: boolean,
  ): Promise<void> {
    if (!supabase) return

    try {
      // Примерная стоимость Deepseek (нужно уточнить актуальные тарифы)
      const INPUT_TOKEN_COST = 0.00014 / 1000 // $0.14 per 1K tokens
      const OUTPUT_TOKEN_COST = 0.00028 / 1000 // $0.28 per 1K tokens

      const requestCost = inputTokens * INPUT_TOKEN_COST + outputTokens * OUTPUT_TOKEN_COST

      const { data: existing } = await supabase.from('deepseek_usage_stats').select('*').single()

      const now = new Date().toISOString()

      if (existing) {
        // Обновляем существующую статистику
        await supabase
          .from('deepseek_usage_stats')
          .update({
            requests_count: existing.requests_count + 1,
            tokens_input: existing.tokens_input + inputTokens,
            tokens_output: existing.tokens_output + outputTokens,
            total_cost: existing.total_cost + requestCost,
            successful_requests: success
              ? existing.successful_requests + 1
              : existing.successful_requests,
            failed_requests: success ? existing.failed_requests : existing.failed_requests + 1,
            last_request_at: now,
            updated_at: now,
          })
          .eq('id', existing.id)
      } else {
        // Создаем новую запись статистики
        await supabase.from('deepseek_usage_stats').insert({
          requests_count: 1,
          tokens_input: inputTokens,
          tokens_output: outputTokens,
          total_cost: requestCost,
          successful_requests: success ? 1 : 0,
          failed_requests: success ? 0 : 1,
          last_request_at: now,
          created_at: now,
          updated_at: now,
        })
      }
    } catch (error) {
      console.error('Error updating Deepseek usage stats:', error)
      // Не бросаем ошибку, чтобы не прерывать основной процесс
    }
  },

  /**
   * СБРОС СТАТИСТИКИ
   * Обнуляет все счетчики использования
   */
  async resetUsageStats(): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    try {
      const { data: existing } = await supabase.from('deepseek_usage_stats').select('id').single()

      if (existing) {
        await supabase
          .from('deepseek_usage_stats')
          .update({
            requests_count: 0,
            tokens_input: 0,
            tokens_output: 0,
            total_cost: 0,
            successful_requests: 0,
            failed_requests: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      }
    } catch (error) {
      console.error('Error resetting Deepseek usage stats:', error)
      throw error
    }
  },

  /**
   * ===============================
   * ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ AbortSignal
   * ===============================
   */

  /**
   * СОЗДАНИЕ ОПТИМИЗИРОВАННОГО AbortSignal
   * ИСПРАВЛЕНИЕ: Упрощенная логика без AbortSignal.timeout() для избежания browser bugs
   * Объединяет внешний signal (от React Query) с простым setTimeout
   */
  createCombinedSignal(externalSignal?: AbortSignal, timeoutMs?: number): AbortSignal {
    // Если нет внешнего сигнала и нет таймаута - возвращаем новый контроллер
    if (!externalSignal && !timeoutMs) {
      return new AbortController().signal
    }

    // Если есть только внешний сигнал
    if (externalSignal && !timeoutMs) {
      return externalSignal
    }

    // ИСПРАВЛЕНИЕ: Для timeout используем простой AbortController вместо AbortSignal.timeout()
    if (!externalSignal && timeoutMs) {
      const controller = new AbortController()

      // Простой setTimeout без browser bugs
      const timeoutId = setTimeout(() => {
        console.log(`🔍 DEEPSEEK: Manual timeout (${timeoutMs}ms)`) // LOG: manual таймаут
        controller.abort(new DOMException(`Request timeout after ${timeoutMs}ms`, 'TimeoutError'))
      }, timeoutMs)

      // Очищаем таймаут при abort
      controller.signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timeoutId)
        },
        { once: true },
      )

      return controller.signal
    }

    // Если есть и внешний сигнал и таймаут - создаем объединенный БЕЗ AbortSignal.timeout()
    const controller = new AbortController()

    // Если внешний сигнал уже отменен
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason)
      return controller.signal
    }

    // Слушаем отмену внешнего сигнала
    const externalAbortHandler = () => {
      console.log('🔍 DEEPSEEK: External signal aborted (React Query cancellation)') // LOG: отмена от React Query
      controller.abort(externalSignal.reason)
    }
    externalSignal.addEventListener('abort', externalAbortHandler, { once: true })

    // ИСПРАВЛЕНИЕ: Простой setTimeout вместо AbortSignal.timeout()
    const timeoutId = setTimeout(() => {
      console.log(`🔍 DEEPSEEK: Combined timeout (${timeoutMs}ms)`) // LOG: комбинированный таймаут
      controller.abort(new DOMException(`Request timeout after ${timeoutMs}ms`, 'TimeoutError'))
    }, timeoutMs)

    // Очищаем ресурсы при отмене
    controller.signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timeoutId)
        externalSignal.removeEventListener('abort', externalAbortHandler)
      },
      { once: true },
    )

    return controller.signal
  },

  /**
   * ===============================
   * ОТЛАДОЧНЫЕ ФУНКЦИИ
   * ===============================
   */

  /**
   * СОХРАНЕНИЕ РАСШИРЕННОГО ОТЛАДОЧНОГО ОТВЕТА В БД
   * Сохраняет данные о запросе и ответе для анализа качества с дополнительными полями
   */
  async saveDebugResponse(debugData: {
    materialName: string
    maxSuggestions: number
    rawResponse: string | null
    rawResponseLength: number
    cleanedResponse?: string
    cleanedResponseLength?: number
    jsonExtractionMethod?: string
    jsonFixApplied?: boolean
    jsonErrorPosition?: number
    jsonErrorMessage?: string
    fallbackUsed?: boolean
    promptSize?: number
    responseTimeMs?: number
    parsedRecommendations: any[]
    recommendationsCount: number
    processingTimeMs: number
    success: boolean
    errorMessage?: string
    mlMode: string
  }): Promise<void> {
    if (!supabase) return

    try {
      // Вычисляем оценку качества для успешных ответов
      let qualityScore = null
      let relevanceNotes = null

      if (debugData.success && debugData.parsedRecommendations.length > 0) {
        // Простая оценка качества на основе соответствия ключевых слов
        const materialKeywords = debugData.materialName
          .toLowerCase()
          .split(' ')
          .filter((word) => word.length >= 3)

        let relevantCount = 0
        for (const rec of debugData.parsedRecommendations) {
          const recName = (rec.nomenclature_name || rec.supplier_name || '').toLowerCase()
          const hasRelevantKeywords = materialKeywords.some((keyword) => recName.includes(keyword))
          if (hasRelevantKeywords) relevantCount++
        }

        qualityScore = relevantCount / debugData.parsedRecommendations.length
        relevanceNotes = `${relevantCount}/${debugData.parsedRecommendations.length} рекомендаций релевантны`
      }

      const { error } = await supabase.from('ai_debug_responses').insert({
        material_name: debugData.materialName,
        max_suggestions: debugData.maxSuggestions,
        ml_mode: debugData.mlMode,
        raw_response: debugData.rawResponse,
        raw_response_length: debugData.rawResponseLength,
        cleaned_response: debugData.cleanedResponse,
        cleaned_response_length: debugData.cleanedResponseLength,
        json_extraction_method: debugData.jsonExtractionMethod,
        json_fix_applied: debugData.jsonFixApplied,
        json_error_position: debugData.jsonErrorPosition,
        json_error_message: debugData.jsonErrorMessage,
        fallback_used: debugData.fallbackUsed,
        prompt_size: debugData.promptSize,
        response_time_ms: debugData.responseTimeMs,
        parsed_recommendations: debugData.parsedRecommendations,
        recommendations_count: debugData.recommendationsCount,
        processing_time_ms: debugData.processingTimeMs,
        success: debugData.success,
        error_message: debugData.errorMessage,
        quality_score: qualityScore,
        relevance_notes: relevanceNotes,
      })

      if (error) {
        console.warn('Ошибка сохранения debug данных:', error) // LOG: ошибка сохранения debug
      } else {
        console.log('🔍 Debug данные сохранены:', {
          material: debugData.materialName,
          success: debugData.success,
          recommendations: debugData.recommendationsCount,
          quality: qualityScore,
        }) // LOG: успешное сохранение debug данных
      }
    } catch (error) {
      console.warn('Исключение при сохранении debug данных:', error) // LOG: исключение debug
    }
  },
}

/**
 * ===============================
 * ML РЕЖИМ УПРАВЛЕНИЯ
 * ===============================
 */

/**
 * API для управления режимом работы ML системы
 * Позволяет переключаться между локальным ML и Deepseek AI
 */
export const mlModeApi = {
  /**
   * ПОЛУЧЕНИЕ ТЕКУЩЕГО РЕЖИМА ML
   * Загружает настройки из localStorage
   */
  async getCurrentMode(): Promise<MLModeConfig> {
    try {
      const saved = localStorage.getItem('ml-mode-config')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error('Error loading ML mode config:', error)
    }

    // Настройки по умолчанию
    return {
      mode: 'local',
      auto_fallback: true,
      cache_deepseek_results: true,
    }
  },

  /**
   * УСТАНОВКА РЕЖИМА ML
   * Сохраняет настройки в localStorage
   */
  async setMode(config: Partial<MLModeConfig>): Promise<void> {
    try {
      const current = await this.getCurrentMode()
      const updated = { ...current, ...config }
      localStorage.setItem('ml-mode-config', JSON.stringify(updated))

      console.log('🔄 ML Mode: Режим изменен на', updated.mode)
    } catch (error) {
      console.error('Error saving ML mode config:', error)
      throw error
    }
  },

  /**
   * ПРОВЕРКА ДОСТУПНОСТИ DEEPSEEK
   * Проверяет настройки и подключение к Deepseek
   */
  async isDeepseekAvailable(): Promise<boolean> {
    try {
      const settings = await deepseekApi.getSettings()
      return settings.enabled && !!settings.api_key
    } catch (error) {
      console.error('Error checking Deepseek availability:', error)
      return false
    }
  },
}
