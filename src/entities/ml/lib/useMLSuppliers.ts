import { useState, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { predictSuppliers, getMLConfig, getNomenclatureBySupplier } from '../api/ml-api'
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
    staleTime: 10 * 1000,
    gcTime: 30 * 1000,
  })

  // Основной запрос для получения предсказаний поставщиков
  const {
    data: response,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['ml-supplier-predictions', currentRequest, config],
    queryFn: async () => {
      if (!currentRequest) return null

      console.log('🤖 ML: Starting supplier prediction for:', currentRequest.materialName) // LOG: начало ML предсказания поставщиков

      const result = await predictSuppliers(currentRequest)

      console.log('🤖 ML: Supplier prediction completed:', { // LOG: завершение ML предсказания поставщиков
        suggestionsCount: result.suggestions.length,
        processingTime: result.processingTime,
        modelUsed: result.modelUsed
      })

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
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
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

    console.log('🤖 ML: Executing immediate supplier prediction request:', request) // LOG: мгновенное выполнение ML запроса поставщиков

    setCurrentRequest(request)
  }, [minQueryLength])

  // Функция для запуска предсказания с debounce (только если включено автопредсказание)
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
  }, [debounceMs, minQueryLength, autoPredict])

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
    modelUsed: lastResponse.modelUsed,
    getNomenclatureForSupplier
  }
}