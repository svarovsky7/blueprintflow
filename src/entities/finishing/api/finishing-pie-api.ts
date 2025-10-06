import { supabase } from '@/lib/supabase'
import type {
  FinishingPie,
  FinishingPieType,
  FinishingPieRow,
  CreateFinishingPieDto,
  UpdateFinishingPieDto,
  CreateFinishingPieTypeDto,
  UpdateFinishingPieTypeDto,
  CreateFinishingPieRowDto,
  UpdateFinishingPieRowDto,
} from '../model/types'

// ========== CRUD для документов типов пирогов (заголовки) ==========

export async function getFinishingPies(
  projectId: string,
  blockId?: string
): Promise<FinishingPie[]> {
  let query = supabase
    .from('finishing_pie')
    .select('*')
    .eq('project_id', projectId)

  if (blockId) {
    query = query.eq('block_id', blockId)
  }

  const { data, error } = await query.order('name')

  if (error) throw error
  return data || []
}

export async function getFinishingPieById(id: string): Promise<FinishingPie | null> {
  const { data, error } = await supabase
    .from('finishing_pie')
    .select(
      `
      *,
      cost_categories(name)
    `
    )
    .eq('id', id)
    .limit(1)

  if (error) throw error

  if (!data || data.length === 0) return null

  const raw = data[0] as any

  // Загружаем информацию о версии и документе отдельно
  let documentationCode = null
  let documentationName = null
  let versionNumber = null

  if (raw.version_id) {
    const { data: versionData, error: versionError } = await supabase
      .from('documentation_versions')
      .select('version_number, documentation_id')
      .eq('id', raw.version_id)
      .maybeSingle()

    if (versionError) {
      console.error('Ошибка загрузки версии:', versionError)
    }

    if (versionData) {
      versionNumber = versionData.version_number

      if (versionData.documentation_id) {
        const { data: docData, error: docError } = await supabase
          .from('documentations')
          .select('code, project_name')
          .eq('id', versionData.documentation_id)
          .maybeSingle()

        if (docError) {
          console.error('Ошибка загрузки документа:', docError)
        }

        if (docData) {
          documentationCode = docData.code
          documentationName = docData.project_name
        }
      }
    }
  }

  return {
    ...raw,
    cost_category_name: raw.cost_categories?.name,
    documentation_code: documentationCode,
    documentation_name: documentationName,
    version_number: versionNumber,
  }
}

export async function createFinishingPie(dto: CreateFinishingPieDto): Promise<FinishingPie> {
  const { data, error } = await supabase
    .from('finishing_pie')
    .insert([dto])
    .select()
    .limit(1)

  if (error) throw error
  return data[0]
}

