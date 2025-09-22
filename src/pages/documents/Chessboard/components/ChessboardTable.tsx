import React, { useMemo, memo, useState, useCallback, useEffect } from 'react'
import { Table, Button, Space, Tooltip } from 'antd'
import { EditOutlined, DeleteOutlined, CopyOutlined, PlusOutlined, BgColorsOutlined } from '@ant-design/icons'
import type { ColumnsType, ColumnType } from 'antd/es/table'
import { RowColorPicker } from './RowColorPicker'
import { CommentsCell } from './CommentsCell'
import { FloorQuantitiesModal } from './FloorQuantitiesModal'
import type { RowData, TableMode, RowColor, FloorModalRow, FloorModalInfo } from '../types'
import { COLUMN_KEYS, TABLE_SCROLL_CONFIG } from '../utils/constants'

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
  overflow-wrap: anywhere !important;
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
  white-space: nowrap !important;
  word-break: keep-all !important;
  overflow-wrap: normal !important;
  hyphens: none !important;
  text-overflow: ellipsis !important;
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
  overflow-wrap: anywhere !important;
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
  overflow-wrap: anywhere !important;
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
      // Столбец "Этажи" - НЕ переносить вообще
      th.style.setProperty('white-space', 'nowrap', 'important')
      th.style.setProperty('word-break', 'keep-all', 'important')
      th.style.setProperty('overflow-wrap', 'normal', 'important')
      th.style.setProperty('hyphens', 'none', 'important')
      th.style.setProperty('text-overflow', 'ellipsis', 'important')
      th.style.setProperty('min-width', '80px', 'important')
      th.style.setProperty('max-width', '80px', 'important')
      th.style.setProperty('width', '80px', 'important')
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
  loading: boolean
  tableMode: TableMode
  visibleColumns: string[]
  onSelectionChange: (selectedRowKeys: React.Key[]) => void
  onRowUpdate: (rowId: string, updates: Partial<RowData>) => void
  onRowCopy: (rowId: string) => void
  onRowDelete: (rowId: string) => void
  onRowColorChange: (rowId: string, color: RowColor) => void
  onStartEditing: (rowId: string) => void
  onCommentUpdate?: (rowId: string, comment: string) => void
}

