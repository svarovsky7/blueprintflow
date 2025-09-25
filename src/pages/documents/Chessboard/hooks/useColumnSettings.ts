import { useState, useEffect, useCallback } from 'react'
import type { ColumnSettings } from '../types'
import { DEFAULT_COLUMN_ORDER, STORAGE_KEYS, HIDDEN_COLUMN_KEYS } from '../utils/constants'

export const useColumnSettings = () => {
  const [columnSettings, setColumnSettings] = useState<ColumnSettings>(() => {
    // Загружаем настройки из localStorage при инициализации
    let hiddenColumns = new Set(HIDDEN_COLUMN_KEYS)
    let columnOrder = DEFAULT_COLUMN_ORDER

    try {
      const savedVisibility = localStorage.getItem(STORAGE_KEYS.COLUMN_VISIBILITY)
      if (savedVisibility) {
        const parsed = JSON.parse(savedVisibility)
        if (Array.isArray(parsed)) {
          hiddenColumns = new Set(parsed)
        }
      }

      const savedOrder = localStorage.getItem(STORAGE_KEYS.COLUMN_ORDER)
      if (savedOrder) {
        const parsed = JSON.parse(savedOrder)
        if (Array.isArray(parsed)) {
          columnOrder = parsed
        }
      }
    } catch (error) {
      console.error('Error loading column settings from localStorage:', error)
    }

    return {
      hiddenColumns,
      columnOrder,
    }
  })

  const [drawerVisible, setDrawerVisible] = useState(false)

  // Сохранение настроек в localStorage
  const saveSettings = useCallback((settings: ColumnSettings) => {
    localStorage.setItem(
      STORAGE_KEYS.COLUMN_VISIBILITY,
      JSON.stringify(Array.from(settings.hiddenColumns)),
    )
    localStorage.setItem(STORAGE_KEYS.COLUMN_ORDER, JSON.stringify(settings.columnOrder))
  }, [])

  // Переключение видимости колонки
  const toggleColumnVisibility = useCallback(
    (columnKey: string) => {
      setColumnSettings((prev) => {
        const newHiddenColumns = new Set(prev.hiddenColumns)

        if (newHiddenColumns.has(columnKey)) {
          newHiddenColumns.delete(columnKey)
        } else {
          newHiddenColumns.add(columnKey)
        }

        const newSettings = {
          ...prev,
          hiddenColumns: newHiddenColumns,
        }

        saveSettings(newSettings)
        return newSettings
      })
    },
    [saveSettings],
  )

  // Перемещение колонки
  const moveColumn = useCallback(
    (fromIndex: number, toIndex: number) => {
      setColumnSettings((prev) => {
        const newOrder = [...prev.columnOrder]
        const [movedColumn] = newOrder.splice(fromIndex, 1)
        newOrder.splice(toIndex, 0, movedColumn)

        const newSettings = {
          ...prev,
          columnOrder: newOrder,
        }

        saveSettings(newSettings)
        return newSettings
      })
    },
    [saveSettings],
  )

  // Сброс настроек к значениям по умолчанию
  const resetToDefault = useCallback(() => {
    const defaultSettings: ColumnSettings = {
      hiddenColumns: new Set(HIDDEN_COLUMN_KEYS),
      columnOrder: DEFAULT_COLUMN_ORDER,
    }

    setColumnSettings(defaultSettings)
    saveSettings(defaultSettings)
  }, [saveSettings])

  // Выделить все / снять выделение
  const toggleAllColumns = useCallback(
    (visible: boolean) => {
      setColumnSettings((prev) => {
        const newHiddenColumns = visible
          ? new Set<string>() // Показать все колонки
          : new Set(
              prev.columnOrder.filter(
                (col) => !['color', 'actions'].includes(col), // Служебные колонки всегда видимы
              ),
            )

        const newSettings = {
          ...prev,
          hiddenColumns: newHiddenColumns,
        }

        saveSettings(newSettings)
        return newSettings
      })
    },
    [saveSettings],
  )

  // Проверка видимости колонки
  const isColumnVisible = useCallback(
    (columnKey: string) => {
      return !columnSettings.hiddenColumns.has(columnKey)
    },
    [columnSettings.hiddenColumns],
  )

  // Получение видимых колонок в правильном порядке
  const getVisibleColumns = useCallback(() => {
    return columnSettings.columnOrder.filter((columnKey) => isColumnVisible(columnKey))
  }, [columnSettings.columnOrder, isColumnVisible])

  // Получение всех колонок с информацией о видимости
  const getAllColumnsWithVisibility = useCallback(() => {
    return columnSettings.columnOrder.map((columnKey) => ({
      key: columnKey,
      visible: isColumnVisible(columnKey),
      isService: ['color', 'actions'].includes(columnKey), // Служебные колонки
    }))
  }, [columnSettings.columnOrder, isColumnVisible])

  // Показать/скрыть drawer настроек
  const openDrawer = useCallback(() => setDrawerVisible(true), [])
  const closeDrawer = useCallback(() => setDrawerVisible(false), [])

  return {
    // Состояние
    columnSettings,
    drawerVisible,

    // Действия
    toggleColumnVisibility,
    moveColumn,
    resetToDefault,
    toggleAllColumns,
    openDrawer,
    closeDrawer,

    // Вычисленные значения
    isColumnVisible,
    getVisibleColumns,
    getAllColumnsWithVisibility,
  }
}
