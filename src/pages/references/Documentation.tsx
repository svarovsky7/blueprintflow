import { useState, useMemo, useCallback } from 'react'
import {
  Table,
  Button,
  Select,
  Space,
  Upload,
  Checkbox,
  Modal,
  Typography,
  Drawer,
  List,
  Switch,
  Input,
  Badge,
  Popconfirm,
  Empty,
  Form,
  App,
} from 'antd'
import {
  UploadOutlined,
  SettingOutlined,
  InboxOutlined,
  FilterOutlined,
  CaretUpFilled,
  CaretDownFilled,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  CopyOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload'
import * as XLSX from 'xlsx'
import {
  documentationApi,
  type DocumentationTableRow,
  type DocumentationFilters,
  type DocumentationColumnSettings,
  type DocumentationImportRow,
  type DocumentationVersion,
  type ImportConflict,
  type ConflictResolution,
} from '@/entities/documentation'
import { documentationTagsApi } from '@/entities/documentation-tags'
import { supabase } from '@/lib/supabase'
import { DOCUMENT_STAGES } from '@/shared/types'
import ConflictResolutionDialog from '@/components/ConflictResolutionDialog'

const { Text } = Typography

type RowColor = '' | 'green' | 'yellow' | 'blue' | 'red'

// Функция для форматирования даты из ISO в DD.MM.YYYY
const formatDate = (isoDate: string | null | undefined): string => {
  if (!isoDate) return '-'
  try {
    const [year, month, day] = isoDate.split('-')
    return `${day}.${month}.${year}`
  } catch {
    return isoDate
  }
}

// Note: Color functionality is temporarily disabled until the 'color' column is added to the database
// const colorMap: Record<RowColor, string> = {
//   green: '#d9f7be',
//   yellow: '#fff1b8',
//   blue: '#e6f7ff',
//   red: '#ffa39e',
//   '': '',
// }

// Получаем сохраненные настройки столбцов из localStorage
const getColumnSettings = (): DocumentationColumnSettings => {
  const saved = localStorage.getItem('documentation_column_settings')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      // Ignore parse errors
    }
  }
  return {
    visible: {
      tag: true,
      code: true,
      version_count: true,
      comments: true,
    },
    order: ['tag', 'code', 'version_count', 'versions', 'comments'],
  }
}

// Сохраняем настройки столбцов в localStorage
const saveColumnSettings = (settings: DocumentationColumnSettings) => {
  localStorage.setItem('documentation_column_settings', JSON.stringify(settings))
}

