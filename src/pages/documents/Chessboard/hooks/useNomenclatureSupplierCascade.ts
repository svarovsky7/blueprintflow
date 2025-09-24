import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { chessboardCascadeApi, type SupplierOption, type NomenclatureOption } from '@/entities/chessboard'

interface UseNomenclatureSupplierCascadeProps {
  /** Текущие значения полей */
  nomenclatureId?: string
  supplierName?: string
  /** Включить каскадную зависимость */
  enableCascade?: boolean
}

interface UseNomenclatureSupplierCascadeResult {
  /** Все доступные номенклатуры */
  nomenclatureOptions: NomenclatureOption[]
  /** Поставщики для выбранной номенклатуры (каскадная фильтрация) */
  filteredSupplierOptions: SupplierOption[]
  /** Все поставщики (когда номенклатура не выбрана) */
  allSupplierOptions: SupplierOption[]
  /** Загрузка данных */
  isLoading: boolean
  /** Ошибки */
  error: Error | null
  /** Обработчик изменения номенклатуры */
  handleNomenclatureChange: (nomenclatureId: string | null, onSupplierClear?: () => void) => void
  /** Обработчик изменения поставщика */
  handleSupplierChange: (supplierName: string | null, onNomenclatureChange?: (nomenclatureId: string) => void) => void
  /** Проверить валидность комбинации номенклатура-поставщик */
  validateCombination: (nomenclatureId?: string, supplierName?: string) => Promise<boolean>
  /** Сохранить связь номенклатура-поставщик в базе данных */
  saveMappingToDatabase: (nomenclatureId: string, supplierName: string) => Promise<boolean>
}

/**
 * Хук для управления каскадной зависимостью между номенклатурой и поставщиками
 */
