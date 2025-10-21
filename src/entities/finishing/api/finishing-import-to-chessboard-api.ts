import { supabase } from '@/lib/supabase'
import type {
  ImportToChessboardResult,
  ValidationError,
  FinishingPieRow,
} from '../model/types'
import {
  getFinishingPieById,
  getFinishingPieRows,
} from './finishing-pie-api'
import {
  getTypeCalculationRows,
  getTypeCalculationFloors,
} from '@/entities/calculation/api/type-calculation-api'
import type { TypeCalculationRow, TypeCalculationFloor } from '@/entities/calculation/model/types'
import { chessboardSetsApi } from '@/entities/chessboard/api/chessboard-sets-api'
import type { CreateChessboardSetRequest } from '@/entities/chessboard/types'

interface PreparedImportItem {
  project_id: string
  cost_category_id: number
  documentation_tag_id: number | null
  version_id: string | null
  block_id: string | null
  location_id: number | null
  material_id: string
  unit_id: string
  detail_cost_category_id: number
  work_name_id: string | null
  work_set_rate_id: string | null
  conversion_coefficient: number | null
  supplier_names_id: string | null
  finishing_pie_type_id: string | null
  floors: Array<{
    floor_number: number
    quantityPd: number
    quantitySpec: number
    quantityRd: number
    location_id: number | null
  }>
}

async function validateRequiredFields(
  pieRows: FinishingPieRow[]
): Promise<{ valid: boolean; invalidRows: ValidationError[] }> {
  const invalidRows: ValidationError[] = []

  pieRows.forEach((row, index) => {
    const errors: string[] = []

    if (!row.pie_type_id) errors.push('Тип')
    if (!row.material_id) errors.push('Наименование материала')
    if (!row.unit_id) errors.push('Ед.Изм.')
    if (!row.detail_cost_category_id) errors.push('Вид затрат')

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber: index + 1,
        pieTypeName: row.pie_type_name || '[не указан]',
        materialName: row.material_name || '[не указан]',
        unitName: row.unit_name || '[не указан]',
        detailCostCategoryName: row.detail_cost_category_name || '[не указан]',
        missingFields: errors,
      })
    }
  })

  return {
    valid: invalidRows.length === 0,
    invalidRows,
  }
}

function validateConsumption(pieRows: FinishingPieRow[]): {
  valid: boolean
  rowsWithInvalidConsumption: Array<{
    rowNumber: number
    pieTypeName: string
    materialName: string
    issue: string
  }>
} {
  const rowsWithInvalidConsumption: Array<{
    rowNumber: number
    pieTypeName: string
    materialName: string
    issue: string
  }> = []

  pieRows.forEach((row, index) => {
    if (row.consumption === 0) {
      rowsWithInvalidConsumption.push({
        rowNumber: index + 1,
        pieTypeName: row.pie_type_name || '[не указан]',
        materialName: row.material_name || '[не указан]',
        issue: 'Значение 0',
      })
    } else if (row.consumption === null || row.consumption === undefined) {
      rowsWithInvalidConsumption.push({
        rowNumber: index + 1,
        pieTypeName: row.pie_type_name || '[не указан]',
        materialName: row.material_name || '[не указан]',
        issue: 'Значение не указано',
      })
    }
  })

  return {
    valid: rowsWithInvalidConsumption.length === 0,
    rowsWithInvalidConsumption,
  }
}

async function getDocumentationCode(versionId: string): Promise<string | null> {
  try {
    const { data: versionData, error: versionError } = await supabase
      .from('documentation_versions')
      .select('documentation_id')
      .eq('id', versionId)
      .maybeSingle()

    if (versionError || !versionData) {
      console.error('Ошибка загрузки версии документа:', versionError)
      return null
    }

    const { data: docData, error: docError } = await supabase
      .from('documentations')
      .select('code')
      .eq('id', versionData.documentation_id)
      .maybeSingle()

    if (docError || !docData) {
      console.error('Ошибка загрузки документа:', docError)
      return null
    }

    return docData.code
  } catch (error) {
    console.error('Ошибка получения кода документа:', error)
    return null
  }
}

