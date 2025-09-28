import { useState, useEffect, useCallback } from 'react'
import type { ChessboardFilters, AppliedFilters } from '../types'
import { DEFAULT_FILTERS, DEFAULT_APPLIED_FILTERS, STORAGE_KEYS } from '../utils/constants'

export const useFiltersState = () => {
  // Базовые фильтры (UI состояние)
  const [filters, setFilters] = useState<ChessboardFilters>(DEFAULT_FILTERS)

  // Примененные фильтры (для API запросов)
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(DEFAULT_APPLIED_FILTERS)

  // Коллапс дополнительных фильтров
  const [filtersCollapsed, setFiltersCollapsed] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEYS.FILTERS}-collapsed`)
    return saved ? JSON.parse(saved) : false
  })

  // Загрузка сохраненных фильтров при инициализации
  useEffect(() => {
    const savedFilters = localStorage.getItem(STORAGE_KEYS.FILTERS)
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters)
        setFilters(parsed)
      } catch (error) {
        console.error('Error loading saved filters:', error)
      }
    }
  }, [])

  // Сохранение фильтров в localStorage
  const saveFilters = useCallback((newFilters: ChessboardFilters) => {
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(newFilters))
  }, [])

  // Обновление конкретного фильтра
  const updateFilter = useCallback(
    <K extends keyof ChessboardFilters>(key: K, value: ChessboardFilters[K]) => {
      console.log(`🔍 Обновление фильтра ${key}:`, value) // LOG: обновление фильтра
      setFilters((prev) => {
        const newFilters = { ...prev, [key]: value }
        console.log('🔍 Новое состояние фильтров после обновления:', newFilters) // LOG: новое состояние
        saveFilters(newFilters)
        return newFilters
      })
    },
    [saveFilters],
  )

  // Сброс всех фильтров
  const resetFilters = useCallback(() => {
    const resetFilters = { ...DEFAULT_FILTERS }
    setFilters(resetFilters)
    saveFilters(resetFilters)
    setAppliedFilters(DEFAULT_APPLIED_FILTERS)
  }, [saveFilters])

  // Каскадные изменения фильтров
  const updateCascadingFilter = useCallback(
    <K extends keyof ChessboardFilters>(key: K, value: ChessboardFilters[K]) => {
      setFilters((prev) => {
        const newFilters = { ...prev, [key]: value }

        // Каскадная логика: при изменении проекта сбрасываем корпуса
        if (key === 'project') {
          newFilters.block = []
        }

        // Каскадная логика: при изменении категорий затрат сбрасываем виды затрат
        if (key === 'costCategory') {
          newFilters.costType = []
        }

        saveFilters(newFilters)
        return newFilters
      })
    },
    [saveFilters],
  )

  // Применение фильтров (преобразование UI фильтров в API фильтры)
  const applyFilters = useCallback(() => {
    console.log('🔍 Применение фильтров - текущие UI фильтры:', filters) // LOG: состояние UI фильтров
    console.log('🔍 Применение фильтров - предыдущие применённые фильтры:', appliedFilters) // LOG: предыдущие применённые фильтры

    const applied: AppliedFilters = {
      // Постоянные фильтры
      project_id: filters.project,
      documentation_section_ids: filters.documentationSection,
      documentation_code_ids: filters.documentationCode,
      documentation_version_ids: appliedFilters.documentation_version_ids, // Сохраняем выбранные версии

      // Сворачиваемые фильтры
      block_ids: filters.block,
      cost_category_ids: filters.costCategory,
      detail_cost_category_ids: filters.costType,

      // Дополнительные фильтры
      material_search: filters.material.trim(),
    }

    console.log('🔍 Новые применённые фильтры:', applied) // LOG: новые применённые фильтры
    setAppliedFilters(applied)
    console.log('✅ setAppliedFilters вызван') // LOG: подтверждение вызова
  }, [filters, appliedFilters.documentation_version_ids])

  // Обновление выбранных версий документов
  const updateDocumentVersions = useCallback((versions: Record<string, string>) => {
    setAppliedFilters(prev => ({
      ...prev,
      documentation_version_ids: versions
    }))
  }, [])

  // Проверка, есть ли активные фильтры
  const hasActiveFilters = useCallback(() => {
    return (
      filters.project !== '' ||
      filters.documentationSection.length > 0 ||
      filters.documentationCode.length > 0 ||
      filters.block.length > 0 ||
      filters.costCategory.length > 0 ||
      filters.costType.length > 0 ||
      filters.material.trim() !== ''
    )
  }, [filters])

  // Проверка, применены ли фильтры
  const hasAppliedFilters = useCallback(() => {
    return (
      appliedFilters.project_id !== '' ||
      appliedFilters.documentation_section_ids.length > 0 ||
      appliedFilters.documentation_code_ids.length > 0 ||
      appliedFilters.block_ids.length > 0 ||
      appliedFilters.cost_category_ids.length > 0 ||
      appliedFilters.detail_cost_category_ids.length > 0 ||
      appliedFilters.material_search !== ''
    )
  }, [appliedFilters])

  // Переключение коллапса дополнительных фильтров
  const toggleFiltersCollapsed = useCallback(() => {
    const newValue = !filtersCollapsed
    setFiltersCollapsed(newValue)
    localStorage.setItem(`${STORAGE_KEYS.FILTERS}-collapsed`, JSON.stringify(newValue))
  }, [filtersCollapsed])

  return {
    // Состояние
    filters,
    appliedFilters,
    filtersCollapsed,

    // Действия
    updateFilter,
    updateCascadingFilter,
    resetFilters,
    applyFilters,
    updateDocumentVersions,
    toggleFiltersCollapsed,
    setAppliedFilters,

    // Вычисленные значения
    hasActiveFilters: hasActiveFilters(),
    hasAppliedFilters: hasAppliedFilters(),
  }
}
