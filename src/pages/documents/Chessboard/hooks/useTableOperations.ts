import { useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import type { Key } from 'react'
import { supabase } from '@/lib/supabase'
import type { TableMode, RowData, RowColor } from '../types'

export const useTableOperations = () => {
  const queryClient = useQueryClient()

  // Режим таблицы (просмотр, добавление, редактирование, удаление)
  const [tableMode, setTableMode] = useState<TableMode>({
    mode: 'view',
    selectedRowKeys: [],
  })

  // Новые строки (для режима добавления)
  const [newRows, setNewRows] = useState<RowData[]>([])

  // Отредактированные строки (для режима редактирования)
  const [editedRows, setEditedRows] = useState<Map<string, Partial<RowData>>>(new Map())

  // Переключение режима таблицы
  const setMode = useCallback((mode: TableMode['mode']) => {
    console.log('🔍 DEBUG: Переключение режима таблицы на:', mode) // LOG: отладочная информация
    setTableMode(prev => ({
      ...prev,
      mode,
      selectedRowKeys: mode === 'view' ? [] : prev.selectedRowKeys,
    }))

    // Сброс состояния при переключении режимов
    if (mode === 'view') {
      setNewRows([])
      setEditedRows(new Map())
    }
  }, [])

  // Выбор строк для массовых операций
  const setSelectedRowKeys = useCallback((keys: Key[]) => {
    setTableMode(prev => ({ ...prev, selectedRowKeys: keys }))
  }, [])

  // Добавление новой строки
  const addNewRow = useCallback((projectId: string) => {
    if (!projectId) {
      message.warning('Выберите проект для добавления строки')
      return
    }

    const newRow: RowData = {
      id: `new-${Date.now()}-${Math.random()}`,
      project: '',
      projectId,
      block: '',
      blockId: '',
      costCategory: '',
      costCategoryId: '',
      costType: '',
      costTypeId: '',
      location: '',
      locationId: '',
      nomenclatureId: '',
      material: '',
      quantity: 0,
      unit: '',
      unitId: '',
      rate: '',
      rateId: '',
      amount: 0,
      color: '',
      floorQuantities: {},
      isNew: true,
      isEditing: true,
    }

    setNewRows(prev => [...prev, newRow])
  }, [])

  // Удаление новой строки
  const removeNewRow = useCallback((rowId: string) => {
    setNewRows(prev => prev.filter(row => row.id !== rowId))
  }, [])

  // Копирование строки
  const copyRow = useCallback((sourceRow: RowData) => {
    const copiedRow: RowData = {
      ...sourceRow,
      id: `copy-${Date.now()}-${Math.random()}`,
      isNew: true,
      isEditing: true,
    }

    setNewRows(prev => [...prev, copiedRow])
  }, [])

  // Обновление новой строки
  const updateNewRow = useCallback((rowId: string, updates: Partial<RowData>) => {
    setNewRows(prev =>
      prev.map(row =>
        row.id === rowId ? { ...row, ...updates } : row
      )
    )
  }, [])

  // Начало редактирования существующей строки
  const startEditing = useCallback((rowId: string) => {
    setEditedRows(prev => {
      const newMap = new Map(prev)
      if (!newMap.has(rowId)) {
        newMap.set(rowId, {})
      }
      return newMap
    })
  }, [])

  // Отмена редактирования строки
  const cancelEditing = useCallback((rowId: string) => {
    setEditedRows(prev => {
      const newMap = new Map(prev)
      newMap.delete(rowId)
      return newMap
    })
  }, [])

  // Обновление редактируемой строки
  const updateEditedRow = useCallback((rowId: string, updates: Partial<RowData>) => {
    setEditedRows(prev => {
      const newMap = new Map(prev)
      const currentEdits = newMap.get(rowId) || {}
      newMap.set(rowId, { ...currentEdits, ...updates })
      return newMap
    })
  }, [])

  // Изменение цвета строки
  const updateRowColor = useCallback((rowId: string, color: RowColor) => {
    if (tableMode.mode === 'add') {
      updateNewRow(rowId, { color })
    } else {
      updateEditedRow(rowId, { color })
    }
  }, [tableMode.mode, updateNewRow, updateEditedRow])

  // Сохранение всех изменений
  const saveChanges = useCallback(async () => {
    try {
      const promises: Promise<any>[] = []

      // Сохранение новых строк
      if (newRows.length > 0) {
        const newRowsData = newRows.map(row => ({
          project_id: row.projectId,
          block_id: row.blockId || null,
          cost_category_id: row.costCategoryId || null,
          detail_cost_category_id: row.costTypeId || null,
          location_id: row.locationId || null,
          nomenclature_id: row.nomenclatureId || null,
          quantity: row.quantity,
          unit_id: row.unitId || null,
          rate_id: row.rateId || null,
          amount: row.amount,
          color: row.color || null,
          floor_quantities: Object.keys(row.floorQuantities).length > 0 ? row.floorQuantities : null,
          original_material: row.originalMaterial || null,
          original_quantity: row.originalQuantity || null,
          original_unit: row.originalUnit || null,
          original_unit_id: row.originalUnitId || null,
        }))

        promises.push(
          supabase.from('chessboard').insert(newRowsData)
        )
      }

      // Сохранение отредактированных строк
      for (const [rowId, updates] of editedRows.entries()) {
        const updateData: any = {}

        if (updates.blockId !== undefined) updateData.block_id = updates.blockId || null
        if (updates.costCategoryId !== undefined) updateData.cost_category_id = updates.costCategoryId || null
        if (updates.costTypeId !== undefined) updateData.detail_cost_category_id = updates.costTypeId || null
        if (updates.locationId !== undefined) updateData.location_id = updates.locationId || null
        if (updates.nomenclatureId !== undefined) updateData.nomenclature_id = updates.nomenclatureId || null
        if (updates.quantity !== undefined) updateData.quantity = updates.quantity
        if (updates.unitId !== undefined) updateData.unit_id = updates.unitId || null
        if (updates.rateId !== undefined) updateData.rate_id = updates.rateId || null
        if (updates.amount !== undefined) updateData.amount = updates.amount
        if (updates.color !== undefined) updateData.color = updates.color || null
        if (updates.floorQuantities !== undefined) {
          updateData.floor_quantities = Object.keys(updates.floorQuantities).length > 0 ? updates.floorQuantities : null
        }

        // Обновляем updated_at
        updateData.updated_at = new Date().toISOString()

        promises.push(
          supabase.from('chessboard').update(updateData).eq('id', rowId)
        )
      }

      await Promise.all(promises)

      // Обновляем кэш
      queryClient.invalidateQueries({ queryKey: ['chessboard-data'] })

      // Сбрасываем состояние
      setNewRows([])
      setEditedRows(new Map())
      setMode('view')

      message.success('Изменения сохранены')
    } catch (error) {
      console.error('Error saving changes:', error)
      message.error('Ошибка при сохранении изменений')
    }
  }, [newRows, editedRows, queryClient, setMode])

  // Отмена всех изменений
  const cancelChanges = useCallback(() => {
    setNewRows([])
    setEditedRows(new Map())
    setMode('view')
  }, [setMode])

  // Удаление выбранных строк
  const deleteSelectedRows = useCallback(async () => {
    if (tableMode.selectedRowKeys.length === 0) {
      message.warning('Выберите строки для удаления')
      return
    }

    try {
      const { error } = await supabase
        .from('chessboard')
        .delete()
        .in('id', tableMode.selectedRowKeys as string[])

      if (error) throw error

      queryClient.invalidateQueries({ queryKey: ['chessboard-data'] })
      setMode('view')
      message.success(`Удалено строк: ${tableMode.selectedRowKeys.length}`)
    } catch (error) {
      console.error('Error deleting rows:', error)
      message.error('Ошибка при удалении строк')
    }
  }, [tableMode.selectedRowKeys, queryClient, setMode])

  // Получение итоговых данных для отображения (с учетом новых и отредактированных строк)
  const getDisplayData = useCallback((originalData: RowData[]) => {
    const dataWithEdits = originalData.map(row => {
      const edits = editedRows.get(row.id)
      return edits ? { ...row, ...edits, isEditing: true } : row
    })

    return [...dataWithEdits, ...newRows]
  }, [editedRows, newRows])

  // Проверка наличия несохраненных изменений
  const hasUnsavedChanges = useMemo(() => {
    return newRows.length > 0 || editedRows.size > 0
  }, [newRows.length, editedRows.size])

  return {
    // Состояние
    tableMode,
    newRows,
    editedRows,
    hasUnsavedChanges,

    // Действия с режимами
    setMode,
    setSelectedRowKeys,

    // Операции со строками
    addNewRow,
    removeNewRow,
    copyRow,
    updateNewRow,
    startEditing,
    cancelEditing,
    updateEditedRow,
    updateRowColor,

    // Сохранение/отмена
    saveChanges,
    cancelChanges,
    deleteSelectedRows,

    // Утилиты
    getDisplayData,
  }
}