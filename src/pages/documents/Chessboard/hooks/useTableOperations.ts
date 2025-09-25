import { useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import type { Key } from 'react'
import { supabase } from '@/lib/supabase'
import type { TableMode, RowData, RowColor } from '../types'
import { parseFloorsFromString } from '../utils/floors'

export const useTableOperations = () => {
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  // Режим таблицы (просмотр, добавление, редактирование, удаление)
  const [tableMode, setTableMode] = useState<TableMode>({
    mode: 'view',
    selectedRowKeys: [],
  })

  // Новые строки (для режима добавления)
  const [newRows, setNewRows] = useState<RowData[]>([])

  // Отредактированные строки (для режима редактирования)
  const [editedRows, setEditedRows] = useState<Map<string, Partial<RowData>>>(new Map())

  // Строки в режиме множественного редактирования (backup подход)
  const [editingRows, setEditingRows] = useState<Record<string, RowData>>({})

  // Переключение режима таблицы
  const setMode = useCallback((mode: TableMode['mode']) => {
    console.log('🔍 DEBUG: Переключение режима таблицы на:', mode) // LOG: отладочная информация
    setTableMode((prev) => ({
      ...prev,
      mode,
      selectedRowKeys: mode === 'view' ? [] : prev.selectedRowKeys,
    }))

    // Сброс состояния при переключении режимов
    if (mode === 'view') {
      setNewRows([])
      setEditedRows(new Map())
      setEditingRows({})
    }
  }, [])

  // Выбор строк для массовых операций
  const setSelectedRowKeys = useCallback((keys: Key[]) => {
    setTableMode((prev) => ({ ...prev, selectedRowKeys: keys }))
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

    setNewRows((prev) => [...prev, newRow])
  }, [])

  // Удаление новой строки
  const removeNewRow = useCallback((rowId: string) => {
    setNewRows((prev) => prev.filter((row) => row.id !== rowId))
  }, [])

  // Копирование строки
  const copyRow = useCallback((sourceRow: RowData) => {
    const copiedRow: RowData = {
      ...sourceRow,
      id: `copy-${Date.now()}-${Math.random()}`,
      isNew: true,
      isEditing: true,
    }

    setNewRows((prev) => [...prev, copiedRow])
  }, [])

  // Обновление новой строки
  const updateNewRow = useCallback((rowId: string, updates: Partial<RowData>) => {
    setNewRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...updates } : row)))
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
    console.log('🔄 updateEditedRow called:', { rowId, updates }) // LOG: обновление редактируемой строки

    setEditedRows(prev => {
      const newMap = new Map(prev)
      const currentEdits = newMap.get(rowId) || {}
      newMap.set(rowId, { ...currentEdits, ...updates })
      return newMap
    })
  }, [])

  // Функции для множественного редактирования (backup подход)
  const startEditBackup = useCallback((rowId: string, originalRow: RowData) => {
    console.log('🔍 DEBUG: Начинаем backup редактирование строки:', rowId) // LOG: отладочная информация
    setEditingRows(prev => ({
      ...prev,
      [rowId]: { ...originalRow, isEditing: true }
    }))
  }, [])

  const stopEditBackup = useCallback((rowId: string) => {
    console.log('🔍 DEBUG: Останавливаем backup редактирование строки:', rowId) // LOG: отладочная информация
    setEditingRows(prev => {
      const updated = { ...prev }
      delete updated[rowId]
      return updated
    })
  }, [])

  const updateEditingRow = useCallback((rowId: string, updates: Partial<RowData>) => {
    console.log('🔍 DEBUG: Обновляем backup редактируемую строку:', { rowId, updates }) // LOG: отладочная информация
    setEditingRows(prev => {
      if (prev[rowId]) {
        return {
          ...prev,
          [rowId]: { ...prev[rowId], ...updates }
        }
      }
      return prev
    })
  }, [])

  // Изменение цвета строки
  const updateRowColor = useCallback(
    (rowId: string, color: RowColor) => {
      if (tableMode.mode === 'add') {
        updateNewRow(rowId, { color })
      } else if (editingRows[rowId]) {
        // Если строка в режиме backup редактирования
        updateEditingRow(rowId, { color })
      } else {
        // Обычное одиночное редактирование
        updateEditedRow(rowId, { color })
      }
    },
    [tableMode.mode, updateNewRow, updateEditedRow, updateEditingRow, editingRows],
  )

  // Сохранение всех изменений
  const saveChanges = useCallback(async () => {
    try {
      const promises: Promise<any>[] = []

      // Сохранение новых строк
      if (newRows.length > 0) {
        const newRowsData = newRows.map((row) => ({
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
          floor_quantities:
            Object.keys(row.floorQuantities).length > 0 ? row.floorQuantities : null,
          original_material: row.originalMaterial || null,
          original_quantity: row.originalQuantity || null,
          original_unit: row.originalUnit || null,
          original_unit_id: row.originalUnitId || null,
        }))

        promises.push(supabase.from('chessboard').insert(newRowsData))
      }

      // Сохранение отредактированных строк
      for (const [rowId, updates] of editedRows.entries()) {
        console.log('🔍 saveChanges - обрабатываем строку:', { rowId, updates }) // LOG: отладочная информация

        // Обновляем только поля, которые есть в основной таблице chessboard
        const chessboardUpdateData: any = {}

        // Поля основной таблицы chessboard (только разрешенные поля из схемы БД)
        if (updates.color !== undefined) {
          chessboardUpdateData.color = updates.color || null
        }
        if (updates.unitId !== undefined) {
          chessboardUpdateData.unit_id = updates.unitId || null
        }
        if (updates.materialId !== undefined) {
          // materialId должен быть UUID, а не строка
          chessboardUpdateData.material = updates.materialId || null
        }
        if (updates.material !== undefined) {
          // Если передается material как UUID строка
          chessboardUpdateData.material = updates.material || null
          console.log('🔍 DEBUG: Обработка поля material:', updates.material) // LOG: отладочная информация
        }
        // ИСПРАВЛЕНИЕ: floors и floorQuantities сохраняются в отдельной таблице chessboard_floor_mapping
        // Не пытаемся сохранить их в основную таблицу chessboard

        // Обновляем updated_at
        chessboardUpdateData.updated_at = new Date().toISOString()

        console.log('📊 saveChanges - данные для основной таблицы:', { rowId, chessboardUpdateData }) // LOG: отладочная информация

        // Обновляем основную таблицу только если есть что обновлять
        if (Object.keys(chessboardUpdateData).length > 1) { // > 1 потому что updated_at всегда есть
          console.log('✅ Обновление основной таблицы chessboard') // LOG: отладочная информация
          promises.push(
            supabase.from('chessboard').update(chessboardUpdateData).eq('id', rowId)
          )
        }

        // Обновляем mapping таблицу для остальных полей (с правильными типами данных)
        const mappingUpdateData: any = {}
        if (updates.blockId !== undefined) mappingUpdateData.block_id = updates.blockId || null
        if (updates.costCategoryId !== undefined) {
          // cost_category_id должно быть integer
          mappingUpdateData.cost_category_id = updates.costCategoryId ? parseInt(updates.costCategoryId) : null
        }
        if (updates.costTypeId !== undefined) {
          // cost_type_id должно быть integer
          mappingUpdateData.cost_type_id = updates.costTypeId ? parseInt(updates.costTypeId) : null
        }
        if (updates.locationId !== undefined) {
          // location_id должно быть integer
          mappingUpdateData.location_id = updates.locationId ? parseInt(updates.locationId) : null
        }

        if (Object.keys(mappingUpdateData).length > 0) {
          mappingUpdateData.updated_at = new Date().toISOString()
          console.log('📊 saveChanges - данные для mapping таблицы:', { rowId, mappingUpdateData }) // LOG: отладочная информация

          // Проверяем существование записи и затем update или insert
          const mappingPromise = supabase
            .from('chessboard_mapping')
            .select('id')
            .eq('chessboard_id', rowId)
            .maybeSingle()
            .then(async ({ data: existingMapping, error: selectError }) => {
              if (selectError) {
                console.error('❌ Ошибка при проверке существования mapping:', selectError) // LOG: отладочная информация
                throw selectError
              }

              if (existingMapping) {
                // Обновляем существующую запись
                console.log('🔄 Обновляем существующую mapping запись:', existingMapping.id) // LOG: отладочная информация
                const { error: updateError } = await supabase
                  .from('chessboard_mapping')
                  .update(mappingUpdateData)
                  .eq('chessboard_id', rowId)

                if (updateError) {
                  console.error('❌ Ошибка при обновлении mapping:', updateError) // LOG: отладочная информация
                  throw updateError
                }
              } else {
                // Создаем новую запись
                console.log('➕ Создаем новую mapping запись для chessboard_id:', rowId) // LOG: отладочная информация
                const { error: insertError } = await supabase
                  .from('chessboard_mapping')
                  .insert({ ...mappingUpdateData, chessboard_id: rowId })

                if (insertError) {
                  console.error('❌ Ошибка при создании mapping:', insertError) // LOG: отладочная информация
                  throw insertError
                }
              }
            })

          promises.push(mappingPromise)
        }

        // Обновляем floors mapping для этажей
        if (updates.floors !== undefined || updates.floorQuantities !== undefined) {
          console.log('🏢 Обновление этажей:', { floors: updates.floors, floorQuantities: updates.floorQuantities }) // LOG: отладочная информация

          // Создаем функцию обновления этажей (аналогично старой логике из backup)
          const updateFloorsPromise = async () => {
            try {
              // 1. Сначала удаляем старые связи этажей
              const { error: deleteError } = await supabase
                .from('chessboard_floor_mapping')
                .delete()
                .eq('chessboard_id', rowId)

              if (deleteError) {
                console.error('🏢 Ошибка удаления старых этажей:', deleteError) // LOG: ошибка удаления
                throw deleteError
              }

              // 2. Парсим строку этажей и добавляем новые
              const floorsString = updates.floors !== undefined ? updates.floors : ''
              if (!floorsString) {
                console.log('🏢 Пустая строка этажей, пропускаем вставку') // LOG: пустые этажи
                return
              }

              const floors = parseFloorsFromString(floorsString)
              const floorQuantities = updates.floorQuantities || {}

              console.log('🏢 Обработка этажей:', { floors, floorQuantities }) // LOG: обработка этажей

              if (floors.length > 0) {
                const totalFloors = floors.length
                const floorMappings = floors.map((floor) => ({
                  chessboard_id: rowId,
                  floor_number: floor,
                  quantityPd: floorQuantities?.[floor]?.quantityPd
                    ? Number(floorQuantities[floor].quantityPd)
                    : null,
                  quantitySpec: floorQuantities?.[floor]?.quantitySpec
                    ? Number(floorQuantities[floor].quantitySpec)
                    : null,
                  quantityRd: floorQuantities?.[floor]?.quantityRd
                    ? Number(floorQuantities[floor].quantityRd)
                    : null,
                }))

                console.log('🏢 Вставляем новые этажи:', floorMappings) // LOG: вставка этажей

                const { error: insertError } = await supabase
                  .from('chessboard_floor_mapping')
                  .insert(floorMappings)

                if (insertError) {
                  console.error('🏢 Ошибка вставки новых этажей:', insertError) // LOG: ошибка вставки
                  throw insertError
                }

                console.log('✅ Этажи успешно обновлены') // LOG: успех обновления
              }
            } catch (error) {
              console.error('🏢 Критическая ошибка обновления этажей:', error) // LOG: критическая ошибка
              throw error
            }
          }

          promises.push(updateFloorsPromise())
        }

        // Обновляем nomenclature mapping для номенклатуры
        if (updates.nomenclatureId !== undefined || updates.supplier !== undefined) {
          console.log('🔍 Обновление номенклатуры:', { nomenclatureId: updates.nomenclatureId, supplier: updates.supplier }) // LOG: отладочная информация

          // Сначала удаляем старую связь
          promises.push(
            supabase.from('chessboard_nomenclature_mapping').delete().eq('chessboard_id', rowId)
          )

          // Если есть номенклатура, создаём новую связь
          const nomenclatureId = updates.nomenclatureId !== undefined ? updates.nomenclatureId : null
          if (nomenclatureId) {
            promises.push(
              supabase.from('chessboard_nomenclature_mapping').insert({
                chessboard_id: rowId,
                nomenclature_id: nomenclatureId,
                supplier_name: updates.supplier || null
              })
            )
          }
        }

        // Обновляем rates mapping для наименования работ
        if (updates.rateId !== undefined || updates.workName !== undefined) {
          console.log('💰 Обновление расценки:', { rateId: updates.rateId, workName: updates.workName }) // LOG: отладочная информация
          // Сначала удаляем старую связь
          promises.push(
            supabase.from('chessboard_rates_mapping').delete().eq('chessboard_id', rowId)
          )
          // Если есть rateId, создаём новую связь
          const rateId = updates.rateId !== undefined ? updates.rateId : null
          if (rateId) {
            promises.push(
              supabase.from('chessboard_rates_mapping').insert({
                chessboard_id: rowId,
                rate_id: rateId
              })
            )
          }
        }
      }

      // Сохранение строк в режиме backup редактирования (полная логика)
      for (const [rowId, editedRowData] of Object.entries(editingRows)) {
        console.log('🔍 saveChanges - обрабатываем backup строку:', { rowId, editedRowData }) // LOG: отладочная информация

        // Обновляем основную таблицу chessboard
        const chessboardUpdateData: any = {}

        if (editedRowData.color !== undefined) {
          chessboardUpdateData.color = editedRowData.color || null
        }
        if (editedRowData.unitId !== undefined) {
          chessboardUpdateData.unit_id = editedRowData.unitId || null
        }
        if (editedRowData.material !== undefined) {
          chessboardUpdateData.material = editedRowData.material || null
        }

        chessboardUpdateData.updated_at = new Date().toISOString()

        if (Object.keys(chessboardUpdateData).length > 1) {
          console.log('✅ Backup: обновление основной таблицы chessboard') // LOG: отладочная информация
          promises.push(
            supabase.from('chessboard').update(chessboardUpdateData).eq('id', rowId)
          )
        }

        // Обновляем mapping таблицу для backup строки
        const mappingUpdateData: any = {}
        if (editedRowData.blockId !== undefined) mappingUpdateData.block_id = editedRowData.blockId || null
        if (editedRowData.costCategoryId !== undefined) {
          mappingUpdateData.cost_category_id = editedRowData.costCategoryId ? parseInt(editedRowData.costCategoryId) : null
        }
        if (editedRowData.costTypeId !== undefined) {
          mappingUpdateData.cost_type_id = editedRowData.costTypeId ? parseInt(editedRowData.costTypeId) : null
        }
        if (editedRowData.locationId !== undefined) {
          mappingUpdateData.location_id = editedRowData.locationId ? parseInt(editedRowData.locationId) : null
        }

        if (Object.keys(mappingUpdateData).length > 0) {
          mappingUpdateData.updated_at = new Date().toISOString()
          console.log('📊 Backup: данные для mapping таблицы:', { rowId, mappingUpdateData }) // LOG: отладочная информация

          const mappingPromise = supabase
            .from('chessboard_mapping')
            .select('id')
            .eq('chessboard_id', rowId)
            .maybeSingle()
            .then(async ({ data: existingMapping, error: selectError }) => {
              if (selectError) {
                console.error('❌ Backup: ошибка при проверке mapping:', selectError) // LOG: отладочная информация
                throw selectError
              }

              if (existingMapping) {
                console.log('🔄 Backup: обновляем существующую mapping запись:', existingMapping.id) // LOG: отладочная информация
                const { error: updateError } = await supabase
                  .from('chessboard_mapping')
                  .update(mappingUpdateData)
                  .eq('chessboard_id', rowId)

                if (updateError) throw updateError
              } else {
                console.log('➕ Backup: создаем новую mapping запись для:', rowId) // LOG: отладочная информация
                const { error: insertError } = await supabase
                  .from('chessboard_mapping')
                  .insert({ ...mappingUpdateData, chessboard_id: rowId })

                if (insertError) throw insertError
              }
            })

          promises.push(mappingPromise)
        }

        // Обновляем nomenclature mapping для backup строки
        if (editedRowData.nomenclatureId !== undefined || editedRowData.supplier !== undefined) {
          console.log('🔍 Backup: обновление номенклатуры:', { nomenclatureId: editedRowData.nomenclatureId, supplier: editedRowData.supplier }) // LOG: отладочная информация

          promises.push(
            supabase.from('chessboard_nomenclature_mapping').delete().eq('chessboard_id', rowId)
          )

          const nomenclatureId = editedRowData.nomenclatureId
          if (nomenclatureId) {
            promises.push(
              supabase.from('chessboard_nomenclature_mapping').insert({
                chessboard_id: rowId,
                nomenclature_id: nomenclatureId,
                supplier_name: editedRowData.supplier || null
              })
            )
          }
        }

        // Обновляем rates mapping для backup строки
        if (editedRowData.rateId !== undefined || editedRowData.workName !== undefined) {
          console.log('💰 Backup: обновление расценки:', { rateId: editedRowData.rateId, workName: editedRowData.workName }) // LOG: отладочная информация
          promises.push(
            supabase.from('chessboard_rates_mapping').delete().eq('chessboard_id', rowId)
          )
          const rateId = editedRowData.rateId
          if (rateId) {
            promises.push(
              supabase.from('chessboard_rates_mapping').insert({
                chessboard_id: rowId,
                rate_id: rateId
              })
            )
          }
        }

        console.log('💾 Backup строка обработана:', rowId) // LOG: отладочная информация
      }

      await Promise.all(promises)

      // Обновляем кэш для перерисовки данных без перезагрузки
      console.log('🔄 Обновление кэша для перерисовки данных') // LOG: отладочная информация

      // Invalidate всех queries, которые начинаются с 'chessboard-'
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey
          return (
            Array.isArray(queryKey) &&
            typeof queryKey[0] === 'string' &&
            queryKey[0].startsWith('chessboard-')
          )
        },
      })

      console.log('✅ Все chessboard кэши обновлены, данные перерисованы') // LOG: отладочная информация

      // Сбрасываем состояние
      setNewRows([])
      setEditedRows(new Map())
      setEditingRows({})
      setMode('view')

      message.success('Изменения сохранены')
    } catch (error) {
      console.error('Error saving changes:', error)
      message.error('Ошибка при сохранении изменений')
    }
  }, [newRows, editedRows, editingRows, queryClient, setMode])

  // Отмена всех изменений
  const cancelChanges = useCallback(() => {
    setNewRows([])
    setEditedRows(new Map())
    setEditingRows({})
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

      // Invalidate всех queries, которые начинаются с 'chessboard-'
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey
          return (
            Array.isArray(queryKey) &&
            typeof queryKey[0] === 'string' &&
            queryKey[0].startsWith('chessboard-')
          )
        },
      })
      setMode('view')
      message.success(`Удалено строк: ${tableMode.selectedRowKeys.length}`)
    } catch (error) {
      console.error('Error deleting rows:', error)
      message.error('Ошибка при удалении строк')
    }
  }, [tableMode.selectedRowKeys, queryClient, setMode])

  // Получение итоговых данных для отображения (с учетом новых, отредактированных строк и backup редактирования)
  const getDisplayData = useCallback((originalData: RowData[]) => {
    const dataWithEdits = originalData.map(row => {
      // Если строка в режиме backup редактирования, используем её данные
      if (editingRows[row.id]) {
        return editingRows[row.id]
      }

      // Иначе используем обычное одиночное редактирование
      const edits = editedRows.get(row.id)
      return edits ? { ...row, ...edits, isEditing: true } : row
    })

    return [...dataWithEdits, ...newRows]
  }, [editedRows, newRows, editingRows])

  // Проверка наличия несохраненных изменений
  const hasUnsavedChanges = useMemo(() => {
    return newRows.length > 0 || editedRows.size > 0 || Object.keys(editingRows).length > 0
  }, [newRows.length, editedRows.size, editingRows])

  return {
    // Состояние
    tableMode,
    newRows,
    editedRows,
    editingRows,
    hasUnsavedChanges,

    // Действия с режимами
    setMode,
    setSelectedRowKeys,

    // Операции со строками (одиночное редактирование)
    addNewRow,
    removeNewRow,
    copyRow,
    updateNewRow,
    startEditing,
    cancelEditing,
    updateEditedRow,
    updateRowColor,

    // Операции backup множественного редактирования
    startEditBackup,
    stopEditBackup,
    updateEditingRow,

    // Сохранение/отмена
    saveChanges,
    cancelChanges,
    deleteSelectedRows,

    // Утилиты
    getDisplayData,
  }
}