export default function Documentation() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<DocumentationFilters>({})
  const [appliedFilters, setAppliedFilters] = useState<DocumentationFilters>({})
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [columnSettings, setColumnSettings] = useState<DocumentationColumnSettings>(getColumnSettings())
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const [addMode, setAddMode] = useState(false)
  const [newRows, setNewRows] = useState<DocumentationTableRow[]>([])
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [selectedVersions, setSelectedVersions] = useState<Record<string, number>>({})
  const [importForm] = Form.useForm()
  const [importConflicts, setImportConflicts] = useState<ImportConflict[]>([])
  const [conflictDialogVisible, setConflictDialogVisible] = useState(false)
  const [pendingImportData, setPendingImportData] = useState<DocumentationImportRow[]>([])
  const [resolvingConflicts, setResolvingConflicts] = useState(false)
  const [importSelectedProjectId, setImportSelectedProjectId] = useState<string | null>(null)

  // Загрузка данных - только если выбран проект
  const { data: documentation = [], isLoading } = useQuery({
    queryKey: ['documentation', appliedFilters],
    queryFn: () => documentationApi.getDocumentation(appliedFilters),
    enabled: !!appliedFilters.project_id, // Загружаем только если выбран проект
  })

  // Загрузка справочников для фильтров
  const { data: tags = [] } = useQuery({
    queryKey: ['documentation-tags'],
    queryFn: documentationTagsApi.getAll,
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from('projects').select('*').order('name')
      return data || []
    },
  })

  const { data: blocks = [] } = useQuery({
    queryKey: ['blocks', filters.project_id],
    queryFn: async () => {
      if (!supabase || !filters.project_id) return []
      // Сначала получаем связи проект-блок
      const { data: projectBlocks } = await supabase
        .from('projects_blocks')
        .select('block_id')
        .eq('project_id', filters.project_id)
      
      if (!projectBlocks || projectBlocks.length === 0) return []
      
      // Затем получаем сами блоки
      const blockIds = projectBlocks.map(pb => pb.block_id)
      const { data: blocksData } = await supabase
        .from('blocks')
        .select('*')
        .in('id', blockIds)
        .order('name')
      
      return blocksData || []
    },
    enabled: !!filters.project_id,
  })

  // Загрузка блоков для выбранного проекта в диалоге импорта
  const { data: importBlocks = [] } = useQuery({
    queryKey: ['blocks', importSelectedProjectId],
    queryFn: async () => {
      if (!supabase || !importSelectedProjectId) return []
      // Сначала получаем связи проект-блок
      const { data: projectBlocks } = await supabase
        .from('projects_blocks')
        .select('block_id')
        .eq('project_id', importSelectedProjectId)
      
      if (!projectBlocks || projectBlocks.length === 0) return []
      
      // Затем получаем сами блоки
      const blockIds = projectBlocks.map(pb => pb.block_id)
      const { data: blocksData } = await supabase
        .from('blocks')
        .select('*')
        .in('id', blockIds)
        .order('name')
      
      return blocksData || []
    },
    enabled: !!importSelectedProjectId,
  })

  // Копирование строки
  const handleCopyRow = useCallback((record: DocumentationTableRow) => {
    const newRow = {
      ...record,
      id: `new-${Date.now()}`,
      documentation_id: '', // Пустой UUID для новых записей
      stage: record.stage || 'П',
      project_code: `${record.project_code}_copy`,
      isNew: true,
      // Поля для новой версии - берем из последней версии или значения по умолчанию
      new_version_number: record.versions.length > 0 ? record.versions[record.versions.length - 1].version_number + 1 : 1,
      new_issue_date: '',
      new_file_url: '',
      new_status: 'not_filled' as DocumentationVersion['status'],
    }
    setNewRows(prev => [...prev, newRow])
    setAddMode(true)
  }, [])

  // Добавление строки после текущей
  const handleAddRowAfter = useCallback((record: DocumentationTableRow) => {
    setNewRows(prev => {
      const index = prev.findIndex(r => r.id === record.id)
      const newRow: DocumentationTableRow = {
        id: `new-${Date.now()}`,
        documentation_id: '', // Пустой UUID для новых записей
        stage: record.stage || 'П',
        tag_name: record.tag_name,
        tag_number: record.tag_number,
        project_code: '',
        version_count: 0,
        versions: [],
        comments: '',
        project_id: record.project_id,
        block_id: record.block_id,
        color: '' as RowColor,
        isNew: true,
        // Поля для новой версии
        new_version_number: 1,
        new_issue_date: '',
        new_file_url: '',
        new_status: 'not_filled' as DocumentationVersion['status'],
      }
      const updated = [...prev]
      updated.splice(index + 1, 0, newRow)
      return updated
    })
  }, [])

  // Удаление новой строки
  const handleDeleteNew = useCallback((record: DocumentationTableRow) => {
    setNewRows(prev => {
      const updated = prev.filter(r => r.id !== record.id)
      if (updated.length === 0) {
        setAddMode(false)
      }
      return updated
    })
  }, [])

  // Удаление записи
  const handleDelete = useCallback(async (record: DocumentationTableRow) => {
    if (record.documentation_id) {
      try {
        await documentationApi.deleteDocumentation(record.documentation_id)
        message.success('Запись успешно удалена')
        queryClient.invalidateQueries({ queryKey: ['documentation'] })
      } catch (error) {
        console.error('Delete error:', error)
        message.error('Ошибка при удалении записи')
      }
    }
  }, [queryClient, message])

  // Колонки таблицы
  const columns = useMemo(() => {
    const allColumns: Array<ColumnsType<DocumentationTableRow>[number] & { visible?: boolean }> = [
      // Колонка цвета - временно скрыта до добавления колонки в БД
      // TODO: раскомментировать после добавления колонки color в БД
      /*{
        title: '',
        key: 'color',
        width: 50,
        fixed: 'left',
        visible: true, // Всегда отображается
        render: (_, record: DocumentationTableRow) => (
          <RowColorPicker
            value={(record.color || '') as RowColor}
            onChange={(color) => handleColorChange(record, color)}
          />
        ),
      },*/
      {
        title: 'Стадия',
        dataIndex: 'stage',
        key: 'stage',
        width: 80,
        fixed: 'left',
        render: (_, record: DocumentationTableRow) => {
          if (record.isNew) {
            return (
              <Select
                size="small"
                style={{ width: '100%' }}
                value={record.stage || 'П'}
                onChange={(value) => {
                  const updated = newRows.map(r => 
                    r.id === record.id 
                      ? { ...r, stage: value }
                      : r
                  )
                  setNewRows(updated)
                }}
                options={[
                  { label: 'П', value: 'П' },
                  { label: 'Р', value: 'Р' },
                ]}
              />
            )
          }
          return record.stage || 'П'
        },
        visible: true,
      },
      {
        title: 'Раздел',
        dataIndex: 'tag_name',
        key: 'tag',
        width: 200,
        sorter: (a, b) => a.tag_name.localeCompare(b.tag_name),
        visible: columnSettings.visible.tag,
        render: (text, record: DocumentationTableRow) => {
          if (record.isNew) {
            return (
              <Select
                style={{ width: '100%' }}
                placeholder="Выберите раздел"
                value={text}
                onChange={(value) => {
                  const tag = tags.find(t => t.name === value)
                  const updated = newRows.map(r => 
                    r.id === record.id 
                      ? { ...r, tag_name: value, tag_number: tag?.tag_number || 0 }
                      : r
                  )
                  setNewRows(updated)
                }}
                options={tags.map(t => ({ label: t.name, value: t.name }))}
              />
            )
          }
          if (editingKey === record.id) {
            return (
              <Select
                style={{ width: '100%' }}
                value={text}
                onChange={() => {
                  // TODO: Обработка редактирования
                }}
                options={tags.map(t => ({ label: t.name, value: t.name }))}
              />
            )
          }
          return text
        },
      },
      {
        title: 'Шифр проекта',
        dataIndex: 'project_code',
        key: 'code',
        width: 200,
        sorter: (a, b) => a.project_code.localeCompare(b.project_code),
        visible: columnSettings.visible.code,
        render: (text, record: DocumentationTableRow) => {
          if (record.isNew || editingKey === record.id) {
            return (
              <Input
                value={text}
                onChange={(e) => {
                  if (record.isNew) {
                    const updated = newRows.map(r => 
                      r.id === record.id 
                        ? { ...r, project_code: e.target.value }
                        : r
                    )
                    setNewRows(updated)
                  }
                }}
                placeholder="Введите шифр проекта"
              />
            )
          }
          return text
        },
      },
      {
        title: 'Версия',
        key: 'version',
        width: 100,
        render: (_, record: DocumentationTableRow) => {
          if (record.isNew) {
            return (
              <Input
                type="number"
                min={1}
                size="small"
                value={record.new_version_number}
                onChange={(e) => {
                  const updated = newRows.map(r => 
                    r.id === record.id 
                      ? { ...r, new_version_number: parseInt(e.target.value) || 1 }
                      : r
                  )
                  setNewRows(updated)
                }}
                placeholder="1"
              />
            )
          }
          
          if (record.versions.length === 0) {
            return '-'
          }
          
          const currentSelectedVersion = selectedVersions[record.id] || 
            record.selected_version || 
            record.versions[record.versions.length - 1]?.version_number
          
          return (
            <Select
              size="small"
              value={currentSelectedVersion}
              onChange={(value) => {
                setSelectedVersions(prev => ({
                  ...prev,
                  [record.id]: value
                }))
              }}
              style={{ width: '100%' }}
              options={record.versions.map(v => ({
                label: v.version_number.toString(),
                value: v.version_number,
              }))}
            />
          )
        },
        visible: columnSettings.visible.version_count,
      },
      {
        title: 'Комментарии',
        dataIndex: 'comments',
        key: 'comments',
        width: 200,
        render: (text, record: DocumentationTableRow) => (
          <Input.TextArea
            value={text}
            placeholder="Добавить комментарий..."
            autoSize={{ minRows: 1, maxRows: 2 }}
            onChange={(e) => {
              if (record.isNew) {
                const updated = newRows.map(r => 
                  r.id === record.id 
                    ? { ...r, comments: e.target.value }
                    : r
                )
                setNewRows(updated)
              }
            }}
          />
        ),
        visible: columnSettings.visible.comments,
      },
      {
        title: 'Дата выдачи',
        key: 'issue_date',
        width: 130,
        render: (_, record: DocumentationTableRow) => {
          if (record.isNew) {
            return (
              <Input
                type="date"
                size="small"
                value={record.new_issue_date}
                onChange={(e) => {
                  const updated = newRows.map(r => 
                    r.id === record.id 
                      ? { ...r, new_issue_date: e.target.value }
                      : r
                  )
                  setNewRows(updated)
                }}
              />
            )
          }
          // Показываем дату выбранной версии
          // Используем ID версии если все версии имеют одинаковый номер
          let selectedVersion: DocumentationVersion | undefined
          
          if (record.selected_version_id && record.versions.every(v => v.version_number === 1)) {
            // Все версии имеют номер 1, используем ID
            selectedVersion = record.versions.find(v => v.id === record.selected_version_id)
          } else {
            // Обычный случай - используем номер версии
            const versionNumber = selectedVersions[record.id] || 
              record.selected_version || 
              record.versions[record.versions.length - 1]?.version_number
            selectedVersion = record.versions.find(v => v.version_number === versionNumber)
          }
          
          // Debug для первых записей
          if (record.project_code && record.project_code.startsWith('СТ26/01-14-АР')) {
            console.log('Date render debug:', {
              code: record.project_code,
              selectedVersionId: record.selected_version_id,
              selectedVersion,
              date: selectedVersion?.issue_date
            })
          }
          
          return formatDate(selectedVersion?.issue_date)
        },
        visible: true,
      },
      {
        title: 'Файл',
        key: 'file',
        width: 100,
        render: (_, record: DocumentationTableRow) => {
          if (record.isNew) {
            return (
              <Input
                size="small"
                value={record.new_file_url || ''}
                onChange={(e) => {
                  const updated = newRows.map(r => 
                    r.id === record.id 
                      ? { ...r, new_file_url: e.target.value }
                      : r
                  )
                  setNewRows(updated)
                }}
                placeholder="Ссылка на файл"
              />
            )
          }
          // Показываем файл выбранной версии
          // Используем ID версии если все версии имеют одинаковый номер
          let selectedVersion: DocumentationVersion | undefined
          
          if (record.selected_version_id && record.versions.every(v => v.version_number === 1)) {
            // Все версии имеют номер 1, используем ID
            selectedVersion = record.versions.find(v => v.id === record.selected_version_id)
          } else {
            // Обычный случай - используем номер версии
            const versionNumber = selectedVersions[record.id] || 
              record.selected_version || 
              record.versions[record.versions.length - 1]?.version_number
            selectedVersion = record.versions.find(v => v.version_number === versionNumber)
          }
          
          // Debug для первых записей
          if (record.project_code && record.project_code.startsWith('СТ26/01-14-АР')) {
            console.log('File URL render debug:', {
              code: record.project_code,
              selectedVersionId: record.selected_version_id,
              selectedVersion,
              fileUrl: selectedVersion?.file_url
            })
          }
          
          if (selectedVersion?.file_url) {
            return (
              <a href={selectedVersion.file_url} target="_blank" rel="noopener noreferrer">
                Открыть
              </a>
            )
          }
          return '-'
        },
        visible: true,
      },
      {
        title: 'Действия',
        key: 'actions',
        width: 150,
        fixed: 'right',
        visible: true, // Всегда отображается
        render: (_, record: DocumentationTableRow) => {
          if (record.isNew) {
            return (
              <Space size="small">
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowDownOutlined />}
                  onClick={() => handleAddRowAfter(record)}
                  title="Добавить строку ниже"
                />
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopyRow(record)}
                  title="Копировать строку"
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteNew(record)}
                  title="Удалить строку"
                />
              </Space>
            )
          }
          
          if (editingKey === record.id) {
            return (
              <Space size="small">
                <Button
                  type="text"
                  size="small"
                  icon={<SaveOutlined />}
                  onClick={() => {
                    // Сохранение редактирования
                    setEditingKey(null)
                  }}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => setEditingKey(null)}
                />
              </Space>
            )
          }

          return (
            <Space size="small">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopyRow(record)}
                title="Копировать строку"
              />
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => setEditingKey(record.id)}
                title="Редактировать"
              />
              <Popconfirm
                title="Удалить запись?"
                description="Вы уверены, что хотите удалить эту запись?"
                onConfirm={() => handleDelete(record)}
                okText="Да"
                cancelText="Отмена"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  title="Удалить"
                />
              </Popconfirm>
            </Space>
          )
        },
      },
    ]

    // Фильтруем видимые колонки и сортируем по порядку
    const visibleColumns = allColumns
      .filter(col => col.visible !== false) // Показываем колонки, у которых visible !== false (включая undefined)
      .sort((a, b) => {
        const aIndex = columnSettings.order.indexOf(a.key as string)
        const bIndex = columnSettings.order.indexOf(b.key as string)
        // Колонки без key в order будут в конце
        if (aIndex === -1 && bIndex === -1) return 0
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1
        return aIndex - bIndex
      })
    
    // Удаляем свойство visible перед возвратом
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return visibleColumns.map(({ visible, ...col }) => col) as ColumnsType<DocumentationTableRow>
  }, [columnSettings, newRows, editingKey, tags, selectedVersions, handleAddRowAfter, handleCopyRow, handleDeleteNew, handleDelete])

  // Обработка импорта Excel
  const handleImportExcel = async () => {
    try {
      const values = await importForm.validateFields()
      
      if (fileList.length === 0) {
        message.error('Выберите файл для импорта')
        return
      }

      setImportLoading(true)
      const file = fileList[0].originFileObj

      const arrayBuffer = await file!.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        cellDates: false, // Не преобразовывать даты автоматически, чтобы получить числовые значения
        dateNF: 'dd.mm.yyyy' // Формат даты по умолчанию
      })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        raw: true, // Получать сырые значения (числа для дат)
        defval: undefined // Значение по умолчанию для пустых ячеек
      })

      // Функция для преобразования Excel serial date в формат YYYY-MM-DD
      const excelDateToISO = (excelDate: string | number | undefined): string | undefined => {
        if (!excelDate) return undefined
        
        // Если это уже строка в формате даты (DD.MM.YYYY), преобразуем её
        if (typeof excelDate === 'string' && excelDate.includes('.')) {
          const [day, month, year] = excelDate.split('.')
          if (day && month && year) {
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          }
        }
        
        // Если это число (Excel serial date)
        const serialDate = typeof excelDate === 'string' ? parseFloat(excelDate) : excelDate
        if (!isNaN(serialDate)) {
          // Excel's date system: January 1, 1900 is serial date 1
          // Excel incorrectly treats 1900 as a leap year, so we need to adjust
          let adjustedDate = serialDate
          
          // Adjust for Excel's leap year bug (for dates after Feb 28, 1900)
          // Excel serial date 60 = Feb 29, 1900 (which doesn't exist)
          // So for serial dates > 60, we subtract 1
          if (serialDate > 60) {
            adjustedDate = serialDate - 1
          }
          
          // Create date from Excel serial number
          // Excel date 1 = Jan 1, 1900, but JS Date needs milliseconds since Jan 1, 1970
          // Days between Jan 1, 1900 and Jan 1, 1970 = 25567
          const jsDate = new Date((adjustedDate - 25567) * 86400 * 1000)
          
          // Adjust for timezone offset to get the correct date
          const utcDate = new Date(jsDate.getTime() + jsDate.getTimezoneOffset() * 60000)
          
          const year = utcDate.getFullYear()
          const month = String(utcDate.getMonth() + 1).padStart(2, '0')
          const day = String(utcDate.getDate()).padStart(2, '0')
          
          return `${year}-${month}-${day}`
        }
        
        return undefined
      }

      // Преобразуем данные в нужный формат с учетом выбранного проекта и стадии
      const importData: DocumentationImportRow[] = (jsonData as Record<string, string | number | undefined>[]).map((row, index) => {
        const processedRow = {
          tag: (row['Раздел'] || '').toString().trim(),
          code: (row['Шифр проекта'] || row['Шифр'] || '').toString().trim(),
          version_number: parseInt((row['Номер версии'] || row['Версия'] || '1').toString()),
          issue_date: excelDateToISO(row['Дата выдачи версии'] || row['Дата выдачи']),
          file_url: (row['Ссылка'] || row['Ссылка на документ'] || '').toString().trim() || undefined,
          project_id: values.project_id,
          block_id: values.block_id, // Добавляем block_id если выбран
          stage: values.stage,
        }
        
        // Логируем первые несколько строк для отладки
        if (index < 3) {
          console.log(`Row ${index + 1}:`, {
            raw_date_value: row['Дата выдачи версии'] || row['Дата выдачи'],
            date_type: typeof (row['Дата выдачи версии'] || row['Дата выдачи']),
            converted_date: processedRow.issue_date,
            raw_url_value: row['Ссылка'] || row['Ссылка на документ'],
            file_url: processedRow.file_url,
            all_fields: Object.keys(row)
          })
        }
        
        return processedRow
      })

      // Проверяем на конфликты
      const conflicts = await documentationApi.checkForConflicts(importData)
      
      if (conflicts.length > 0) {
        // Есть конфликты - показываем диалог
        setImportConflicts(conflicts)
        setPendingImportData(importData)
        setConflictDialogVisible(true)
        setImportLoading(false)
        setImportModalOpen(false) // Закрываем модальное окно импорта
      } else {
        // Нет конфликтов - импортируем сразу
        const result = await documentationApi.importFromExcel(importData)

        if (result.errors.length > 0) {
          message.warning(`Импортировано ${result.results.length} записей, ошибок: ${result.errors.length}`)
        } else {
          message.success(`Успешно импортировано ${result.results.length} записей`)
        }

        // Обновляем данные
        queryClient.invalidateQueries({ queryKey: ['documentation'] })
        setImportModalOpen(false)
        setFileList([])
        importForm.resetFields()
        setImportSelectedProjectId(null)
        setImportLoading(false)
      }
    } catch (error) {
      console.error('Import error:', error)
      message.error('Ошибка при импорте файла')
      setImportLoading(false)
    }
  }

  // Обработка разрешения конфликтов
  const handleConflictResolution = async (resolutions: Map<number, ConflictResolution>) => {
    try {
      setResolvingConflicts(true)
      
      const result = await documentationApi.importFromExcelWithResolutions(
        pendingImportData,
        resolutions
      )

      let message_text = `Импортировано: ${result.results.length} записей`
      if (result.skipped && result.skipped.length > 0) {
        message_text += `, пропущено: ${result.skipped.length}`
      }
      if (result.errors.length > 0) {
        message_text += `, ошибок: ${result.errors.length}`
      }

      message.success(message_text)

      // Обновляем данные
      queryClient.invalidateQueries({ queryKey: ['documentation'] })
      
      // Очищаем состояние
      setConflictDialogVisible(false)
      setImportConflicts([])
      setPendingImportData([])
      setFileList([])
      importForm.resetFields()
      setImportSelectedProjectId(null)
    } catch (error) {
      console.error('Error resolving conflicts:', error)
      message.error('Ошибка при обработке конфликтов')
    } finally {
      setResolvingConflicts(false)
    }
  }

  // Отмена импорта при конфликтах
  const handleCancelConflictResolution = () => {
    setConflictDialogVisible(false)
    setImportConflicts([])
    setPendingImportData([])
    // Возвращаем модальное окно импорта
    setImportModalOpen(true)
  }

  // Обновление настроек столбцов
  const updateColumnSettings = (newSettings: DocumentationColumnSettings) => {
    setColumnSettings(newSettings)
    saveColumnSettings(newSettings)
  }

  // Применение фильтров
  const handleApply = () => {
    setAppliedFilters(filters)
    setAddMode(false)
    setNewRows([])
    setSelectedVersions({}) // Очищаем выбранные версии при смене фильтров
  }

  // Добавление новой строки
  const handleAddRow = () => {
    const newRow = {
      id: `new-${Date.now()}`,
      documentation_id: '', // Пустой UUID для новых записей
      stage: 'П' as 'П' | 'Р', // По умолчанию П (проект)
      tag_name: '',
      tag_number: 0,
      project_code: '',
      version_count: 0,
      versions: [],
      comments: '',
      project_id: appliedFilters.project_id || null,
      block_id: appliedFilters.block_id || null,
      color: '' as RowColor,
      isNew: true,
      // Поля для новой версии
      new_version_number: 1,
      new_issue_date: '',
      new_file_url: '',
      new_status: 'not_filled' as DocumentationVersion['status'],
    }
    setNewRows([...newRows, newRow])
    setAddMode(true)
  }


  // Сохранение всех новых записей
  const handleSaveAll = async () => {
    try {
      console.log('Saving rows with appliedFilters:', appliedFilters)
      for (const row of newRows) {
        const tagId = tags.find(t => t.name === row.tag_name)?.id
        console.log('Saving row with project_id:', row.project_id, 'block_id:', row.block_id)
        
        // Используем комплексный метод сохранения
        await documentationApi.saveDocumentationComplete({
          code: row.project_code,
          stage: row.stage || 'П',
          tagId,
          projectId: row.project_id || undefined,
          blockId: row.block_id || undefined,
          // color: row.color || undefined, // TODO: раскомментировать после добавления колонки в БД
          versionNumber: row.new_version_number,
          issueDate: row.new_issue_date,
          fileUrl: row.new_file_url,
          status: row.new_status || 'not_filled',
          comment: row.comments || undefined,
        })
      }
      message.success(`Успешно сохранено записей: ${newRows.length}`)
      setNewRows([])
      setAddMode(false)
      queryClient.invalidateQueries({ queryKey: ['documentation'] })
    } catch (error) {
      console.error('Save all error:', error)
      message.error('Ошибка при сохранении записей')
    }
  }

  // Отмена всех изменений
  const handleCancelAll = () => {
    setNewRows([])
    setAddMode(false)
  }


  // Объединение данных для таблицы
  const tableData = useMemo(() => {
    return [...newRows, ...documentation]
  }, [newRows, documentation])

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <Space align="center" size="middle">
            <Text style={{ fontSize: '16px' }}>Проект:</Text>
            <Select
              placeholder="Выберите проект"
              style={{ width: 280 }}
              size="large"
              value={filters.project_id}
              onChange={(value) => setFilters({ ...filters, project_id: value, block_id: undefined })}
              options={projects?.map((p) => ({ 
                value: p.id, 
                label: <span style={{ fontWeight: 'bold' }}>{p.name}</span> 
              })) ?? []}
              showSearch
              filterOption={(input, option) => {
                const label = option?.label
                if (!label) return false
                if (typeof label === 'object' && 'props' in label) {
                  const text = ((label as React.ReactElement).props as { children?: string })?.children || ''
                  if (typeof text === 'string') {
                    return text.toLowerCase().includes(input.toLowerCase())
                  }
                  return false
                }
                if (typeof label === 'string') {
                  return (label as string).toLowerCase().includes(input.toLowerCase())
                }
                return false
              }}
            />
            <Select
              style={{ width: 100 }}
              placeholder="Стадия"
              allowClear
              size="large"
              value={filters.stage}
              onChange={(value) => setFilters({ ...filters, stage: value })}
              options={[
                { label: 'П', value: DOCUMENT_STAGES.P },
                { label: 'Р', value: DOCUMENT_STAGES.R },
              ]}
            />
            <Select
              style={{ width: 200 }}
              placeholder="Тэг"
              allowClear
              size="large"
              value={filters.tag_id}
              onChange={(value) => setFilters({ ...filters, tag_id: value })}
              options={tags.map((t) => ({ label: t.name, value: t.id }))}
            />
            <Button 
              type="primary" 
              size="large"
              onClick={handleApply} 
              disabled={!filters.project_id}
            >
              Применить
            </Button>
            <Badge 
              count={[filters.block_id, filters.status, filters.show_latest_only].filter(Boolean).length} 
              size="small"
              style={{ marginRight: '8px' }}
            >
              <Button
                type={filtersExpanded ? 'default' : 'text'}
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                icon={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FilterOutlined style={{ fontSize: '16px', color: filtersExpanded ? '#1890ff' : undefined }} />
                    {filtersExpanded ? 
                      <CaretUpFilled style={{ fontSize: '10px', color: '#1890ff' }} /> : 
                      <CaretDownFilled style={{ fontSize: '10px' }} />
                    }
                  </span>
                }
                size="large"
              >
                Фильтры
              </Button>
            </Badge>
          </Space>
          <Space>
            {appliedFilters.project_id && !addMode && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddRow}
                size="large"
              >
                Добавить
              </Button>
            )}
            {addMode && (
              <>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveAll}
                  size="large"
                >
                  Сохранить
                </Button>
                <Button
                  onClick={handleCancelAll}
                  size="large"
                >
                  Отмена
                </Button>
              </>
            )}
            <Button
              icon={<UploadOutlined />}
              onClick={() => setImportModalOpen(true)}
              size="large"
            >
              Импорт Excel
            </Button>
          </Space>
        </div>

        {/* Развернутые фильтры */}
        {filtersExpanded && (
          <div style={{ 
            marginBottom: 16, 
            padding: '16px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px'
          }}>
            <Space wrap style={{ width: '100%' }}>
              <Select
                style={{ width: 200 }}
                placeholder="Корпус"
                allowClear
                disabled={!filters.project_id}
                value={filters.block_id}
                onChange={(value) => setFilters({ ...filters, block_id: value })}
                options={blocks.map((b) => ({ label: b.name, value: b.id }))}
              />
              <Select
                style={{ width: 200 }}
                placeholder="Статус"
                allowClear
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
                options={[
                  { label: 'Данные заполнены по пересчету РД', value: 'filled_recalc' },
                  { label: 'Данные заполнены по спеке РД', value: 'filled_spec' },
                  { label: 'Данные не заполнены', value: 'not_filled' },
                  { label: 'Созданы ВОР', value: 'vor_created' },
                ]}
              />
              <Checkbox
                checked={filters.show_latest_only}
                onChange={(e) => setFilters({ ...filters, show_latest_only: e.target.checked })}
              >
                Скрыть все версии кроме последней
              </Checkbox>
              <Button
                icon={<SettingOutlined />}
                onClick={() => setSettingsDrawerOpen(true)}
              >
                Настройки столбцов
              </Button>
            </Space>
          </div>
        )}
      </div>

      {/* Таблица */}
      {!appliedFilters.project_id ? (
        <Empty
          description="Выберите проект для просмотра документации"
          style={{ marginTop: 48 }}
        />
      ) : (
        <Table
          columns={columns}
          dataSource={tableData}
          rowKey="id"
          loading={isLoading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total}`,
          }}
          scroll={{ x: 'max-content' }}
          // TODO: раскомментировать после добавления колонки color в БД
          /*onRow={(record: DocumentationTableRow) => ({
            style: {
              backgroundColor: record.color ? colorMap[record.color as RowColor] : undefined,
            },
          })}*/
        />
      )}

      {/* Drawer настроек столбцов */}
      <Drawer
        title="Настройки столбцов"
        placement="right"
        onClose={() => setSettingsDrawerOpen(false)}
        open={settingsDrawerOpen}
        width={400}
      >
        <List
          dataSource={[
            { key: 'tag', label: 'Раздел' },
            { key: 'code', label: 'Шифр проекта' },
            { key: 'version_count', label: 'Версия' },
            { key: 'comments', label: 'Комментарии' },
          ]}
          renderItem={(item) => (
            <List.Item>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <span>{item.label}</span>
                <Switch
                  checked={columnSettings.visible[item.key as keyof typeof columnSettings.visible]}
                  onChange={(checked) => {
                    updateColumnSettings({
                      ...columnSettings,
                      visible: {
                        ...columnSettings.visible,
                        [item.key]: checked,
                      },
                    })
                  }}
                />
              </Space>
            </List.Item>
          )}
        />
      </Drawer>

      {/* Модальное окно импорта */}
      <Modal
        title="Импорт из Excel"
        open={importModalOpen}
        onOk={handleImportExcel}
        onCancel={() => {
          setImportModalOpen(false)
          setFileList([])
          importForm.resetFields()
          setImportSelectedProjectId(null)
        }}
        confirmLoading={importLoading}
        okText="Импортировать"
        cancelText="Отмена"
        width={600}
      >
        <Form
          form={importForm}
          layout="vertical"
          initialValues={{
            stage: DOCUMENT_STAGES.P,
          }}
        >
          <Form.Item
            name="project_id"
            label="Проект"
            rules={[{ required: true, message: 'Выберите проект' }]}
          >
            <Select
              placeholder="Выберите проект"
              options={projects?.map((p) => ({ 
                value: p.id, 
                label: p.name,
              })) ?? []}
              showSearch
              filterOption={(input, option) => {
                const label = option?.label
                if (typeof label === 'string') {
                  return label.toLowerCase().includes(input.toLowerCase())
                }
                return false
              }}
              onChange={(value) => {
                setImportSelectedProjectId(value)
                // Сбрасываем выбранный корпус при смене проекта
                importForm.setFieldValue('block_id', undefined)
              }}
            />
          </Form.Item>

          <Form.Item
            name="block_id"
            label="Корпус"
            rules={[{ required: false }]}
          >
            <Select
              placeholder="Выберите корпус (необязательно)"
              options={importBlocks?.map((b) => ({ 
                value: b.id, 
                label: b.name,
              })) ?? []}
              allowClear
              disabled={!importSelectedProjectId}
              showSearch
              filterOption={(input, option) => {
                const label = option?.label
                if (typeof label === 'string') {
                  return label.toLowerCase().includes(input.toLowerCase())
                }
                return false
              }}
            />
          </Form.Item>

          <Form.Item
            name="stage"
            label="Тип документа"
            rules={[{ required: true, message: 'Выберите тип документа' }]}
          >
            <Select
              options={[
                { label: 'П (Проект)', value: DOCUMENT_STAGES.P },
                { label: 'Р (Рабочий)', value: DOCUMENT_STAGES.R },
              ]}
            />
          </Form.Item>

          <Form.Item label="Файл для импорта">
            <Upload.Dragger
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList.slice(-1))}
              beforeUpload={() => false}
              accept=".xlsx,.xls"
              maxCount={1}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Нажмите или перетащите файл для загрузки</p>
              <p className="ant-upload-hint">
                Поддерживаются файлы Excel (.xlsx, .xls)
                <br />
                Файл должен содержать столбцы: Раздел, Шифр проекта, Номер версии, Дата выдачи версии, Ссылка
              </p>
            </Upload.Dragger>
          </Form.Item>
        </Form>
      </Modal>

      {/* Диалог разрешения конфликтов */}
      <ConflictResolutionDialog
        visible={conflictDialogVisible}
        conflicts={importConflicts}
        onResolve={handleConflictResolution}
        onCancel={handleCancelConflictResolution}
        loading={resolvingConflicts}
      />
    </div>
  )
}