import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { predictSuppliers, getMLConfig, getNomenclatureBySupplier } from '../api/ml-api'
import { mlModeApi } from '@/entities/api-settings'
import type { MLPredictionRequest, NomenclatureSuggestion, MLConfig } from '../model/types'

interface UseMLSuppliersOptions {
  enabled?: boolean
  debounceMs?: number
  minQueryLength?: number
  autoPredict?: boolean
}

interface UseMLSuppliersResult {
  suggestions: NomenclatureSuggestion[]
  isLoading: boolean
  error: Error | null
  config: MLConfig | undefined
  predict: (materialName: string, context?: MLPredictionRequest['context']) => void
  predictNow: (materialName: string, context?: MLPredictionRequest['context']) => void
  clearSuggestions: () => void
  confidence: number
  processingTime: number
  modelUsed: string
  getNomenclatureForSupplier: (supplierId: string) => Promise<any[]>
}

/**
 * Хук для ML-предсказания поставщиков по названию материала
 */
export const useMLSuppliers = (options: UseMLSuppliersOptions = {}): UseMLSuppliersResult => {
  const {
    enabled = true,
    debounceMs = 300,
    minQueryLength = 2,
    autoPredict = false
  } = options

  const [currentRequest, setCurrentRequest] = useState<MLPredictionRequest | null>(null)
  const [mlMode, setMLMode] = useState<string>('local') // Текущий режим ML/AI
  const [lastResponse, setLastResponse] = useState<{
    confidence: number
    processingTime: number
    modelUsed: string
  }>({
    confidence: 0,
    processingTime: 0,
    modelUsed: 'none'
  })

  const debounceRef = useRef<NodeJS.Timeout>()

  // Загружаем конфигурацию ML
  const { data: config } = useQuery({
    queryKey: ['ml-config'],
    queryFn: getMLConfig,
    staleTime: 10 * 1000, // ИСПРАВЛЕНИЕ: 10 секунд для быстрого обновления настроек
    gcTime: 30 * 1000, // 30 секунд в памяти
  })

  // Загружаем режим ML/AI (без кэша для актуальности)
  const { data: modeConfig } = useQuery({
    queryKey: ['ml-mode-config-suppliers'],
    queryFn: () => mlModeApi.getCurrentMode(),
    staleTime: 0, // Всегда свежие данные
    gcTime: 1000, // Минимальное время в памяти
    refetchOnMount: true, // Перезагружать при монтировании
  })

  // Обновляем режим ML при изменении конфигурации (стабилизируем зависимость)
  useEffect(() => {
    if (modeConfig?.mode && modeConfig.mode !== mlMode) {
      setMLMode(modeConfig.mode)
      console.log('🔄 useMLSuppliers: Режим обновлен на', modeConfig.mode) // LOG: обновление режима
    }
  }, [modeConfig?.mode, mlMode])

  // Стабилизируем значения конфигурации для предотвращения бесконечных рендеров
  const stableConfigEnabled = useMemo(() => config?.enabled, [config?.enabled])
  const stableConfigMode = useMemo(() => config?.mode, [config?.mode])

  // Отслеживание изменений ключа запроса (только для диагностики в dev режиме)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 useMLSuppliers Query Key Changed:', {
        enabled: enabled && stableConfigEnabled && !!currentRequest,
        currentRequestMaterial: currentRequest?.materialName || 'none',
        currentRequestId: currentRequest?.id || 'none',
        configEnabled: stableConfigEnabled,
        configMode: stableConfigMode,
        mlMode
      }) // LOG: диагностика изменений queryKey
    }
  }, [currentRequest?.materialName, currentRequest?.id, stableConfigEnabled, stableConfigMode, mlMode, enabled])

  // Стабилизируем query key для предотвращения бесконечных запросов
  const stableQueryKey = useMemo(() => {
    if (!currentRequest) return ['ml-supplier-predictions', 'no-request']

    return [
      'ml-supplier-predictions',
      currentRequest.materialName,
      currentRequest.context?.projectId || 'no-project',
      currentRequest.context?.blockId || 'no-block',
      mlMode,
      stableConfigEnabled ? 'enabled' : 'disabled'
    ]
  }, [currentRequest?.materialName, currentRequest?.context?.projectId, currentRequest?.context?.blockId, mlMode, stableConfigEnabled])

  // Основной запрос для получения предсказаний поставщиков
  const {
    data: response,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: stableQueryKey,
    enabled: enabled && stableConfigEnabled && !!currentRequest,
    staleTime: 3 * 60 * 1000, // 3 минуты - дольше чем таймаут Deepseek (90 сек)
    gcTime: 10 * 60 * 1000, // 10 минут в памяти
    // Увеличиваем таймаут до 60 секунд для Deepseek запросов
    queryFn: async ({ signal }) => {
      if (!currentRequest) return null

      console.log('🤖 ML: Starting supplier prediction for:', currentRequest.materialName) // LOG: начало ML предсказания поставщиков

      // LOG: Детальная диагностика React Query signal
      console.log('🔍 ML Suppliers React Query signal:', {
        hasSignal: !!signal,
        aborted: signal?.aborted || false,
        reason: signal?.reason
      })

      try {
        // ИСПРАВЛЕНИЕ AbortError: Передаем signal в ML API
        const result = await predictSuppliers(currentRequest, signal)

        console.log('🤖 ML: Supplier prediction completed:', { // LOG: завершение ML предсказания поставщиков
          suggestionsCount: result.suggestions.length,
          processingTime: result.processingTime,
          modelUsed: result.modelUsed
        })

        // Сохраняем информацию о последнем ответе (стабилизируем вычисления)
        const avgConfidence = result.suggestions.length > 0
          ? result.suggestions.reduce((sum, s) => sum + s.confidence, 0) / result.suggestions.length
          : 0

        setLastResponse({
          confidence: avgConfidence,
          processingTime: result.processingTime,
          modelUsed: result.modelUsed
        })

        return result
      } catch (error) {
        // Проверяем тип ошибки - AbortError не логируем как ошибку
        if (error instanceof Error && error.name === 'AbortError') {
          // ДЕТАЛЬНАЯ ДИАГНОСТИКА AbortError в useMLSuppliers
          console.log('🔍 ML Suppliers AbortError ДЕТАЛИ:', {
            errorName: error.name,
            errorMessage: error.message,
            signalAborted: signal?.aborted || false,
            signalReason: signal?.reason,
            source: 'useMLSuppliers.queryFn'
          })
          throw error // Пробрасываем AbortError для правильной обработки React Query
        }

        // Для других ошибок логируем и пробрасываем
        console.error('🤖 ML: Supplier prediction error in useMLSuppliers:', error)
        throw error
      }
    },
    retry: (failureCount, error) => {
      // Не повторяем запросы при AbortError
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🔍 useMLSuppliers: AbortError detected, no retry needed')
        return false
      }
      // Для других ошибок - максимум 2 повтора
      console.log('🔍 useMLSuppliers: Retrying query, attempt:', failureCount + 1)
      return failureCount < 2
    },
    meta: {
      // Метаданные для отслеживания запросов
      queryType: 'ml-suppliers',
      material: currentRequest?.materialName
    }
  })

  // Отслеживание состояния React Query (только для диагностики в dev режиме)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && (error || response)) {
      console.log('🔍 useMLSuppliers React Query State:', {
        isLoading,
        hasError: !!error,
        hasData: !!response,
        errorType: error?.name,
        suggestionsCount: response?.suggestions?.length || 0
      })
    }
  }, [isLoading, error, response])

  // Функция для мгновенного предсказания без debounce (стабилизировано)
  const predictNow = useCallback((materialName: string, context?: MLPredictionRequest['context']) => {
    // Очищаем предыдущий таймер
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Проверяем минимальную длину запроса
    if (materialName.length < minQueryLength) {
      setCurrentRequest(null)
      return
    }

    const request: MLPredictionRequest = {
      materialName: materialName.trim(),
      context
    }

    console.log('🤖 ML: Executing immediate supplier prediction request:', request) // LOG: мгновенное выполнение ML запроса поставщиков
    console.log('🔍 DEBUG: Текущий режим ML в useMLSuppliers:', mlMode) // DEBUG LOG: текущий режим

    setCurrentRequest(request)
  }, [minQueryLength]) // Удаляем mlMode из зависимостей - он уже используется в queryKey

  // Функция для запуска предсказания с debounce (только если включено автопредсказание) - стабилизировано
  const predict = useCallback((materialName: string, context?: MLPredictionRequest['context']) => {
    if (!autoPredict) {
      console.log('🤖 ML: Auto-predict disabled for suppliers, skipping prediction') // LOG: автопредсказание поставщиков отключено
      return
    }

    // Очищаем предыдущий таймер
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Проверяем минимальную длину запроса
    if (materialName.length < minQueryLength) {
      setCurrentRequest(null)
      return
    }

    console.log('🤖 ML: Scheduling supplier prediction with debounce:', materialName) // LOG: планирование ML предсказания поставщиков

    // Устанавливаем новый таймер
    debounceRef.current = setTimeout(() => {
      const request: MLPredictionRequest = {
        materialName: materialName.trim(),
        context
      }

      console.log('🤖 ML: Executing supplier prediction request:', request) // LOG: выполнение ML запроса поставщиков

      setCurrentRequest(request)
    }, debounceMs)
  }, [debounceMs, minQueryLength, autoPredict]) // Удаляем mlMode из зависимостей

  // Функция для очистки предложений
  const clearSuggestions = useCallback(() => {
    console.log('🤖 ML: Clearing supplier suggestions') // LOG: очистка ML предложений поставщиков

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    setCurrentRequest(null)
    setLastResponse({
      confidence: 0,
      processingTime: 0,
      modelUsed: 'none'
    })
  }, [])

  // Функция для получения номенклатуры по поставщику
  const getNomenclatureForSupplier = useCallback(async (supplierId: string) => {
    console.log('🤖 ML: Getting nomenclature for supplier:', supplierId) // LOG: получение номенклатуры для поставщика
    return await getNomenclatureBySupplier(supplierId)
  }, [])

  // Фильтруем предложения по порогу confidence (стабилизировано)
  const filteredSuggestions = useMemo(() => {
    if (!response?.suggestions) return []

    const threshold = config?.confidenceThreshold || 0.3
    return response.suggestions.filter(suggestion => suggestion.confidence >= threshold)
  }, [response?.suggestions, config?.confidenceThreshold])

  return {
    suggestions: filteredSuggestions,
    isLoading,
    error: error as Error | null,
    config,
    predict,
    predictNow,
    clearSuggestions,
    confidence: lastResponse.confidence,
    processingTime: lastResponse.processingTime,
    modelUsed: lastResponse.modelUsed,
    getNomenclatureForSupplier
  }
}