export const ChessboardTable = memo(({
  data,
  loading,
  tableMode,
  visibleColumns,
  onSelectionChange,
  onRowUpdate,
  onRowCopy,
  onRowDelete,
  onRowColorChange,
  onStartEditing,
  onCommentUpdate,
}: ChessboardTableProps) => {
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

  // Функция для открытия модального окна этажей
  const openFloorModal = useCallback((record: RowData, isEdit: boolean = false) => {
    // Формируем данные для модального окна из floorQuantities
    const floorData: FloorModalRow[] = []
    if (record.floorQuantities) {
      Object.entries(record.floorQuantities).forEach(([floor, quantities]) => {
        floorData.push({
          floor: Number(floor),
          quantityPd: quantities.quantityPd,
          quantitySpec: quantities.quantitySpec,
          quantityRd: quantities.quantityRd,
        })
      })
    }

    // Если нет данных этажей, но есть общие количества, создаем одну запись
    if (floorData.length === 0) {
      floorData.push({
        floor: 1,
        quantityPd: record.quantityPd,
        quantitySpec: record.quantitySpec,
        quantityRd: record.quantityRd,
      })
    }

    setFloorModalData(floorData)
    setFloorModalInfo({
      projectCode: record.documentationCode,
      projectName: record.documentationProjectName,
      workName: record.workName,
      material: record.material,
      unit: record.unit,
    })
    setFloorModalIsEdit(isEdit)
    setFloorModalOpen(true)
  }, [])

  const closeFloorModal = useCallback(() => {
    setFloorModalOpen(false)
    setFloorModalData([])
    setFloorModalIsEdit(false)
  }, [])

  const saveFloorModal = useCallback((floors: FloorModalRow[]) => {
    // TODO: реализовать сохранение данных этажей
    console.log('Saving floor data:', floors) // LOG
    closeFloorModal()
  }, [closeFloorModal])
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
          {tableMode.mode === 'view' && (
            <>
              <Tooltip title="Цвет строки">
                <RowColorPicker
                  value={record.color}
                  onChange={(color) => onRowColorChange(record.id, color)}
                />
              </Tooltip>
              <Tooltip title="Редактировать">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onStartEditing(record.id)}
                />
              </Tooltip>
              <Tooltip title="Удалить">
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => onRowDelete(record.id)}
                />
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
              <Tooltip title="Редактировать">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onStartEditing(record.id)}
                />
              </Tooltip>
              <Tooltip title="Добавить строку">
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => {/* TODO: добавить новую строку */}}
                />
              </Tooltip>
              <Tooltip title="Скопировать">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => onRowCopy(record.id)}
                />
              </Tooltip>
              <Tooltip title="Удалить">
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => onRowDelete(record.id)}
                />
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
    },

    // Шифр проекта (из справочника Документация)
    {
      title: 'Шифр проекта',
      key: COLUMN_KEYS.DOCUMENTATION_CODE,
      dataIndex: 'documentationCode',
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
      width: 50,
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

    // Корпус (из таблицы blocks)
    {
      title: 'Корпус',
      key: COLUMN_KEYS.BLOCK,
      dataIndex: 'block',
      filterMode: 'tree' as const,
      filterSearch: true,
      onFilter: (value, record) => record.block.includes(value as string),
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

    // Этажи
    {
      title: 'Этажи',
      key: COLUMN_KEYS.FLOORS,
      dataIndex: 'floors',
      width: 80, // Фиксированная ширина для предотвращения сжатия
      onHeaderCell: () => ({
        className: 'chessboard-header-cell floors-header',
        style: {
          whiteSpace: 'nowrap', // НЕ переносить заголовок "Этажи"
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '20px',
          padding: '4px 8px',
          minWidth: '80px', // Увеличенная минимальная ширина
          maxWidth: '80px', // Максимальная ширина
          width: '80px', // Фиксированная ширина
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          wordBreak: 'keep-all', // Не разрывать слова
          overflowWrap: 'normal', // Стандартная обработка переносов
        },
      }),
      onCell: () => ({
        style: {
          whiteSpace: 'nowrap', // НЕ переносить содержимое ячеек "Этажи"
          textAlign: 'center',
          minWidth: '80px',
          maxWidth: '80px',
        },
      }),
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
    },

    // Наименование работ
    {
      title: 'Наименование\nработ',
      key: COLUMN_KEYS.WORK_NAME,
      dataIndex: 'workName',
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
    },

    // Локализация
    {
      title: 'Локализация',
      key: COLUMN_KEYS.LOCATION,
      dataIndex: 'location',
      filterMode: 'tree' as const,
      filterSearch: true,
      onFilter: (value, record) => record.location.includes(value as string),
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
    },

    // Кол-во по ПД
    {
      title: 'Кол-во\nпо ПД',
      key: COLUMN_KEYS.QUANTITY_PD,
      dataIndex: 'quantityPd',
      width: 60,
      onHeaderCell: () => ({
        className: 'chessboard-header-cell',
        style: {
          whiteSpace: 'pre-line',
          textAlign: 'center',
          verticalAlign: 'middle',
          lineHeight: '12px',
          padding: '2px 4px',
          wordBreak: 'keep-all',
          overflowWrap: 'anywhere',
          minWidth: '60px',
          maxHeight: '52px',
          overflow: 'hidden',
        },
      }),
      render: (value, record) => (
        <Button
          type="text"
          size="small"
          style={{ padding: 0, height: 'auto', color: record.floorQuantities ? '#1677ff' : 'inherit' }}
          onClick={() => openFloorModal(record, false)}
        >
          {value || '0'}
        </Button>
      ),
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
      render: (value, record) => (
        <Button
          type="text"
          size="small"
          style={{ padding: 0, height: 'auto', color: record.floorQuantities ? '#1677ff' : 'inherit' }}
          onClick={() => openFloorModal(record, false)}
        >
          {value || '0'}
        </Button>
      ),
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
      render: (value, record) => (
        <Button
          type="text"
          size="small"
          style={{ padding: 0, height: 'auto', color: record.floorQuantities ? '#1677ff' : 'inherit' }}
          onClick={() => openFloorModal(record, false)}
        >
          {value || '0'}
        </Button>
      ),
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
    },

    // Наименование поставщика
    {
      title: 'Наименование\nпоставщика',
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
    },

    // Ед.изм.
    {
      title: 'Ед.изм.',
      key: COLUMN_KEYS.UNIT,
      dataIndex: 'unit',
      filterMode: 'tree' as const,
      filterSearch: true,
      onFilter: (value, record) => record.unit.includes(value as string),
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
          value={value}
          rowId={record.id}
          onCommentUpdate={onCommentUpdate}
          mode={tableMode.mode}
        />
      ),
    },
  ], [tableMode, onRowColorChange, onStartEditing, onRowDelete, onRowCopy, onCommentUpdate, openFloorModal])

  // Фильтрация столбцов по видимости
  const visibleColumnsData = useMemo(() => {
    return allColumns.filter(column =>
      visibleColumns.includes(column.key as string)
    )
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
      <Table<RowData>
        className="chessboard-table"
        columns={visibleColumnsData}
        dataSource={data}
        loading={loading}
        rowKey="id"
        rowSelection={rowSelection}
        rowClassName={rowClassName}
        sticky={true}
        scroll={{ x: 'max-content' }}
        pagination={{
          position: ['bottomCenter'],
          defaultPageSize: 100,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} из ${total} записей`,
          pageSizeOptions: ['10', '20', '50', '100', '200', '500'],
        }}
        size="small"
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