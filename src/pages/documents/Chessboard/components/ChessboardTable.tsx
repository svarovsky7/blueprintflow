import React, { useMemo, memo, useState, useCallback, useEffect } from 'react'
import { Table, Button, Space, Tooltip, Input, Select, AutoComplete, InputNumber } from 'antd'
import { EditOutlined, DeleteOutlined, CopyOutlined, PlusOutlined, BgColorsOutlined } from '@ant-design/icons'
import type { ColumnsType, ColumnType } from 'antd/es/table'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ratesApi } from '@/entities/rates/api/rates-api'
import { RowColorPicker } from './RowColorPicker'
import { CommentsCell } from './CommentsCell'
import { FloorQuantitiesModal } from './FloorQuantitiesModal'
import type { RowData, TableMode, RowColor, FloorModalRow, FloorModalInfo } from '../types'
import { COLUMN_KEYS, TABLE_SCROLL_CONFIG, LARGE_TABLE_CONFIG, MATERIAL_TYPE_OPTIONS } from '../utils/constants'
import { parseFloorsFromString, hasMultipleFloors as checkMultipleFloors, distributeQuantitiesAcrossFloors } from '../utils/floors'
import { useNomenclatureSupplierCascade } from '../hooks/useNomenclatureSupplierCascade'
import { chessboardCascadeApi } from '@/entities/chessboard'
import { documentationApi } from '@/entities/documentation/api/documentation-api'

// ОПТИМИЗАЦИЯ: константы стилей для предотвращения создания новых объектов на каждом рендере
const STABLE_STYLES = {
  fullWidth: { width: '100%' } as const,
  fullWidthFlex: { width: '100%', flex: 1 } as const,
  floorButton: { flexShrink: 0 } as const,
  compactSpace: { width: '100%' } as const,
  dropdownStyle: {
    zIndex: 10000,
    maxHeight: '200px',
    overflowY: 'auto' as const
  } as const,
} as const

// Функция для динамического расчета ширины dropdown
const calculateDropdownWidth = (options: Array<{ label: string; value: any }>) => {
  if (!options || options.length === 0) return 200

  // Приблизительный расчет ширины на основе самого длинного текста
  const maxLength = Math.max(...options.map(option => String(option.label).length))

  // Формула: базовая ширина 120px + 8px на символ, но не более 500px
  const calculatedWidth = Math.min(120 + (maxLength * 8), 500)

  return Math.max(calculatedWidth, 150) // Минимальная ширина 150px
}

// Стиль для динамического dropdown
const getDynamicDropdownStyle = (options: Array<{ label: string; value: any }>) => ({
  ...STABLE_STYLES.dropdownStyle,
  minWidth: calculateDropdownWidth(options),
  width: calculateDropdownWidth(options),
  maxWidth: '500px',
  zIndex: 9999,
})

// КОНФИГУРАЦИЯ: Точные настройки ширины столбцов для оптимизации пространства
const COLUMN_WIDTH_CONFIG: Record<string, { width?: number; minWidth?: number; maxWidth?: number }> = {
  [COLUMN_KEYS.ACTIONS]: { width: 80 }, // Увеличенная ширина для действий (+20px)
  [COLUMN_KEYS.DOCUMENTATION_SECTION]: { minWidth: 40, maxWidth: 80 }, // "Раздел" динамический 40-80px
  [COLUMN_KEYS.DOCUMENTATION_CODE]: { width: 100 }, // "Шифр проекта" 100px
  [COLUMN_KEYS.DOCUMENTATION_PROJECT_NAME]: { width: 120, minWidth: 120, maxWidth: 120 }, // Фиксированная
  [COLUMN_KEYS.DOCUMENTATION_VERSION]: { width: 40 }, // "Вер." фиксированная 40px
  [COLUMN_KEYS.BLOCK]: { minWidth: 60, maxWidth: 90 }, // "Корпус" + 10px = ~60px
  [COLUMN_KEYS.FLOORS]: { width: 50 }, // "Этажи" 50px
  [COLUMN_KEYS.COST_CATEGORY]: { width: 120 }, // "Категория затрат" 120px
  [COLUMN_KEYS.COST_TYPE]: { minWidth: 80, maxWidth: 120 }, // "Вид затрат"
  [COLUMN_KEYS.WORK_NAME]: { minWidth: 140, maxWidth: 240 }, // "Наименование работ" +40px
  [COLUMN_KEYS.LOCATION]: { width: 80 }, // "Локализация" 80px
  [COLUMN_KEYS.MATERIAL]: { width: 120 }, // "Материал" 120px
  [COLUMN_KEYS.MATERIAL_TYPE]: { width: 60 }, // "Тип материала" 60px
  [COLUMN_KEYS.QUANTITY_PD]: { width: 60 }, // "Кол-во по ПД" 60px
  [COLUMN_KEYS.QUANTITY_SPEC]: { width: 90 }, // "Кол-во по спеке РД" 90px
  [COLUMN_KEYS.QUANTITY_RD]: { width: 80 }, // "Кол-во по пересчету РД" 80px
  [COLUMN_KEYS.NOMENCLATURE]: { minWidth: 120, maxWidth: 180 }, // "Номенклатура"
  [COLUMN_KEYS.SUPPLIER]: { minWidth: 100, maxWidth: 150 }, // "Наименование поставщика"
  [COLUMN_KEYS.UNIT]: { width: 40 }, // "Ед.изм." 40px
  [COLUMN_KEYS.COMMENTS]: { width: 80 }, // "Комментарии" 80px
}

const DEFAULT_COLUMN_WIDTH = { minWidth: 100, maxWidth: 150 } // Для остальных столбцов

// Столбцы, которые поддерживают перенос текста (многострочные) - ВСЕ СТОЛБЦЫ
const MULTILINE_COLUMNS = new Set([
  COLUMN_KEYS.ACTIONS,
  COLUMN_KEYS.DOCUMENTATION_SECTION,
  COLUMN_KEYS.DOCUMENTATION_CODE,
  COLUMN_KEYS.DOCUMENTATION_PROJECT_NAME,
  COLUMN_KEYS.DOCUMENTATION_VERSION,
  COLUMN_KEYS.BLOCK,
  COLUMN_KEYS.FLOORS,
  COLUMN_KEYS.COST_CATEGORY,
  COLUMN_KEYS.COST_TYPE,
  COLUMN_KEYS.WORK_NAME,
  COLUMN_KEYS.WORK_UNIT,
  COLUMN_KEYS.LOCATION,
  COLUMN_KEYS.MATERIAL,
  COLUMN_KEYS.MATERIAL_TYPE,
  COLUMN_KEYS.QUANTITY_PD,
  COLUMN_KEYS.QUANTITY_SPEC,
  COLUMN_KEYS.QUANTITY_RD,
  COLUMN_KEYS.NOMENCLATURE,
  COLUMN_KEYS.SUPPLIER,
  COLUMN_KEYS.UNIT,
  COLUMN_KEYS.COMMENTS
])

function normalizeColumns(cols: ColumnsType<RowData>): ColumnsType<RowData> {
  const walk = (arr: ColumnsType<RowData>): ColumnsType<RowData> =>
    arr.map((c) => {
      if ((c as ColumnType<RowData> & { children?: ColumnsType<RowData> }).children?.length) {
        return {
          ...c,
          children: walk((c as ColumnType<RowData> & { children: ColumnsType<RowData> }).children)
        }
      }

      // Получаем конфигурацию для конкретного столбца или используем по умолчанию
      const columnKey = (c as ColumnType<RowData>).key as string
      const config = COLUMN_WIDTH_CONFIG[columnKey] || DEFAULT_COLUMN_WIDTH
      const isMultiline = MULTILINE_COLUMNS.has(columnKey)

      // Определяем настройки ширины
      const width = config.width
      const minWidth = config.minWidth || width || DEFAULT_COLUMN_WIDTH.minWidth
      const maxWidth = config.maxWidth || width || DEFAULT_COLUMN_WIDTH.maxWidth

      return {
        ...c,
        width: width || minWidth, // Принудительно устанавливаем ширину
        minWidth,
        maxWidth,
        ellipsis: !isMultiline, // Отключаем ellipsis для многострочных столбцов
        onHeaderCell: (col?: unknown) => ({
          ...(c.onHeaderCell?.(col) || {}),
          style: {
            ...(c.onHeaderCell?.(col)?.style || {}),
            width: `${width || minWidth}px !important`,
            minWidth: `${minWidth}px !important`,
            maxWidth: `${maxWidth}px !important`,
            whiteSpace: 'normal' as const,
            overflow: 'hidden' as const,
            textOverflow: 'clip' as const,
            flex: 'none' as const, // Отключаем flex для фиксированной ширины
            boxSizing: 'border-box' as const
          }
        }),
        onCell: (record?: RowData, index?: number) => ({
          ...(c.onCell?.(record, index) || {}),
          style: {
            ...(c.onCell?.(record, index)?.style || {}),
            width: `${width || minWidth}px !important`,
            minWidth: `${minWidth}px !important`,
            maxWidth: `${maxWidth}px !important`,
            whiteSpace: 'normal' as const,
            overflow: 'hidden' as const,
            textOverflow: 'clip' as const,
            wordBreak: 'break-word' as const,
            padding: isMultiline ? '8px 12px' : undefined,
            flex: 'none' as const, // Отключаем flex для фиксированной ширины
            boxSizing: 'border-box' as const
          }
        })
      }
    })
  return walk(cols)
}

// Компонент для каскадного выбора работ - ИСПРАВЛЕНИЕ Rules of Hooks
interface WorkNameSelectProps {
  value: string
  costTypeId: string | undefined
  costCategoryId: string | undefined
  onChange: (value: string) => void
}

const WorkNameSelect: React.FC<WorkNameSelectProps> = ({ value, costTypeId, costCategoryId, onChange }) => {
  // ИСПРАВЛЕНИЕ: Стабилизируем queryKey для предотвращения infinite render
  const stableQueryKey = useMemo(() => {
    const key = ['works-by-category']
    if (costTypeId) key.push(costTypeId)
    if (costCategoryId) key.push(costCategoryId)
    return key
  }, [costTypeId, costCategoryId])

  // Хук всегда вызывается на верхнем уровне компонента
  const { data: workOptions = [] } = useQuery({
    queryKey: stableQueryKey,
    queryFn: () => ratesApi.getWorksByCategory(costTypeId, costCategoryId),
    enabled: !!(costTypeId || costCategoryId), // Запрос только если есть вид или категория затрат
  })

  return (
    <Select
      value={value || undefined}
      placeholder=""
      onChange={onChange}
      allowClear
      showSearch
      size="small"
      style={STABLE_STYLES.fullWidth}
      filterOption={(input, option) => {
        const text = option?.label?.toString() || ""
        return text.toLowerCase().includes(input.toLowerCase())
      }}
      options={workOptions}
      disabled={!costTypeId && !costCategoryId} // Отключаем если нет ни вида, ни категории затрат
      notFoundContent={costTypeId || costCategoryId ? 'Работы не найдены' : 'Выберите вид или категорию затрат'}
    />
  )
}

// Компонент для каскадного выбора версий документа
interface VersionSelectProps {
  value: string
  documentId: string | undefined
  isEditing?: boolean // LOG: добавляем флаг режима редактирования
  onChange: (versionId: string, versionNumber: string, documentationCodeId?: string) => void
}

