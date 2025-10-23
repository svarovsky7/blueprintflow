import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import type { Key } from 'react'
import { supabase } from '@/lib/supabase'
import { getOrCreateWorkSet, createWorkSetRate } from '@/entities/rates/api'
import { setCurrentUser } from '@/entities/chessboard'
import type { TableMode, RowData, RowColor, AppliedFilters } from '../types'
import { parseFloorsFromString } from '../utils/floors'

export const useTableOperations = (refetch?: () => void, data: RowData[] = [], appliedFilters?: AppliedFilters) => {
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  // Получить текущего пользователя для setCurrentUser
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    fetchUser()
  }, [])

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
  const addNewRow = useCallback(async (
    projectId: string,
    appliedFilters: AppliedFilters,
    insertPosition: 'first' | 'after' = 'first',
    afterRowIndex?: number,
    selectedVersions?: Record<string, string>
  ) => {
    if (!projectId) {
      message.warning('Выберите проект для добавления строки')
      return
    }

    // Извлекаем первые элементы из фильтров
    const firstDocSectionId = appliedFilters.documentation_section_ids.length > 0 ? appliedFilters.documentation_section_ids[0] : ''
    const firstDocCodeId = appliedFilters.documentation_code_ids.length > 0 ? appliedFilters.documentation_code_ids[0] : ''
    const firstBlockId = appliedFilters.block_ids.length > 0 ? appliedFilters.block_ids[0] : ''
    const firstCostCategoryId = appliedFilters.cost_category_ids.length > 0 ? appliedFilters.cost_category_ids[0] : ''
    const firstCostTypeId = appliedFilters.detail_cost_category_ids.length > 0 ? appliedFilters.detail_cost_category_ids[0] : ''

    // Получаем названия для выбранных ID
    let docSectionName = ''
    let docCode = ''
    let docProjectName = ''
    let blockName = ''
    let costCategoryName = ''
    let costTypeName = ''

    if (firstDocSectionId) {
      const { data: sectionData } = await supabase
        .from('documentation_tags')
        .select('name')
        .eq('id', firstDocSectionId)
        .maybeSingle()
      if (sectionData) docSectionName = sectionData.name
    }

    if (firstDocCodeId) {
      const { data: docData } = await supabase
        .from('documentations')
        .select('code, project_name')
        .eq('id', firstDocCodeId)
        .maybeSingle()
      if (docData) {
        docCode = docData.code
        docProjectName = docData.project_name
      }
    }

    // Получаем версию документа
    let docVersionId = ''
    let docVersionNumber = ''
    
    if (firstDocCodeId) {
      // Сначала проверяем selectedVersions (выбор пользователя из модального окна)
      if (selectedVersions && selectedVersions[firstDocCodeId]) {
        docVersionId = selectedVersions[firstDocCodeId]
        
        // Получаем номер версии
        const { data: versionData } = await supabase
          .from('documentation_versions')
          .select('version_number')
          .eq('id', docVersionId)
          .maybeSingle()
        
        if (versionData) {
          docVersionNumber = versionData.version_number.toString()
        }
      } else {
        // Если версия не выбрана в модальном окне, загружаем последнюю версию
        const { data: latestVersion } = await supabase
          .from('documentation_versions')
          .select('id, version_number')
          .eq('documentation_id', firstDocCodeId)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (latestVersion) {
          docVersionId = latestVersion.id
          docVersionNumber = latestVersion.version_number.toString()
        }
      }
    }

    if (firstBlockId) {
      const { data: blockData } = await supabase
        .from('blocks')
        .select('name')
        .eq('id', firstBlockId)
        .maybeSingle()
      if (blockData) blockName = blockData.name
    }

    if (firstCostCategoryId) {
      const { data: categoryData } = await supabase
        .from('cost_categories')
        .select('name')
        .eq('id', firstCostCategoryId)
        .maybeSingle()
      if (categoryData) costCategoryName = categoryData.name
    }

    if (firstCostTypeId) {
      const { data: typeData } = await supabase
        .from('detail_cost_categories')
        .select('name')
        .eq('id', firstCostTypeId)
        .maybeSingle()
      if (typeData) costTypeName = typeData.name
    }

    const newRow: RowData = {
      id: `new-${Date.now()}-${Math.random()}`,
      project: '',
      projectId,
      // Данные из документации (заполняем из фильтров)
      documentationSection: docSectionName,
      documentationCode: docCode,
      documentationProjectName: docProjectName,
      documentationVersion: docVersionNumber,
      documentationVersionId: docVersionId,
      documentationCodeId: firstDocCodeId,
      // Данные из маппингов (заполняем из фильтров)
      block: blockName,
      blockId: firstBlockId,
      floors: '',
      costCategory: costCategoryName,
      costCategoryId: firstCostCategoryId,
      costType: costTypeName,
      costTypeId: firstCostTypeId,
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
      type: '',
      typeId: '',
      quantityPd: '',
      quantitySpec: '',
      quantityRd: '',
      conversionCoefficient: '', // Коэффициент пересчета
      convertedQuantity: '0', // Кол-во пересчет (расчетное)
      unitNomenclature: '', // Ед.Изм. Номенкл.
      unitNomenclatureId: '', // ID единицы измерения номенклатуры
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
  }, [tableMode.mode, message])

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
          // Получаем текущего пользователя напрямую, если currentUserId не загружен
          let userId = currentUserId
          if (!userId) {
            const { data: { user } } = await supabase.auth.getUser()
            userId = user?.id || null
          }

          const { error } = await supabase
            .from('chessboard')
            .update({ 
              color,
              updated_by: userId 
            })
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
    [tableMode.mode, updateNewRow, updateEditedRow, updateEditingRow, editingRows, queryClient, message, currentUserId],
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
        // Сортируем newRows для правильного порядка после перезагрузки:
        // 1. afterRows сохраняются первыми (более ранний created_at, будут ниже в таблице)
        // 2. firstRows сохраняются последними в ОБРАТНОМ порядке (последняя сохраненная
        //    first-строка получит самый поздний created_at и будет самой первой в таблице)
        const afterRows = newRows.filter(r => r._insertPosition === 'after')
        const firstRows = newRows.filter(r => r._insertPosition === 'first').reverse()
        const sortedNewRows = [...afterRows, ...firstRows]

        for (const row of sortedNewRows) {
          // 1. Сначала создаем запись в основной таблице chessboard (только основные поля БД)
          const chessboardData = {
            project_id: row.projectId,
            color: row.color || null,
            unit_id: row.unitId || null,
            material: row.materialId || null,
            material_type: row.materialType || 'База',
            type_id: row.typeId || null,
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

          // Добавляем поля авторов в данные для вставки
          const dataWithAuthors = {
            ...chessboardData,
            created_by: currentUserId,
            updated_by: currentUserId,
          }


          const { data: newChessboardRow, error: insertError } = await supabase
            .from('chessboard')
            .insert(dataWithAuthors)
            .select('id')
            .single()

          if (insertError) {
            throw insertError
          }

          const newRowId = newChessboardRow.id
          
          // Если мы работаем в контексте активного комплекта, добавляем новую строку в него
          if (appliedFilters?.set_ids && appliedFilters.set_ids.length > 0) {
            const mappingData = {
              set_id: appliedFilters.set_ids[0], // Берем первый (и единственный) активный комплект
              chessboard_id: newRowId,
              added_by: currentUserId,
              added_at: new Date().toISOString(),
            }

            const { error: mappingSetError } = await supabase.from('chessboard_sets_rows_mapping').insert(mappingData)
            
            if (mappingSetError) {
                console.error('Failed to map new row to the active set:', mappingSetError)
                message.warning(`Не удалось добавить строку в комплект: ${mappingSetError.message}`)
            }
          }


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

          // 4. Создаем связи с номенклатурой через supplier_names_id
          if (row.supplier && row.supplier.trim()) {
            // Ищем supplier_names_id по названию поставщика
            const { data: supplierData, error: supplierError } = await supabase
              .from('supplier_names')
              .select('id')
              .eq('name', row.supplier.trim())
              .maybeSingle()

            if (supplierError) {
              throw supplierError
            }

            if (supplierData) {
              const { error: nomError } = await supabase
                .from('chessboard_nomenclature_mapping')
                .insert({
                  chessboard_id: newRowId,
                  supplier_names_id: supplierData.id,
                  conversion_coefficient: row.conversionCoefficient ? Number(row.conversionCoefficient) : null
                })

              if (nomError) {
                throw nomError
              }
            }
          }

          // 5. Создаем связи с расценками
          if (row.rateId || row.workName || row.workSet) {
            let finalWorkSetRateId = row.rateId // rateId теперь это work_set_rate_id

            // Если есть workName и workSet, но нет rateId, создаем новую расценку
            if (row.workName && row.workName.trim() && row.workSet && row.workSet.trim() && !finalWorkSetRateId) {
              const workNameValue = row.workName.trim()
              const workSetValue = row.workSet.trim()

              // Получаем или создаем work_set
              const workSetRecord = await getOrCreateWorkSet(workSetValue)

              // Создаем новую расценку в work_set_rates
              const newWorkSetRate = await createWorkSetRate({
                work_set_id: workSetRecord.id,
                work_name_id: row.workNameId || '', // Должен быть получен из dropdown
                base_rate: 0,
                unit_id: row.unitId || null,
                active: true,
              })

              finalWorkSetRateId = newWorkSetRate.id
            }

            // Создаем mapping только если есть finalWorkSetRateId
            if (finalWorkSetRateId) {
              const { error: rateError } = await supabase
                .from('chessboard_rates_mapping')
                .insert({
                  chessboard_id: newRowId,
                  work_set_rate_id: finalWorkSetRateId,
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
        if (updates.typeId !== undefined) {
          chessboardUpdateData.type_id = updates.typeId || null
        }
        // ИСПРАВЛЕНИЕ: floors и floorQuantities сохраняются в отдельной таблице chessboard_floor_mapping
        // Не пытаемся сохранить их в основную таблицу chessboard

        // Обновляем updated_at
        chessboardUpdateData.updated_at = new Date().toISOString()


        // Получаем текущего пользователя напрямую, если currentUserId не загружен
        let userId = currentUserId
        if (!userId) {
          const { data: { user } } = await supabase.auth.getUser()
          userId = user?.id || null
        }

        // Примечание: setCurrentUser больше не нужен, так как триггер удален

        // Всегда обновляем основную таблицу, чтобы обновить updated_by и updated_at
        const chessboardPromise = async () => {
          // Добавляем поле updated_by в данные для обновления
          // Исключаем created_by из обновления (оно должно оставаться неизменным)
          const { created_by, ...dataWithoutCreatedBy } = chessboardUpdateData
          const dataWithAuthor = {
            ...dataWithoutCreatedBy,
            updated_by: userId,
          }


          const { data, error } = await supabase
            .from('chessboard')
            .update(dataWithAuthor)
            .eq('id', rowId)
            .select('id, created_by, updated_by, updated_at')

          if (error) {
            throw error
          }
          return { data, error }
        }
        promises.push(chessboardPromise())

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

          // Создаем новые связи
          if (updates.documentationVersionId) {
            promises.push(
              supabase
                .from('chessboard_documentation_mapping')
                .insert({
                  chessboard_id: rowId,
                  version_id: updates.documentationVersionId
                })
            )
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


              // Сценарий 1: Указаны новые этажи (строка с этажами)
              if (floorsString && floorsString.trim()) {

                const floors = parseFloorsFromString(floorsString)

                if (floors.length > 0) {
                  // При указании этажей удаляем ВСЕ существующие записи для данной строки
                  const { error: deleteError } = await supabase
                    .from('chessboard_floor_mapping')
                    .delete()
                    .eq('chessboard_id', rowId)

                  if (deleteError) {
                    throw deleteError
                  }

                  // Создаем новые записи для указанных этажей
                  const totalFloors = floors.length
                  const newFloorRecords = floors.map(floor => {
                    const existingFloorRecord = existingFloors?.find(f => f.floor_number === floor)

                    // Определяем количества для каждого нового этажа
                    const floorQuantityData = {
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
                // Сценарий 2: Этажи не указаны, но есть существующие этажи в БД и обновлены количества
                // Удаляем старые записи
                const { error: deleteError } = await supabase
                  .from('chessboard_floor_mapping')
                  .delete()
                  .eq('chessboard_id', rowId)

                if (deleteError) {
                  throw deleteError
                }

                // Перераспределяем новые количества по существующим этажам
                const totalFloors = existingFloorsWithNumbers.length
                const updatedFloorRecords = existingFloorsWithNumbers.map(existingFloor => {
                  return {
                    chessboard_id: rowId,
                    floor_number: existingFloor.floor_number,
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
                // Сценарий 3: Нет этажей (ни в updates, ни в БД), но обновлены количества
                const existingRecord = existingFloors?.find(floor => floor.floor_number === null)

                if (existingRecord) {
                  // Обновляем существующую запись без этажей
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
                  // Создаем новую запись без этажей
                  const quantityMapping = {
                    chessboard_id: rowId,
                    floor_number: null,
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
                // Сценарий 4: Существующие этажи удалены (переход от этажей к количествам без этажей)
                // Суммируем количества по существующим этажам
                const totalQuantities = existingFloorsWithNumbers.reduce((totals, floor) => {
                  return {
                    quantityPd: (totals.quantityPd || 0) + (floor.quantityPd || 0),
                    quantitySpec: (totals.quantitySpec || 0) + (floor.quantitySpec || 0),
                    quantityRd: (totals.quantityRd || 0) + (floor.quantityRd || 0),
                  }
                }, { quantityPd: 0, quantitySpec: 0, quantityRd: 0 })

                // Удаляем ВСЕ существующие записи
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
        // КРИТИЧНО: проверяем явное изменение, а не просто наличие ключа в updates
        if (updates.nomenclatureId !== undefined || updates.supplier !== undefined || updates.conversionCoefficient !== undefined) {
          const nomenclatureId = updates.nomenclatureId
          const supplierName = updates.supplier

          if (supplierName) {
            // Сначала удаляем старую связь, затем создаем новую с supplier_names_id
            const nomenclaturePromise = async () => {
              // Удаляем существующую связь
              await supabase
                .from('chessboard_nomenclature_mapping')
                .delete()
                .eq('chessboard_id', rowId)

              // Ищем supplier_names_id по имени поставщика
              const { data: supplierData, error: supplierError } = await supabase
                .from('supplier_names')
                .select('id')
                .eq('name', supplierName.trim())
                .maybeSingle()

              if (supplierError) throw supplierError

              if (supplierData) {
                // Создаем новую связь
                const { error } = await supabase
                  .from('chessboard_nomenclature_mapping')
                  .insert({
                    chessboard_id: rowId,
                    supplier_names_id: supplierData.id,
                    conversion_coefficient: updates.conversionCoefficient ? Number(updates.conversionCoefficient) : null
                  })

                if (error) throw error
              }
            }
            promises.push(nomenclaturePromise())
          } else if (supplierName === null || supplierName === '') {
            // ТОЛЬКО если nomenclatureId явно установлен в null или пустую строку - удаляем связь
            promises.push(
              supabase.from('chessboard_nomenclature_mapping').delete().eq('chessboard_id', rowId)
            )
          } else if (updates.conversionCoefficient !== undefined) {
            // Обновляем только коэффициент для существующей записи
            const nomenclaturePromise = async () => {
              const { error } = await supabase
                .from('chessboard_nomenclature_mapping')
                .update({
                  conversion_coefficient: updates.conversionCoefficient ? Number(updates.conversionCoefficient) : null
                })
                .eq('chessboard_id', rowId)

              if (error) throw error
            }
            promises.push(nomenclaturePromise())
          }
          // Если nomenclatureId === undefined - НЕ трогаем существующую связь!
        }

        // Обновляем rates mapping для наименования работ
        if (updates.rateId !== undefined || updates.workName !== undefined) {
          const workSetRateId = updates.rateId !== undefined ? updates.rateId : null

          if (workSetRateId) {
            // Сначала удаляем старую связь, затем создаем новую
            const ratesPromise = async () => {
              await supabase
                .from('chessboard_rates_mapping')
                .delete()
                .eq('chessboard_id', rowId)

              const { error } = await supabase
                .from('chessboard_rates_mapping')
                .insert({
                  chessboard_id: rowId,
                  work_set_rate_id: workSetRateId,
                })

              if (error) throw error
            }
            promises.push(ratesPromise())
          } else {
            // Если workSetRateId пустой, удаляем связь
            promises.push(
              supabase.from('chessboard_rates_mapping').delete().eq('chessboard_id', rowId)
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
        // КРИТИЧНО: используем materialId (UUID), а не material (название)
        if (editedRowData.materialId !== undefined) {
          chessboardUpdateData.material = editedRowData.materialId || null
        }
        if (editedRowData.typeId !== undefined) {
          chessboardUpdateData.type_id = editedRowData.typeId || null
        }

        chessboardUpdateData.updated_at = new Date().toISOString()


        // Получаем текущего пользователя напрямую, если currentUserId не загружен (backup режим)
        let userId = currentUserId
        if (!userId) {
          const { data: { user } } = await supabase.auth.getUser()
          userId = user?.id || null
        }

        // Примечание: setCurrentUser больше не нужен, так как триггер удален (backup режим)

        // Всегда обновляем основную таблицу, чтобы обновить updated_by и updated_at (backup режим)
        const chessboardBackupPromise = async () => {
          // Добавляем поле updated_by в данные для обновления (backup режим)
          // Исключаем created_by из обновления (оно должно оставаться неизменным)
          const { created_by, ...dataWithoutCreatedBy } = chessboardUpdateData
          const dataWithAuthor = {
            ...dataWithoutCreatedBy,
            updated_by: userId,
          }


          const { data, error } = await supabase
            .from('chessboard')
            .update(dataWithAuthor)
            .eq('id', rowId)
            .select('id, created_by, updated_by, updated_at')

          if (error) {
            throw error
          }
          return { data, error }
        }
        promises.push(chessboardBackupPromise())

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

        // Обновляем floors mapping для этажей и количеств (BACKUP режим)
        if (editedRowData.floors !== undefined || editedRowData.floorQuantities !== undefined ||
            editedRowData.quantityPd !== undefined || editedRowData.quantitySpec !== undefined || editedRowData.quantityRd !== undefined) {

          // Создаем функцию обновления этажей и количеств для backup режима
          const updateFloorsPromise = async () => {
            try {
              // 1. Сначала получаем существующие данные этажей
              const { data: existingFloors } = await supabase
                .from('chessboard_floor_mapping')
                .select('*')
                .eq('chessboard_id', rowId)

              // 2. Проверяем, есть ли этажи или количества для обработки
              const floorsString = editedRowData.floors !== undefined ? editedRowData.floors : ''
              const floorQuantities = editedRowData.floorQuantities || {}

              // Проверяем, есть ли прямые изменения количеств (без этажей)
              const hasDirectQuantityUpdates = editedRowData.quantityPd !== undefined ||
                                               editedRowData.quantitySpec !== undefined ||
                                               editedRowData.quantityRd !== undefined

              // Проверяем, есть ли существующие этажи в БД (кроме записей с floor_number = null)
              const existingFloorsWithNumbers = existingFloors?.filter(floor => floor.floor_number !== null) || []
              const hasExistingFloors = existingFloorsWithNumbers.length > 0

              if (floorsString && floorsString.trim()) {
                // Обработка с указанными этажами
                const floors = parseFloorsFromString(floorsString)

                if (floors.length > 0) {
                  // При указании этажей удаляем ВСЕ существующие записи для данной строки
                  const { error: deleteError } = await supabase
                    .from('chessboard_floor_mapping')
                    .delete()
                    .eq('chessboard_id', rowId)

                  if (deleteError) {
                    throw deleteError
                  }

                  // Создаем новые записи для указанных этажей
                  const totalFloors = floors.length
                  const newFloorRecords = floors.map(floor => {
                    const existingFloorRecord = existingFloors?.find(f => f.floor_number === floor)

                    const floorQuantityData = {
                      quantityPd: hasDirectQuantityUpdates && editedRowData.quantityPd !== undefined
                        ? (editedRowData.quantityPd ? Number(editedRowData.quantityPd) / totalFloors : null)
                        : (floorQuantities?.[floor]?.quantityPd
                          ? Number(floorQuantities[floor].quantityPd)
                          : (existingFloorRecord?.quantityPd || null)),
                      quantitySpec: hasDirectQuantityUpdates && editedRowData.quantitySpec !== undefined
                        ? (editedRowData.quantitySpec ? Number(editedRowData.quantitySpec) / totalFloors : null)
                        : (floorQuantities?.[floor]?.quantitySpec
                          ? Number(floorQuantities[floor].quantitySpec)
                          : (existingFloorRecord?.quantitySpec || null)),
                      quantityRd: hasDirectQuantityUpdates && editedRowData.quantityRd !== undefined
                        ? (editedRowData.quantityRd ? Number(editedRowData.quantityRd) / totalFloors : null)
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
                // Есть существующие этажи в БД, обновляем количества для них
                const { error: deleteError } = await supabase
                  .from('chessboard_floor_mapping')
                  .delete()
                  .eq('chessboard_id', rowId)

                if (deleteError) {
                  throw deleteError
                }

                const totalFloors = existingFloorsWithNumbers.length
                const updatedFloorRecords = existingFloorsWithNumbers.map(existingFloor => {
                  return {
                    chessboard_id: rowId,
                    floor_number: existingFloor.floor_number,
                    quantityPd: hasDirectQuantityUpdates && editedRowData.quantityPd !== undefined
                      ? (editedRowData.quantityPd ? Number(editedRowData.quantityPd) / totalFloors : null)
                      : (existingFloor.quantityPd || null),
                    quantitySpec: hasDirectQuantityUpdates && editedRowData.quantitySpec !== undefined
                      ? (editedRowData.quantitySpec ? Number(editedRowData.quantitySpec) / totalFloors : null)
                      : (existingFloor.quantitySpec || null),
                    quantityRd: hasDirectQuantityUpdates && editedRowData.quantityRd !== undefined
                      ? (editedRowData.quantityRd ? Number(editedRowData.quantityRd) / totalFloors : null)
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
                // Обработка количеств БЕЗ указания этажей
                const existingRecord = existingFloors?.find(floor => floor.floor_number === null)

                if (existingRecord) {
                  // Обновляем существующую запись
                  const updateData: any = {}

                  if (editedRowData.quantityPd !== undefined) {
                    updateData.quantityPd = editedRowData.quantityPd ? Number(editedRowData.quantityPd) : null
                  }
                  if (editedRowData.quantitySpec !== undefined) {
                    updateData.quantitySpec = editedRowData.quantitySpec ? Number(editedRowData.quantitySpec) : null
                  }
                  if (editedRowData.quantityRd !== undefined) {
                    updateData.quantityRd = editedRowData.quantityRd ? Number(editedRowData.quantityRd) : null
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
                    floor_number: null,
                    quantityPd: editedRowData.quantityPd !== undefined
                      ? (editedRowData.quantityPd ? Number(editedRowData.quantityPd) : null)
                      : null,
                    quantitySpec: editedRowData.quantitySpec !== undefined
                      ? (editedRowData.quantitySpec ? Number(editedRowData.quantitySpec) : null)
                      : null,
                    quantityRd: editedRowData.quantityRd !== undefined
                      ? (editedRowData.quantityRd ? Number(editedRowData.quantityRd) : null)
                      : null,
                  }

                  const { error: insertError } = await supabase
                    .from('chessboard_floor_mapping')
                    .insert(quantityMapping)

                  if (insertError) {
                    throw insertError
                  }
                }
              } else if (hasExistingFloors && editedRowData.floors !== undefined && (!floorsString || !floorsString.trim())) {
                // Удаление этажей - переход от этажей к количествам без этажей
                const totalQuantities = existingFloorsWithNumbers.reduce((totals, floor) => {
                  return {
                    quantityPd: (totals.quantityPd || 0) + (floor.quantityPd || 0),
                    quantitySpec: (totals.quantitySpec || 0) + (floor.quantitySpec || 0),
                    quantityRd: (totals.quantityRd || 0) + (floor.quantityRd || 0),
                  }
                }, { quantityPd: 0, quantitySpec: 0, quantityRd: 0 })

                const { error: deleteError } = await supabase
                  .from('chessboard_floor_mapping')
                  .delete()
                  .eq('chessboard_id', rowId)

                if (deleteError) {
                  throw deleteError
                }

                const nullFloorRecord = {
                  chessboard_id: rowId,
                  floor_number: null,
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
              }
            } catch (error) {
              throw error
            }
          }

          promises.push(updateFloorsPromise())
        }

        // Обновляем nomenclature mapping для backup строки
        // КРИТИЧНО: проверяем явное изменение, а не просто наличие ключа в editedRowData
        if (editedRowData.nomenclatureId !== undefined || editedRowData.supplier !== undefined || editedRowData.conversionCoefficient !== undefined) {
          const nomenclatureId = editedRowData.nomenclatureId
          const supplierName = editedRowData.supplier

          if (supplierName) {
            // Сначала удаляем старую связь, затем создаем новую с supplier_names_id
            const nomenclaturePromise = async () => {
              // Удаляем существующую связь
              await supabase
                .from('chessboard_nomenclature_mapping')
                .delete()
                .eq('chessboard_id', rowId)

              // Ищем supplier_names_id по имени поставщика
              const { data: supplierData, error: supplierError } = await supabase
                .from('supplier_names')
                .select('id')
                .eq('name', supplierName.trim())
                .maybeSingle()

              if (supplierError) throw supplierError

              if (supplierData) {
                // Создаем новую связь
                const { error } = await supabase
                  .from('chessboard_nomenclature_mapping')
                  .insert({
                    chessboard_id: rowId,
                    supplier_names_id: supplierData.id,
                    conversion_coefficient: editedRowData.conversionCoefficient ? Number(editedRowData.conversionCoefficient) : null
                  })

                if (error) throw error
              }
            }
            promises.push(nomenclaturePromise())
          } else if (supplierName === null || supplierName === '') {
            // ТОЛЬКО если supplierName явно установлен в null или пустую строку - удаляем связь
            promises.push(
              supabase.from('chessboard_nomenclature_mapping').delete().eq('chessboard_id', rowId)
            )
          } else if (editedRowData.conversionCoefficient !== undefined) {
            // Обновляем только коэффициент для существующей записи
            const nomenclaturePromise = async () => {
              const { error } = await supabase
                .from('chessboard_nomenclature_mapping')
                .update({
                  conversion_coefficient: editedRowData.conversionCoefficient ? Number(editedRowData.conversionCoefficient) : null
                })
                .eq('chessboard_id', rowId)

              if (error) throw error
            }
            promises.push(nomenclaturePromise())
          }
          // Если nomenclatureId === undefined - НЕ трогаем существующую связь!
        }

        // Обновляем rates mapping для backup строки
        if (editedRowData.rateId !== undefined || editedRowData.workName !== undefined || editedRowData.workSetId !== undefined) {
          const workSetRateId = editedRowData.rateId

          if (workSetRateId) {
            // Сначала удаляем старую связь, затем создаем новую
            const ratesPromise = async () => {
              await supabase
                .from('chessboard_rates_mapping')
                .delete()
                .eq('chessboard_id', rowId)

              const { error } = await supabase
                .from('chessboard_rates_mapping')
                .insert({
                  chessboard_id: rowId,
                  work_set_rate_id: workSetRateId,
                })

              if (error) throw error
            }
            promises.push(ratesPromise())
          } else {
            // Если workSetRateId пустой, удаляем связь
            promises.push(
              supabase.from('chessboard_rates_mapping').delete().eq('chessboard_id', rowId)
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
    } catch (error: any) {
      console.error('Error saving changes:', error)
      message.error(`Ошибка при сохранении изменений: ${error.message}`)
    }
  }, [newRows, editedRows, editingRows, queryClient, setMode, message, data, currentUserId, appliedFilters])

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
      // Устанавливаем текущего пользователя перед DELETE из chessboard
      if (currentUserId) {
        await setCurrentUser(currentUserId)
      }

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
  }, [refetch, message, queryClient, currentUserId])

  // Удаление выбранных строк
  const deleteSelectedRows = useCallback(async () => {
    if (tableMode.selectedRowKeys.length === 0) {
      message.warning('Выберите строки для удаления')
      return
    }

    try {
      // Устанавливаем текущего пользователя перед DELETE из chessboard
      if (currentUserId) {
        await setCurrentUser(currentUserId)
      }

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
  }, [tableMode.selectedRowKeys, queryClient, setMode, currentUserId])

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