export async function updateFinishingPie(
  id: string,
  dto: UpdateFinishingPieDto
): Promise<FinishingPie> {
  const { data, error } = await supabase
    .from('finishing_pie')
    .update({ ...dto, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .limit(1)

  if (error) throw error
  return data[0]
}

export async function deleteFinishingPie(id: string): Promise<void> {
  const { error } = await supabase.from('finishing_pie').delete().eq('id', id)

  if (error) throw error
}

// ========== CRUD для справочника типов пирогов ==========

export async function getFinishingPieTypes(projectId: string): Promise<FinishingPieType[]> {
  const { data, error } = await supabase
    .from('finishing_pie_types')
    .select('*')
    .eq('project_id', projectId)
    .order('name')

  if (error) throw error
  return data || []
}

export async function getFinishingPieTypeById(id: string): Promise<FinishingPieType | null> {
  const { data, error } = await supabase
    .from('finishing_pie_types')
    .select('*')
    .eq('id', id)
    .limit(1)

  if (error) throw error
  return data && data.length > 0 ? data[0] : null
}

export async function createFinishingPieType(
  dto: CreateFinishingPieTypeDto
): Promise<FinishingPieType> {
  const { data, error } = await supabase
    .from('finishing_pie_types')
    .insert([dto])
    .select()
    .limit(1)

  if (error) throw error
  return data[0]
}

export async function updateFinishingPieType(
  id: string,
  dto: UpdateFinishingPieTypeDto
): Promise<FinishingPieType> {
  const { data, error } = await supabase
    .from('finishing_pie_types')
    .update({ ...dto, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .limit(1)

  if (error) throw error
  return data[0]
}

export async function deleteFinishingPieType(id: string): Promise<void> {
  const { error } = await supabase.from('finishing_pie_types').delete().eq('id', id)

  if (error) throw error
}

// ========== CRUD для строк табличной части ==========

export async function getFinishingPieRows(finishingPieId: string): Promise<FinishingPieRow[]> {
  const { data, error } = await supabase
    .from('finishing_pie_mapping')
    .select(
      `
      *,
      pie_types:pie_type_id (name),
      materials:material_id (name),
      units:unit_id (name),
      detail_cost_categories:detail_cost_category_id (id, name),
      work_names:work_name_id (id, name),
      rates:rate_id (id, work_set),
      rate_units:rate_unit_id (name)
    `
    )
    .eq('finishing_pie_id', finishingPieId)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Маппинг данных с join'ами
  return (
    data?.map((row: any) => ({
      id: row.id,
      pie_type_id: row.pie_type_id,
      pie_type_name: row.pie_types?.name || null,
      finishing_pie_id: row.finishing_pie_id,
      material_id: row.material_id,
      material_name: row.materials?.name || null,
      unit_id: row.unit_id,
      unit_name: row.units?.name || null,
      consumption: row.consumption,
      detail_cost_category_id: row.detail_cost_category_id,
      detail_cost_category_name: row.detail_cost_categories?.name || null,
      work_name_id: row.work_name_id,
      work_name: row.work_names?.name || null, // Название работы из work_names
      rate_id: row.rate_id,
      work_set: row.rates?.work_set || null, // Рабочий набор из rates (для отображения)
      rate_unit_id: row.rate_unit_id,
      rate_unit_name: row.rate_units?.name || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })) || []
  )
}

export async function createFinishingPieRow(
  dto: CreateFinishingPieRowDto
): Promise<FinishingPieRow> {
  console.log('Создание строки с DTO:', dto)
  const { data, error } = await supabase
    .from('finishing_pie_mapping')
    .insert([dto])
    .select()
    .limit(1)

  if (error) {
    console.error('Ошибка при создании строки finishing_pie_mapping:', error)
    throw error
  }
  console.log('Строка создана успешно:', data)
  return data[0]
}

export async function updateFinishingPieRow(
  id: string,
  dto: UpdateFinishingPieRowDto
): Promise<FinishingPieRow> {
  const { data, error } = await supabase
    .from('finishing_pie_mapping')
    .update({ ...dto, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .limit(1)

  if (error) throw error
  return data[0]
}

export async function deleteFinishingPieRow(id: string): Promise<void> {
  const { error } = await supabase.from('finishing_pie_mapping').delete().eq('id', id)

  if (error) throw error
}

// ========== Вспомогательные функции ==========

// Получить ед.изм. работы по ID расценки
export async function getRateUnitId(rateId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('rates')
    .select('unit_id')
    .eq('id', rateId)
    .maybeSingle()

  if (error) throw error
  return data?.unit_id || null
}

// Получить виды затрат по категории затрат
export async function getDetailCostCategoriesByCostCategory(
  costCategoryId: number
): Promise<{ value: number; label: string }[]> {
  const { data, error } = await supabase
    .from('detail_cost_categories_mapping')
    .select(
      `
      detail_cost_category_id,
      detail_cost_categories(id, name)
    `
    )
    .eq('cost_category_id', costCategoryId)

  if (error) throw error

  if (!data || data.length === 0) return []

  // Убираем дубликаты и преобразуем в формат для Select
  const uniqueCategories = new Map<number, string>()
  data.forEach((item: any) => {
    const detailCategory = item.detail_cost_categories
    if (detailCategory && !uniqueCategories.has(detailCategory.id)) {
      uniqueCategories.set(detailCategory.id, detailCategory.name)
    }
  })

  return Array.from(uniqueCategories.entries())
    .map(([id, name]) => ({
      value: id,
      label: name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}