const VersionSelect: React.FC<VersionSelectProps> = ({ value, documentId, isEditing = false, onChange }) => {
  console.log('🔍 VersionSelect render:', { value, documentId, isEditing, isValueUUID: value?.length === 36 }) // LOG: рендер компонента версий

  // ИСПРАВЛЕНИЕ: кэшируем отображаемое значение для предотвращения мерцания UUID
  const [displayValue, setDisplayValue] = useState<string | undefined>(undefined)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)

  // Стабилизируем queryKey
  const stableQueryKey = useMemo(() => {
    const key = ['document-versions']
    if (documentId) {
      key.push('by-document', documentId)
    } else if (value) {
      key.push('by-version', value)
    }
    return key
  }, [documentId, value])

  // Загружаем версии для выбранного документа или по ID версии
  const { data: versionOptions = [] } = useQuery({
    queryKey: stableQueryKey,
    queryFn: () => {
      if (documentId) {
        // LOG: загрузка версий по documentId
        console.log('🔍 Loading versions by documentId:', documentId)
        return documentationApi.getVersionsByDocumentId(documentId)
      } else if (value) {
        // LOG: загрузка версий по versionId
        console.log('🔍 Loading versions by versionId:', value)
        return documentationApi.getVersionsByVersionId(value)
      }
      return []
    },
    enabled: !!(documentId || value), // Запрос если есть документ или версия
  })

  // ИСПРАВЛЕНИЕ: устанавливаем displayValue ТОЛЬКО когда у нас есть соответствующая опция с label
  useEffect(() => {
    if (value && versionOptions.length > 0) {
      const currentVersion = versionOptions.find(v => v.value === value)
      if (currentVersion && (!isInitialized || displayValue !== value)) {
        console.log('🔄 Setting displayValue with correct label:', { // LOG
          versionId: value,
          versionNumber: currentVersion.label,
          previousDisplayValue: displayValue,
          isInitialized
        })
        // Устанавливаем displayValue только когда у нас есть правильная опция с label
        setDisplayValue(value)
        setIsInitialized(true)
      }
    } else if (!value) {
      // Если value пустое, сбрасываем displayValue
      console.log('🧹 Clearing displayValue (no value)') // LOG
      setDisplayValue(undefined)
      setIsInitialized(false)
    }
  }, [value, versionOptions, isInitialized, displayValue])

  console.log('📋 VersionSelect options loaded:', { versionOptions, displayValue, documentId }) // LOG: загруженные опции версий

  // Проверяем, есть ли активная версия (value - это UUID версии)
  const hasActiveVersion = value && versionOptions.length > 0
  // LOG: Компонент активен в режиме редактирования или если есть активная версия
  const isDisabled = !isEditing && !documentId && !hasActiveVersion

  console.log('🎛️ VersionSelect state:', { isEditing, hasActiveVersion, isDisabled, optionsCount: versionOptions.length }) // LOG: состояние компонента

  return (
    <Select
      value={displayValue}
      // ИСПРАВЛЕНИЕ: явно указываем что отображать в поле
      optionLabelProp="label"
      placeholder=""
      onChange={async (versionId) => {
        console.log('🔄 Version changing:', { versionId, value }) // LOG

        // Немедленно обновляем displayValue чтобы избежать мерцания
        setDisplayValue(versionId)

        const selectedVersion = versionOptions.find(v => v.value === versionId)
        if (selectedVersion) {
          console.log('✅ Version selected:', { versionId, versionNumber: selectedVersion.label }) // LOG: выбор версии

          // Получаем documentationCodeId если нет documentId
          let documentationCodeId = documentId
          if (!documentId && versionId) {
            try {
              console.log('🔍 Getting documentationCodeId for versionId:', versionId) // LOG
              const { data: versionData, error } = await supabase
                .from('documentation_versions')
                .select('documentation_id')
                .eq('id', versionId)
                .single()

              if (error) {
                console.error('❌ Error getting documentationCodeId:', error) // LOG
              } else {
                documentationCodeId = versionData.documentation_id
                console.log('✅ Got documentationCodeId:', documentationCodeId) // LOG
              }
            } catch (error) {
              console.error('❌ Error in version change:', error) // LOG
            }
          }

          onChange(versionId, selectedVersion.label, documentationCodeId)
        }
      }}
      onClear={() => {
        console.log('🧹 Version field cleared') // LOG
        setDisplayValue(undefined)
        onChange('', '', documentId)
      }}
      allowClear
      showSearch
      size="small"
      style={STABLE_STYLES.fullWidth}
      filterOption={(input, option) => {
        const text = option?.label?.toString() || ""
        return text.toLowerCase().includes(input.toLowerCase())
      }}
      options={versionOptions}
      disabled={isDisabled} // Отключаем только если нет ни документа, ни активной версии
      notFoundContent={documentId ? 'Версии не найдены' : 'Выберите документ'}
    />
  )
}

// CSS стили для заголовков таблицы - ИСПРАВЛЕННОЕ РЕШЕНИЕ для правильных переносов
const headerStyles = `
/* КРИТИЧЕСКОЕ РЕШЕНИЕ: ограничиваем весь thead через контейнер */
#root .chessboard-table .ant-table-thead,
.chessboard-table .ant-table-thead,
table.ant-table thead {
  height: 60px !important;
  max-height: 60px !important;
  min-height: 60px !important;
  overflow: hidden !important;
}

#root .chessboard-table .ant-table-thead > tr,
.chessboard-table .ant-table-thead > tr,
table.ant-table thead tr {
  display: table-row !important;
  height: 60px !important;
  max-height: 60px !important;
  min-height: 60px !important;
}

/* БАЗОВЫЕ стили заголовков - ИСПРАВЛЕНЫ для правильных переносов */
#root .chessboard-table .ant-table-thead > tr > th,
.chessboard-table .ant-table-thead > tr > th,
table.ant-table thead tr th {
  display: table-cell !important;
  vertical-align: middle !important;
  height: 60px !important;
  max-height: 60px !important;
  min-height: 60px !important;
  line-height: 12px !important;
  padding: 2px 4px !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
  white-space: pre-line !important;
  text-align: center !important;
  font-size: 10px !important;
  font-weight: 500 !important;
  /* КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: переносы ТОЛЬКО по пробелам */
  word-break: keep-all !important;
  overflow-wrap: break-word !important;
  /* Предотвращаем разбивание по буквам - только по пробелам */
  word-spacing: normal !important;
  hyphens: none !important;
  /* Контролируем высоту строк в пределах 3 строк */
  display: table-cell !important;
  hyphens: none !important;
}

/* АДАПТИВНЫЕ правила для разных масштабов UI */
@media screen and (min-width: 1px) {
  /* Масштаб 1.0 - стандартный */
  body[style*="scale(1)"] .chessboard-table .ant-table-thead > tr > th,
  body:not([style*="scale"]) .chessboard-table .ant-table-thead > tr > th {
    font-size: 10px !important;
    line-height: 12px !important;
    padding: 1px 2px !important;
  }

  /* Масштаб 0.9 - небольшое уменьшение */
  body[style*="scale(0.9)"] .chessboard-table .ant-table-thead > tr > th {
    font-size: 9px !important;
    line-height: 11px !important;
    padding: 1px 1px !important;
  }

  /* Масштаб 0.8 - среднее уменьшение */
  body[style*="scale(0.8)"] .chessboard-table .ant-table-thead > tr > th {
    font-size: 8px !important;
    line-height: 10px !important;
    padding: 0px 1px !important;
  }

  /* Масштаб 0.7 - сильное уменьшение - КРИТИЧЕСКАЯ ОПТИМИЗАЦИЯ */
  body[style*="scale(0.7)"] .chessboard-table .ant-table-thead > tr > th {
    font-size: 7px !important;
    line-height: 9px !important;
    padding: 0px 0px !important;
    font-weight: 600 !important;
    letter-spacing: -0.2px !important;
  }
}

/* СПЕЦИАЛЬНЫЕ правила для конкретных столбцов с проблемными переносами - ИСПРАВЛЕНЫ */
/* Столбец "Этажи" - НЕ переносить вообще */
#root .chessboard-table .ant-table-thead > tr > th.floors-header,
.chessboard-table .ant-table-thead > tr > th.floors-header {
  font-size: 10px !important;
  line-height: 14px !important;
  padding: 4px 8px !important;
  min-width: 80px !important;
  max-width: 80px !important;
  width: 80px !important;
  white-space: normal !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  overflow: hidden !important;
}

/* Столбцы количества - переносы ТОЛЬКО по \n, НЕ в середине слов */
#root .chessboard-table .ant-table-thead > tr > th.quantity-spec-header,
.chessboard-table .ant-table-thead > tr > th.quantity-spec-header,
#root .chessboard-table .ant-table-thead > tr > th.quantity-rd-header,
.chessboard-table .ant-table-thead > tr > th.quantity-rd-header {
  font-size: 9px !important;
  line-height: 11px !important;
  padding: 2px 4px !important;
  min-width: 80px !important;
  max-width: 80px !important;
  width: 80px !important;
  /* КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: правильные переносы - ТОЛЬКО по \n, НЕ в середине слов */
  white-space: pre-line !important;
  word-break: keep-all !important;
  overflow-wrap: break-word !important;
  hyphens: none !important;
  word-spacing: normal !important;
  overflow: hidden !important;
  max-height: 52px !important;
}

/* Столбец "Ед.изм." - НЕ переносить вообще */
#root .chessboard-table .ant-table-thead > tr > th.unit-header,
.chessboard-table .ant-table-thead > tr > th.unit-header {
  font-size: 10px !important;
  line-height: 14px !important;
  padding: 4px 8px !important;
  min-width: 70px !important;
  max-width: 70px !important;
  width: 70px !important;
  white-space: normal !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  overflow: hidden !important;
}

/* ЦВЕТОВАЯ СХЕМА СТРОК - Раскраска всей строки при выборе цвета */
.chessboard-table .ant-table-tbody > tr.row-color-green > td {
  background-color: #d9f7be !important;
}

.chessboard-table .ant-table-tbody > tr.row-color-yellow > td {
  background-color: #fff1b8 !important;
}

.chessboard-table .ant-table-tbody > tr.row-color-blue > td {
  background-color: #e6f7ff !important;
}

.chessboard-table .ant-table-tbody > tr.row-color-red > td {
  background-color: #ffa39e !important;
}

/* Hover эффект для цветных строк */
.chessboard-table .ant-table-tbody > tr.row-color-green:hover > td {
  background-color: #b7eb8f !important;
}

.chessboard-table .ant-table-tbody > tr.row-color-yellow:hover > td {
  background-color: #ffe58f !important;
}

.chessboard-table .ant-table-tbody > tr.row-color-blue:hover > td {
  background-color: #bae7ff !important;
}

.chessboard-table .ant-table-tbody > tr.row-color-red:hover > td {
  background-color: #ff7875 !important;
}

/* ГЛОБАЛЬНЫЕ правила переносов для ВСЕХ ячеек таблицы - только по пробелам */
.chessboard-table .ant-table-tbody > tr > td {
  word-break: keep-all !important;
  overflow-wrap: break-word !important;
  hyphens: none !important;
  white-space: normal !important;
}

/* Дополнительные правила для всего содержимого ячеек */
.chessboard-table .ant-table-tbody > tr > td * {
  word-break: keep-all !important;
  overflow-wrap: break-word !important;
  hyphens: none !important;
  white-space: normal !important;
}

/* Супер-высокоспецифичные правила для проблемных ячеек */
#root .chessboard-table .ant-table-tbody > tr > td,
table.ant-table tbody tr td {
  word-break: keep-all !important;
  overflow-wrap: break-word !important;
  word-wrap: break-word !important;
  hyphens: none !important;
  -webkit-hyphens: none !important;
  -moz-hyphens: none !important;
  -ms-hyphens: none !important;
}

/* Специальное правило для столбца Корпус - компактный и динамический */
.chessboard-table .ant-table-thead > tr > th.block-header {
  white-space: normal !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  min-width: 60px !important;
  max-width: 120px !important;
  width: auto !important;
  padding: 2px 4px !important;
  font-size: 10px !important;
  display: table-cell !important;
  visibility: visible !important;
  opacity: 1 !important;
}

/* Принудительные правила для отображения столбца Корпус по содержимому ячеек */
.chessboard-table .ant-table-thead > tr > th[data-block-column],
.chessboard-table .ant-table-tbody > tr > td[data-block-column] {
  display: table-cell !important;
  visibility: visible !important;
  opacity: 1 !important;
  min-width: 60px !important;
  max-width: 120px !important;
  width: auto !important;
  padding: 2px 4px !important;
  font-size: 11px !important;
  white-space: normal !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  overflow: hidden !important;
}

/* СУПЕР-ПРИНУДИТЕЛЬНОЕ правило для столбца Корпус по позиции (6-й столбец) */
.chessboard-table .ant-table-thead > tr > th:nth-child(6),
.chessboard-table .ant-table-tbody > tr > td:nth-child(6) {
  display: table-cell !important;
  visibility: visible !important;
  opacity: 1 !important;
  min-width: 60px !important;
  max-width: 120px !important;
  width: auto !important;
  padding: 2px 4px !important;
  font-size: 11px !important;
  white-space: normal !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  overflow: hidden !important;
}

/* Устаревшие правила для nth-child (оставлены для совместимости) */
#root .chessboard-table .ant-table-thead > tr > th[style*="40px"],
.chessboard-table .ant-table-thead > tr > th:nth-child(13),
.chessboard-table .ant-table-thead > tr > th:nth-child(14),
.chessboard-table .ant-table-thead > tr > th:nth-child(15) {
  font-size: 9px !important;
  line-height: 11px !important;
  padding: 1px 2px !important;
  min-width: 80px !important;
  width: auto !important;
  /* Правильные переносы только по словам - ТОЛЬКО ПО ПРОБЕЛАМ */
  word-break: keep-all !important;
  overflow-wrap: break-word !important;
  white-space: pre-line !important;
  word-spacing: normal !important;
  hyphens: none !important;
}

/* ИСПРАВЛЕННАЯ оптимизация для масштаба 0.7 и узких столбцов */
body[style*="scale(0.7)"] .chessboard-table .ant-table-thead > tr > th:nth-child(13),
body[style*="scale(0.7)"] .chessboard-table .ant-table-thead > tr > th:nth-child(14),
body[style*="scale(0.7)"] .chessboard-table .ant-table-thead > tr > th:nth-child(15) {
  font-size: 7px !important;
  line-height: 9px !important;
  padding: 1px !important;
  font-weight: 600 !important;
  /* КРИТИЧЕСКОЕ: увеличиваем минимальную ширину для масштаба 0.7 */
  min-width: 65px !important;
  width: auto !important;
  /* Сохраняем правильные переносы - ТОЛЬКО ПО ПРОБЕЛАМ */
  word-break: keep-all !important;
  overflow-wrap: break-word !important;
  white-space: pre-line !important;
  letter-spacing: normal !important;
  word-spacing: normal !important;
}

/* Все содержимое заголовков - строгое ограничение */
#root .chessboard-table .ant-table-thead > tr > th *,
.chessboard-table .ant-table-thead > tr > th *,
table.ant-table thead tr th * {
  height: auto !important;
  max-height: 58px !important;
  overflow: hidden !important;
  line-height: 12px !important;
  font-size: 10px !important;
  box-sizing: border-box !important;
}

/* Контейнер содержимого заголовка - ИСПРАВЛЕННОЕ решение */
#root .chessboard-table .ant-table-thead > tr > th > .ant-table-column-title,
.chessboard-table .ant-table-thead > tr > th > .ant-table-column-title,
table.ant-table thead tr th .ant-table-column-title {
  height: auto !important;
  max-height: 52px !important;
  overflow: hidden !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  /* ИСПРАВЛЕНИЕ: правильные настройки переносов ТОЛЬКО ПО ПРОБЕЛАМ */
  word-break: keep-all !important;
  overflow-wrap: break-word !important;
  hyphens: none !important;
  white-space: pre-line !important;
  text-align: center !important;
  line-height: 12px !important;
  padding: 0 !important;
  margin: 0 !important;
  flex-grow: 1 !important;
  /* Ограничиваем количество строк максимум 3 */
  -webkit-line-clamp: 3 !important;
  -webkit-box-orient: vertical !important;
  /* Но отключаем для white-space: pre-line */
  display: flex !important;
}

/* Сортировка и фильтры - тоже flex для правильного размещения */
#root .chessboard-table .ant-table-thead > tr > th .ant-table-column-sorters,
.chessboard-table .ant-table-thead > tr > th .ant-table-column-sorters,
table.ant-table thead tr th .ant-table-column-sorters {
  height: auto !important;
  max-height: 52px !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  margin: 0 !important;
  flex-grow: 1 !important;
}

/* Убираем лишние отступы у иконок сортировки */
#root .chessboard-table .ant-table-thead > tr > th .ant-table-column-sorter,
.chessboard-table .ant-table-thead > tr > th .ant-table-column-sorter,
table.ant-table thead tr th .ant-table-column-sorter {
  margin-left: 4px !important;
  height: auto !important;
  max-height: 20px !important;
  flex-shrink: 0 !important;
}

/* Специальное правило для наших кастомных заголовков */
#root .chessboard-table .ant-table-thead > tr > th.chessboard-header-cell,
.chessboard-table .ant-table-thead > tr > th.chessboard-header-cell {
  display: table-cell !important;
  vertical-align: middle !important;
  height: 60px !important;
  max-height: 60px !important;
  min-height: 60px !important;
  white-space: pre-line !important;
  text-align: center !important;
}

/* АТОМАРНАЯ защита - перехватываем любые inline стили */
#root .chessboard-table .ant-table-thead > tr > th[style],
.chessboard-table .ant-table-thead > tr > th[style] {
  display: table-cell !important;
  vertical-align: middle !important;
  height: 60px !important;
  max-height: 60px !important;
  min-height: 60px !important;
  text-align: center !important;
}
`