async function prepareImportData(
  doc: any,
  pieRows: FinishingPieRow[],
  calcRows: TypeCalculationRow[],
  activeTypeIds: Set<string>
): Promise<PreparedImportItem[]> {
  const importData: PreparedImportItem[] = []

  const filteredPieRows = pieRows.filter((row) => row.pie_type_id && activeTypeIds.has(row.pie_type_id))

  // Этап 1: Группировка строк Расчета по типу пирога
  const calcRowsByType = new Map<string, TypeCalculationRow[]>()
  calcRows.forEach((row) => {
    if (!row.pie_type_id) return
    if (!calcRowsByType.has(row.pie_type_id)) {
      calcRowsByType.set(row.pie_type_id, [])
    }
    calcRowsByType.get(row.pie_type_id)!.push(row)
  })

  // Этап 2: Суммирование количеств по этажам для каждого типа
  const floorSumsByType = new Map<
    string,
    {
      floorSums: Map<number, { quantitySpec: number; quantityRd: number }>
      firstCalcRow: TypeCalculationRow
    }
  >()

  for (const [pieTypeId, calcRowsForType] of calcRowsByType.entries()) {
    const floorSums = new Map<number, { quantitySpec: number; quantityRd: number }>()

    for (const calcRow of calcRowsForType) {
      const floors = await getTypeCalculationFloors(calcRow.id)

      floors.forEach((floor: TypeCalculationFloor) => {
        const current = floorSums.get(floor.floor_number) || { quantitySpec: 0, quantityRd: 0 }
        floorSums.set(floor.floor_number, {
          quantitySpec: current.quantitySpec + (floor.quantitySpec || 0),
          quantityRd: current.quantityRd + (floor.quantityRd || 0),
        })
      })
    }

    floorSumsByType.set(pieTypeId, {
      floorSums,
      firstCalcRow: calcRowsForType[0],
    })
  }

  // Этап 3: Создание записей для импорта
  for (const pieRow of filteredPieRows) {
    const typeData = floorSumsByType.get(pieRow.pie_type_id!)
    if (!typeData) continue

    const { floorSums, firstCalcRow } = typeData

    importData.push({
      project_id: doc.project_id,
      cost_category_id: doc.cost_category_id,
      documentation_tag_id: doc.documentation_tag_id,
      version_id: doc.version_id,
      block_id: firstCalcRow.block_id,
      location_id: firstCalcRow.location_id,
      material_id: pieRow.material_id!,
      unit_id: pieRow.unit_id!,
      detail_cost_category_id: pieRow.detail_cost_category_id!,
      work_name_id: pieRow.work_name_id,
      work_set_rate_id: pieRow.work_set_rate_id,
      conversion_coefficient: pieRow.consumption ?? null,
      supplier_names_id: pieRow.supplier_name_id,
      finishing_pie_type_id: pieRow.pie_type_id,
      floors: Array.from(floorSums.entries()).map(([floor_number, sums]) => ({
        floor_number,
        quantityPd: 0,
        quantitySpec: sums.quantitySpec,
        quantityRd: sums.quantityRd,
        location_id: null, // location_id должен быть NULL когда есть floor_number
      })),
    })
  }

  return importData
}

