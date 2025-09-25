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
export const useMLNomenclatureSuppliers = (
  options: UseMLNomenclatureSuppliersOptions = {},
): UseMLNomenclatureSuppliersResult => {
  const { enabled = true, debounceMs = 300, minQueryLength = 2, autoPredict = false } = options

  const [currentRequest, setCurrentRequest] = useState<MLPredictionRequest | null>(null)
  const [mlMode, setMLMode] = useState<string>('local')
  const [lastResponse, setLastResponse] = useState<{
    confidence: number
    processingTime: number
    modelUsed: string
  }>({
    confidence: 0,
    processingTime: 0,
    modelUsed: 'none',
  })

  const debounceRef = useRef<NodeJS.Timeout>()

  // РАДИКАЛЬНОЕ ИСПРАВЛЕНИЕ: Загружаем конфигурацию ML с долгим кэшем
  const { data: config } = useQuery({
    queryKey: ['ml-nomenclature-suppliers-config'],
    queryFn: getMLConfig,
    staleTime: 5 * 60 * 1000, // 5 минут - предотвращает infinite renders
    gcTime: 15 * 60 * 1000, // 15 минут в памяти
    refetchOnMount: false, // Отключаем автообновление
    refetchOnWindowFocus: false, // Отключаем обновление при фокусе
  })

  // РАДИКАЛЬНОЕ ИСПРАВЛЕНИЕ: Загружаем режим ML/AI с максимальным кэшем
  const { data: modeConfig } = useQuery({
    queryKey: ['ml-mode-config-nomenclature-suppliers'],
    queryFn: () => mlModeApi.getCurrentMode(),
    staleTime: 10 * 60 * 1000, // 10 минут - критично для предотвращения loops
    gcTime: 30 * 60 * 1000, // 30 минут в памяти
    refetchOnMount: false, // Отключаем все автообновления
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  // РАДИКАЛЬНОЕ ИСПРАВЛЕНИЕ: Используем useRef вместо useState для mlMode - предотвращает renders
  const mlModeRef = useRef(mlMode)

  useEffect(() => {
    if (modeConfig?.mode && modeConfig.mode !== mlModeRef.current) {
      if (import.meta.env.DEV) {
        console.log('🔄 useMLNomenclatureSuppliers: Обновляем режим с', mlModeRef.current, 'на', modeConfig.mode) // LOG: обновление режима
      }
      mlModeRef.current = modeConfig.mode
      setMLMode(modeConfig.mode) // Обновляем state только когда действительно нужно
    }
  }, [modeConfig?.mode]) // Зависимость только от mode, не от объекта

  // Стабилизируем значения конфигурации
  const stableConfigEnabled = useMemo(() => config?.enabled, [config?.enabled])

  // Стабилизируем материалы для query key (только значения, не объекты) - ДОЛЖНО БЫТЬ ПЕРЕД useEffect!
  const stableMaterialName = useMemo(
    () => currentRequest?.materialName || '',
    [currentRequest?.materialName],
  )
  const stableProjectId = useMemo(
    () => currentRequest?.context?.projectId || 'no-project',
    [currentRequest?.context?.projectId],
  )
  const stableBlockId = useMemo(
    () => currentRequest?.context?.blockId || 'no-block',
    [currentRequest?.context?.blockId],
  )

  // ИСПРАВЛЕНО: Убираем лишний useEffect для предотвращения бесконечных рендеров
  // useEffect для отслеживания изменений удален - логирование переносим в queryFn

  const stableQueryKey = useMemo(() => {
    if (!stableMaterialName) return ['ml-nomenclature-suppliers-predictions', 'no-request']

    return [
      'ml-nomenclature-suppliers-predictions',
      stableMaterialName,
      stableProjectId,
      stableBlockId,
      mlMode,
      stableConfigEnabled ? 'enabled' : 'disabled',
    ]
  }, [stableMaterialName, stableProjectId, stableBlockId, mlMode, stableConfigEnabled])

  // ОТКЛЮЧЕНО: TanStack Query полностью отключен для предотвращения infinite renders
  const response = null
  const isLoading = false
  const error = null

  /*
  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: stableQueryKey,
    enabled: false, // ПОЛНОСТЬЮ ОТКЛЮЧЕНО
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    queryFn: async ({ signal }) => {
      if (!currentRequest) return null

      if (import.meta.env.DEV) {
        console.log(
          '🤖 ML: Starting nomenclature suppliers prediction for:',
          currentRequest.materialName,
        ) // LOG: начало ML предсказания номенклатуры поставщиков
      }

      try {
        const result = await predictNomenclatureSuppliers(currentRequest, signal)

        if (import.meta.env.DEV) {
          console.log('🤖 ML: Nomenclature suppliers prediction completed:', {
            // LOG: завершение ML предсказания номенклатуры поставщиков
            suggestionsCount: result.suggestions.length,
            processingTime: result.processingTime,
            modelUsed: result.modelUsed,
          })
        }

        // Сохраняем информацию о последнем ответе
        const avgConfidence =
          result.suggestions.length > 0
            ? result.suggestions.reduce((sum, s) => sum + s.confidence, 0) /
              result.suggestions.length
            : 0

        setLastResponse({
          confidence: avgConfidence,
          processingTime: result.processingTime,
          modelUsed: result.modelUsed,
        })

        return result
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('🔍 ML NomenclatureSuppliers AbortError ДЕТАЛИ:', {
            errorName: error.name,
            errorMessage: error.message,
            signalAborted: signal?.aborted || false,
            signalReason: signal?.reason,
            source: 'useMLNomenclatureSuppliers.queryFn',
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
      material: currentRequest?.materialName,
    },
  })
  */

  // Функция для мгновенного предсказания без debounce
  const predictNow = useCallback(
    (materialName: string, context?: MLPredictionRequest['context']) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      if (materialName.length < minQueryLength) {
        setCurrentRequest(null)
        return
      }

      const request: MLPredictionRequest = {
        materialName: materialName.trim(),
        context,
      }

      if (import.meta.env.DEV) {
        console.log(
          '🤖 ML: Executing immediate nomenclature suppliers prediction request:',
          request,
        ) // LOG: мгновенное выполнение ML запроса номенклатуры поставщиков
      }

      setCurrentRequest(request)
    },
    [minQueryLength],
  )

  // Функция для запуска предсказания с debounce
  const predict = useCallback(
    (materialName: string, context?: MLPredictionRequest['context']) => {
      if (!autoPredict) {
        if (import.meta.env.DEV) {
          console.log(
            '🤖 ML: Auto-predict disabled for nomenclature suppliers, skipping prediction',
          ) // LOG: автопредсказание номенклатуры поставщиков отключено
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
        console.log(
          '🤖 ML: Scheduling nomenclature suppliers prediction with debounce:',
          materialName,
        ) // LOG: планирование ML предсказания номенклатуры поставщиков
      }

      debounceRef.current = setTimeout(() => {
        const request: MLPredictionRequest = {
          materialName: materialName.trim(),
          context,
        }

        if (import.meta.env.DEV) {
          console.log('🤖 ML: Executing nomenclature suppliers prediction request:', request) // LOG: выполнение ML запроса номенклатуры поставщиков
        }

        setCurrentRequest(request)
      }, debounceMs)
    },
    [debounceMs, minQueryLength, autoPredict],
  )

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
      modelUsed: 'none',
    })
  }, [])

  // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Стабилизируем зависимости для предотвращения infinite renders
  const stableSuggestionsKey = useMemo(() => {
    if (!response?.suggestions?.length) return 'no-suggestions'
    const first = response.suggestions[0]
    const last = response.suggestions[response.suggestions.length - 1]
    return `${response.suggestions.length}-${first?.id}-${last?.id}`
  }, [
    response?.suggestions?.length,
    response?.suggestions?.[0]?.id,
    response?.suggestions?.[response.suggestions.length - 1]?.id
  ])

  const filteredSuggestions = useMemo(() => {
    if (!response?.suggestions) return []

    const threshold = config?.confidenceThreshold || 0.3
    const filtered = response.suggestions.filter((suggestion) => suggestion.confidence >= threshold)

    if (import.meta.env.DEV && response.suggestions.length > 0) {
      console.log('🔍 useMLNomenclatureSuppliers: Фильтрация предложений:', {
        total: response.suggestions.length,
        filtered: filtered.length,
        threshold,
      }) // LOG: фильтрация предложений
    }

    return filtered
  }, [
    stableSuggestionsKey, // ИСПРАВЛЕНО: используем стабилизированный ключ
    config?.confidenceThreshold,
  ])

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
  }
}