// Добавляем стили в head
if (typeof document !== 'undefined') {
  const styleElement = document.getElementById('chessboard-header-styles')
  if (!styleElement) {
    const style = document.createElement('style')
    style.id = 'chessboard-header-styles'
    style.textContent = headerStyles
    document.head.appendChild(style)
  } else {
    // Обновляем стили если они изменились
    styleElement.textContent = headerStyles
  }
}

// Функция принудительной фиксации высоты заголовков с адаптивностью
const forceHeaderHeight = () => {
  if (typeof document === 'undefined') return

  // Определяем текущий масштаб
  const bodyStyle = document.body.style.transform
  const scaleMatch = bodyStyle.match(/scale\(([\d.]+)\)/)
  const currentScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1.0

  // Адаптивные настройки в зависимости от масштаба
  const getScaleSettings = (scale: number) => {
    if (scale <= 0.7) {
      return {
        fontSize: '7px',
        lineHeight: '9px',
        padding: '0px',
        fontWeight: '600',
        letterSpacing: '-0.2px'
      }
    } else if (scale <= 0.8) {
      return {
        fontSize: '8px',
        lineHeight: '10px',
        padding: '0px 1px',
        fontWeight: '500',
        letterSpacing: 'normal'
      }
    } else if (scale <= 0.9) {
      return {
        fontSize: '9px',
        lineHeight: '11px',
        padding: '1px 1px',
        fontWeight: '500',
        letterSpacing: 'normal'
      }
    } else {
      return {
        fontSize: '10px',
        lineHeight: '12px',
        padding: '1px 2px',
        fontWeight: '500',
        letterSpacing: 'normal'
      }
    }
  }

  const settings = getScaleSettings(currentScale)

  const headers = document.querySelectorAll('.chessboard-table .ant-table-thead th')
  headers.forEach((header: Element, index: number) => {
    const th = header as HTMLElement

    // Определяем типы проблемных столбцов по классам
    const isFloorsColumn = th.classList.contains('floors-header')
    const isQuantitySpecColumn = th.classList.contains('quantity-spec-header')
    const isQuantityRdColumn = th.classList.contains('quantity-rd-header')
    const isUnitColumn = th.classList.contains('unit-header')
    const isBlockColumn = th.classList.contains('block-header')
    const isQuantityColumn = isQuantitySpecColumn || isQuantityRdColumn

    // Базовые стили для всех заголовков
    th.style.setProperty('display', 'table-cell', 'important')
    th.style.setProperty('vertical-align', 'middle', 'important')
    th.style.setProperty('height', '60px', 'important')
    th.style.setProperty('max-height', '60px', 'important')
    th.style.setProperty('min-height', '60px', 'important')
    th.style.setProperty('overflow', 'hidden', 'important')
    th.style.setProperty('box-sizing', 'border-box', 'important')
    th.style.setProperty('text-align', 'center', 'important')

    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: специальная обработка проблемных столбцов
    if (isFloorsColumn) {
      // Столбец "Этажи" - с переносом текста
      th.style.setProperty('white-space', 'normal', 'important')
      th.style.setProperty('word-break', 'break-word', 'important')
      th.style.setProperty('overflow-wrap', 'break-word', 'important')
      th.style.setProperty('min-width', '120px', 'important')
      th.style.setProperty('max-width', '120px', 'important')
      th.style.setProperty('width', '120px', 'important')
    } else if (isUnitColumn) {
      // Столбец "Ед.изм." - с переносом текста
      th.style.setProperty('white-space', 'normal', 'important')
      th.style.setProperty('word-break', 'break-word', 'important')
      th.style.setProperty('overflow-wrap', 'break-word', 'important')
      th.style.setProperty('min-width', '100px', 'important')
      th.style.setProperty('max-width', '100px', 'important')
      th.style.setProperty('width', '100px', 'important')
    } else if (isBlockColumn) {
      // Столбец "Корпус" - компактный и динамический с переносом
      th.style.setProperty('white-space', 'normal', 'important')
      th.style.setProperty('word-break', 'break-word', 'important')
      th.style.setProperty('overflow-wrap', 'break-word', 'important')
      th.style.setProperty('overflow', 'hidden', 'important')
      th.style.setProperty('min-width', '60px', 'important')
      th.style.setProperty('max-width', '120px', 'important')
      th.style.setProperty('width', 'auto', 'important')
      th.style.setProperty('padding', '2px 4px', 'important')
    } else if (isQuantityColumn) {
      // Столбцы количества - переносы ТОЛЬКО по \n
      th.style.setProperty('white-space', 'pre-line', 'important')
      th.style.setProperty('word-break', 'keep-all', 'important')
      th.style.setProperty('overflow-wrap', 'break-word', 'important')
      th.style.setProperty('hyphens', 'none', 'important')
      th.style.setProperty('min-width', '80px', 'important')
      th.style.setProperty('max-width', '80px', 'important')
      th.style.setProperty('width', '80px', 'important')
    } else {
      // Обычные столбцы
      th.style.setProperty('white-space', 'pre-line', 'important')
      th.style.setProperty('word-break', 'keep-all', 'important')
      th.style.setProperty('overflow-wrap', 'break-word', 'important')
      th.style.setProperty('hyphens', 'none', 'important')
    }

    // Адаптивные стили в зависимости от масштаба
    th.style.setProperty('font-size', settings.fontSize, 'important')
    th.style.setProperty('line-height', settings.lineHeight, 'important')
    th.style.setProperty('padding', settings.padding, 'important')
    th.style.setProperty('font-weight', settings.fontWeight, 'important')
    th.style.setProperty('letter-spacing', settings.letterSpacing, 'important')

    // Специальные настройки шрифта для проблемных столбцов
    if (isFloorsColumn) {
      th.style.setProperty('font-size', '10px', 'important')
      th.style.setProperty('line-height', '14px', 'important')
      th.style.setProperty('padding', '4px 8px', 'important')
    } else if (isUnitColumn) {
      th.style.setProperty('font-size', '10px', 'important')
      th.style.setProperty('line-height', '14px', 'important')
      th.style.setProperty('padding', '4px 8px', 'important')
    } else if (isBlockColumn) {
      th.style.setProperty('font-size', '10px', 'important')
      th.style.setProperty('line-height', '12px', 'important')
      th.style.setProperty('padding', '2px 4px', 'important')
      th.style.setProperty('font-weight', '500', 'important')
    } else if (isQuantityColumn) {
      if (currentScale <= 0.7) {
        th.style.setProperty('font-size', '7px', 'important')
        th.style.setProperty('line-height', '9px', 'important')
        th.style.setProperty('padding', '1px', 'important')
        th.style.setProperty('font-weight', '600', 'important')
      } else {
        th.style.setProperty('font-size', '9px', 'important')
        th.style.setProperty('line-height', '11px', 'important')
        th.style.setProperty('padding', '2px 4px', 'important')
      }
    }

    // Ограничиваем дочерние элементы
    const children = th.querySelectorAll('*')
    children.forEach((child: Element) => {
      const childEl = child as HTMLElement
      childEl.style.setProperty('max-height', '58px', 'important')
      childEl.style.setProperty('overflow', 'hidden', 'important')
      childEl.style.setProperty('font-size', settings.fontSize, 'important')
      childEl.style.setProperty('line-height', settings.lineHeight, 'important')
    })
  })
}

