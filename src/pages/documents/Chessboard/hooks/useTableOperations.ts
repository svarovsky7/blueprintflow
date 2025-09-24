import { useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import type { Key } from 'react'
import { supabase } from '@/lib/supabase'
import type { TableMode, RowData, RowColor } from '../types'

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

        // Обновляем updated_at
        chessboardUpdateData.updated_at = new Date().toISOString()

        console.log('📊 saveChanges - данные для основной таблицы:', { rowId, chessboardUpdateData }) // LOG: отладочная информация
        console.log('🔍 DEBUG: все updates для проверки:', { rowId, updates }) // LOG: отладочная информация
        console.log('🔍 DEBUG: поля в updates:', Object.keys(updates)) // LOG: отладочная информация

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

        // Обновляем nomenclature mapping для номенклатуры (как в backup)
        if (updates.nomenclatureId !== undefined || updates.supplier !== undefined) {
          console.log('🔍 Обновление номенклатуры:', { nomenclatureId: updates.nomenclatureId, supplier: updates.supplier }) // LOG: отладочная информация

          // Сначала удаляем старую связь (как в backup)
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

        // Каскадное очищение: при смене вида затрат очищаем наименование работ
        if (updates.costTypeId !== undefined) {
          console.log('🔄 Каскадное очищение: изменился вид затрат, очищаем наименование работ') // LOG: отладочная информация
          // Удаляем связь с расценкой (наименованием работ)
          promises.push(
            supabase.from('chessboard_rates_mapping').delete().eq('chessboard_id', rowId)
          )
        }

        // Обновляем rates mapping для наименования работ (как в backup)
        if (updates.rateId !== undefined) {
          console.log('🔍 Обновление расценки (наименования работ):', updates.rateId) // LOG: отладочная информация

          // Сначала удаляем старую связь (как в backup)
          promises.push(
            supabase.from('chessboard_rates_mapping').delete().eq('chessboard_id', rowId)
          )

          // Если выбрана расценка, создаём новую запись
          if (updates.rateId) {
            promises.push(
              supabase.from('chessboard_rates_mapping').insert({
                chessboard_id: rowId,
                rate_id: updates.rateId
              })
            )
          }
        }

        // Обновляем floor mapping для этажей и количественных данных (по логике из backup)
        if (updates.quantityPd !== undefined || updates.quantitySpec !== undefined || updates.quantityRd !== undefined || updates.floorQuantities !== undefined || updates.floors !== undefined) {
          console.log('🔍 Обновление этажей и количеств - исходные updates:', {
            quantityPd: updates.quantityPd,
            quantitySpec: updates.quantitySpec,
            quantityRd: updates.quantityRd,
            floorQuantities: updates.floorQuantities,
            floors: updates.floors
          }) // LOG: отладочная информация

          // ВАЖНО: Получаем текущие данные строки из chessboard_floor_mapping, чтобы сохранить существующие количества
          const currentRowPromise = supabase
            .from('chessboard_floor_mapping')
            .select('"quantityPd", "quantitySpec", "quantityRd", floor_number')
            .eq('chessboard_id', rowId)
            .then(async ({ data: currentFloorMappings, error: currentRowError }) => {
              if (currentRowError) {
                console.error('❌ Ошибка получения текущих данных маппинга этажей:', currentRowError) // LOG: отладочная информация
                throw currentRowError
              }

              console.log('📊 Текущие данные floor_mapping из БД:', currentFloorMappings) // LOG: отладочная информация

              // Суммируем текущие количества из всех записей floor_mapping для получения общих сумм
              let currentTotalPd = 0
              let currentTotalSpec = 0
              let currentTotalRd = 0
              let floorsArray: number[] = []

              if (currentFloorMappings && currentFloorMappings.length > 0) {
                currentFloorMappings.forEach(mapping => {
                  currentTotalPd += Number(mapping.quantityPd) || 0
                  currentTotalSpec += Number(mapping.quantitySpec) || 0
                  currentTotalRd += Number(mapping.quantityRd) || 0
                  if (mapping.floor_number) {
                    floorsArray.push(mapping.floor_number)
                  }
                })
              }

              // Создаем строку этажей из массива
              const currentFloorsString = floorsArray.length > 0 ? floorsArray.sort((a, b) => a - b).join('-') : ''

              console.log('📊 Суммированные текущие количества:', {
                currentTotalPd,
                currentTotalSpec,
                currentTotalRd,
                currentFloorsString
              }) // LOG: отладочная информация

              // Объединяем новые значения с существующими (приоритет у updates)
              let finalQuantityPd = updates.quantityPd !== undefined ? updates.quantityPd : currentTotalPd
              let finalQuantitySpec = updates.quantitySpec !== undefined ? updates.quantitySpec : currentTotalSpec
              let finalQuantityRd = updates.quantityRd !== undefined ? updates.quantityRd : currentTotalRd
              const finalFloors = updates.floors !== undefined ? updates.floors : currentFloorsString

              // ВАЖНО: Если изменились только этажи (не количества), пересчитываем существующие количества
              if (updates.floors !== undefined &&
                  updates.quantityPd === undefined &&
                  updates.quantitySpec === undefined &&
                  updates.quantityRd === undefined) {

                console.log('🔄 Пересчет количеств при изменении этажей:', {
                  oldFloors: currentFloorsString,
                  newFloors: updates.floors,
                  currentTotals: { currentTotalPd, currentTotalSpec, currentTotalRd }
                }) // LOG: отладочная информация

                // Сохраняем существующие суммарные количества (они останутся теми же)
                finalQuantityPd = currentTotalPd
                finalQuantitySpec = currentTotalSpec
                finalQuantityRd = currentTotalRd
              }

              const allQuantities = {
                quantityPd: finalQuantityPd,
                quantitySpec: finalQuantitySpec,
                quantityRd: finalQuantityRd,
                floors: finalFloors
              }

              console.log('📊 Объединенные количества (новые + существующие):', allQuantities) // LOG: отладочная информация

              // Сначала удаляем все старые записи этажей для этой строки (как в backup)
              await supabase.from('chessboard_floor_mapping').delete().eq('chessboard_id', rowId)

              // Парсим строку этажей
              const floors = allQuantities.floors ? parseFloorsString(allQuantities.floors) : []
              const floorQuantities = updates.floorQuantities
              const locationId = updates.locationId ? parseInt(updates.locationId) : null

              if (floors.length > 0) {
                console.log('📊 Создание записей для этажей:', floors) // LOG: отладочная информация

                const floorMappings = floors.map((floor: number) => {
                  const qty = floorQuantities?.[floor] || {}

                  // Пропорциональное распределение количеств по этажам (используем ПОЛНЫЕ данные)
                  const proportionalQuantityPd = qty.quantityPd ? Number(qty.quantityPd) :
                    (allQuantities.quantityPd && floors.length > 1) ? Number(allQuantities.quantityPd) / floors.length :
                    allQuantities.quantityPd ? Number(allQuantities.quantityPd) : null

                  const proportionalQuantitySpec = qty.quantitySpec ? Number(qty.quantitySpec) :
                    (allQuantities.quantitySpec && floors.length > 1) ? Number(allQuantities.quantitySpec) / floors.length :
                    allQuantities.quantitySpec ? Number(allQuantities.quantitySpec) : null

                  const proportionalQuantityRd = qty.quantityRd ? Number(qty.quantityRd) :
                    (allQuantities.quantityRd && floors.length > 1) ? Number(allQuantities.quantityRd) / floors.length :
                    allQuantities.quantityRd ? Number(allQuantities.quantityRd) : null

                  console.log(`📊 Этаж ${floor} - пропорциональные количества:`, {
                    quantityPd: proportionalQuantityPd,
                    quantitySpec: proportionalQuantitySpec,
                    quantityRd: proportionalQuantityRd
                  }) // LOG: отладочная информация

                  return {
                    chessboard_id: rowId,
                    floor_number: floor,
                    location_id: locationId,
                    quantityPd: proportionalQuantityPd,
                    quantitySpec: proportionalQuantitySpec,
                    quantityRd: proportionalQuantityRd,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }
                })

                await supabase.from('chessboard_floor_mapping').insert(floorMappings)
              } else {
                // Если нет этажей, создаем одну запись по умолчанию (как в backup)
                const qty = floorQuantities?.[0] || {}

                console.log('📊 Создание записи по умолчанию (без этажей)') // LOG: отладочная информация

                const defaultFloorMapping = {
                  chessboard_id: rowId,
                  location_id: locationId,
                  quantityPd: qty.quantityPd ? Number(qty.quantityPd) :
                            allQuantities.quantityPd ? Number(allQuantities.quantityPd) : null,
                  quantitySpec: qty.quantitySpec ? Number(qty.quantitySpec) :
                              allQuantities.quantitySpec ? Number(allQuantities.quantitySpec) : null,
                  quantityRd: qty.quantityRd ? Number(qty.quantityRd) :
                             allQuantities.quantityRd ? Number(allQuantities.quantityRd) : null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }

                await supabase.from('chessboard_floor_mapping').insert(defaultFloorMapping)
              }
            })

          promises.push(currentRowPromise)
        }

        // Функция парсинга этажей - обрабатывает диапазоны и отдельные этажи
        function parseFloorsString(floorsStr: string): number[] {
          if (!floorsStr) return []

          console.log('🔍 Парсинг строки этажей:', floorsStr) // LOG: отладочная информация

          const result: number[] = []
          const parts = floorsStr.split(/[,\s]+/) // Разделяем по запятой и пробелам

          parts.forEach(part => {
            const trimmedPart = part.trim()
            if (!trimmedPart) return

            // Проверяем, есть ли диапазон (например "2-4")
            if (trimmedPart.includes('-')) {
              const [startStr, endStr] = trimmedPart.split('-')
              const start = Number(startStr.trim())
              const end = Number(endStr.trim())

              if (!isNaN(start) && !isNaN(end) && start <= end) {
                // Создаем диапазон этажей от start до end включительно
                for (let i = start; i <= end; i++) {
                  if (!result.includes(i)) {
                    result.push(i)
                  }
                }
                console.log(`📊 Диапазон "${trimmedPart}" -> этажи:`, Array.from({length: end - start + 1}, (_, i) => start + i)) // LOG: отладочная информация
              }
            } else {
              // Отдельный этаж
              const floor = Number(trimmedPart)
              if (!isNaN(floor) && !result.includes(floor)) {
                result.push(floor)
                console.log(`📊 Отдельный этаж: ${floor}`) // LOG: отладочная информация
              }
            }
          })

          const sortedResult = result.sort((a, b) => a - b)
          console.log(`📊 Итоговый массив этажей:`, sortedResult) // LOG: отладочная информация

          return sortedResult
        }


        // ВАЖНО: workName (Наименование работ) не сохраняется напрямую,
        // а берется из rates через chessboard_rates_mapping, которая уже обновляется выше

        // ВАЖНО: floors (Этажи) - это отображаемое поле, которое формируется из floor_number
        // в chessboard_floor_mapping, не требует отдельного сохранения

        // Логирование пропущенных полей для отладки
        if (updates.workName !== undefined) {
          console.log('ℹ️ workName - вычисляемое поле, не сохраняется напрямую:', updates.workName) // LOG: отладочная информация
        }
        if (updates.floors !== undefined) {
          console.log('ℹ️ floors - отображаемое поле, не сохраняется напрямую:', updates.floors) // LOG: отладочная информация
        }
      }

      await Promise.all(promises)

      // Обновляем кэш для перерисовки данных без перезагрузки
      console.log('🔄 Обновление кэша для перерисовки данных') // LOG: отладочная информация

      // Invalidate всех queries, которые начинаются с 'chessboard-'
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey
          return Array.isArray(queryKey) && typeof queryKey[0] === 'string' && queryKey[0].startsWith('chessboard-')
        }
      })

      console.log('✅ Все chessboard кэши обновлены, данные перерисованы') // LOG: отладочная информация

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

      // Invalidate всех queries, которые начинаются с 'chessboard-'
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey
          return Array.isArray(queryKey) && typeof queryKey[0] === 'string' && queryKey[0].startsWith('chessboard-')
        }
      })
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