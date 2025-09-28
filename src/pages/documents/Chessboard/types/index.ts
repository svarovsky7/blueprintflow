import type { Key } from 'react'

export type RowColor = '' | 'green' | 'yellow' | 'blue' | 'red'

export interface FloorQuantity {
  quantityPd: string
  quantitySpec: string
  quantityRd: string
}

export type FloorQuantities = Record<number, FloorQuantity>

export interface RowData {
  id: string
  project: string
  projectId: string
  // Данные из документации
  documentationSection: string // Раздел (из справочника Тэги проекта)
  documentationCode: string // Шифр проекта (из справочника Документация)
  documentationProjectName: string // Наименование проекта (зависимое от Шифра проекта)
  documentationVersion: string // Версия проекта
  documentationVersionId: string // UUID выбранной версии документа
  documentationCodeId: string // UUID документа для VersionSelect
  // Данные из маппингов
  block: string
  blockId: string
  floors: string // Этажи
  costCategory: string
  costCategoryId: string
  costType: string
  costTypeId: string
  workName: string // Наименование работ
  workUnit: string // Ед.Изм. Работ
  rateId: string // ID расценки
  location: string // Локализация
  locationId: string
  material: string
  materialType: 'База' | 'Доп' | 'ИИ' // Тип материала
  quantityPd: string // Кол-во по ПД
  quantitySpec: string // Кол-во по спеке РД
  quantityRd: string // Кол-во по пересчету РД
  nomenclature: string // Номенклатура
  nomenclatureId: string
  supplier: string // Наименование поставщика
  unit: string // Ед.изм.
  unitId: string
  comments: string // Комментарии
  color: RowColor
  // Данные этажей для модального окна
  floorQuantities?: FloorQuantities
  // Технические поля
  originalMaterial?: string
  originalQuantity?: number
  originalUnit?: string
  originalUnitId?: string
  isNew?: boolean
  isEditing?: boolean
  isConflict?: boolean
}

export interface FloorModalRow {
  floor: number
  quantityPd: string
  quantitySpec: string
  quantityRd: string
}

export interface FloorModalInfo {
  projectCode?: string
  projectName?: string
  workName?: string
  material: string
  unit: string
}

export interface Comment {
  id: string
  text: string
  created_at: string
  updated_at: string
}

export interface CommentWithMapping extends Comment {
  chessboard_comments_mapping: {
    chessboard_id: string
  }[]
}

export interface DocumentVersion {
  id: string
  documentation_id: string
  version_number: number
  issue_date?: string
  status: 'draft' | 'filled_spec' | 'filled_recalc' | 'vor_created'
}

export interface DocumentationForVersions {
  id: string
  code: string
  project_name: string
  tag_id: string
  documentation_tags?: {
    id: string
    name: string
    tag_number: string
  }
}

export interface ViewRow {
  id: string
  project: { id: string; name: string }
  block: { id: string; name: string } | null
  cost_category: { id: string; name: string } | null
  detail_cost_category: { id: string; name: string } | null
  location: { id: string; name: string } | null
  nomenclature: { id: string; name: string } | null
  quantity: number
  unit: { id: string; name: string } | null
  rate: { id: string; rate: number } | null
  amount: number
  color: RowColor
  floor_quantities: Record<string, any> | null
  originalMaterial?: string
  originalQuantity?: number
  originalUnit?: string
  originalUnitId?: string
  chessboard_comments_mapping?: CommentWithMapping[]
}

export interface TableRow extends RowData {
  key: string
}

export interface ProjectOption {
  value: string
  label: string
}

export interface BlockOption {
  value: string
  label: string
}

export interface UnitOption {
  value: string
  label: string
}

export interface NomenclatureOption {
  value: string
  label: string
}

export interface CostCategoryOption {
  value: string
  label: string
}

export interface CostTypeOption {
  value: string
  label: string
  categoryId: string
}

export interface LocationOption {
  value: string
  label: string
  categoryId: string
  typeId: string
}

export interface RateOption {
  value: string
  label: string
  rate: number
}

export type NomenclatureMapping = {
  id: string
  nomenclature_id: string
  nomenclature: { id: string; name: string }
}

export interface DbRow {
  id: string
  project_id: string
  block_id: string | null
  cost_category_id: string | null
  detail_cost_category_id: string | null
  location_id: string | null
  nomenclature_id: string | null
  quantity: number
  unit_id: string | null
  rate_id: string | null
  amount: number
  color: RowColor | null
  floor_quantities: Record<string, any> | null
  original_material?: string | null
  original_quantity?: number | null
  original_unit?: string | null
  original_unit_id?: string | null
  created_at: string
  updated_at: string
  projects: { id: string; name: string } | null
  blocks: { id: string; name: string } | null
  cost_categories: { id: string; name: string } | null
  detail_cost_categories: { id: string; name: string } | null
  location: { id: string; name: string } | null
  nomenclature: { id: string; name: string } | null
  units: { id: string; name: string } | null
  rates: { id: string; rate: number } | null
  chessboard_comments_mapping?: Array<{
    comments: Comment
  }>
}

export type HiddenColKey = 'block' | 'costCategory' | 'costType' | 'location'

export interface ChessboardFilters {
  // Постоянные фильтры
  project: string // Проект
  documentationSection: string[] // Раздел (Тэги проекта)
  documentationCode: string[] // Шифр проекта (Документация)

  // Сворачиваемые фильтры
  block: string[] // Корпус
  costCategory: string[] // Категория затрат
  costType: string[] // Вид затрат

  // Дополнительные фильтры
  material: string // Поиск по материалам
}

export interface AppliedFilters {
  // Постоянные фильтры
  project_id: string // ID выбранного проекта
  documentation_section_ids: string[] // ID выбранных разделов (Тэги проекта)
  documentation_code_ids: string[] // ID выбранных шифров проектов (Документация)
  documentation_version_ids: Record<string, string> // ID выбранных версий для каждого документа

  // Сворачиваемые фильтры
  block_ids: string[] // ID выбранных корпусов
  cost_category_ids: string[] // ID выбранных категорий затрат
  detail_cost_category_ids: string[] // ID выбранных видов затрат

  // Дополнительные фильтры
  material_search: string // Поиск по материалам
}

export interface ColumnSettings {
  hiddenColumns: Set<string>
  columnOrder: string[]
}

export interface TableMode {
  mode: 'view' | 'add' | 'edit' | 'delete'
  selectedRowKeys: Key[]
}
