import type { RowColor } from '../types'

export const colorMap: Record<RowColor, string> = {
  green: '#d9f7be',
  yellow: '#fff1b8',
  blue: '#e6f7ff',
  red: '#ffa39e',
  '': '',
}

export const ROW_COLORS: RowColor[] = ['', 'green', 'yellow', 'blue', 'red']

export const DEFAULT_FILTERS = {
  // Постоянные фильтры
  project: '',
  documentationSection: [] as string[],
  documentationCode: [] as string[],

  // Сворачиваемые фильтры
  block: [] as string[],
  costCategory: [] as string[],
  costType: [] as string[],

  // Дополнительные фильтры
  material: '',
}

export const DEFAULT_APPLIED_FILTERS = {
  // Постоянные фильтры
  project_id: '',
  documentation_section_ids: [] as string[],
  documentation_code_ids: [] as string[],
  documentation_version_ids: {} as Record<string, string>,

  // Сворачиваемые фильтры
  block_ids: [] as string[],
  cost_category_ids: [] as string[],
  detail_cost_category_ids: [] as string[],

  // Дополнительные фильтры
  material_search: '',
}

export const PAGINATION_OPTIONS = [10, 20, 50, 100, 200, 500]
export const DEFAULT_PAGE_SIZE = 100

export const COLUMN_KEYS = {
  ACTIONS: 'actions', // Служебный столбец
  DOCUMENTATION_SECTION: 'documentationSection', // Раздел (Тэги проекта)
  DOCUMENTATION_CODE: 'documentationCode', // Шифр проекта
  DOCUMENTATION_PROJECT_NAME: 'documentationProjectName', // Наименование проекта
  DOCUMENTATION_VERSION: 'documentationVersion', // Версия
  BLOCK: 'block', // Корпус
  FLOORS: 'floors', // Этажи
  COST_CATEGORY: 'costCategory', // Категория затрат
  COST_TYPE: 'costType', // Вид затрат
  WORK_SET: 'workSet', // Рабочий набор
  WORK_NAME: 'workName', // Наименование работ
  WORK_UNIT: 'workUnit', // Ед.Изм. Работ
  LOCATION: 'location', // Локализация
  MATERIAL: 'material', // Материал
  MATERIAL_TYPE: 'materialType', // Тип материала
  QUANTITY_PD: 'quantityPd', // Кол-во по ПД
  QUANTITY_SPEC: 'quantitySpec', // Кол-во по спеке РД
  QUANTITY_RD: 'quantityRd', // Кол-во по пересчету РД
  CONVERSION_COEFFICIENT: 'conversionCoefficient', // Коэффициент пересчета
  CONVERTED_QUANTITY: 'convertedQuantity', // Кол-во пересчет (расчетное)
  UNIT_NOMENCLATURE: 'unitNomenclature', // Ед.Изм. Номенкл.
  NOMENCLATURE: 'nomenclature', // Номенклатура
  SUPPLIER: 'supplier', // Наименование поставщика
  UNIT: 'unit', // Ед.изм.
  COMMENTS: 'comments', // Комментарии
} as const

export const HIDDEN_COLUMN_KEYS = [COLUMN_KEYS.WORK_UNIT] as const // Временно скрываем столбец "Ед.Изм. Работ"

export const DEFAULT_COLUMN_ORDER = [
  COLUMN_KEYS.ACTIONS,
  COLUMN_KEYS.DOCUMENTATION_SECTION,
  COLUMN_KEYS.DOCUMENTATION_CODE,
  COLUMN_KEYS.DOCUMENTATION_PROJECT_NAME,
  COLUMN_KEYS.DOCUMENTATION_VERSION,
  COLUMN_KEYS.BLOCK,
  COLUMN_KEYS.FLOORS,
  COLUMN_KEYS.COST_CATEGORY,
  COLUMN_KEYS.COST_TYPE,
  COLUMN_KEYS.WORK_SET,
  COLUMN_KEYS.WORK_NAME,
  COLUMN_KEYS.WORK_UNIT,
  COLUMN_KEYS.LOCATION,
  COLUMN_KEYS.MATERIAL,
  COLUMN_KEYS.MATERIAL_TYPE,
  COLUMN_KEYS.UNIT,
  COLUMN_KEYS.QUANTITY_PD,
  COLUMN_KEYS.QUANTITY_SPEC,
  COLUMN_KEYS.QUANTITY_RD,
  COLUMN_KEYS.CONVERSION_COEFFICIENT, // Новый столбец: Коэфф-т
  COLUMN_KEYS.CONVERTED_QUANTITY, // Новый столбец: Кол-во пересчет
  COLUMN_KEYS.UNIT_NOMENCLATURE, // Новый столбец: Ед.Изм. Номенкл.
  COLUMN_KEYS.NOMENCLATURE,
  COLUMN_KEYS.SUPPLIER,
  COLUMN_KEYS.COMMENTS,
]

// СТАБИЛЬНАЯ конфигурация скролла для обычных таблиц (НЕ ДОЛЖНА ИЗМЕНЯТЬСЯ!)
export const TABLE_SCROLL_CONFIG = {
  x: 'max-content' as const,
  y: 'calc(100vh - 300px)',
} as const

// СТАБИЛЬНАЯ конфигурация скролла для больших таблиц
const LARGE_TABLE_SCROLL_CONFIG = {
  x: 'max-content' as const,
  y: 'calc(100vh - 300px)',
  // Дополнительные настройки для больших таблиц
  scrollToFirstRowOnChange: false, // Не прыгать в начало при изменениях
} as const

// ОПТИМИЗАЦИЯ DOM: конфигурация для больших таблиц
export const LARGE_TABLE_CONFIG = {
  // Виртуализация для больших данных (>1000 строк)
  virtual: true,
  // Высота строки для расчета виртуализации
  rowHeight: 54,
  // Буфер строк для плавной прокрутки
  overscanRowCount: 10,
  // Критический размер для включения виртуализации
  virtualThreshold: 1000,
  // Стабильная конфигурация скролла
  scroll: LARGE_TABLE_SCROLL_CONFIG,
} as const

export const EXCEL_HEADERS = {
  MATERIAL: ['материал', 'номенклатура', 'наименование'],
  QUANTITY: ['кол', 'количество', 'qty'],
  UNIT: ['ед', 'единица', 'unit'],
}

export const MATERIAL_TYPE_OPTIONS = [
  { value: 'База', label: 'База' },
  { value: 'Доп', label: 'Доп' },
] as const

export const STORAGE_KEYS = {
  COLUMN_VISIBILITY: 'chessboard-column-visibility',
  COLUMN_ORDER: 'chessboard-column-order',
  PAGE_SIZE: 'chessboard-page-size',
  FILTERS: 'chessboard-filters',
} as const