interface ChessboardTableProps {
  data: RowData[]
  originalData: RowData[] // Оригинальные данные из БД без новых строк
  loading: boolean
  tableMode: TableMode
  visibleColumns: string[]
  currentProjectId?: string
  onSelectionChange: (selectedRowKeys: React.Key[]) => void
  onRowUpdate: (rowId: string, updates: Partial<RowData>) => void
  onRowCopy: (rowId: string) => void
  onRowDelete: (rowId: string) => void
  onRowColorChange: (rowId: string, color: RowColor) => void
  onStartEditing: (rowId: string) => void
  onAddRowAfter?: (rowIndex: number) => void
  onCopyRowAfter?: (rowData: RowData, rowIndex: number) => void
  onRemoveNewRow?: (rowId: string) => void
}

export const ChessboardTable = memo(({
  data,
  originalData,
  loading,
  tableMode,
  visibleColumns,
  currentProjectId,
  onSelectionChange,
  onRowUpdate,
  onRowCopy,
  onRowDelete,
  onRowColorChange,
  onStartEditing,
  onAddRowAfter,
  onCopyRowAfter,
  onRemoveNewRow,
}: ChessboardTableProps) => {

  // Каскадная зависимость номенклатуры и поставщиков
  const cascadeHook = useNomenclatureSupplierCascade({
    enableCascade: true
  })


  // Загрузка данных справочников для селектов
  const { data: materialsData = [] } = useQuery({
    queryKey: ['materials-autocomplete'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('uuid, name')
        .order('name')
      if (error) throw error
      return data.map(item => ({ value: item.uuid, label: item.name })).filter(Boolean)
    },
  })

  const { data: costCategoriesData = [] } = useQuery({
    queryKey: ['cost-categories-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_categories')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data.map(item => ({ value: item.id, label: item.name }))
    },
  })

  // Оставляем для обратной совместимости
  const { data: costTypesData = [] } = useQuery({
    queryKey: ['detail-cost-categories-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('detail_cost_categories')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data.map(item => ({ value: item.id, label: item.name }))
    },
  })

  const { data: unitsData = [] } = useQuery({
    queryKey: ['units-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data.map(item => ({ value: item.id, label: item.name }))
    },
  })

  // Корпуса для выбранного проекта через projects_blocks
  const { data: blocksData = [] } = useQuery({
    queryKey: ['blocks-select', currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) {
        return []
      }

      const { data, error } = await supabase
        .from('blocks')
        .select(`
          id,
          name,
          projects_blocks!inner(
            project_id
          )
        `)
        .eq('projects_blocks.project_id', currentProjectId)
        .not('name', 'is', null)
        .neq('name', '')
        .order('name')

      if (error) throw error
      return data.map(item => ({ value: item.id, label: item.name })).filter(item => item.label && item.label.trim())
    },
    enabled: !!currentProjectId,
  })

  // Данные из каскадного хука (заменяют старые запросы номенклатуры и поставщиков)
  const nomenclatureData = cascadeHook.nomenclatureOptions.map(item => ({
    value: item.id,
    label: item.name
  }))

  const suppliersData = cascadeHook.allSupplierOptions.map(item => ({
    value: item.name, // Используем name как value для обратной совместимости
    label: item.name
  }))

  const { data: locationsData = [] } = useQuery({
    queryKey: ['locations-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data.map(item => ({ value: item.id, label: item.name }))
    },
  })

  // Данные для документации - Раздел (Тэги проекта)
  const { data: documentationTagsData = [] } = useQuery({
    queryKey: ['documentation-tags-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documentation_tags')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data.map(item => ({ value: item.id, label: item.name }))
    },
  })

  // Данные для документации - Шифр проекта (Документация) с каскадной фильтрацией по проекту
  const { data: documentationData = [] } = useQuery({
    queryKey: ['documentations-select', currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) {
        return []
      }

      const { data, error } = await supabase
        .from('documentations')
        .select(`
          id,
          code,
          project_name,
          tag_id,
          documentations_projects_mapping!inner(
            project_id
          )
        `)
        .eq('documentations_projects_mapping.project_id', currentProjectId)
        .order('code')

      if (error) throw error
      return data.map(item => ({
        value: item.id,
        label: item.code,
        projectName: item.project_name,
        tagId: item.tag_id
      }))
    },
    enabled: !!currentProjectId,
  })

  // Данные для видов затрат с каскадной фильтрацией
  const { data: allCostTypesData = [] } = useQuery({
    queryKey: ['detail-cost-categories-with-category'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('detail_cost_categories')
        .select('id, name, cost_category_id')
        .order('name')
      if (error) throw error
      return data.map(item => ({
        value: item.id,
        label: item.name,
        categoryId: item.cost_category_id
      }))
    },
  })

  // ИСПРАВЛЕННАЯ принудительная фиксация высоты заголовков после рендера
  useEffect(() => {
    // Однократный вызов при изменении данных для применения исправлений переносов
    const timer = setTimeout(() => {
      forceHeaderHeight() // ВКЛЮЧЕНО с исправлениями переносов
    }, 100)

    return () => {
      clearTimeout(timer)
    }
  }, [data, loading, visibleColumns, tableMode])

  // Состояние для модального окна этажей
  const [floorModalOpen, setFloorModalOpen] = useState(false)
  const [floorModalData, setFloorModalData] = useState<FloorModalRow[]>([])
  const [floorModalInfo, setFloorModalInfo] = useState<FloorModalInfo>({
    projectCode: '',
    projectName: '',
    workName: '',
    material: '',
    unit: '',
  })
  const [floorModalIsEdit, setFloorModalIsEdit] = useState(false)
  const [floorModalCurrentRowId, setFloorModalCurrentRowId] = useState<string>('')


  // Функция для открытия модального окна этажей по ID записи (с принудительной очисткой)
  const openFloorModalById = async (recordId: string, isEdit: boolean = false) => {
    // Ищем актуальную запись в data
    const record = data.find(item => item.id === recordId)
    if (!record) {
      return
    }

    // Сначала закрываем модальное окно и очищаем данные
    setFloorModalOpen(false)
    setFloorModalData([])
    setFloorModalInfo({
      projectCode: '',
      projectName: '',
      workName: '',
      material: '',
      unit: '',
    })

    // Даем время на применение состояния
    await new Promise(resolve => setTimeout(resolve, 50))

    // Формируем данные для модального окна из floorQuantities
    const floorData: FloorModalRow[] = []
    if (record.floorQuantities) {
      Object.entries(record.floorQuantities).forEach(([floor, quantities]) => {
        const floorItem = {
          floor: Number(floor),
          quantityPd: quantities.quantityPd,
          quantitySpec: quantities.quantitySpec,
          quantityRd: quantities.quantityRd,
        }
        floorData.push(floorItem)
      })
    }

    // Если нет данных этажей, но есть общие количества, создаем одну запись
    if (floorData.length === 0) {
      const fallbackData = {
        floor: 1,
        quantityPd: record.quantityPd,
        quantitySpec: record.quantitySpec,
        quantityRd: record.quantityRd,
      }
      floorData.push(fallbackData)
    }

    const newModalInfo = {
      projectCode: record.documentationCode,
      projectName: record.documentationProjectName,
      workName: record.workName,
      material: record.material,
      unit: record.unit,
    }

    // Устанавливаем новые данные и открываем модальное окно
    setFloorModalData(floorData)
    setFloorModalInfo(newModalInfo)
    setFloorModalIsEdit(isEdit)
    setFloorModalCurrentRowId(recordId)
    setFloorModalOpen(true)
  }

  const closeFloorModal = useCallback(() => {
    setFloorModalOpen(false)
    setFloorModalData([])
    setFloorModalIsEdit(false)
    setFloorModalCurrentRowId('')
  }, [])

  const saveFloorModal = useCallback((floors: FloorModalRow[]) => {
    if (!floorModalCurrentRowId) {
      closeFloorModal()
      return
    }

    // Конвертируем данные этажей в формат floorQuantities
    const floorQuantities: Record<number, any> = {}

    // Рассчитываем суммы для всех типов количества
    let totalQuantityPd = 0
    let totalQuantitySpec = 0
    let totalQuantityRd = 0

    floors.forEach(floorData => {
      if (floorData.floor && floorData.floor > 0) {
        floorQuantities[floorData.floor] = {
          quantityPd: floorData.quantityPd || '0',
          quantitySpec: floorData.quantitySpec || '0',
          quantityRd: floorData.quantityRd || '0'
        }

        // Суммируем для обновления основных полей
        totalQuantityPd += parseFloat(floorData.quantityPd || '0')
        totalQuantitySpec += parseFloat(floorData.quantitySpec || '0')
        totalQuantityRd += parseFloat(floorData.quantityRd || '0')
      }
    })

    // Обновляем запись с новыми данными
    onRowUpdate(floorModalCurrentRowId, {
      floorQuantities,
      quantityPd: totalQuantityPd,
      quantitySpec: totalQuantitySpec,
      quantityRd: totalQuantityRd
    })

    closeFloorModal()
  }, [floorModalCurrentRowId, onRowUpdate, closeFloorModal])


  // Функция для проверки, есть ли у записи множественные этажи
  const hasMultipleFloors = useCallback((record: RowData) => {
    if (!record.floors) return false
    return checkMultipleFloors(record.floors.toString())
  }, [])

  // Обработчик изменения поля этажей с автоматическим распределением количеств
  const handleFloorsChange = useCallback((recordId: string, newFloorsValue: string) => {
    // Находим запись, чтобы получить текущие количества
    const record = data.find(r => r.id === recordId)
    if (!record) {
      console.error('🏢 ERROR: Record not found for floors change:', recordId)
      return
    }

    console.log('🏢 Floor change START:', {
      recordId,
      newFloorsValue,
      currentFloors: record.floors,
      currentFloorQuantities: record.floorQuantities
    })

    // Получаем текущие общие количества
    const currentQuantityPd = parseFloat(record.quantityPd || '0')
    const currentQuantitySpec = parseFloat(record.quantitySpec || '0')
    const currentQuantityRd = parseFloat(record.quantityRd || '0')

    console.log('🏢 Current quantities:', {
      currentQuantityPd,
      currentQuantitySpec,
      currentQuantityRd
    })

    // Если количества есть, распределяем их по новым этажам
    const newFloorQuantities = distributeQuantitiesAcrossFloors(
      newFloorsValue,
      record.floorQuantities || {},
      currentQuantityPd,
      currentQuantitySpec,
      currentQuantityRd
    )


    const updateData = {
      floors: newFloorsValue,
      floorQuantities: newFloorQuantities
    }


    // Обновляем запись с новыми этажами и распределенными количествами
    onRowUpdate(recordId, updateData)

  }, [data, onRowUpdate])

  // ОПТИМИЗАЦИЯ: стабильные обработчики событий (ИСПРАВЛЕНО: убираем циклические зависимости)
  const handleStartEditing = useCallback((recordId: string) => () => onStartEditing(recordId), [onStartEditing])
  const handleRowDelete = useCallback((recordId: string) => () => onRowDelete(recordId), [onRowDelete])
  const handleRowCopy = useCallback((recordId: string) => () => onRowCopy(recordId), [onRowCopy])
  const handleOpenFloorModal = useCallback((recordId: string) => () => openFloorModalById(recordId, true), [openFloorModalById])

  // ОПТИМИЗАЦИЯ DOM: динамическая конфигурация для больших таблиц
  const isLargeDataset = useMemo(() => data.length > LARGE_TABLE_CONFIG.virtualThreshold, [data.length])

  const tableScrollConfig = useMemo(() => {
    // ИСПРАВЛЕНИЕ: упрощаем конфигурацию скролла для работы с flex-контейнером
    return {
      x: 'max-content' as const,
      // Убираем y-скролл, так как теперь за него отвечает внешний контейнер
    }
  }, [isLargeDataset])

  // Логирование для мониторинга производительности больших таблиц
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isLargeDataset) {
      console.log('🔍 Large dataset detected in ChessboardTable:', {
        dataLength: data.length,
        threshold: LARGE_TABLE_CONFIG.virtualThreshold,
        usingOptimizedConfig: true
      })
    }
  }, [isLargeDataset, data.length])

  // Базовые столбцы таблицы
  const allColumns: ColumnsType<RowData> = useMemo(() => [
    // Служебный столбец с действиями
    {
      title: '',
      key: COLUMN_KEYS.ACTIONS,
      width: 85, // Ширина для color picker + редактировать + удалить
      fixed: 'left' as const,
      onHeaderCell: () => ({
        className: 'chessboard-header-cell',
        style: {
          whiteSpace: 'pre-line',
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
        },
      }),
      render: (_, record) => (
        <Space size="small">
          {(tableMode.mode === 'view' || tableMode.mode === 'edit') && (
            <>
              <Tooltip title="Цвет строки">
                <RowColorPicker
                  value={record.color}
                  onChange={(color) => onRowColorChange(record.id, color)}
                />
              </Tooltip>
              <Tooltip title="Редактировать">
                <div>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={handleStartEditing(record.id)}
                  />
                </div>
              </Tooltip>
              <Tooltip title="Удалить">
                <div>
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    danger
                    onClick={handleRowDelete(record.id)}
                  />
                </div>
              </Tooltip>
            </>
          )}
          {tableMode.mode === 'add' && (
            <>
              <Tooltip title="Цвет строки">
                <RowColorPicker
                  value={record.color}
                  onChange={(color) => onRowColorChange(record.id, color)}
                />
              </Tooltip>
              <Tooltip title="Добавить строку">
                <div>
                  <Button
                    type="text"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      console.log('🔍 Добавить строку - поиск индекса:', { recordId: record.id, isNew: record.id.startsWith('new-') || record.id.startsWith('copy-') }) // LOG: отладка добавления строки

                      // Если это новая строка, ищем её позицию в отображаемых данных и преобразуем в оригинальный индекс
                      if (record.id.startsWith('new-') || record.id.startsWith('copy-')) {
                        const displayIndex = data.findIndex(row => row.id === record.id)
                        console.log('📍 Новая строка найдена на позиции:', displayIndex) // LOG: позиция новой строки

                        // Для новых строк находим предыдущую оригинальную строку
                        let originalIndex = -1
                        for (let i = displayIndex - 1; i >= 0; i--) {
                          const prevRow = data[i]
                          if (!prevRow.id.startsWith('new-') && !prevRow.id.startsWith('copy-')) {
                            originalIndex = originalData.findIndex(row => row.id === prevRow.id)
                            console.log('📍 Найдена предыдущая оригинальная строка на индексе:', originalIndex) // LOG: предыдущая оригинальная строка
                            break
                          }
                        }

                        if (originalIndex !== -1) {
                          onAddRowAfter?.(originalIndex)
                        } else {
                          // Если предыдущей оригинальной строки нет, вставляем в начало (после первой строки или как первая)
                          console.log('📍 Предыдущей оригинальной строки нет, вставляем в начало') // LOG: вставка в начало
                          onAddRowAfter?.(-1) // Специальное значение для вставки в начало
                        }
                      } else {
                        // Для оригинальных строк ищем в originalData
                        const rowIndex = originalData.findIndex(row => row.id === record.id)
                        console.log('📍 Оригинальная строка найдена на индексе:', rowIndex) // LOG: найденный индекс оригинальной строки
                        if (rowIndex !== -1) {
                          onAddRowAfter?.(rowIndex)
                        } else {
                          console.warn('⚠️ Оригинальная строка не найдена!') // LOG: строка не найдена
                        }
                      }
                    }}
                  />
                </div>
              </Tooltip>
              <Tooltip title="Скопировать">
                <div>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => {
                      console.log('🔍 Копировать строку - поиск индекса:', { recordId: record.id, isNew: record.id.startsWith('new-') || record.id.startsWith('copy-') }) // LOG: отладка копирования строки

                      // Если это новая строка, ищем её позицию в отображаемых данных и преобразуем в оригинальный индекс
                      if (record.id.startsWith('new-') || record.id.startsWith('copy-')) {
                        const displayIndex = data.findIndex(row => row.id === record.id)
                        console.log('📍 Новая строка для копирования найдена на позиции:', displayIndex) // LOG: позиция новой строки

                        // Для новых строк находим предыдущую оригинальную строку
                        let originalIndex = -1
                        for (let i = displayIndex - 1; i >= 0; i--) {
                          const prevRow = data[i]
                          if (!prevRow.id.startsWith('new-') && !prevRow.id.startsWith('copy-')) {
                            originalIndex = originalData.findIndex(row => row.id === prevRow.id)
                            console.log('📍 Найдена предыдущая оригинальная строка для копирования на индексе:', originalIndex) // LOG: предыдущая оригинальная строка
                            break
                          }
                        }

                        if (originalIndex !== -1) {
                          onCopyRowAfter?.(record, originalIndex)
                        } else {
                          // Если предыдущей оригинальной строки нет, вставляем в начало
                          console.log('📍 Предыдущей оригинальной строки нет, копируем в начало') // LOG: копирование в начало
                          onCopyRowAfter?.(record, -1) // Специальное значение для вставки в начало
                        }
                      } else {
                        // Для оригинальных строк ищем в originalData
                        const rowIndex = originalData.findIndex(row => row.id === record.id)
                        console.log('📍 Оригинальная строка для копирования найдена на индексе:', rowIndex) // LOG: найденный индекс оригинальной строки для копирования
                        if (rowIndex !== -1) {
                          onCopyRowAfter?.(record, rowIndex)
                        } else {
                          console.warn('⚠️ Оригинальная строка для копирования не найдена!') // LOG: оригинальная строка для копирования не найдена
                        }
                      }
                    }}
                  />
                </div>
              </Tooltip>
              <Tooltip title="Удалить">
                <div>
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    danger
                    onClick={() => {
                      if (record.isNew) {
                        onRemoveNewRow?.(record.id)
                      } else {
                        handleRowDelete(record.id)()
                      }
                    }}
                  />
                </div>
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },

    // Раздел (из справочника Тэги проекта)
    {
      title: 'Раздел',
      key: COLUMN_KEYS.DOCUMENTATION_SECTION,
      dataIndex: 'documentationSection',
      width: 'auto',
      minWidth: 30,
      maxWidth: 60,
      filterMode: 'tree' as const,
      filterSearch: true,
      onFilter: (value, record) => record.documentationSection.includes(value as string),
      onHeaderCell: () => ({
        className: 'chessboard-header-cell',
        style: {
          whiteSpace: 'pre-line',
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
        },
      }),
      render: (value, record) => {
        const isEditing = (record as any).isEditing
        if (isEditing) {
          return (
            <Select
              value={value || undefined}
              onChange={(newValue) => {
                const selectedTag = documentationTagsData.find(tag => tag.value === newValue)
                onRowUpdate(record.id, {
                  documentationSection: selectedTag ? selectedTag.label : '',
                  documentationSectionId: newValue,
                  // Сброс зависимых полей при изменении раздела
                  documentationCode: '',
                  documentationCodeId: '',
                  documentationProjectName: ''
                })
              }}
              options={documentationTagsData}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              placeholder=""
              size="small"
              style={{ width: '100%' }}
              dropdownStyle={getDynamicDropdownStyle(documentationTagsData)}
            />
          )
        }
        return value
      },
    },

    // Шифр проекта (из справочника Документация)
    {
      title: 'Шифр проекта',
      key: COLUMN_KEYS.DOCUMENTATION_CODE,
      dataIndex: 'documentationCode',
      width: 'auto',
      minWidth: 60,
      maxWidth: 120,
      filterMode: 'tree' as const,
      filterSearch: true,
      onFilter: (value, record) => record.documentationCode.includes(value as string),
      onHeaderCell: () => ({
        className: 'chessboard-header-cell',
        style: {
          whiteSpace: 'pre-line',
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
        },
      }),
      render: (value, record) => {
        const isEditing = (record as any).isEditing
        if (isEditing) {
          return (
            <Select
              value={value || undefined}
              onChange={async (newValue) => {
                const selectedDoc = documentationData.find(doc => doc.value === newValue)

                // Базовое обновление полей документа
                const updateData = {
                  documentationCode: selectedDoc ? selectedDoc.label : '',
                  documentationCodeId: newValue,
                  documentationProjectName: selectedDoc ? selectedDoc.projectName : '',
                  // Сбрасываем версию при смене документа
                  documentationVersionId: '',
                  documentationVersion: ''
                }

                // Если выбран документ, автоматически загружаем и выбираем последнюю версию
                if (newValue) {
                  try {
                    const versions = await documentationApi.getVersionsByDocumentId(newValue)
                    if (versions.length > 0) {
                      // Находим версию с максимальным номером
                      const latestVersion = versions.reduce((max, current) =>
                        current.versionNumber > max.versionNumber ? current : max
                      )
                      updateData.documentationVersionId = latestVersion.value
                      updateData.documentationVersion = latestVersion.label
                    }
                  } catch (error) {
                    console.error('Ошибка загрузки версий документа:', error)
                  }
                }

                onRowUpdate(record.id, updateData)
              }}
              // Фильтрация по выбранному разделу
              options={documentationData.filter(doc => {
                const currentSection = (record as any).documentationSectionId
                return !currentSection || doc.tagId === currentSection
              })}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              placeholder=""
              size="small"
              style={{ width: '100%' }}
              dropdownStyle={getDynamicDropdownStyle(documentationData)}
            />
          )
        }
        return value
      },
    },

    // Наименование проекта (подтягивается зависимое от Шифра проекта)
    {
      title: 'Наименование\nпроекта',
      key: COLUMN_KEYS.DOCUMENTATION_PROJECT_NAME,
      dataIndex: 'documentationProjectName',
      width: 300,
      filterMode: 'tree' as const,
      filterSearch: true,
      onFilter: (value, record) => record.documentationProjectName.includes(value as string),
      onHeaderCell: () => ({
        className: 'chessboard-header-cell',
        style: {
          whiteSpace: 'pre-line',
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
        },
      }),
    },

    // Версия проекта
    {
      title: 'Вер.',
      key: COLUMN_KEYS.DOCUMENTATION_VERSION,
      dataIndex: 'documentationVersion',
      width: 70,
      onHeaderCell: () => ({
        className: 'chessboard-header-cell',
        style: {
          whiteSpace: 'pre-line',
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
        },
      }),
      render: (value, record) => {
        const isEditing = (record as any).isEditing
        if (isEditing) {
          const currentDocumentId = (record as any).documentationCodeId
          const currentVersionId = (record as any).documentationVersionId


          return (
            <VersionSelect
              value={currentVersionId || ''}
              documentId={currentDocumentId}
              isEditing={true} // LOG: передаем флаг режима редактирования
              onChange={(versionId, versionNumber, documentCodeId) => {
                console.log('📝 Version onChange called:', { versionId, versionNumber, documentCodeId }) // LOG: изменение версии

                onRowUpdate(record.id, {
                  documentationVersionId: versionId,
                  documentationVersion: versionNumber,
                  documentationCodeId: documentCodeId || '' // Используем переданный documentCodeId из VersionSelect
                })
              }}
            />
          )
        }
        return <span>{value || ''}</span>
      },
    },

    // Корпус (из таблицы blocks)
    {
      title: 'Корпус',
      key: COLUMN_KEYS.BLOCK,
      dataIndex: 'block',
      filterMode: 'tree' as const,
      filterSearch: true,
      onFilter: (value, record) => record.block.includes(value as string),
      onHeaderCell: () => ({
        className: 'chessboard-header-cell block-header',
        'data-block-column': 'true',
        style: {
          whiteSpace: 'nowrap',
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
        },
      }),
      onCell: () => ({
        'data-block-column': 'true',
      }),
      render: (value, record) => {
        const isEditing = (record as any).isEditing
        if (isEditing) {
          return (
            <Select
              value={value || undefined}
              onChange={(newValue) => onRowUpdate(record.id, { block: newValue })}
              options={blocksData}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              placeholder=""
              size="small"
              style={{ width: '100%' }}
              dropdownStyle={getDynamicDropdownStyle(blocksData)}
              placement="bottomLeft"
            />
          )
        }
        return value
      },
    },

    // Этажи
    {
      title: 'Этажи',
      key: COLUMN_KEYS.FLOORS,
      dataIndex: 'floors',
      width: 100, // Уменьшена ширина, кнопка + перенесена
      onHeaderCell: () => ({
        className: 'chessboard-header-cell floors-header',
        style: {
          whiteSpace: 'nowrap', // НЕ переносить заголовок "Этажи"
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
          minWidth: '100px', // Уменьшенная минимальная ширина
          maxWidth: '100px', // Максимальная ширина
          width: '100px', // Фиксированная ширина
          overflow: 'hidden',
          wordBreak: 'break-word', // Разрывать слова для переноса
          overflowWrap: 'break-word', // Перенос длинных слов
        },
      }),
      onCell: () => ({
        style: {
          whiteSpace: 'nowrap', // НЕ переносить содержимое ячеек "Этажи"
          textAlign: 'center',
          minWidth: '100px',
          maxWidth: '100px',
        },
      }),
      render: (value, record) => {
        const isEditing = (record as any).isEditing
        if (isEditing) {
          return (
            <Input
              value={value || ''}
              onChange={(e) => handleFloorsChange(record.id, e.target.value)}
              size="small"
              placeholder="1,2,3 или 1-5"
              style={{ width: '100%' }}
            />
          )
        }
        return value
      },
    },

    // Категория затрат
    {
      title: 'Категория\nзатрат',
      key: COLUMN_KEYS.COST_CATEGORY,
      dataIndex: 'costCategory',
      width: 200,
      filterMode: 'tree' as const,
      filterSearch: true,
      onFilter: (value, record) => record.costCategory.includes(value as string),
      onHeaderCell: () => ({
        className: 'chessboard-header-cell',
        style: {
          whiteSpace: 'pre-line',
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
        },
      }),
      render: (value, record) => {
        const isEditing = (record as any).isEditing
        if (isEditing) {
          return (
            <Select
              value={value || undefined}
              onChange={(newValue) => {
                const selectedCategory = costCategoriesData.find(cat => cat.value === newValue)
                onRowUpdate(record.id, {
                  costCategory: selectedCategory ? selectedCategory.label : '',
                  costCategoryId: newValue,
                  // Сброс зависимых полей при смене категории затрат
                  costType: '',
                  costTypeId: ''
                })
              }}
              options={costCategoriesData}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              placeholder=""
              size="small"
              style={{ width: '100%' }}
              dropdownStyle={getDynamicDropdownStyle(costCategoriesData)}
            />
          )
        }
        return value
      },
    },

    // Вид затрат
    {
      title: 'Вид затрат',
      key: COLUMN_KEYS.COST_TYPE,
      dataIndex: 'costType',
      width: 200,
      filterMode: 'tree' as const,
      filterSearch: true,
      onFilter: (value, record) => record.costType.includes(value as string),
      onHeaderCell: () => ({
        className: 'chessboard-header-cell',
        style: {
          whiteSpace: 'pre-line',
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
        },
      }),
      render: (value, record) => {
        const isEditing = (record as any).isEditing
        if (isEditing) {
          return (
            <Select
              value={value || undefined}
              onChange={(newValue) => {
                const selectedCostType = allCostTypesData.find(type => type.value === newValue)
                onRowUpdate(record.id, {
                  costType: selectedCostType ? selectedCostType.label : '',
                  costTypeId: newValue
                })
              }}
              // Фильтрация по выбранной категории затрат
              options={(() => {
                const currentCategory = (record as any).costCategoryId

                if (!currentCategory) {
                  // Если категория не выбрана, показываем все виды затрат
                  return allCostTypesData
                }

                return allCostTypesData.filter(type => {
                  const categoryId = currentCategory.toString()
                  const typeCategoryId = type.categoryId ? type.categoryId.toString() : null
                  return typeCategoryId === categoryId
                })
              })()}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              placeholder=""
              size="small"
              disabled={!record.costCategoryId} // Отключаем если не выбрана категория затрат
              style={{
                width: '100%',
                minHeight: 'auto',
                height: 'auto'
              }}
              dropdownStyle={getDynamicDropdownStyle((() => {
                const categoryId = record.costCategoryId ? record.costCategoryId.toString() : null
                return allCostTypesData.filter(type => {
                  const typeCategoryId = type.categoryId ? type.categoryId.toString() : null
                  return typeCategoryId === categoryId
                })
              })())}
            />
          )
        }
        return value
      },
    },

    // Наименование работ
    {
      title: 'Наименование\nработ',
      key: COLUMN_KEYS.WORK_NAME,
      dataIndex: 'workName',
      width: 'auto',
      minWidth: 60,
      maxWidth: 200,
      filterMode: 'tree' as const,
      filterSearch: true,
      onFilter: (value, record) => record.workName.includes(value as string),
      onHeaderCell: () => ({
        className: 'chessboard-header-cell',
        style: {
          whiteSpace: 'pre-line',
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
        },
      }),
      render: (value, record) => {
        const isEditing = (record as any).isEditing
        if (isEditing) {
          const costTypeId = (record as RowData).costTypeId
          const costCategoryId = (record as RowData).costCategoryId
          const currentRateId = (record as RowData).rateId

          return (
            <WorkNameSelect
              value={currentRateId || ''} // Используем rateId как value
              costTypeId={costTypeId}
              costCategoryId={costCategoryId}
              onChange={(selectedRateId, option) => {
                // selectedRateId - это ID расценки, option.label - это название работы
                const selectedWorkName = option?.label || ''
                onRowUpdate(record.id, {
                  workName: selectedWorkName,
                  rateId: selectedRateId
                })
              }}
            />
          )
        }
        return <span>{value || ''}</span>
      },
    },

    // Ед.Изм. Работ
    {
      title: 'Ед.Изм.\nРабот',
      key: COLUMN_KEYS.WORK_UNIT,
      dataIndex: 'workUnit',
      width: 'auto',
      minWidth: 60,
      maxWidth: 100,
      filterMode: 'tree' as const,
      filterSearch: true,
      onFilter: (value, record) => record.workUnit?.includes(value as string),
      onHeaderCell: () => ({
        className: 'chessboard-header-cell',
        style: {
          whiteSpace: 'pre-line',
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
        },
      }),
      render: (value, record) => {
        return <span>{value || ''}</span>
      },
    },

    // Локализация
    {
      title: 'Локализация',
      key: COLUMN_KEYS.LOCATION,
      dataIndex: 'location',
      width: 80,
      filterMode: 'tree' as const,
      filterSearch: true,
      onFilter: (value, record) => record.location.includes(value as string),
      onHeaderCell: () => ({
        className: 'chessboard-header-cell',
        style: {
          whiteSpace: 'nowrap', // НЕ переносить заголовок "Локализация"
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
          overflow: 'hidden',
          wordBreak: 'break-word', // Разрывать слова для переноса
          overflowWrap: 'break-word', // Перенос длинных слов
        },
      }),
      onCell: () => ({
        style: {
          whiteSpace: 'nowrap', // НЕ переносить содержимое ячеек "Локализация"
          textAlign: 'center',
        },
      }),
      render: (value, record) => {
        const isEditing = (record as any).isEditing
        if (isEditing) {
          const currentLocationId = (record as RowData).locationId
          return (
            <Select
              value={currentLocationId || undefined} // Используем locationId как value
              onChange={(newValue, option) => {
                // newValue - это ID локализации, option.label - это название локализации
                const selectedLocationName = option?.label || ''
                onRowUpdate(record.id, {
                  location: selectedLocationName,
                  locationId: newValue
                })
              }}
              options={locationsData}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              placeholder=""
              size="small"
              style={{ width: '100%' }}
              dropdownStyle={getDynamicDropdownStyle(locationsData)}
            />
          )
        }
        return value
      },
    },

    // Материал
    {
      title: 'Материал',
      key: COLUMN_KEYS.MATERIAL,
      dataIndex: 'material',
      filterMode: 'tree' as const,
      filterSearch: true,
      onFilter: (value, record) => record.material.includes(value as string),
      onHeaderCell: () => ({
        className: 'chessboard-header-cell',
        style: {
          whiteSpace: 'pre-line',
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
        },
      }),
      render: (value, record) => {
        const isEditing = (record as any).isEditing

        if (isEditing) {
          // Находим UUID материала для отредактированной строки или используем исходный
          const currentMaterialUuid = record.materialId || record.material
          // Находим название материала по UUID для отображения
          const currentMaterialName = materialsData.find(m => m.value === currentMaterialUuid)?.label || value || ''

          return (
            <AutoComplete
              value={currentMaterialName}
              onChange={(newValue) => {
                // Ищем UUID материала по введенному названию
                const selectedMaterial = materialsData.find(m => m.label === newValue)
                const materialUuid = selectedMaterial?.value || newValue // Если не найден UUID, используем введенный текст
                onRowUpdate(record.id, { material: materialUuid })
              }}
              options={materialsData}
              filterOption={(inputValue, option) =>
                option?.label?.toString().toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
              }
              size="small"
              style={{ width: '100%' }}
              placeholder="Введите материал..."
              dropdownStyle={getDynamicDropdownStyle(materialsData)}
            />
          )
        }

        // В режиме просмотра показываем название материала, если value содержит UUID
        const materialName = materialsData.find(m => m.value === value)?.label || value || ''
        return <span>{materialName}</span>
      },
    },

    // Тип материала
    {
      title: 'Тип\nматериала',
      key: COLUMN_KEYS.MATERIAL_TYPE,
      dataIndex: 'materialType',
      width: 60,
      filterMode: 'tree' as const,
      filterSearch: true,
      onFilter: (value, record) => record.materialType?.includes(value as string),
      onHeaderCell: () => ({
        className: 'chessboard-header-cell',
        style: {
          whiteSpace: 'pre-line',
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
        },
      }),
      render: (value, record) => {
        const isEditing = (record as any).isEditing
        if (isEditing) {
          return (
            <Select
              value={value || 'База'}
              onChange={(newValue) => onRowUpdate(record.id, { materialType: newValue })}
              options={MATERIAL_TYPE_OPTIONS}
              size="small"
              style={STABLE_STYLES.fullWidth}
              dropdownStyle={getDynamicDropdownStyle(MATERIAL_TYPE_OPTIONS)}
              placeholder=""
            />
          )
        }
        return <span>{value || 'База'}</span>
      },
    },

    // Кол-во по ПД
    {
      title: 'Кол-во\nпо ПД',
      key: COLUMN_KEYS.QUANTITY_PD,
      dataIndex: 'quantityPd',
      width: 80,
      onHeaderCell: () => ({
        className: 'chessboard-header-cell',
        style: {
          whiteSpace: 'pre-line',
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '12px',
          padding: '2px 4px',
          wordBreak: 'keep-all',
          overflowWrap: 'break-word',
          minWidth: '80px',
          maxHeight: '52px',
          overflow: 'hidden',
        },
      }),
      render: (value, record) => {
        const isMultipleFloors = hasMultipleFloors(record)
        const isEditing = (record as any).isEditing

        if (isEditing) {
          if (isMultipleFloors) {
            return (
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  value={value || 0}
                  onChange={(newValue) => {
                    const quantity = newValue || 0
                    onRowUpdate(record.id, { quantityPd: quantity })
                  }}
                  size="small"
                  style={{ width: '100%', flex: 1 }}
                  min={0}
                  precision={2}
                  formatter={(val) => {
                    if (val === null || val === undefined) return ''
                    const num = Number(val)
                    return num % 1 === 0 ? num.toString() : num.toString()
                  }}
                />
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleOpenFloorModal(record.id)}
                  title="Редактировать по этажам"
                  style={STABLE_STYLES.floorButton}
                />
              </Space.Compact>
            )
          } else {
            return (
              <InputNumber
                value={value || 0}
                onChange={(newValue) => {
                  const quantity = newValue || 0
                  onRowUpdate(record.id, { quantityPd: quantity })
                }}
                size="small"
                style={{ width: '100%' }}
                min={0}
                precision={2}
                formatter={(val) => {
                  if (val === null || val === undefined) return ''
                  const num = Number(val)
                  return num % 1 === 0 ? num.toString() : num.toString()
                }}
              />
            )
          }
        } else {
          // В режиме просмотра для множественных этажей показываем ссылку
          if (isMultipleFloors && value) {
            return (
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => handleOpenFloorModal(record.id)()}
              >
                {value || '0'}
              </Button>
            )
          }
          return <span>{value || '0'}</span>
        }
      },
    },

    // Кол-во по спецификации РД
    {
      title: 'Кол-во по\nспецификации\nРД',
      key: COLUMN_KEYS.QUANTITY_SPEC,
      dataIndex: 'quantitySpec',
      width: 80, // Увеличенная ширина
      onHeaderCell: () => ({
        className: 'chessboard-header-cell quantity-spec-header',
        style: {
          whiteSpace: 'pre-line', // Разрешены переносы по \n
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '12px',
          padding: '2px 4px',
          wordBreak: 'keep-all', // НЕ разрывать слова в середине
          overflowWrap: 'break-word', // Переносить только целые слова
          hyphens: 'none', // НЕ использовать дефисы
          minWidth: '80px', // Увеличенная минимальная ширина
          maxWidth: '80px', // Фиксированная максимальная ширина
          width: '80px', // Фиксированная ширина
          maxHeight: '52px',
          overflow: 'hidden',
        },
      }),
      render: (value, record) => {
        const isMultipleFloors = hasMultipleFloors(record)
        const isEditing = (record as any).isEditing

        if (isEditing) {
          if (isMultipleFloors) {
            return (
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  value={value || 0}
                  onChange={(newValue) => {
                    const quantity = newValue || 0
                    onRowUpdate(record.id, { quantitySpec: quantity })
                  }}
                  size="small"
                  style={{ width: '100%', flex: 1 }}
                  min={0}
                  precision={2}
                  formatter={(val) => {
                    if (val === null || val === undefined) return ''
                    const num = Number(val)
                    return num % 1 === 0 ? num.toString() : num.toString()
                  }}
                />
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleOpenFloorModal(record.id)}
                  title="Редактировать по этажам"
                  style={STABLE_STYLES.floorButton}
                />
              </Space.Compact>
            )
          } else {
            return (
              <InputNumber
                value={value || 0}
                onChange={(newValue) => {
                  const quantity = newValue || 0
                  onRowUpdate(record.id, { quantitySpec: quantity })
                }}
                size="small"
                style={{ width: '100%' }}
                min={0}
                precision={2}
                formatter={(val) => {
                  if (val === null || val === undefined) return ''
                  const num = Number(val)
                  return num % 1 === 0 ? num.toString() : num.toString()
                }}
              />
            )
          }
        } else {
          // В режиме просмотра для множественных этажей показываем ссылку
          if (isMultipleFloors && value) {
            return (
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => handleOpenFloorModal(record.id)()}
              >
                {value || '0'}
              </Button>
            )
          }
          return <span>{value || '0'}</span>
        }
      },
    },

    // Кол-во по пересчету РД
    {
      title: 'Кол-во по\nпересчету\nРД',
      key: COLUMN_KEYS.QUANTITY_RD,
      dataIndex: 'quantityRd',
      width: 80, // Увеличенная ширина
      onHeaderCell: () => ({
        className: 'chessboard-header-cell quantity-rd-header',
        style: {
          whiteSpace: 'pre-line', // Разрешены переносы по \n
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '12px',
          padding: '2px 4px',
          wordBreak: 'keep-all', // НЕ разрывать слова в середине
          overflowWrap: 'break-word', // Переносить только целые слова
          hyphens: 'none', // НЕ использовать дефисы
          minWidth: '80px', // Увеличенная минимальная ширина
          maxWidth: '80px', // Фиксированная максимальная ширина
          width: '80px', // Фиксированная ширина
          maxHeight: '52px',
          overflow: 'hidden',
        },
      }),
      render: (value, record) => {
        const isMultipleFloors = hasMultipleFloors(record)
        const isEditing = (record as any).isEditing

        if (isEditing) {
          if (isMultipleFloors) {
            return (
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  value={value || 0}
                  onChange={(newValue) => {
                    const quantity = newValue || 0
                    onRowUpdate(record.id, { quantityRd: quantity })
                  }}
                  size="small"
                  style={{ width: '100%', flex: 1 }}
                  min={0}
                  precision={2}
                  formatter={(val) => {
                    if (val === null || val === undefined) return ''
                    const num = Number(val)
                    return num % 1 === 0 ? num.toString() : num.toString()
                  }}
                />
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleOpenFloorModal(record.id)}
                  title="Редактировать по этажам"
                  style={STABLE_STYLES.floorButton}
                />
              </Space.Compact>
            )
          } else {
            return (
              <InputNumber
                value={value || 0}
                onChange={(newValue) => {
                  const quantity = newValue || 0
                  onRowUpdate(record.id, { quantityRd: quantity })
                }}
                size="small"
                style={{ width: '100%' }}
                min={0}
                precision={2}
                formatter={(val) => {
                  if (val === null || val === undefined) return ''
                  const num = Number(val)
                  return num % 1 === 0 ? num.toString() : num.toString()
                }}
              />
            )
          }
        } else {
          // В режиме просмотра для множественных этажей показываем ссылку
          if (isMultipleFloors && value) {
            return (
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => handleOpenFloorModal(record.id)()}
              >
                {value || '0'}
              </Button>
            )
          }
          return <span>{value || '0'}</span>
        }
      },
    },

    // Номенклатура
    {
      title: 'Номенклатура',
      key: COLUMN_KEYS.NOMENCLATURE,
      dataIndex: 'nomenclature',
      width: 250,
      filterMode: 'tree' as const,
      filterSearch: true,
      onFilter: (value, record) => record.nomenclature.includes(value as string),
      onHeaderCell: () => ({
        className: 'chessboard-header-cell',
        style: {
          whiteSpace: 'pre-line',
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
        },
      }),
      render: (value, record) => {
        const isEditing = (record as any).isEditing
        if (isEditing) {
          return (
            <Select
              value={record.nomenclatureId || undefined}
              onChange={(newValue) => {
                const selectedNomenclature = cascadeHook.nomenclatureOptions.find(nom => nom.value === newValue)

                // Используем каскадную логику для обработки изменения номенклатуры
                cascadeHook.handleNomenclatureChange(newValue, () => {
                  // Очищаем поставщика при изменении номенклатуры
                  onRowUpdate(record.id, {
                    nomenclature: selectedNomenclature ? selectedNomenclature.label : '',
                    nomenclatureId: newValue,
                    supplier: '', // Очищаем поставщика для каскадного обновления
                  })
                })

                // Обновляем только номенклатуру если каскад отключен
                if (!newValue) {
                  onRowUpdate(record.id, {
                    nomenclature: '',
                    nomenclatureId: '',
                  })
                }
              }}
              options={(() => {
                return cascadeHook.nomenclatureOptions
              })()}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              placeholder=""
              size="small"
              style={{
                width: '100%',
                minHeight: 'auto',
                height: 'auto'
              }}
              dropdownStyle={getDynamicDropdownStyle(cascadeHook.nomenclatureOptions)}
            />
          )
        }
        return value
      },
    },

    // Наименование поставщика
    {
      title: 'Наименование\nноменклатуры\nпоставщика',
      key: COLUMN_KEYS.SUPPLIER,
      dataIndex: 'supplier',
      width: 250,
      filterMode: 'tree' as const,
      filterSearch: true,
      onFilter: (value, record) => record.supplier.includes(value as string),
      onHeaderCell: () => ({
        className: 'chessboard-header-cell',
        style: {
          whiteSpace: 'pre-line',
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
        },
      }),
      render: (value, record) => {
        const isEditing = (record as any).isEditing
        if (isEditing) {
          return (
            <Select
              value={record.supplier || undefined}
              onChange={(newValue) => {
                // Обновляем UI
                onRowUpdate(record.id, {
                  supplier: newValue || '',
                })

                // Сохранение каскадной связи в БД если номенклатура выбрана
                if (record.nomenclatureId && newValue) {
                  cascadeHook.saveMappingToDatabase(record.nomenclatureId, newValue)
                    .then(saved => {
                      if (saved) {
                      }
                    })
                    .catch(error => {
                      console.error('🔗 Cascade: Ошибка сохранения связи:', error)
                    })
                }
              }}
              options={(() => {
                const options = record.nomenclatureId ? cascadeHook.filteredSupplierOptions : cascadeHook.allSupplierOptions
                return options
              })()}
              allowClear
              showSearch
              size="small"
              placeholder=""
              disabled={!record.nomenclatureId}
              style={{ width: '100%' }}
              filterOption={(input, option) => {
                const text = option?.label?.toString() || ""
                return text.toLowerCase().includes(input.toLowerCase())
              }}
            />
          )
        }
        return value
      },
    },


    // Ед.изм.
    {
      title: 'Ед.изм.',
      key: COLUMN_KEYS.UNIT,
      dataIndex: 'unit',
      width: 100, // Увеличена ширина для Select
      filterMode: 'tree' as const,
      filterSearch: true,
      onFilter: (value, record) => record.unit.includes(value as string),
      onHeaderCell: () => ({
        className: 'chessboard-header-cell unit-header',
        style: {
          whiteSpace: 'nowrap', // НЕ переносить заголовок "Ед.изм."
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
          minWidth: '100px',
          maxWidth: '100px',
          width: '100px',
          overflow: 'hidden',
          wordBreak: 'break-word', // Разрывать слова для переноса
          overflowWrap: 'break-word', // Перенос длинных слов
        },
      }),
      render: (value, record) => {
        const isEditing = (record as any).isEditing
        if (isEditing) {
          return (
            <Select
              value={record.unitId || undefined}
              onChange={(newValue) => onRowUpdate(record.id, { unitId: newValue })}
              options={unitsData}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              placeholder=""
              size="small"
              style={{ width: '100%' }}
              dropdownStyle={getDynamicDropdownStyle(unitsData)}
            />
          )
        }
        return value
      },
    },

    // Комментарии
    {
      title: 'Комментарии',
      key: COLUMN_KEYS.COMMENTS,
      dataIndex: 'comments',
      width: 120,
      onHeaderCell: () => ({
        className: 'chessboard-header-cell',
        style: {
          whiteSpace: 'pre-line',
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
        },
      }),
      render: (value, record) => (
        <CommentsCell
          rowId={record.id}
          mode={tableMode.mode}
        />
      ),
    },
  ], [tableMode, onRowColorChange, handleStartEditing, handleRowDelete, handleRowCopy, handleOpenFloorModal, hasMultipleFloors])

  // Фильтрация столбцов по видимости с нормализацией ширины
  const visibleColumnsData = useMemo(() => {
    const filteredColumns = allColumns.filter(column =>
      visibleColumns.includes(column.key as string)
    )
    return normalizeColumns(filteredColumns)
  }, [allColumns, visibleColumns])

  // Настройки выбора строк для режимов add/edit/delete
  const rowSelection = useMemo(() => {
    if (tableMode.mode === 'delete') {
      return {
        selectedRowKeys: tableMode.selectedRowKeys,
        onChange: onSelectionChange,
        type: 'checkbox' as const,
      }
    }
    return undefined
  }, [tableMode, onSelectionChange])

  // Обработка цвета строк
  const rowClassName = (record: RowData) => {
    if (record.color) {
      return `row-color-${record.color}`
    }
    return ''
  }

  return (
    <>
      <style>{`
        /* Действия - 1-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(1) {
          width: 80px !important;
          min-width: 80px !important;
          max-width: 80px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(1) {
          width: 80px !important;
          min-width: 80px !important;
          max-width: 80px !important;
        }
        /* Раздел - 2-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(2) {
          min-width: 40px !important;
          max-width: 80px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(2) {
          min-width: 40px !important;
          max-width: 80px !important;
        }
        /* Шифр проекта - 3-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(3) {
          width: 100px !important;
          min-width: 100px !important;
          max-width: 100px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(3) {
          width: 100px !important;
          min-width: 100px !important;
          max-width: 100px !important;
        }
        /* Вер. - 5-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(5) {
          width: 40px !important;
          min-width: 40px !important;
          max-width: 40px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(5) {
          width: 40px !important;
          min-width: 40px !important;
          max-width: 40px !important;
        }
        /* Этажи - 7-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(7) {
          width: 50px !important;
          min-width: 50px !important;
          max-width: 50px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(7) {
          width: 50px !important;
          min-width: 50px !important;
          max-width: 50px !important;
        }
        /* Категория затрат - 8-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(8) {
          width: 120px !important;
          min-width: 120px !important;
          max-width: 120px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(8) {
          width: 120px !important;
          min-width: 120px !important;
          max-width: 120px !important;
        }
        /* Наименование работ - 10-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(10) {
          min-width: 140px !important;
          max-width: 240px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(10) {
          min-width: 140px !important;
          max-width: 240px !important;
        }
        /* Локализация - 11-й столбец (WORK_UNIT скрыт) */
        .chessboard-table .ant-table-thead > tr > th:nth-child(11) {
          width: 80px !important;
          min-width: 80px !important;
          max-width: 80px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(11) {
          width: 80px !important;
          min-width: 80px !important;
          max-width: 80px !important;
        }
        /* Материал - 12-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(12) {
          width: 120px !important;
          min-width: 120px !important;
          max-width: 120px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(12) {
          width: 120px !important;
          min-width: 120px !important;
          max-width: 120px !important;
        }
        /* Тип материала - 13-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(13) {
          width: 60px !important;
          min-width: 60px !important;
          max-width: 60px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(13) {
          width: 60px !important;
          min-width: 60px !important;
          max-width: 60px !important;
        }
        /* Кол-во по ПД - 14-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(14) {
          width: 60px !important;
          min-width: 60px !important;
          max-width: 60px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(14) {
          width: 60px !important;
          min-width: 60px !important;
          max-width: 60px !important;
        }
        /* Кол-во по спеке РД - 15-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(15) {
          width: 90px !important;
          min-width: 90px !important;
          max-width: 90px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(15) {
          width: 90px !important;
          min-width: 90px !important;
          max-width: 90px !important;
        }
        /* Кол-во по пересчету РД - 16-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(16) {
          width: 90px !important;
          min-width: 90px !important;
          max-width: 90px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(16) {
          width: 90px !important;
          min-width: 90px !important;
          max-width: 90px !important;
        }
        /* Ед.изм. - 19-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(19) {
          width: 40px !important;
          min-width: 40px !important;
          max-width: 40px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(19) {
          width: 40px !important;
          min-width: 40px !important;
          max-width: 40px !important;
        }
        /* Наименование проекта - 4-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(4) {
          width: 120px !important;
          min-width: 120px !important;
          max-width: 120px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(4) {
          width: 120px !important;
          min-width: 120px !important;
          max-width: 120px !important;
        }
        /* Корпус - 6-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(6) {
          min-width: 60px !important;
          max-width: 90px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(6) {
          min-width: 60px !important;
          max-width: 90px !important;
        }
        /* Вид затрат - 9-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(9) {
          min-width: 80px !important;
          max-width: 120px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(9) {
          min-width: 80px !important;
          max-width: 120px !important;
        }
        /* Номенклатура - 17-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(17) {
          min-width: 120px !important;
          max-width: 180px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(17) {
          min-width: 120px !important;
          max-width: 180px !important;
        }
        /* Наименование поставщика - 18-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(18) {
          min-width: 100px !important;
          max-width: 150px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(18) {
          min-width: 100px !important;
          max-width: 150px !important;
        }
        /* Комментарии - 20-й столбец */
        .chessboard-table .ant-table-thead > tr > th:nth-child(20) {
          width: 80px !important;
          min-width: 80px !important;
          max-width: 80px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td:nth-child(20) {
          width: 80px !important;
          min-width: 80px !important;
          max-width: 80px !important;
        }
        /* Форсирование для всех остальных столбцов */
        .chessboard-table .ant-table-thead > tr > th {
          box-sizing: border-box !important;
          flex: none !important;
          white-space: normal !important;
          overflow: hidden !important;
          word-break: break-word !important;
          padding: 4px 6px !important;
          line-height: 1.2 !important;
        }
        .chessboard-table .ant-table-tbody > tr > td {
          box-sizing: border-box !important;
          flex: none !important;
          white-space: normal !important;
          overflow: hidden !important;
          word-break: break-word !important;
          padding: 4px 6px !important;
          line-height: 1.2 !important;
          vertical-align: middle !important;
        }
        /* Выравнивание полей ввода по центру ячеек с автоматической высотой */
        .chessboard-table .ant-table-tbody > tr > td .ant-select,
        .chessboard-table .ant-table-tbody > tr > td .ant-input,
        .chessboard-table .ant-table-tbody > tr > td .ant-input-number {
          display: flex !important;
          align-items: center !important;
          height: auto !important;
          min-height: 24px !important;
        }
        .chessboard-table .ant-table-tbody > tr > td .ant-select-selector,
        .chessboard-table .ant-table-tbody > tr > td .ant-input-number-input {
          height: auto !important;
          min-height: 24px !important;
          display: flex !important;
          align-items: center !important;
          white-space: normal !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
        /* Автоматическая высота для выбранных значений в Select */
        .chessboard-table .ant-table-tbody > tr > td .ant-select-selection-item {
          white-space: normal !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          height: auto !important;
          line-height: 1.2 !important;
        }
        /* Автоматическая высота для множественного выбора */
        .chessboard-table .ant-table-tbody > tr > td .ant-select-selection-overflow {
          height: auto !important;
          min-height: 20px !important;
        }
        .chessboard-table .ant-table-tbody > tr {
          height: auto !important;
          min-height: 32px !important;
        }
        /* Компактные иконки в столбце действий с поддержкой масштаба */
        .chessboard-table .ant-btn {
          padding: calc(2px * var(--app-scale, 1)) calc(4px * var(--app-scale, 1)) !important;
          height: calc(24px * var(--app-scale, 1)) !important;
          width: calc(24px * var(--app-scale, 1)) !important;
          font-size: calc(12px * var(--app-scale, 1)) !important;
          margin: 0 calc(1px * var(--app-scale, 1)) !important;
        }
        .chessboard-table .ant-btn-icon-only {
          padding: calc(2px * var(--app-scale, 1)) !important;
        }
        .chessboard-table .anticon {
          font-size: calc(12px * var(--app-scale, 1)) !important;
          line-height: 1 !important;
        }
        /* Компактная цветовая кнопка с поддержкой масштаба */
        .chessboard-table .color-picker-button {
          width: calc(20px * var(--app-scale, 1)) !important;
          height: calc(20px * var(--app-scale, 1)) !important;
          min-width: calc(20px * var(--app-scale, 1)) !important;
          padding: 0 !important;
          margin: 0 calc(1px * var(--app-scale, 1)) !important;
        }
        /* Компактные элементы управления */
        .chessboard-table .ant-select {
          font-size: 12px !important;
        }
        .chessboard-table .ant-select-selector {
          padding: 2px 4px !important;
          min-height: 24px !important;
          height: auto !important;
          line-height: 1.2 !important;
          white-space: normal !important;
          word-wrap: break-word !important;
        }
        .chessboard-table .ant-input {
          padding: 2px 6px !important;
          font-size: 12px !important;
          line-height: 1.2 !important;
          min-height: 24px !important;
          height: auto !important;
          white-space: normal !important;
          word-wrap: break-word !important;
        }
        .chessboard-table .ant-input-number {
          font-size: 12px !important;
        }
        .chessboard-table .ant-input-number-input {
          padding: 2px 6px !important;
          font-size: 12px !important;
          line-height: 1.2 !important;
          min-height: 20px !important;
        }
        /* Компактная пагинация */
        .chessboard-table + .ant-table-pagination {
          margin: 8px 0 !important;
          font-size: 12px !important;
        }
        .chessboard-table + .ant-table-pagination .ant-pagination-item {
          min-width: 24px !important;
          height: 24px !important;
          line-height: 22px !important;
          font-size: 12px !important;
        }
        .chessboard-table + .ant-table-pagination .ant-select-selector {
          height: 24px !important;
          min-height: 24px !important;
          padding: 0 4px !important;
          font-size: 12px !important;
          white-space: nowrap !important;
        }
        .chessboard-table table {
          table-layout: fixed !important;
        }
        .chessboard-table .ant-table {
          table-layout: fixed !important;
        }
        /* Основной контейнер таблицы */
        .chessboard-table {
          width: 100% !important;
          height: 100% !important;
        }
        /* КРИТИЧЕСКИ ВАЖНО: убираем overflow с внутренних элементов Ant Design */
        .chessboard-table .ant-table-container {
          overflow: visible !important;
        }
        .chessboard-table .ant-table-content {
          overflow: visible !important;
        }
        .chessboard-table .ant-table-body {
          overflow: visible !important;
        }
        /* Sticky заголовки с закреплением к блоку фильтров */
        .chessboard-table .ant-table-header {
          position: sticky !important;
          top: 0 !important;
          z-index: 100 !important;
          background: white !important;
          /* ВАЖНО: не создаем overflow для заголовков */
          overflow: visible !important;
        }
        /* Восстанавливаем скроллы для таблицы */
        .chessboard-table .ant-table-container {
          height: calc(100vh - 300px) !important;
          overflow: auto !important;
          border: 1px solid #f0f0f0 !important;
          border-radius: 6px !important;
        }
        .chessboard-table .ant-table-body {
          height: auto !important;
          overflow: visible !important;
        }
        .chessboard-table .ant-table-thead {
          position: sticky !important;
          top: 0 !important;
          z-index: 100 !important;
          background: white !important;
        }
        .chessboard-table .ant-table-tbody {
          overflow: visible !important;
        }
        /* Обеспечиваем корректную работу sticky заголовков для каждой ячейки */
        .chessboard-table .ant-table-thead > tr > th {
          position: sticky !important;
          top: 0 !important;
          background: white !important;
          z-index: 101 !important;
          border-bottom: 1px solid #f0f0f0 !important;
        }
        /* Убираем лишние границы и тени, которые создают визуальные полосы */
        .chessboard-table .ant-table {
          border: none !important;
        }
        .chessboard-table .ant-table-content {
          border: none !important;
        }
        .chessboard-table .ant-table-scroll {
          border: none !important;
        }
        /* Исправляем отображение при горизонтальном скролле */
        .chessboard-table .ant-table-container::before,
        .chessboard-table .ant-table-container::after {
          display: none !important;
        }
      `}</style>
      <Table<RowData>
        className="chessboard-table"
        tableLayout="fixed"
        style={{
          tableLayout: 'fixed',
          width: '100%',
          height: '100%',
          flex: 1,
        }}
        columns={visibleColumnsData}
        dataSource={data}
        loading={loading}
        rowKey="id"
        rowSelection={rowSelection}
        rowClassName={rowClassName}
        pagination={false}
        size="small"
        sticky={{
          offsetHeader: 0,
          offsetScroll: 0,
        }}
        scroll={TABLE_SCROLL_CONFIG}
      />

      <FloorQuantitiesModal
        open={floorModalOpen}
        info={floorModalInfo}
        floorData={floorModalData}
        isEdit={floorModalIsEdit}
        onClose={closeFloorModal}
        onSave={saveFloorModal}
      />

    </>
  )
})

ChessboardTable.displayName = 'ChessboardTable'