async function createChessboardRecords(
  importData: PreparedImportItem[],
  setId: string
): Promise<{ createdRows: number; createdFloorMappings: number; errors: string[] }> {
  let createdRows = 0
  let createdFloorMappings = 0
  const errors: string[] = []

  for (const item of importData) {
    try {
      let chessboardTypeId: string | null = null
      if (item.finishing_pie_type_id) {
        const { data: pieTypeData } = await supabase
          .from('finishing_pie_types')
          .select('name')
          .eq('id', item.finishing_pie_type_id)
          .maybeSingle()

        if (pieTypeData?.name) {
          const { data: existingType } = await supabase
            .from('chessboard_types')
            .select('id')
            .eq('name', pieTypeData.name)
            .maybeSingle()

          if (existingType) {
            chessboardTypeId = existingType.id
          } else {
            const { data: newType } = await supabase
              .from('chessboard_types')
              .insert({ name: pieTypeData.name })
              .select('id')
              .single()
            chessboardTypeId = newType?.id || null
          }
        }
      }

      const insertPayload = {
        project_id: item.project_id,
        material: item.material_id,
        unit_id: item.unit_id,
        material_type: 'База' as const,
        type_id: chessboardTypeId,
      }

      const { data: chessboardRow, error: cbError } = await supabase
        .from('chessboard')
        .insert(insertPayload)
        .select('id')
        .single()

      if (cbError) {
        errors.push(`Ошибка создания записи в chessboard: ${cbError.message}`)
        continue
      }

      const chessboardId = chessboardRow.id
      createdRows++

      const { error: mappingError } = await supabase.from('chessboard_mapping').insert({
        chessboard_id: chessboardId,
        block_id: item.block_id,
        cost_category_id: item.cost_category_id,
        cost_type_id: item.detail_cost_category_id,
        location_id: item.location_id,
      })

      if (mappingError && !mappingError.message.includes('duplicate')) {
        console.error('Ошибка вставки mapping:', mappingError)
      }

      // Вставка в chessboard_nomenclature_mapping только если:
      // 1. Есть supplier_names_id (ID наименования поставщика)
      // 2. Коэффициент не null (указан в исходных данных)
      if (item.supplier_names_id && item.conversion_coefficient !== null) {
        const { error: nomenclatureError } = await supabase
          .from('chessboard_nomenclature_mapping')
          .insert({
            chessboard_id: chessboardId,
            supplier_names_id: item.supplier_names_id,
            conversion_coefficient: item.conversion_coefficient,
          })

        if (nomenclatureError && !nomenclatureError.message.includes('duplicate')) {
          console.error('Ошибка вставки nomenclature mapping:', nomenclatureError)
        }
      }

      for (const floor of item.floors) {
        const { error: floorError } = await supabase
          .from('chessboard_floor_mapping')
          .insert({
            chessboard_id: chessboardId,
            floor_number: floor.floor_number,
            quantityPd: floor.quantityPd,
            quantitySpec: floor.quantitySpec,
            quantityRd: floor.quantityRd,
            location_id: floor.location_id,
          })

        if (!floorError) {
          createdFloorMappings++
        } else {
          console.error('Ошибка вставки floor mapping:', floorError)
        }
      }

      if (item.version_id) {
        const { error: docError } = await supabase
          .from('chessboard_documentation_mapping')
          .insert({
            chessboard_id: chessboardId,
            version_id: item.version_id,
          })

        if (docError && !docError.message.includes('duplicate')) {
          console.error('Ошибка вставки documentation mapping:', docError)
        }
      }

      if (item.work_set_rate_id) {
        const { error: ratesError } = await supabase
          .from('chessboard_rates_mapping')
          .insert({
            chessboard_id: chessboardId,
            work_set_rate_id: item.work_set_rate_id,
          })

        if (ratesError && !ratesError.message.includes('duplicate')) {
          console.error('Ошибка вставки rates mapping:', ratesError)
        }
      }
    } catch (error: any) {
      errors.push(`Ошибка обработки записи: ${error.message}`)
    }
  }

  return { createdRows, createdFloorMappings, errors }
}

