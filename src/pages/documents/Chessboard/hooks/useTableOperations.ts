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
      // Данные из документации
      documentationSection: '',
      documentationCode: '',
      documentationProjectName: '',
      documentationVersion: '',
      documentationVersionId: '',
      documentationCodeId: '',
      // Данные из маппингов
      block: '',
      blockId: '',
      floors: '',
      costCategory: '',
      costCategoryId: '',
      costType: '',
      costTypeId: '',
      workName: '',
      workUnit: '',
      rateId: '',
      location: '',
      locationId: '',
      material: '',
      materialType: 'База',
      quantityPd: '',
      quantitySpec: '',
      quantityRd: '',
      nomenclature: '',
      nomenclatureId: '',
      supplier: '',
      unit: '',
      unitId: '',
      comments: '',
      color: '',
      // Данные этажей для модального окна
      floorQuantities: {},
      // Технические поля
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
    async (rowId: string, color: RowColor) => {
      if (tableMode.mode === 'add') {
        updateNewRow(rowId, { color })
      } else if (editingRows[rowId]) {
        // Если строка в режиме backup редактирования
        updateEditingRow(rowId, { color })
      } else if (tableMode.mode === 'view') {
        // ИСПРАВЛЕНИЕ: В режиме просмотра сразу сохраняем цвет в БД без перевода в режим редактирования
        try {
          console.log('🎨 Updating row color directly in DB:', { rowId, color }) // LOG: прямое обновление цвета в БД

          const { error } = await supabase
            .from('chessboard')
            .update({ color })
            .eq('id', rowId)

          if (error) {
            console.error('❌ Failed to update row color:', error) // LOG: ошибка обновления цвета
            message.error('Ошибка при обновлении цвета строки')
          } else {
            console.log('✅ Row color updated successfully') // LOG: цвет успешно обновлен
            // Обновляем кэш React Query
            queryClient.invalidateQueries({ queryKey: ['chessboard-data'] })
            message.success('Цвет строки обновлен')
          }
        } catch (error) {
          console.error('❌ Error updating row color:', error) // LOG: ошибка при обновлении цвета
          message.error('Ошибка при обновлении цвета строки')
        }
      } else {
        // Обычное одиночное редактирование для других режимов
        updateEditedRow(rowId, { color })
      }
    },
    [tableMode.mode, updateNewRow, updateEditedRow, updateEditingRow, editingRows, queryClient, message],
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
      console.log('🔍 DEBUG: Все ключи в updates:', Object.keys(updates)) // LOG: отладочная информация
      console.log('🔍 DEBUG: Проверяем поля документации:', {
        documentationSection: updates.documentationSection,
        documentationCode: updates.documentationCode,
        documentationSectionId: updates.documentationSectionId,
        documentationCodeId: updates.documentationCodeId,
        documentationTagId: updates.documentationTagId,
        documentationId: updates.documentationId,
        block: updates.block,
        blockId: updates.blockId
      }) // LOG: отладочная информация

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
        // Обработка материала: нужно найти или создать материал в таблице materials
        if (updates.material !== undefined) {
          const materialName = updates.material?.trim()
          if (materialName) {
            console.log('🔍 DEBUG: Обработка материала, ищем или создаем:', materialName) // LOG: отладочная информация

            // Ищем существующий материал (поле uuid, а не id!)
            const { data: existingMaterial, error: findError } = await supabase
              .from('materials')
              .select('uuid')
              .eq('name', materialName)
              .single()

            if (findError && findError.code !== 'PGRST116') {
              console.error('🔍 ERROR: Ошибка поиска материала:', findError) // LOG: ошибка поиска
              throw findError
            }

            let materialId: string
            if (existingMaterial) {
              // Материал найден
              materialId = existingMaterial.uuid
              console.log('🔍 DEBUG: Материал найден, UUID:', materialId) // LOG: найденный материал
            } else {
              // Создаем новый материал
              console.log('🔍 DEBUG: Создаем новый материал:', materialName) // LOG: новый материал
              const { data: newMaterial, error: createError } = await supabase
                .from('materials')
                .insert({ name: materialName })
                .select('uuid')
                .single()

              if (createError) {
                console.error('🔍 ERROR: Ошибка создания материала:', createError) // LOG: ошибка создания
                throw createError
              }

              materialId = newMaterial.uuid
              console.log('🔍 DEBUG: Новый материал создан, UUID:', materialId) // LOG: созданный материал
            }

            chessboardUpdateData.material = materialId
          } else {
            chessboardUpdateData.material = null
          }
        }
        if (updates.materialType !== undefined) {
          chessboardUpdateData.material_type = updates.materialType || 'База'
          console.log('🔍 DEBUG: Обработка поля materialType:', updates.materialType) // LOG: отладочная информация
        }
        // ИСПРАВЛЕНИЕ: floors и floorQuantities сохраняются в отдельной таблице chessboard_floor_mapping
        // Не пытаемся сохранить их в основную таблицу chessboard

        // Обновляем updated_at
        chessboardUpdateData.updated_at = new Date().toISOString()

        console.log('📊 saveChanges - данные для основной таблицы:', { rowId, chessboardUpdateData }) // LOG: отладочная информация

        // Обновляем основную таблицу только если есть что обновлять
        if (Object.keys(chessboardUpdateData).length > 1) { // > 1 потому что updated_at всегда есть
          console.log('✅ Обновление основной таблицы chessboard') // LOG: отладочная информация
          const chessboardPromise = supabase.from('chessboard').update(chessboardUpdateData).eq('id', rowId)
          promises.push(chessboardPromise)
        }

        // Обновляем mapping таблицу для остальных полей (с правильными типами данных)
        const mappingUpdateData: any = {}
        console.log('🔍 DEBUG: Проверяем blockId:', { blockId: updates.blockId, block: updates.block }) // LOG: отладочная информация
        if (updates.blockId !== undefined) {
          mappingUpdateData.block_id = updates.blockId || null
          console.log('✅ DEBUG: Добавили block_id в mapping:', mappingUpdateData.block_id) // LOG: отладочная информация
        } else if (updates.block !== undefined) {
          // Если пришло название блока вместо ID - используем его как ID (блоки могут быть UUID)
          mappingUpdateData.block_id = updates.block || null
          console.log('✅ DEBUG: Добавили block (as ID) в mapping:', mappingUpdateData.block_id) // LOG: отладочная информация
        }
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

        // Обновляем documentation mapping для полей документации
        console.log('🔍 DEBUG: Проверяем условие документации:', {
          documentationSectionId_defined: updates.documentationSectionId !== undefined,
          documentationCodeId_defined: updates.documentationCodeId !== undefined,
          documentationSectionId_value: updates.documentationSectionId,
          documentationCodeId_value: updates.documentationCodeId,
          documentationSection: updates.documentationSection,
          documentationCode: updates.documentationCode
        }) // LOG: отладочная информация

        if (updates.documentationSectionId !== undefined || updates.documentationCodeId !== undefined) {
          console.log('📄 ВОШЛИ в обновление документации:', { documentationSectionId: updates.documentationSectionId, documentationCodeId: updates.documentationCodeId }) // LOG: отладочная информация

          // Сначала удаляем старые связи
          promises.push(
            supabase.from('chessboard_documentation_mapping').delete().eq('chessboard_id', rowId)
          )

          // Добавляем новую связь - используется documentationVersionId как version_id
          // В таблице chessboard_documentation_mapping есть только поле version_id
          if (updates.documentationVersionId) {
            console.log('📄 Добавляем version_id (documentationVersionId):', updates.documentationVersionId) // LOG: отладочная информация
            promises.push(
              supabase.from('chessboard_documentation_mapping').insert({
                chessboard_id: rowId,
                version_id: updates.documentationVersionId
              })
            )
          } else if (updates.documentationCodeId) {
            // Fallback: если версия не выбрана, но выбран документ, используем documentationCodeId
            console.log('📄 Fallback: добавляем version_id (documentationCodeId):', updates.documentationCodeId) // LOG: отладочная информация
            promises.push(
              supabase.from('chessboard_documentation_mapping').insert({
                chessboard_id: rowId,
                version_id: updates.documentationCodeId
              })
            )
          } else {
            console.log('📄 documentationCodeId не указан, пропускаем добавление в documentation_mapping') // LOG: отладочная информация
          }
        }

        // Обновляем floors mapping для этажей и количеств
        if (updates.floors !== undefined || updates.floorQuantities !== undefined ||
            updates.quantityPd !== undefined || updates.quantitySpec !== undefined || updates.quantityRd !== undefined) {
          console.log('🏢 Обновление этажей и количеств:', {
            floors: updates.floors,
            floorQuantities: updates.floorQuantities,
            quantityPd: updates.quantityPd,
            quantitySpec: updates.quantitySpec,
            quantityRd: updates.quantityRd
          }) // LOG: отладочная информация

          // Создаем функцию обновления этажей и количеств
          const updateFloorsPromise = async () => {
            try {
              // 1. Сначала получаем существующие данные этажей
              const { data: existingFloors } = await supabase
                .from('chessboard_floor_mapping')
                .select('*')
                .eq('chessboard_id', rowId)

              console.log('🔍 Существующие данные этажей:', existingFloors) // LOG: отладочная информация

              // 2. Проверяем, есть ли этажи или количества для обработки
              const floorsString = updates.floors !== undefined ? updates.floors : ''
              const floorQuantities = updates.floorQuantities || {}

              // Проверяем, есть ли прямые изменения количеств (без этажей)
              const hasDirectQuantityUpdates = updates.quantityPd !== undefined ||
                                               updates.quantitySpec !== undefined ||
                                               updates.quantityRd !== undefined

              // Проверяем, есть ли существующие этажи в БД (кроме записей с floor_number = null)
              const existingFloorsWithNumbers = existingFloors?.filter(floor => floor.floor_number !== null) || []
              const hasExistingFloors = existingFloorsWithNumbers.length > 0

              console.log('🔍 DEBUG: Анализ условий обработки:', {
                floorsString,
                floorsStringTrimmed: floorsString.trim(),
                floorsStringExists: !!(floorsString && floorsString.trim()),
                hasDirectQuantityUpdates,
                hasExistingFloors,
                existingFloorsWithNumbers,
                updateFields: {
                  floors: updates.floors,
                  quantityPd: updates.quantityPd,
                  quantitySpec: updates.quantitySpec,
                  quantityRd: updates.quantityRd
                },
                floorQuantities
              }) // LOG: анализ условий

              if (floorsString && floorsString.trim()) {
                console.log('✅ DEBUG: Выполняем секцию ОБРАБОТКА ЭТАЖЕЙ') // LOG: выполнение секции
                // Обработка с указанными этажами
                const floors = parseFloorsFromString(floorsString)
                console.log('🏢 Обработка этажей:', { floors, floorQuantities, hasDirectQuantityUpdates, quantityUpdates: { quantityPd: updates.quantityPd, quantitySpec: updates.quantitySpec, quantityRd: updates.quantityRd } }) // LOG: обработка этажей

                if (floors.length > 0) {
                  // КРИТИЧНО: При указании этажей удаляем ВСЕ существующие записи для данной строки
                  // (включая записи с floor_number = null - количества без этажей)
                  console.log('🗑️ Удаляем ВСЕ старые записи этажей и количеств') // LOG: удаление всех записей
                  const { error: deleteError } = await supabase
                    .from('chessboard_floor_mapping')
                    .delete()
                    .eq('chessboard_id', rowId) // Удаляем все записи для данной строки

                  if (deleteError) {
                    console.error('🏢 Ошибка удаления старых этажей:', deleteError) // LOG: ошибка удаления
                    throw deleteError
                  }

                  // Теперь создаем новые записи для указанных этажей
                  const newFloorRecords = floors.map(floor => {
                    // Находим существующую запись для этого этажа для сохранения неизменных значений
                    const existingFloorRecord = existingFloors?.find(f => f.floor_number === floor)

                    const floorQuantityData = {
                      // ПРИОРИТЕТ: прямые изменения количеств, затем floorQuantities, затем существующие значения
                      quantityPd: hasDirectQuantityUpdates && updates.quantityPd !== undefined
                        ? (updates.quantityPd ? Number(updates.quantityPd) : null)
                        : (floorQuantities?.[floor]?.quantityPd
                          ? Number(floorQuantities[floor].quantityPd)
                          : (existingFloorRecord?.quantityPd || null)),
                      quantitySpec: hasDirectQuantityUpdates && updates.quantitySpec !== undefined
                        ? (updates.quantitySpec ? Number(updates.quantitySpec) : null)
                        : (floorQuantities?.[floor]?.quantitySpec
                          ? Number(floorQuantities[floor].quantitySpec)
                          : (existingFloorRecord?.quantitySpec || null)),
                      quantityRd: hasDirectQuantityUpdates && updates.quantityRd !== undefined
                        ? (updates.quantityRd ? Number(updates.quantityRd) : null)
                        : (floorQuantities?.[floor]?.quantityRd
                          ? Number(floorQuantities[floor].quantityRd)
                          : (existingFloorRecord?.quantityRd || null)),
                    }

                    console.log(`🏢 Обработка этажа ${floor}:`, {
                      hasDirectQuantityUpdates,
                      directUpdates: { quantityPd: updates.quantityPd, quantitySpec: updates.quantitySpec, quantityRd: updates.quantityRd },
                      floorQuantitiesForThisFloor: floorQuantities?.[floor],
                      existingRecord: existingFloorRecord,
                      resultQuantityData: floorQuantityData
                    }) // LOG: обработка этажа

                    return {
                      chessboard_id: rowId,
                      floor_number: floor,
                      ...floorQuantityData
                    }
                  })

                  console.log('➕ Создаем новые этажи:', newFloorRecords) // LOG: создание этажей

                  const { error: insertError } = await supabase
                    .from('chessboard_floor_mapping')
                    .insert(newFloorRecords)

                  if (insertError) {
                    console.error('🏢 Ошибка создания новых этажей:', insertError) // LOG: ошибка создания
                    throw insertError
                  }

                  console.log('✅ Этажи успешно заменены') // LOG: успех замены
                }
              } else if (hasExistingFloors && hasDirectQuantityUpdates) {
                // НОВАЯ СЕКЦИЯ: Есть существующие этажи в БД, но поле floors не передано
                // Обновляем количества для существующих этажей
                                console.log('🔄 Обновление количеств для существующих этажей:', existingFloorsWithNumbers) // LOG: обновление существующих этажей

                // Удаляем все существующие записи
                const { error: deleteError } = await supabase
                  .from('chessboard_floor_mapping')
                  .delete()
                  .eq('chessboard_id', rowId) // Удаляем все записи для данной строки

                if (deleteError) {
                                    throw deleteError
                }

                // Создаем новые записи для существующих этажей с обновленными количествами
                const totalFloors = existingFloorsWithNumbers.length
                
                const updatedFloorRecords = existingFloorsWithNumbers.map(existingFloor => {
                  return {
                    chessboard_id: rowId,
                    floor_number: existingFloor.floor_number,
                    // РАСПРЕДЕЛЯЕМ количества равномерно между всеми этажами или сохраняем существующие значения
                    quantityPd: hasDirectQuantityUpdates && updates.quantityPd !== undefined
                      ? (updates.quantityPd ? Number(updates.quantityPd) / totalFloors : null)
                      : (existingFloor.quantityPd || null),
                    quantitySpec: hasDirectQuantityUpdates && updates.quantitySpec !== undefined
                      ? (updates.quantitySpec ? Number(updates.quantitySpec) / totalFloors : null)
                      : (existingFloor.quantitySpec || null),
                    quantityRd: hasDirectQuantityUpdates && updates.quantityRd !== undefined
                      ? (updates.quantityRd ? Number(updates.quantityRd) / totalFloors : null)
                      : (existingFloor.quantityRd || null),
                  }
                })

                console.log('📐 Количества распределены по этажам:', updatedFloorRecords.map(record => ({
                  floor: record.floor_number,
                  quantityPd: record.quantityPd,
                  quantitySpec: record.quantitySpec,
                  quantityRd: record.quantityRd
                }))) // LOG: результат распределения

                const { error: insertError } = await supabase
                  .from('chessboard_floor_mapping')
                  .insert(updatedFloorRecords)

                if (insertError) {
                                    throw insertError
                }

                              } else if (hasDirectQuantityUpdates && (!floorsString || !floorsString.trim()) && !hasExistingFloors) {
                                console.log('⚠️ DEBUG: Условия выполнения:', {
                  hasDirectQuantityUpdates,
                  floorsStringEmpty: !floorsString || !floorsString.trim(),
                  floorsString,
                  floorsStringTrimmed: floorsString?.trim()
                }) // LOG: условия выполнения
                // Обработка количеств БЕЗ указания этажей - только если этажи НЕ указаны
                console.log('📊 Обработка количеств без этажей') // LOG: количества без этажей

                // Ищем существующую запись с floor_number = null
                const existingRecord = existingFloors?.find(floor => floor.floor_number === null)

                if (existingRecord) {
                  // Обновляем существующую запись, сохраняя неизменные поля
                  const updateData: any = {}

                  if (updates.quantityPd !== undefined) {
                    updateData.quantityPd = updates.quantityPd ? Number(updates.quantityPd) : null
                  }
                  if (updates.quantitySpec !== undefined) {
                    updateData.quantitySpec = updates.quantitySpec ? Number(updates.quantitySpec) : null
                  }
                  if (updates.quantityRd !== undefined) {
                    updateData.quantityRd = updates.quantityRd ? Number(updates.quantityRd) : null
                  }

                  console.log('🔄 Обновляем существующую запись:', { id: existingRecord.id, updateData }) // LOG: обновление записи

                  const { error: updateError } = await supabase
                    .from('chessboard_floor_mapping')
                    .update(updateData)
                    .eq('id', existingRecord.id)

                  if (updateError) {
                    console.error('📊 Ошибка обновления количеств:', updateError) // LOG: ошибка обновления
                    throw updateError
                  }
                } else {
                  // Создаем новую запись
                  const quantityMapping = {
                    chessboard_id: rowId,
                    floor_number: null, // Этаж не указан
                    quantityPd: updates.quantityPd !== undefined
                      ? (updates.quantityPd ? Number(updates.quantityPd) : null)
                      : null,
                    quantitySpec: updates.quantitySpec !== undefined
                      ? (updates.quantitySpec ? Number(updates.quantitySpec) : null)
                      : null,
                    quantityRd: updates.quantityRd !== undefined
                      ? (updates.quantityRd ? Number(updates.quantityRd) : null)
                      : null,
                  }

                  console.log('➕ Создаем новую запись для количеств:', quantityMapping) // LOG: создание записи

                  const { error: insertError } = await supabase
                    .from('chessboard_floor_mapping')
                    .insert(quantityMapping)

                  if (insertError) {
                    console.error('📊 Ошибка создания количеств:', insertError) // LOG: ошибка создания
                    throw insertError
                  }
                }

                console.log('✅ Количества успешно обработаны') // LOG: успех обработки
              } else if (hasExistingFloors && updates.floors !== undefined && (!floorsString || !floorsString.trim())) {
                // НОВАЯ СЕКЦИЯ: Удаление этажей - переход от этажей к количествам без этажей
                                
                // Суммируем количества со всех существующих этажей
                const totalQuantities = existingFloorsWithNumbers.reduce((totals, floor) => {
                  return {
                    quantityPd: (totals.quantityPd || 0) + (floor.quantityPd || 0),
                    quantitySpec: (totals.quantitySpec || 0) + (floor.quantitySpec || 0),
                    quantityRd: (totals.quantityRd || 0) + (floor.quantityRd || 0),
                  }
                }, { quantityPd: 0, quantitySpec: 0, quantityRd: 0 })

                // Удаляем все существующие записи
                const { error: deleteError } = await supabase
                  .from('chessboard_floor_mapping')
                  .delete()
                  .eq('chessboard_id', rowId)

                if (deleteError) {
                                    throw deleteError
                }

                // Создаем одну запись с floor_number = null и суммированными количествами
                const nullFloorRecord = {
                  chessboard_id: rowId,
                  floor_number: null, // Этажи удалены
                  quantityPd: totalQuantities.quantityPd || null,
                  quantitySpec: totalQuantities.quantitySpec || null,
                  quantityRd: totalQuantities.quantityRd || null,
                }

                const { error: insertError } = await supabase
                  .from('chessboard_floor_mapping')
                  .insert(nullFloorRecord)

                if (insertError) {
                                    throw insertError
                }

                              } else {
                                console.log('🏢 Нет данных для сохранения в chessboard_floor_mapping') // LOG: нет данных
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

      const results = await Promise.all(promises)

      // Проверяем результаты на ошибки
      results.forEach((result, index) => {
        // Проверяем, что result существует перед доступом к свойствам
        if (result && result.error) {
          console.error(`❌ Ошибка в promise ${index}:`, result.error) // LOG: ошибка запроса
        } else if (result) {
          console.log(`✅ Promise ${index} выполнен успешно`) // LOG: успешный запрос
        } else {
          console.warn(`⚠️  Promise ${index} вернул undefined`) // LOG: неопределенный результат
        }
      })

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

    return [...newRows, ...dataWithEdits]
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
