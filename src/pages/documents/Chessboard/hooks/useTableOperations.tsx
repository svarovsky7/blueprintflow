import { useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import type { Key } from 'react'
import { supabase } from '@/lib/supabase'
import { ratesApi } from '@/entities/rates/api/rates-api'
import type { TableMode, RowData, RowColor } from '../types'
import { parseFloorsFromString } from '../utils/floors'

export const useTableOperations = (refetch?: () => void, data: RowData[] = []) => {
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
  const addNewRow = useCallback((projectId: string, insertPosition: 'first' | 'after' = 'first', afterRowIndex?: number) => {
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
      workSet: '',
      workSetId: '',
      workName: '',
      workNameId: '',
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
      isEditing: tableMode.mode === 'add',
      _insertPosition: insertPosition,
      _afterRowIndex: afterRowIndex,
    }

    setNewRows((prev) => {
      if (insertPosition === 'first') {
        const result = [newRow, ...prev]
        return result
      } else if (insertPosition === 'after' && afterRowIndex !== undefined) {
        const newRows = [...prev]
        newRows.splice(afterRowIndex + 1, 0, newRow)
        return newRows
      }
      const result = [...prev, newRow]
      return result
    })
  }, [tableMode.mode])

  // Удаление новой строки
  const removeNewRow = useCallback((rowId: string) => {
    setNewRows((prev) => prev.filter((row) => row.id !== rowId))
  }, [])

  // Копирование строки
  const copyRow = useCallback((sourceRow: RowData, insertPosition: 'after' = 'after', afterRowIndex?: number) => {
    const copiedRow: RowData = {
      ...sourceRow,
      id: `copy-${Date.now()}-${Math.random()}`,
      isNew: true,
      isEditing: tableMode.mode === 'add',
      _insertPosition: insertPosition,
      _afterRowIndex: afterRowIndex,
    }

    setNewRows((prev) => {
      if (insertPosition === 'after' && afterRowIndex !== undefined) {
        const newRows = [...prev]
        newRows.splice(afterRowIndex + 1, 0, copiedRow)
        return newRows
      }
      return [...prev, copiedRow]
    })
  }, [tableMode.mode])

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

    setEditedRows(prev => {
      const newMap = new Map(prev)
      const currentEdits = newMap.get(rowId) || {}
      newMap.set(rowId, { ...currentEdits, ...updates })
      return newMap
    })
  }, [])

  // Функции для множественного редактирования (backup подход)
  const startEditBackup = useCallback((rowId: string, originalRow: RowData) => {
    setEditingRows(prev => ({
      ...prev,
      [rowId]: { ...originalRow, isEditing: true }
    }))
  }, [])

  const stopEditBackup = useCallback((rowId: string) => {
    setEditingRows(prev => {
      const updated = { ...prev }
      delete updated[rowId]
      return updated
    })
  }, [])

  const updateEditingRow = useCallback((rowId: string, updates: Partial<RowData>) => {
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

          const { error } = await supabase
            .from('chessboard')
            .update({ color })
            .eq('id', rowId)

          if (error) {
            message.error('Ошибка при обновлении цвета строки')
          } else {
            // Обновляем кэш React Query
            queryClient.invalidateQueries({ queryKey: ['chessboard-data'] })
            message.success('Цвет строки обновлен')
          }
        } catch (error) {
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
      // Валидация обязательных полей
      const validateRequiredFields = (): { isValid: boolean; invalidRows: string[] } => {
        const invalidRows: string[] = []

        // Проверка новых строк
        newRows.forEach((row, index) => {
          if (!row.costCategoryId || !row.costTypeId) {
            invalidRows.push(`Новая строка №${index + 1}`)
          }
        })

        // Проверка редактируемых строк - нужно учитывать исходные данные
        editedRows.forEach((updates, rowId) => {
          // Ищем оригинальную строку в data
          const originalRow = data.find(r => r.id === rowId)

          // Определяем финальные значения (обновленные или оригинальные)
          const finalCategoryId = updates.costCategoryId !== undefined
            ? updates.costCategoryId
            : originalRow?.costCategoryId

          const finalTypeId = updates.costTypeId !== undefined
            ? updates.costTypeId
            : originalRow?.costTypeId

          if (!finalCategoryId || !finalTypeId) {
            const rowLabel = originalRow?.material
              ? `Строка с материалом "${originalRow.material.substring(0, 30)}..."`
              : `Строка ID: ${rowId.substring(0, 8)}`
            invalidRows.push(rowLabel)
          }
        })

        // Проверка backup редактирования
        Object.entries(editingRows).forEach(([rowId, row]) => {
          if (!row.costCategoryId || !row.costTypeId) {
            const rowLabel = row.material
              ? `Строка с материалом "${row.material.substring(0, 30)}..."`
              : `Строка ID: ${rowId.substring(0, 8)}`
            invalidRows.push(rowLabel)
          }
        })

        return {
          isValid: invalidRows.length === 0,
          invalidRows
        }
      }

      const validation = validateRequiredFields()

      if (!validation.isValid) {
        message.error({
          content: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                Не заполнены обязательные поля
              </div>
              <div style={{ marginBottom: 4 }}>
                Необходимо указать "Категория затрат" и "Вид затрат" для:
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, maxHeight: 200, overflowY: 'auto' }}>
                {validation.invalidRows.map((row, idx) => (
                  <li key={idx}>{row}</li>
                ))}
              </ul>
            </div>
          ),
          duration: 6
        })
        return // Прерываем сохранение
      }

      const promises: Promise<any>[] = []

      // Сохранение новых строк - ИСПРАВЛЕНО: используем последовательную обработку как в редактировании
      if (newRows.length > 0) {
        for (const row of newRows) {
          // 1. Сначала создаем запись в основной таблице chessboard (только основные поля БД)
          const chessboardData = {
            project_id: row.projectId,
            color: row.color || null,
            unit_id: row.unitId || null,
            material: row.materialId || null,
            material_type: row.materialType || 'База',
          }

          // Обработка материала - если это UUID, используем как есть, если название - ищем/создаем
          if (row.material && row.material.trim()) {
            const materialValue = row.material.trim()

            // Проверяем, является ли значение UUID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(materialValue)

            if (isUUID) {
              // Если это UUID, используем как есть
              chessboardData.material = materialValue
            } else {
              // Если это название, ищем или создаем материал
              const { data: existingMaterial, error: findError } = await supabase
                .from('materials')
                .select('uuid')
                .eq('name', materialValue)
                .single()

              if (findError && findError.code !== 'PGRST116') {
                throw findError
              }

              let materialId: string
              if (existingMaterial) {
                materialId = existingMaterial.uuid
              } else {
                const { data: newMaterial, error: createError } = await supabase
                  .from('materials')
                  .insert({ name: materialValue })
                  .select('uuid')
                  .single()

                if (createError) {
                  throw createError
                }

                materialId = newMaterial.uuid
              }

              chessboardData.material = materialId
            }
          }


          const { data: newChessboardRow, error: insertError } = await supabase
            .from('chessboard')
            .insert(chessboardData)
            .select('id')
            .single()

          if (insertError) {
            throw insertError
          }

          const newRowId = newChessboardRow.id

          // 2. Создаем запись в mapping таблице (аналогично редактированию)
          const mappingData: any = {}
          if (row.blockId) {
            mappingData.block_id = row.blockId
          }
          if (row.costCategoryId) mappingData.cost_category_id = parseInt(row.costCategoryId)
          if (row.costTypeId) mappingData.cost_type_id = parseInt(row.costTypeId)
          if (row.locationId) mappingData.location_id = parseInt(row.locationId)

          if (Object.keys(mappingData).length > 0) {
            mappingData.chessboard_id = newRowId
            mappingData.updated_at = new Date().toISOString()


            const { error: mappingError } = await supabase
              .from('chessboard_mapping')
              .insert(mappingData)

            if (mappingError) {
              throw mappingError
            }
          }

          // 3. Создаем связи с документацией (аналогично редактированию)
          if (row.documentationVersionId) {
            const { error: docError } = await supabase
              .from('chessboard_documentation_mapping')
              .insert({
                chessboard_id: newRowId,
                version_id: row.documentationVersionId
              })

            if (docError) {
              throw docError
            }
          }

          // 4. Создаем связи с номенклатурой (аналогично редактированию)
          if (row.nomenclatureId) {
            const { error: nomError } = await supabase
              .from('chessboard_nomenclature_mapping')
              .insert({
                chessboard_id: newRowId,
                nomenclature_id: row.nomenclatureId,
                supplier_name: row.supplier || null
              })

            if (nomError) {
              throw nomError
            }
          }

          // 5. Создаем связи с расценками через API для работы с work_names
          if (row.rateId || row.workName) {

            let finalRateId = row.rateId

            // Если есть workName но нет rateId, создаем через API
            if (row.workName && row.workName.trim() && !finalRateId) {
              const workNameValue = row.workName.trim()

              // Создаем расценку через API, который работает с work_names
              const newRate = await ratesApi.create({
                work_name: workNameValue,
                work_set: row.workSet || '',
                base_rate: 0,
                unit_id: row.unitId || null,
                active: true,
                detail_cost_category_id: row.costTypeId ? parseInt(row.costTypeId) : undefined,
                cost_category_id: row.costCategoryId ? parseInt(row.costCategoryId) : undefined,
              })

              finalRateId = newRate.id
            }

            // Создаем mapping только если есть finalRateId
            if (finalRateId) {
              const { error: rateError } = await supabase
                .from('chessboard_rates_mapping')
                .insert({
                  chessboard_id: newRowId,
                  rate_id: finalRateId
                })

              if (rateError) {
                throw rateError
              }
            }
          }

          // 6. Сохраняем количества в chessboard_floor_mapping (аналогично редактированию)
          if (row.floorQuantities && Object.keys(row.floorQuantities).length > 0) {

            const floorRecords = []
            for (const [floorNumber, quantities] of Object.entries(row.floorQuantities)) {
              floorRecords.push({
                chessboard_id: newRowId,
                floor_number: parseInt(floorNumber),
                quantityPd: quantities.quantityPd ? Number(quantities.quantityPd) : null,
                quantitySpec: quantities.quantitySpec ? Number(quantities.quantitySpec) : null,
                quantityRd: quantities.quantityRd ? Number(quantities.quantityRd) : null
              })
            }

            if (floorRecords.length > 0) {
              const { error: floorError } = await supabase
                .from('chessboard_floor_mapping')
                .insert(floorRecords)

              if (floorError) {
                throw floorError
              }
            }
          } else if (row.quantityPd || row.quantitySpec || row.quantityRd) {
            // Сохраняем общие количества без этажей
            const { error: quantityError } = await supabase
              .from('chessboard_floor_mapping')
              .insert({
                chessboard_id: newRowId,
                floor_number: null,
                quantityPd: row.quantityPd ? Number(row.quantityPd) : null,
                quantitySpec: row.quantitySpec ? Number(row.quantitySpec) : null,
                quantityRd: row.quantityRd ? Number(row.quantityRd) : null
              })

            if (quantityError) {
              throw quantityError
            }
          }
        }
      }

      // Сохранение отредактированных строк
      for (const [rowId, updates] of editedRows.entries()) {

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

            // Ищем существующий материал (поле uuid, а не id!)
            const { data: existingMaterial, error: findError } = await supabase
              .from('materials')
              .select('uuid')
              .eq('name', materialName)
              .single()

            if (findError && findError.code !== 'PGRST116') {
              throw findError
            }

            let materialId: string
            if (existingMaterial) {
              // Материал найден
              materialId = existingMaterial.uuid
            } else {
              // Создаем новый материал
              const { data: newMaterial, error: createError } = await supabase
                .from('materials')
                .insert({ name: materialName })
                .select('uuid')
                .single()

              if (createError) {
                throw createError
              }

              materialId = newMaterial.uuid
            }

            chessboardUpdateData.material = materialId
          } else {
            chessboardUpdateData.material = null
          }
        }
        if (updates.materialType !== undefined) {
          chessboardUpdateData.material_type = updates.materialType
        }
        // ИСПРАВЛЕНИЕ: floors и floorQuantities сохраняются в отдельной таблице chessboard_floor_mapping
        // Не пытаемся сохранить их в основную таблицу chessboard

        // Обновляем updated_at
        chessboardUpdateData.updated_at = new Date().toISOString()


        // Обновляем основную таблицу только если есть что обновлять
        if (Object.keys(chessboardUpdateData).length > 1) { // > 1 потому что updated_at всегда есть
          const chessboardPromise = supabase.from('chessboard').update(chessboardUpdateData).eq('id', rowId)
          promises.push(chessboardPromise)
        }

        // Обновляем mapping таблицу для остальных полей (с правильными типами данных)
        const mappingUpdateData: any = {}
        if (updates.blockId !== undefined) {
          mappingUpdateData.block_id = updates.blockId || null
        } else if (updates.block !== undefined) {
          // Если пришло название блока вместо ID - используем его как ID (блоки могут быть UUID)
          mappingUpdateData.block_id = updates.block || null
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

          // Проверяем существование записи и затем update или insert
          const mappingPromise = supabase
            .from('chessboard_mapping')
            .select('id')
            .eq('chessboard_id', rowId)
            .maybeSingle()
            .then(async ({ data: existingMapping, error: selectError }) => {
              if (selectError) {
                throw selectError
              }

              if (existingMapping) {
                // Обновляем существующую запись
                const { error: updateError } = await supabase
                  .from('chessboard_mapping')
                  .update(mappingUpdateData)
                  .eq('chessboard_id', rowId)

                if (updateError) {
                  throw updateError
                }
              } else {
                // Создаем новую запись
                const { error: insertError } = await supabase
                  .from('chessboard_mapping')
                  .insert({ ...mappingUpdateData, chessboard_id: rowId })

                if (insertError) {
                  throw insertError
                }
              }
            })

          promises.push(mappingPromise)
        }

        // Обновляем documentation mapping для полей документации

        if (updates.documentationSectionId !== undefined || updates.documentationCodeId !== undefined) {

          // Сначала удаляем старые связи
          promises.push(
            supabase.from('chessboard_documentation_mapping').delete().eq('chessboard_id', rowId)
          )

          // Добавляем новую связь - используется documentationVersionId как version_id
          // В таблице chessboard_documentation_mapping есть только поле version_id
          if (updates.documentationVersionId) {
            promises.push(
              supabase.from('chessboard_documentation_mapping').insert({
                chessboard_id: rowId,
                version_id: updates.documentationVersionId
              })
            )
          } else if (updates.documentationCodeId) {
            // Fallback: если версия не выбрана, но выбран документ, используем documentationCodeId
            promises.push(
              supabase.from('chessboard_documentation_mapping').insert({
                chessboard_id: rowId,
                version_id: updates.documentationCodeId
              })
            )
          } else {
          }
        }

        // Обновляем floors mapping для этажей и количеств
        if (updates.floors !== undefined || updates.floorQuantities !== undefined ||
            updates.quantityPd !== undefined || updates.quantitySpec !== undefined || updates.quantityRd !== undefined) {

          // Создаем функцию обновления этажей и количеств
          const updateFloorsPromise = async () => {
            try {
              // 1. Сначала получаем существующие данные этажей
              const { data: existingFloors } = await supabase
                .from('chessboard_floor_mapping')
                .select('*')
                .eq('chessboard_id', rowId)


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


              if (floorsString && floorsString.trim()) {
                // Обработка с указанными этажами
                const floors = parseFloorsFromString(floorsString)

                if (floors.length > 0) {
                  // КРИТИЧНО: При указании этажей удаляем ВСЕ существующие записи для данной строки
                  // (включая записи с floor_number = null - количества без этажей)
                  const { error: deleteError } = await supabase
                    .from('chessboard_floor_mapping')
                    .delete()
                    .eq('chessboard_id', rowId) // Удаляем все записи для данной строки

                  if (deleteError) {
                    throw deleteError
                  }

                  // Теперь создаем новые записи для указанных этажей
                  const totalFloors = floors.length
                  const newFloorRecords = floors.map(floor => {
                    // Находим существующую запись для этого этажа для сохранения неизменных значений
                    const existingFloorRecord = existingFloors?.find(f => f.floor_number === floor)

                    const floorQuantityData = {
                      // ПРИОРИТЕТ: прямые изменения количеств (с равномерным распределением), затем floorQuantities, затем существующие значения
                      quantityPd: hasDirectQuantityUpdates && updates.quantityPd !== undefined
                        ? (updates.quantityPd ? Number(updates.quantityPd) / totalFloors : null)
                        : (floorQuantities?.[floor]?.quantityPd
                          ? Number(floorQuantities[floor].quantityPd)
                          : (existingFloorRecord?.quantityPd || null)),
                      quantitySpec: hasDirectQuantityUpdates && updates.quantitySpec !== undefined
                        ? (updates.quantitySpec ? Number(updates.quantitySpec) / totalFloors : null)
                        : (floorQuantities?.[floor]?.quantitySpec
                          ? Number(floorQuantities[floor].quantitySpec)
                          : (existingFloorRecord?.quantitySpec || null)),
                      quantityRd: hasDirectQuantityUpdates && updates.quantityRd !== undefined
                        ? (updates.quantityRd ? Number(updates.quantityRd) / totalFloors : null)
                        : (floorQuantities?.[floor]?.quantityRd
                          ? Number(floorQuantities[floor].quantityRd)
                          : (existingFloorRecord?.quantityRd || null)),
                    }


                    return {
                      chessboard_id: rowId,
                      floor_number: floor,
                      ...floorQuantityData
                    }
                  })


                  const { error: insertError } = await supabase
                    .from('chessboard_floor_mapping')
                    .insert(newFloorRecords)

                  if (insertError) {
                    throw insertError
                  }

                }
              } else if (hasExistingFloors && hasDirectQuantityUpdates) {
                // НОВАЯ СЕКЦИЯ: Есть существующие этажи в БД, но поле floors не передано
                // Обновляем количества для существующих этажей

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


                const { error: insertError } = await supabase
                  .from('chessboard_floor_mapping')
                  .insert(updatedFloorRecords)

                if (insertError) {
                                    throw insertError
                }

                              } else if (hasDirectQuantityUpdates && (!floorsString || !floorsString.trim()) && !hasExistingFloors) {
                // Обработка количеств БЕЗ указания этажей - только если этажи НЕ указаны

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


                  const { error: updateError } = await supabase
                    .from('chessboard_floor_mapping')
                    .update(updateData)
                    .eq('id', existingRecord.id)

                  if (updateError) {
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


                  const { error: insertError } = await supabase
                    .from('chessboard_floor_mapping')
                    .insert(quantityMapping)

                  if (insertError) {
                    throw insertError
                  }
                }

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
              }
            } catch (error) {
              throw error
            }
          }

          promises.push(updateFloorsPromise())
        }

        // Обновляем nomenclature mapping для номенклатуры
        if (updates.nomenclatureId !== undefined || updates.supplier !== undefined) {

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
          // Сначала удаляем старую связь
          promises.push(
            supabase.from('chessboard_rates_mapping').delete().eq('chessboard_id', rowId)
          )
          // Если есть rateId, создаём новую связь
          const rateId = updates.rateId !== undefined ? updates.rateId : null
          const workSetId = updates.workSetId !== undefined ? updates.workSetId : null
          if (rateId) {
            promises.push(
              supabase.from('chessboard_rates_mapping').insert({
                chessboard_id: rowId,
                rate_id: rateId,
                work_set: workSetId
              })
            )
          }
        }
      }

      // Сохранение строк в режиме backup редактирования (полная логика)
      for (const [rowId, editedRowData] of Object.entries(editingRows)) {

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

          const mappingPromise = supabase
            .from('chessboard_mapping')
            .select('id')
            .eq('chessboard_id', rowId)
            .maybeSingle()
            .then(async ({ data: existingMapping, error: selectError }) => {
              if (selectError) {
                throw selectError
              }

              if (existingMapping) {
                const { error: updateError } = await supabase
                  .from('chessboard_mapping')
                  .update(mappingUpdateData)
                  .eq('chessboard_id', rowId)

                if (updateError) throw updateError
              } else {
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
        if (editedRowData.rateId !== undefined || editedRowData.workName !== undefined || editedRowData.workSetId !== undefined) {
          promises.push(
            supabase.from('chessboard_rates_mapping').delete().eq('chessboard_id', rowId)
          )
          const rateId = editedRowData.rateId
          const workSetId = editedRowData.workSetId
          if (rateId) {
            promises.push(
              supabase.from('chessboard_rates_mapping').insert({
                chessboard_id: rowId,
                rate_id: rateId,
                work_set: workSetId
              })
            )
          }
        }

      }

      const results = await Promise.all(promises)

      // Проверяем результаты на ошибки
      results.forEach((result, index) => {
        // Проверяем, что result существует перед доступом к свойствам
        if (result && result.error) {
        } else if (result) {
        } else {
        }
      })

      // Обновляем кэш для перерисовки данных без перезагрузки

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
  }, [newRows, editedRows, editingRows, queryClient, setMode, message, data])

  // Отмена всех изменений
  const cancelChanges = useCallback(() => {
    setNewRows([])
    setEditedRows(new Map())
    setEditingRows({})
    setMode('view')
  }, [setMode])

  // Удаление одной строки (каскадное)
  const deleteSingleRow = useCallback(async (rowId: string) => {
    try {
      const { error } = await supabase
        .from('chessboard')
        .delete()
        .eq('id', rowId)

      if (error) {
        message.error(`Ошибка удаления строки: ${error.message}`)
        return false
      }

      message.success('Строка успешно удалена')
      // Обновляем данные
      if (refetch) {
        await refetch()
      } else {
        // Fallback: invalidate всех queries, которые начинаются с 'chessboard-'
        await queryClient.invalidateQueries({ queryKey: ['chessboard-'] })
      }
      return true
    } catch (error) {
      message.error('Произошла ошибка при удалении строки')
      return false
    }
  }, [refetch, message, queryClient])

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
      if (edits) {
        return {
          ...row,
          ...edits,
          isEditing: tableMode.mode === 'edit' || tableMode.mode === 'add'
        }
      }
      return row
    })

    // Если нет новых строк, возвращаем данные с редактированием
    if (newRows.length === 0) {
      return dataWithEdits
    }


    // ИСПРАВЛЕНИЕ: Создаем результирующий массив с правильным позиционированием
    let result = [...dataWithEdits] // Начинаем с существующих данных

    // Разделяем новые строки по типу позиционирования
    const firstRows = newRows.filter(row => row._insertPosition === 'first')
    const afterRows = newRows.filter(row => row._insertPosition === 'after')


    // Сначала добавляем строки 'first' в начало
    for (const newRow of firstRows) {
      result.unshift({ ...newRow, isEditing: tableMode.mode === 'add' })
    }

    // Затем добавляем строки 'after' - важно: обрабатываем в обратном порядке индексов,
    // чтобы при вставке не сдвигались позиции следующих строк
    const sortedAfterRows = afterRows.sort((a, b) => {
      const aIndex = a._afterRowIndex ?? -1
      const bIndex = b._afterRowIndex ?? -1
      return bIndex - aIndex // ОБРАТНЫЙ порядок для правильной вставки
    })


    // Вставляем строки 'after'
    for (const newRow of sortedAfterRows) {
      if (typeof newRow._afterRowIndex === 'number') {
        const originalRowIndex = newRow._afterRowIndex

        // ИСПРАВЛЕНИЕ: Обработка специального значения -1 (вставка в самое начало)
        const insertPosition = originalRowIndex === -1
          ? 1 // Вставляем после первой firstRow, если есть, или в самое начало
          : originalRowIndex + firstRows.length + 1


        if (insertPosition <= result.length) {
          result.splice(insertPosition, 0, { ...newRow, isEditing: tableMode.mode === 'add' })
        } else {
          // Если позиция за пределами, добавляем в конец
          result.push({ ...newRow, isEditing: tableMode.mode === 'add' })
        }
      } else {
        // По умолчанию добавляем в конец
        result.push({ ...newRow, isEditing: tableMode.mode === 'add' })
      }
    }


    return result
  }, [editedRows, newRows, editingRows, tableMode.mode])

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
    deleteSingleRow,

    // Утилиты
    getDisplayData,
  }
}