export async function deleteFinishingChessboardSet(
  finishingPieId: string,
  setId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { data: mapping, error: mappingError } = await supabase
      .from('finishing_pie_sets_mapping')
      .select('*')
      .eq('finishing_pie_id', finishingPieId)
      .eq('set_id', setId)
      .maybeSingle()

    if (mappingError || !mapping) {
      return {
        success: false,
        message: 'Связь между документом и комплектом не найдена',
      }
    }

    const { data: setData, error: setError } = await supabase
      .from('chessboard_sets')
      .select('project_id, block_ids, cost_category_ids, version_id')
      .eq('id', setId)
      .maybeSingle()

    if (setError || !setData) {
      console.error('Ошибка получения данных комплекта:', setError)
      return {
        success: false,
        message: 'Комплект не найден',
      }
    }

    const { data: chessboardMappings, error: mappingsError } = await supabase
      .from('chessboard_mapping')
      .select('chessboard_id')
      .in('block_id', setData.block_ids || [])
      .in('cost_category_id', setData.cost_category_ids || [])

    if (mappingsError) {
      console.error('Ошибка получения маппингов chessboard:', mappingsError)
    }

    const chessboardIds = chessboardMappings?.map((m) => m.chessboard_id).filter(Boolean) || []

    if (chessboardIds.length > 0) {
      const { data: chessboardRecords, error: chessboardError } = await supabase
        .from('chessboard')
        .select('id')
        .eq('project_id', setData.project_id)
        .in('id', chessboardIds)

      if (!chessboardError && chessboardRecords && chessboardRecords.length > 0) {
        const recordIds = chessboardRecords.map((r) => r.id)

        const { error: deleteChessboardError } = await supabase
          .from('chessboard')
          .delete()
          .in('id', recordIds)

        if (deleteChessboardError) {
          console.error('Ошибка удаления записей chessboard:', deleteChessboardError)
          return {
            success: false,
            message: `Ошибка удаления записей: ${deleteChessboardError.message}`,
          }
        }
      }
    }

    const { error: deleteMappingError } = await supabase
      .from('finishing_pie_sets_mapping')
      .delete()
      .eq('finishing_pie_id', finishingPieId)
      .eq('set_id', setId)

    if (deleteMappingError) {
      console.error('Ошибка удаления связи:', deleteMappingError)
      return {
        success: false,
        message: `Ошибка удаления связи: ${deleteMappingError.message}`,
      }
    }

    const { error: deleteSetError } = await supabase
      .from('chessboard_sets')
      .delete()
      .eq('id', setId)

    if (deleteSetError) {
      console.error('Ошибка удаления комплекта:', deleteSetError)
      return {
        success: false,
        message: `Ошибка удаления комплекта: ${deleteSetError.message}`,
      }
    }

    return {
      success: true,
      message: 'Комплект и все связанные записи успешно удалены',
    }
  } catch (error: any) {
    console.error('Критическая ошибка удаления:', error)
    return {
      success: false,
      message: error.message || 'Неизвестная ошибка при удалении',
    }
  }
}