export const useNomenclatureSupplierCascade = ({
  nomenclatureId,
  supplierName,
  enableCascade = true
}: UseNomenclatureSupplierCascadeProps = {}): UseNomenclatureSupplierCascadeResult => {

  const [currentNomenclatureId, setCurrentNomenclatureId] = useState<string | null>(nomenclatureId || null)
  const [currentSupplierName, setCurrentSupplierName] = useState<string | null>(supplierName || null)

  // Обновляем внутреннее состояние при изменении props
  useEffect(() => {
    setCurrentNomenclatureId(nomenclatureId || null)
  }, [nomenclatureId])

  useEffect(() => {
    setCurrentSupplierName(supplierName || null)
  }, [supplierName])

  // Загрузка всех номенклатур
  const {
    data: nomenclatureOptions = [],
    isLoading: isLoadingNomenclature,
    error: nomenclatureError
  } = useQuery({
    queryKey: ['cascade-nomenclature-all'],
    queryFn: chessboardCascadeApi.getAllNomenclature,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  })

  // Загрузка всех поставщиков
  const {
    data: allSupplierOptions = [],
    isLoading: isLoadingAllSuppliers,
    error: allSuppliersError
  } = useQuery({
    queryKey: ['cascade-suppliers-all'],
    queryFn: chessboardCascadeApi.getAllSuppliers,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  })

  // Загрузка поставщиков для выбранной номенклатуры (каскадная фильтрация)
  const {
    data: filteredSupplierOptions = [],
    isLoading: isLoadingFilteredSuppliers,
    error: filteredSuppliersError
  } = useQuery({
    queryKey: ['cascade-suppliers-by-nomenclature', currentNomenclatureId],
    queryFn: () => chessboardCascadeApi.getSuppliersByNomenclature(currentNomenclatureId!),
    enabled: enableCascade && !!currentNomenclatureId,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  })

  const isLoading = isLoadingNomenclature || isLoadingAllSuppliers || isLoadingFilteredSuppliers
  const error = nomenclatureError || allSuppliersError || filteredSuppliersError

  // Обработчик изменения номенклатуры
  const handleNomenclatureChange = useCallback((
    nomenclatureId: string | null,
    onSupplierClear?: () => void
  ) => {
    console.log('🔗 Cascade: Изменение номенклатуры:', nomenclatureId) // LOG: изменение номенклатуры

    setCurrentNomenclatureId(nomenclatureId)

    if (enableCascade && nomenclatureId) {
      // Очищаем поставщика при изменении номенклатуры для каскадного обновления
      setCurrentSupplierName(null)
      onSupplierClear?.()
      console.log('🔗 Cascade: Поставщик очищен для каскадного обновления') // LOG: очистка поставщика
    }
  }, [enableCascade])

  // Обработчик изменения поставщика
  const handleSupplierChange = useCallback(async (
    supplierName: string | null,
    onNomenclatureChange?: (nomenclatureId: string) => void
  ) => {
    console.log('🔗 Cascade: Изменение поставщика:', supplierName) // LOG: изменение поставщика

    setCurrentSupplierName(supplierName)

    if (enableCascade && supplierName && !currentNomenclatureId) {
      // Автоматически подставляем номенклатуру если поставщик выбран первым
      try {
        // Ищем поставщика по имени среди всех поставщиков
        const supplier = allSupplierOptions.find(s => s.name === supplierName)
        if (supplier) {
          const nomenclature = await chessboardCascadeApi.getNomenclatureBySupplier(supplier.id)
          if (nomenclature) {
            setCurrentNomenclatureId(nomenclature.id)
            onNomenclatureChange?.(nomenclature.id)
            console.log('🔗 Cascade: Автоматически подставлена номенклатура:', nomenclature.name) // LOG: автоподстановка номенклатуры
          }
        }
      } catch (error) {
        console.error('🔗 Cascade: Ошибка автоподстановки номенклатуры:', error)
      }
    }
  }, [enableCascade, currentNomenclatureId, allSupplierOptions])

  // Проверка валидности комбинации номенклатура-поставщик
  const validateCombination = useCallback(async (
    checkNomenclatureId?: string,
    checkSupplierName?: string
  ): Promise<boolean> => {
    const nomenclatureToCheck = checkNomenclatureId || currentNomenclatureId
    const supplierToCheck = checkSupplierName || currentSupplierName

    if (!nomenclatureToCheck || !supplierToCheck || !enableCascade) {
      return true // Если каскад отключен или данные не полные - считаем валидным
    }

    try {
      // Находим ID поставщика по имени
      const supplier = allSupplierOptions.find(s => s.name === supplierToCheck)
      if (!supplier) {
        console.log('🔗 Cascade: Поставщик не найден в списке:', supplierToCheck) // LOG: поставщик не найден
        return false
      }

      const isLinked = await chessboardCascadeApi.isNomenclatureSupplierLinked(
        nomenclatureToCheck,
        supplier.id
      )

      console.log('🔗 Cascade: Проверка связи номенклатуры и поставщика:', { // LOG: проверка связи
        nomenclature: nomenclatureOptions.find(n => n.id === nomenclatureToCheck)?.name,
        supplier: supplierToCheck,
        isLinked
      })

      return isLinked
    } catch (error) {
      console.error('🔗 Cascade: Ошибка проверки связи:', error)
      return false
    }
  }, [currentNomenclatureId, currentSupplierName, enableCascade, allSupplierOptions, nomenclatureOptions])

  // Сохранение связи номенклатура-поставщик в базе данных
  const saveMappingToDatabase = useCallback(async (
    nomenclatureId: string,
    supplierName: string
  ): Promise<boolean> => {
    if (!enableCascade || !nomenclatureId || !supplierName) {
      console.log('🔗 Cascade: Сохранение связи пропущено - некорректные параметры:', { nomenclatureId, supplierName, enableCascade }) // LOG: пропуск сохранения связи
      return false
    }

    try {
      // Находим ID поставщика по имени
      const supplier = allSupplierOptions.find(s => s.name === supplierName)
      if (!supplier) {
        console.error('🔗 Cascade: Поставщик не найден для сохранения связи:', supplierName) // LOG: поставщик не найден
        return false
      }

      // Создаем связь в базе данных
      const success = await chessboardCascadeApi.createNomenclatureSupplierMapping(nomenclatureId, supplier.id)

      if (success) {
        console.log('✅ Cascade: Связь номенклатура-поставщик успешно сохранена:', { nomenclatureId, supplierId: supplier.id, supplierName }) // LOG: связь сохранена
      }

      return success
    } catch (error) {
      console.error('🔗 Cascade: Ошибка сохранения связи номенклатура-поставщик:', error)
      return false
    }
  }, [enableCascade, allSupplierOptions])

  return {
    nomenclatureOptions,
    filteredSupplierOptions: enableCascade && currentNomenclatureId ? filteredSupplierOptions : allSupplierOptions,
    allSupplierOptions,
    isLoading,
    error: error as Error | null,
    handleNomenclatureChange,
    handleSupplierChange,
    validateCombination,
    saveMappingToDatabase
  }
}