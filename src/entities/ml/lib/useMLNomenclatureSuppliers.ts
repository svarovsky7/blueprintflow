import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { predictNomenclatureSuppliers, getMLConfig } from '../api/ml-api'
import { mlModeApi } from '@/entities/api-settings'
import type { MLPredictionRequest, NomenclatureSuggestion, MLConfig } from '../model/types'

interface UseMLNomenclatureSuppliersOptions {
  enabled?: boolean
  debounceMs?: number
  minQueryLength?: number
  autoPredict?: boolean
}

interface UseMLNomenclatureSuppliersResult {
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
}

/**
 * Хук для ML-предсказания номенклатуры поставщика по названию материала
 * Находит наиболее соответствующие материалу названия номенклатуры поставщика
 */
export const useMLNomenclatureSuppliers = (options: UseMLNomenclatureSuppliersOptions = {}): UseMLNomenclatureSuppliersResult => {
  const {
    enabled = true,
    debounceMs = 300,
    minQueryLength = 2,
    autoPredict = false
  } = options

  const [currentRequest, setCurrentRequest] = useState<MLPredictionRequest | null>(null)
  const [mlMode, setMLMode] = useState<string>('local')
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
    queryKey: ['ml-nomenclature-suppliers-config'],
    queryFn: getMLConfig,
    staleTime: 10 * 1000, // 10 секунд для быстрого обновления настроек
    gcTime: 30 * 1000, // 30 секунд в памяти
  })

  // Загружаем режим ML/AI
  const { data: modeConfig } = useQuery({
    queryKey: ['ml-mode-config-nomenclature-suppliers'],
    queryFn: () => mlModeApi.getCurrentMode(),
    staleTime: 0,
    gcTime: 1000,
    refetchOnMount: true,
  })

  // Обновляем режим ML при изменении конфигурации (оптимизировано)
  useEffect(() => {
    if (modeConfig?.mode && modeConfig.mode !== mlMode) {
      setMLMode(modeConfig.mode)
      if (import.meta.env.DEV) {
        console.log('🔄 useMLNomenclatureSuppliers: Режим обновлен на', modeConfig.mode) // LOG: обновление режима
      }
    }
  }, [modeConfig?.mode, mlMode])

  // Стабилизируем значения конфигурации
  const stableConfigEnabled = useMemo(() => config?.enabled, [config?.enabled])

  // Отслеживание изменений ключа запроса (сокращено)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔍 useMLNomenclatureSuppliers Query Key Changed:', {
        enabled: enabled && stableConfigEnabled && !!currentRequest,
        currentRequestMaterial: currentRequest?.materialName || 'none',
        configEnabled: stableConfigEnabled
      }) // LOG: диагностика изменений queryKey
    }
  }, [currentRequest, stableConfigEnabled, enabled])

  // Стабилизируем query key
  const stableQueryKey = useMemo(() => {
    if (!currentRequest) return ['ml-nomenclature-suppliers-predictions', 'no-request']

    return [
      'ml-nomenclature-suppliers-predictions',
      currentRequest.materialName,
      currentRequest.context?.projectId || 'no-project',
      currentRequest.context?.blockId || 'no-block',
      mlMode,
      stableConfigEnabled ? 'enabled' : 'disabled'
    ]
  }, [currentRequest, mlMode, stableConfigEnabled])

  // Основной запрос для получения предсказаний номенклатуры поставщика
  const {
    data: response,
    isLoading,
    error
  } = useQuery({
    queryKey: stableQueryKey,
    enabled: enabled && stableConfigEnabled && !!currentRequest,
    staleTime: 3 * 60 * 1000, // 3 минуты
    gcTime: 10 * 60 * 1000, // 10 минут в памяти
    queryFn: async ({ signal }) => {
      if (!currentRequest) return null

      if (import.meta.env.DEV) {
        console.log('🤖 ML: Starting nomenclature suppliers prediction for:', currentRequest.materialName) // LOG: начало ML предсказания номенклатуры поставщиков
      }

      try {
        const result = await predictNomenclatureSuppliers(currentRequest, signal)

        if (import.meta.env.DEV) {
          console.log('🤖 ML: Nomenclature suppliers prediction completed:', { // LOG: завершение ML предсказания номенклатуры поставщиков
            suggestionsCount: result.suggestions.length,
            processingTime: result.processingTime,
            modelUsed: result.modelUsed
          })
        }

        // Сохраняем информацию о последнем ответе
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
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('🔍 ML NomenclatureSuppliers AbortError ДЕТАЛИ:', {
            errorName: error.name,
            errorMessage: error.message,
            signalAborted: signal?.aborted || false,
            signalReason: signal?.reason,
            source: 'useMLNomenclatureSuppliers.queryFn'
          })
          throw error
        }

        console.error('🤖 ML: Nomenclature suppliers prediction error:', error)
        throw error
      }
    },
    retry: (failureCount, error) => {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🔍 useMLNomenclatureSuppliers: AbortError detected, no retry needed')
        return false
      }
      console.log('🔍 useMLNomenclatureSuppliers: Retrying query, attempt:', failureCount + 1)
      return failureCount < 2
    },
    meta: {
      queryType: 'ml-nomenclature-suppliers',
      material: currentRequest?.materialName
    }
  })

  // Функция для мгновенного предсказания без debounce
  const predictNow = useCallback((materialName: string, context?: MLPredictionRequest['context']) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (materialName.length < minQueryLength) {
      setCurrentRequest(null)
      return
    }

    const request: MLPredictionRequest = {
      materialName: materialName.trim(),
      context
    }

    if (import.meta.env.DEV) {
      console.log('🤖 ML: Executing immediate nomenclature suppliers prediction request:', request) // LOG: мгновенное выполнение ML запроса номенклатуры поставщиков
    }

    setCurrentRequest(request)
  }, [minQueryLength])

  // Функция для запуска предсказания с debounce
  const predict = useCallback((materialName: string, context?: MLPredictionRequest['context']) => {
    if (!autoPredict) {
      if (import.meta.env.DEV) {
        console.log('🤖 ML: Auto-predict disabled for nomenclature suppliers, skipping prediction') // LOG: автопредсказание номенклатуры поставщиков отключено
      }
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (materialName.length < minQueryLength) {
      setCurrentRequest(null)
      return
    }

    if (import.meta.env.DEV) {
      console.log('🤖 ML: Scheduling nomenclature suppliers prediction with debounce:', materialName) // LOG: планирование ML предсказания номенклатуры поставщиков
    }

    debounceRef.current = setTimeout(() => {
      const request: MLPredictionRequest = {
        materialName: materialName.trim(),
        context
      }

      if (import.meta.env.DEV) {
        console.log('🤖 ML: Executing nomenclature suppliers prediction request:', request) // LOG: выполнение ML запроса номенклатуры поставщиков
      }

      setCurrentRequest(request)
    }, debounceMs)
  }, [debounceMs, minQueryLength, autoPredict])

  // Функция для очистки предложений
  const clearSuggestions = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log('🤖 ML: Clearing nomenclature suppliers suggestions') // LOG: очистка ML предложений номенклатуры поставщиков
    }

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

  // Фильтруем предложения по порогу confidence
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
    modelUsed: lastResponse.modelUsed
  }
}