export async function importFinishingToChessboard(
  finishingPieId: string,
  customSetName?: string
): Promise<ImportToChessboardResult> {
  try {
    const doc = await getFinishingPieById(finishingPieId)
    if (!doc) {
      return {
        success: false,
        errors: ['Документ не найден'],
        warnings: [],
        message: 'Документ не найден',
      }
    }

    const completedStatuses = await supabase
      .from('statuses')
      .select('id')
      .eq('name', 'Завершен')
      .eq('is_active', true)

    const completedStatusId = completedStatuses.data?.[0]?.id

    if (
      !completedStatusId ||
      doc.status_finishing_pie !== completedStatusId ||
      doc.status_type_calculation !== completedStatusId
    ) {
      return {
        success: false,
        errors: ['Оба статуса должны быть "Завершен"'],
        warnings: [],
        message: 'Не выполнено условие по статусам',
      }
    }

    const pieRows = await getFinishingPieRows(finishingPieId)
    if (pieRows.length === 0) {
      return {
        success: false,
        errors: ['Нет строк в документе "Типы пирога отделки"'],
        warnings: [],
        message: 'Нет данных для импорта',
      }
    }

    const validation = await validateRequiredFields(pieRows)
    if (!validation.valid) {
      return {
        success: false,
        validationError: true,
        invalidRows: validation.invalidRows,
        errors: ['Обнаружены незаполненные обязательные поля'],
        warnings: [],
        message: `Обнаружено ${validation.invalidRows.length} строк с незаполненными обязательными полями`,
      }
    }

    // Проверка на нули и отсутствие значений в столбце "Расход"
    const consumptionValidation = validateConsumption(pieRows)
    if (!consumptionValidation.valid) {
      const rowsList = consumptionValidation.rowsWithInvalidConsumption
        .map((r) => `Строка ${r.rowNumber}: ${r.pieTypeName} - ${r.materialName} (${r.issue})`)
        .join('\n')
      return {
        success: false,
        errors: ['Некорректные значения в столбце Расход', rowsList],
        warnings: [],
        message: `Обнаружено ${consumptionValidation.rowsWithInvalidConsumption.length} строк с некорректным расходом`,
      }
    }

    const calcRows = await getTypeCalculationRows(finishingPieId)
    if (calcRows.length === 0) {
      return {
        success: false,
        errors: ['Нет строк в документе "Расчет по типам"'],
        warnings: [],
        message: 'Нет данных расчета',
      }
    }

    const activeTypeIds = new Set(
      calcRows.map((row) => row.pie_type_id).filter((id): id is string => !!id)
    )

    const filteredPieRows = pieRows.filter(
      (row) => row.pie_type_id && activeTypeIds.has(row.pie_type_id)
    )

    if (filteredPieRows.length === 0) {
      return {
        success: false,
        errors: [
          'Ни один тип из "Типов пирога отделки" не упомянут в "Расчет по типам"',
        ],
        warnings: [],
        message: 'Нет соответствий типов между документами',
      }
    }

    const setName = customSetName || (await getDocumentationCode(doc.version_id!)) || doc.name

    const importData = await prepareImportData(doc, pieRows, calcRows, activeTypeIds)

    const { data: versionData } = await supabase
      .from('documentation_versions')
      .select('documentation_id')
      .eq('id', doc.version_id!)
      .maybeSingle()

    const setFilters: CreateChessboardSetRequest = {
      name: setName,
      filters: {
        project_id: doc.project_id,
        documentation_id: versionData?.documentation_id || null,
        version_id: doc.version_id || null,
        tag_id: doc.documentation_tag_id || null,
        block_ids: [...new Set(importData.map((d) => d.block_id).filter((id): id is string => !!id))],
        cost_category_ids: [doc.cost_category_id!],
        cost_type_ids: [
          ...new Set(importData.map((d) => d.detail_cost_category_id).filter((id) => !!id)),
        ],
      },
      status_id: completedStatusId,
    }

    const newSet = await chessboardSetsApi.createSet(setFilters)

    // Создаем запись в chessboard_sets_documents_mapping для корректного отображения в модальном окне
    if (versionData?.documentation_id && doc.version_id) {
      await supabase.from('chessboard_sets_documents_mapping').insert({
        set_id: newSet.id,
        documentation_id: versionData.documentation_id,
        version_id: doc.version_id,
        order_index: 0,
      })
    }

    const { createdRows, createdFloorMappings, errors } = await createChessboardRecords(
      importData,
      newSet.id
    )

    await supabase.from('finishing_pie_sets_mapping').insert({
      finishing_pie_id: finishingPieId,
      set_id: newSet.id,
    })

    const excludedRows = pieRows.length - filteredPieRows.length

    return {
      success: true,
      set_id: newSet.id,
      set_number: newSet.set_number,
      set_name: newSet.name,
      created_rows: createdRows,
      created_floor_mappings: createdFloorMappings,
      excluded_rows: excludedRows,
      errors,
      warnings: excludedRows > 0 ? [`Исключено ${excludedRows} строк (тип не в расчете)`] : [],
    }
  } catch (error: any) {
    console.error('Критическая ошибка импорта:', error)
    return {
      success: false,
      errors: [error.message || 'Неизвестная ошибка'],
      warnings: [],
      message: 'Критическая ошибка при импорте',
    }
  }
}
