// Типы для настроек API сервисов
// Этот файл содержит типы для всех API интеграций: Яндекс Диск + Deepseek

/**
 * ЯНДЕКС ДИСК НАСТРОЙКИ
 * Используется для загрузки файлов на Яндекс Диск
 */
export interface YandexDiskSettings {
  id: string
  token: string // OAuth токен для доступа к Яндекс Диску
  base_path: string // Базовый путь для загрузки файлов (например: disk:/blueprintflow)
  make_public: boolean // Автоматически публиковать загруженные файлы
  created_at: string
  updated_at: string
}

/**
 * DEEPSEEK API НАСТРОЙКИ
 * Используется для AI анализа материалов и получения рекомендаций
 * Совместим с OpenAI API форматом
 */
export interface DeepseekSettings {
  id: string
  api_key: string // API ключ для доступа к Deepseek (получить на https://platform.deepseek.com/api_keys)
  base_url: string // Базовый URL для API (по умолчанию: https://api.deepseek.com)
  model: 'deepseek-chat' | 'deepseek-reasoner' // Модель для использования
  enabled: boolean // Включен ли Deepseek (если false - используется локальный ML)
  temperature: number // Температура для генерации (0.0 - 1.0, по умолчанию 0.7)
  max_tokens: number // Максимальное количество токенов в ответе (по умолчанию 1000)
  system_prompt?: string // Кастомный системный промпт для анализа материалов (опционально)
  created_at: string
  updated_at: string
}

/**
 * СТАТИСТИКА ИСПОЛЬЗОВАНИЯ DEEPSEEK
 * Отслеживание использования для контроля расходов и производительности
 */
export interface DeepseekUsageStats {
  id: string
  requests_count: number // Общее количество запросов к API
  tokens_input: number // Количество входящих токенов
  tokens_output: number // Количество исходящих токенов
  total_cost: number // Общая стоимость использования (в USD)
  successful_requests: number // Количество успешных запросов
  failed_requests: number // Количество неудачных запросов
  last_request_at: string // Время последнего запроса
  created_at: string
  updated_at: string
}

/**
 * РЕЖИМЫ РАБОТЫ ML СИСТЕМЫ
 * Определяет какой алгоритм использовать для подбора материалов
 */
export type MLMode = 'local' | 'deepseek'

/**
 * КОНФИГУРАЦИЯ ML РЕЖИМА
 * Настройки выбора между локальным ML и Deepseek API
 */
export interface MLModeConfig {
  mode: MLMode // Текущий режим работы
  auto_fallback: boolean // Автоматически переключаться на локальный ML при ошибках Deepseek
  cache_deepseek_results: boolean // Кэшировать результаты Deepseek для повторных запросов
}

/**
 * DEEPSEEK ЗАПРОС ДЛЯ АНАЛИЗА МАТЕРИАЛОВ
 * Структура запроса к Deepseek API для получения рекомендаций по материалам
 */
export interface DeepseekMaterialRequest {
  material_name: string // Название материала для анализа
  context?: {
    project_type?: string // Тип проекта (жилой, коммерческий, промышленный)
    cost_category?: string // Категория затрат
    cost_type?: string // Тип затрат
    location?: string // Местоположение/этаж
  }
  preferences?: {
    prefer_eco_friendly?: boolean // Предпочитать экологичные материалы
    budget_conscious?: boolean // Учитывать бюджет
    quality_priority?: boolean // Приоритет качества
    max_suggestions?: number // Максимальное количество рекомендаций (по умолчанию 15)
  }
}

/**
 * DEEPSEEK ОТВЕТ С РАСШИРЕННЫМ АНАЛИЗОМ
 * Структура ответа от Deepseek API с детальным анализом материалов
 */
export interface DeepseekMaterialResponse {
  // Анализ материала из интернета
  material_analysis?: {
    found_online: boolean // Найден ли материал в интернете
    characteristics: string // Технические характеристики
    applications: string // Сферы применения
    market_price_range: string // Диапазон рыночных цен
  }

  // Рекомендации по номенклатуре
  recommendations: Array<{
    nomenclature_id?: string // ID номенклатуры из базы (если найден)
    nomenclature_name: string // Название рекомендуемой номенклатуры
    supplier_name?: string // Рекомендуемый поставщик
    confidence: number // Уверенность в рекомендации (0-1)

    // РАСШИРЕННЫЕ ПОЛЯ ДЛЯ AI АНАЛИЗА
    price_analysis?: string // Анализ цен и выгоды
    quality_score?: number // Оценка качества (1-10)
    characteristics_match?: string // Соответствие характеристик
    reasoning: string // Детальное обоснование выбора
    tooltip_info?: string // Краткая справка для показа при наведении

    alternative_names?: string[] // Альтернативные названия материала
  }>

  usage_stats: {
    tokens_input: number // Количество входящих токенов
    tokens_output: number // Количество исходящих токенов
    processing_time_ms: number // Время обработки в миллисекундах
  }
}

// ОБРАТНАЯ СОВМЕСТИМОСТЬ: Алиас для старого типа
export type DiskSettings = YandexDiskSettings