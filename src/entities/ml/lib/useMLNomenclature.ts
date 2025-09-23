import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { predictNomenclature, getMLConfig, updateMLMetrics } from '../api/ml-api'
import { mlModeApi } from '@/entities/api-settings'
import type { MLPredictionRequest, NomenclatureSuggestion, MLConfig } from '../model/types'

interface UseMLNomenclatureOptions {
  enabled?: boolean
  debounceMs?: number
  minQueryLength?: number
  autoPredict?: boolean // Новая опция для автоматического предсказания
}

interface UseMLNomenclatureResult {
  suggestions: NomenclatureSuggestion[]
  isLoading: boolean
  error: Error | null
  config: MLConfig | undefined
  predict: (materialName: string, context?: MLPredictionRequest['context']) => void
  predictNow: (materialName: string, context?: MLPredictionRequest['context']) => void // Мгновенное предсказание без debounce
  clearSuggestions: () => void
  confidence: number
  processingTime: number
  modelUsed: string
}

/**
 * Хук для ML-предсказания номенклатуры по названию материала
 */
export const useMLNomenclature = (options: UseMLNomenclatureOptions = {}): UseMLNomenclatureResult => {
  const {
    enabled = true,
    debounceMs = 300,
    minQueryLength = 2,
    autoPredict = false // По умолчанию автопредсказание отключено
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
    queryKey: ['ml-mode-config'],
    queryFn: () => mlModeApi.getCurrentMode(),
    staleTime: 0, // Всегда свежие данные
    gcTime: 1000, // Минимальное время в памяти
    refetchOnMount: true, // Перезагружать при монтировании
  })

  // Обновляем режим ML при изменении конфигурации
  useEffect(() => {
    if (modeConfig) {
      setMLMode(modeConfig.mode)
      console.log('🔄 useMLNomenclature: Режим обновлен на', modeConfig.mode) // LOG: обновление режима
    }
  }, [modeConfig])

  // Основной запрос для получения предсказаний
  const {
    data: response,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['ml-nomenclature-predictions', currentRequest, config, mlMode], // Включаем режим ML в ключ кэша
    queryFn: async () => {
      if (!currentRequest) return null

      console.log('🤖 ML: Starting prediction for:', currentRequest.materialName) // LOG: начало ML предсказания

      const result = await predictNomenclature(currentRequest)

      console.log('🤖 ML: Prediction completed:', { // LOG: завершение ML предсказания
        suggestionsCount: result.suggestions.length,
        processingTime: result.processingTime,
        modelUsed: result.modelUsed
      })

      // Обновляем метрики
      const successful = result.suggestions.length > 0
      await updateMLMetrics(result, successful)

      // Сохраняем информацию о последнем ответе
      setLastResponse({
        confidence: result.suggestions.length > 0
          ? result.suggestions.reduce((sum, s) => sum + s.confidence, 0) / result.suggestions.length
          : 0,
        processingTime: result.processingTime,
        modelUsed: result.modelUsed
      })

      return result
    },
    enabled: enabled && config?.enabled && !!currentRequest,
    staleTime: 30 * 1000, // 30 секунд кэша
    gcTime: 5 * 60 * 1000, // 5 минут в памяти
  })

  // Функция для мгновенного предсказания без debounce
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

    console.log('🤖 ML: Executing immediate prediction request:', request) // LOG: мгновенное выполнение ML запроса
    console.log('🔍 DEBUG: Текущий режим ML в useMLNomenclature:', mlMode) // DEBUG LOG: текущий режим

    setCurrentRequest(request)
  }, [minQueryLength, mlMode])

  // Функция для запуска предсказания с debounce (только если включено автопредсказание)
  const predict = useCallback((materialName: string, context?: MLPredictionRequest['context']) => {
    if (!autoPredict) {
      console.log('🤖 ML: Auto-predict disabled, skipping prediction') // LOG: автопредсказание отключено
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

    console.log('🤖 ML: Scheduling prediction with debounce:', materialName) // LOG: планирование ML предсказания

    // Устанавливаем новый таймер
    debounceRef.current = setTimeout(() => {
      const request: MLPredictionRequest = {
        materialName: materialName.trim(),
        context
      }

      console.log('🤖 ML: Executing prediction request:', request) // LOG: выполнение ML запроса

      setCurrentRequest(request)
    }, debounceMs)
  }, [debounceMs, minQueryLength, autoPredict])

  // Функция для очистки предложений
  const clearSuggestions = useCallback(() => {
    console.log('🤖 ML: Clearing suggestions') // LOG: очистка ML предложений

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
  const filteredSuggestions = response?.suggestions.filter(
    suggestion => suggestion.confidence >= (config?.confidenceThreshold || 0.3)
  ) || []

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