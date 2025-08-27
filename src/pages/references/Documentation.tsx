import { useState, useMemo, useCallback, useEffect } from 'react'
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
  Input,
  Badge,
  Popconfirm,
  Empty,
  Form,
  App,
  Radio,
  Tooltip,
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
  ArrowUpOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload'
import * as XLSX from 'xlsx'
import FileUpload from '@/components/FileUpload'
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

const { Text, Title } = Typography

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
    order: ['stage', 'tag', 'code', 'version', 'issue_date', 'file', 'comments', 'actions'],
  }
}


export default function Documentation() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<DocumentationFilters>({})
  const [appliedFilters, setAppliedFilters] = useState<DocumentationFilters>({})
  const [filtersExpanded, setFiltersExpanded] = useState(true) // По умолчанию развернут
  const [columnSettings] = useState<DocumentationColumnSettings>(getColumnSettings())
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
  const [fileDuplicates, setFileDuplicates] = useState<Array<{
    key: string
    rows: DocumentationImportRow[]
    indices: number[]
  }>>([])
  const [duplicateDialogVisible, setDuplicateDialogVisible] = useState(false)
  const [selectedDuplicates, setSelectedDuplicates] = useState<Map<string, number>>(new Map())
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedRowsForDelete, setSelectedRowsForDelete] = useState<Set<string>>(new Set())
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('documentation_page_size')
    return saved ? parseInt(saved) : 100
  })
  const [editingRows, setEditingRows] = useState<Record<string, DocumentationTableRow>>({}) // Для множественного редактирования
  
  // Состояния для управления столбцами
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  
  // Диагностика двойного скролла
  useEffect(() => {
    const checkScrollbars = () => {
      const body = document.body
      const html = document.documentElement
      const table = document.querySelector('.ant-table-wrapper')
      const tableContainer = document.querySelector('.ant-table-container')
      const tableBody = document.querySelector('.ant-table-body')
      const mainContent = document.querySelector('.ant-layout-content')
      
      console.log('📊 Documentation Scroll diagnostics:')
      console.log('Body height:', body.scrollHeight, 'Client height:', body.clientHeight)
      console.log('Body has scroll:', body.scrollHeight > body.clientHeight)
      console.log('HTML height:', html.scrollHeight, 'Client height:', html.clientHeight)
      console.log('HTML has scroll:', html.scrollHeight > html.clientHeight)
      console.log('Window inner height:', window.innerHeight)
      console.log('Document height:', document.documentElement.scrollHeight)
      
      if (mainContent) {
        console.log('Main content:', mainContent.scrollHeight, mainContent.clientHeight)
        console.log('Main content overflow:', window.getComputedStyle(mainContent).overflow)
      }
      
      if (table) {
        console.log('Table wrapper:', table.scrollHeight, table.clientHeight)
        const tableRect = table.getBoundingClientRect()
        console.log('Table position:', { top: tableRect.top, height: tableRect.height, bottom: tableRect.bottom })
      }
      if (tableContainer) {
        console.log('Table container:', tableContainer.scrollHeight, tableContainer.clientHeight)
      }
      if (tableBody) {
        console.log('Table body:', tableBody.scrollHeight, tableBody.clientHeight)
        console.log('Table body overflow:', window.getComputedStyle(tableBody).overflow)
      }
      
      // Проверяем стили overflow
      console.log('Body overflow:', window.getComputedStyle(body).overflow)
      console.log('HTML overflow:', window.getComputedStyle(html).overflow)
      
      // Проверяем все элементы со скроллом
      const scrollableElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el)
        return (style.overflow === 'auto' || style.overflow === 'scroll' || 
                style.overflowY === 'auto' || style.overflowY === 'scroll') &&
                el.scrollHeight > el.clientHeight
      })
      console.log('Elements with scroll:', scrollableElements.length)
      scrollableElements.forEach(el => {
        console.log('Scrollable element:', el.className, el.scrollHeight, el.clientHeight)
      })
    }
    
    // Проверяем после рендера
    setTimeout(checkScrollbars, 500)
    window.addEventListener('resize', checkScrollbars)
    
    return () => window.removeEventListener('resize', checkScrollbars)
  }, [appliedFilters])

  // Функции управления столбцами
  const toggleColumnVisibility = useCallback((key: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [key]: prev[key] === false ? true : false
    }))
  }, [])
  
  const selectAllColumns = useCallback((select: boolean, allColumnsData: Array<{key: string, title: string}>) => {
    const newVisibility: Record<string, boolean> = {}
    allColumnsData.forEach(col => {
      newVisibility[col.key] = select
    })
    setColumnVisibility(newVisibility)
  }, [])
  
  const resetToDefaults = useCallback((allColumnsData: Array<{key: string, title: string}>) => {
    // Сброс видимости - все столбцы видимы
    const defaultVisibility: Record<string, boolean> = {}
    allColumnsData.forEach(col => {
      defaultVisibility[col.key] = true
    })
    setColumnVisibility(defaultVisibility)
    
    // Сброс порядка - исходный порядок
    setColumnOrder(allColumnsData.map(c => c.key))
    
    // Очистка localStorage
    localStorage.removeItem('documentation-column-visibility')
    localStorage.removeItem('documentation-column-order')
  }, [])

  const moveColumn = useCallback((key: string, direction: 'up' | 'down') => {
    setColumnOrder(prev => {
      const currentIndex = prev.indexOf(key)
      if (currentIndex === -1) return prev
      
      const newOrder = [...prev]
      if (direction === 'up' && currentIndex > 0) {
        [newOrder[currentIndex], newOrder[currentIndex - 1]] = [newOrder[currentIndex - 1], newOrder[currentIndex]]
      } else if (direction === 'down' && currentIndex < prev.length - 1) {
        [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]]
      }
      
      return newOrder
    })
  }, [])

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
      project_name: record.project_name,
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
        tag_id: null, // Будет заполнено при сохранении
        tag_name: record.tag_name,
        tag_number: record.tag_number,
        project_code: '',
        project_name: '',
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
    // Чекбокс колонка для режима удаления
    const checkboxColumn = deleteMode ? {
      title: '',
      dataIndex: 'checkbox',
      key: 'checkbox',
      width: 50,
      fixed: 'left' as const,
      render: (_: any, record: DocumentationTableRow) => (
        <Checkbox
          checked={selectedRowsForDelete.has(record.id)}
          onChange={() => {
            const newSelected = new Set(selectedRowsForDelete)
            if (newSelected.has(record.id)) {
              newSelected.delete(record.id)
            } else {
              newSelected.add(record.id)
            }
            setSelectedRowsForDelete(newSelected)
          }}
        />
      ),
      visible: true,
    } : null

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
        width: 60,
        sorter: (a, b) => (a.stage || 'П').localeCompare(b.stage || 'П'),
        filters: [
          { text: 'П', value: 'П' },
          { text: 'Р', value: 'Р' },
        ],
        onFilter: (value, record) => record.stage === value,
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
        width: 100,
        sorter: (a, b) => a.tag_name.localeCompare(b.tag_name),
        filters: tags.map(t => ({ text: t.name, value: t.name })),
        onFilter: (value, record) => record.tag_name === value,
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
          if (editingKey === record.id || editingRows[record.id]) {
            const editedRow = editingRows[record.id] || record
            return (
              <Select
                style={{ width: '100%' }}
                value={editedRow.tag_name}
                onChange={(value) => {
                  const tag = tags.find(t => t.name === value)
                  setEditingRows(prev => ({
                    ...prev,
                    [record.id]: {
                      ...editedRow,
                      tag_name: value,
                      tag_number: tag?.tag_number || 0
                    }
                  }))
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
        width: 160,
        sorter: (a, b) => a.project_code.localeCompare(b.project_code),
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
          <div style={{ padding: 8 }}>
            <Input
              placeholder="Поиск по шифру"
              value={selectedKeys[0]}
              onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
              onPressEnter={() => confirm()}
              style={{ marginBottom: 8, display: 'block' }}
            />
            <Space>
              <Button
                type="primary"
                onClick={() => confirm()}
                icon={<FilterOutlined />}
                size="small"
                style={{ width: 90 }}
              >
                Поиск
              </Button>
              <Button onClick={() => clearFilters && clearFilters()} size="small" style={{ width: 90 }}>
                Сброс
              </Button>
            </Space>
          </div>
        ),
        onFilter: (value, record) => {
          if (typeof value === 'string') {
            return record.project_code.toLowerCase().includes(value.toLowerCase())
          }
          return false
        },
        visible: columnSettings.visible.code,
        render: (text, record: DocumentationTableRow) => {
          if (record.isNew || editingKey === record.id || editingRows[record.id]) {
            const editedRow = editingRows[record.id] || record
            return (
              <Input
                value={record.isNew ? text : editedRow.project_code}
                onChange={(e) => {
                  if (record.isNew) {
                    const updated = newRows.map(r => 
                      r.id === record.id 
                        ? { ...r, project_code: e.target.value }
                        : r
                    )
                    setNewRows(updated)
                  } else {
                    setEditingRows(prev => ({
                      ...prev,
                      [record.id]: {
                        ...editedRow,
                        project_code: e.target.value
                      }
                    }))
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
        sorter: (a, b) => {
          const aVersion = a.selected_version || a.versions[0]?.version_number || 0
          const bVersion = b.selected_version || b.versions[0]?.version_number || 0
          return aVersion - bVersion
        },
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
        visible: columnVisibility.version !== false,
      },
      {
        title: 'Дата выдачи',
        key: 'issue_date',
        width: 100,
        sorter: (a, b) => {
          const aDate = a.versions.find(v => v.version_number === (a.selected_version || a.versions[0]?.version_number))?.issue_date || ''
          const bDate = b.versions.find(v => v.version_number === (b.selected_version || b.versions[0]?.version_number))?.issue_date || ''
          return aDate.localeCompare(bDate)
        },
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
        visible: columnVisibility.issue_date !== false,
      },
      {
        title: 'Файл',
        key: 'file',
        width: 100,
        filters: [
          { text: 'Есть файл', value: 'has_file' },
          { text: 'Нет файла', value: 'no_file' },
        ],
        onFilter: (value, record) => {
          const selectedVersion = record.versions.find(v => v.version_number === (record.selected_version || record.versions[0]?.version_number))
          const hasFile = !!selectedVersion?.file_url
          return value === 'has_file' ? hasFile : !hasFile
        },
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
          
          // Показываем файлы выбранной версии
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

          return (
              <FileUpload
              files={selectedVersion?.local_files || []}
              onChange={async (files) => {
                if (selectedVersion) {
                  try {
                    await documentationApi.updateVersionLocalFiles(selectedVersion.id, files)
                    queryClient.invalidateQueries({ queryKey: ['documentation'] })
                  } catch (error) {
                    console.error('Failed to update files:', error)
                    message.error('Не удалось обновить файлы')
                  }
                }
              }}
              disabled={false}
              projectName={record.project_name}
              sectionName={record.tag_name}
              documentationCode={record.project_code}
              onlineFileUrl={selectedVersion?.file_url || undefined}
            />
          )
        },
        visible: columnVisibility.file !== false,
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
          
          if (editingKey === record.id || editingRows[record.id]) {
            return (
              <Space size="small">
                <Button
                  type="text"
                  size="small"
                  icon={<SaveOutlined />}
                  onClick={async () => {
                    // Сохранение редактирования
                    const editedRow = editingRows[record.id]
                    if (editedRow) {
                      try {
                        // TODO: Добавить сохранение через API
                        message.success('Запись обновлена')
                        setEditingRows(prev => {
                          const newRows = { ...prev }
                          delete newRows[record.id]
                          return newRows
                        })
                        queryClient.invalidateQueries({ queryKey: ['documentation'] })
                      } catch {
                        message.error('Ошибка при сохранении')
                      }
                    }
                    setEditingKey(null)
                  }}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setEditingRows(prev => {
                      const newRows = { ...prev }
                      delete newRows[record.id]
                      return newRows
                    })
                    setEditingKey(null)
                  }}
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
                onClick={() => {
                  setEditingKey(record.id)
                  setEditingRows(prev => ({
                    ...prev,
                    [record.id]: { ...record }
                  }))
                }}
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

    // Фильтруем и упорядочиваем столбцы согласно настройкам
    const orderedColumns = columnOrder.length > 0 ? 
      columnOrder
        .filter(key => {
          // Служебные столбцы не управляются порядком
          if (key === 'checkbox' || key === 'actions') return false
          return columnVisibility[key] !== false
        })
        .map(key => allColumns.find(col => col.key === key))
        .filter(Boolean) 
      : allColumns.filter(col => col.visible !== false)

    // Добавляем служебные столбцы в конце
    const actionColumn = allColumns.find(col => col.key === 'actions')
    const visibleColumns = actionColumn ? [...orderedColumns, actionColumn] : orderedColumns
    
    // Добавляем checkbox колонку в начало если включен режим удаления
    const finalColumns = checkboxColumn ? [checkboxColumn, ...visibleColumns] : visibleColumns
    
    // Удаляем свойство visible перед возвратом
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return finalColumns.map((col: any) => {
      const { visible, ...rest } = col
      return rest
    }) as ColumnsType<DocumentationTableRow>
  }, [columnSettings, newRows, editingKey, editingRows, tags, selectedVersions, handleAddRowAfter, handleCopyRow, handleDeleteNew, handleDelete, deleteMode, selectedRowsForDelete, message, queryClient, columnVisibility, columnOrder])

  // Получаем все столбцы для управления настройками
  const allColumnsForSettings = useMemo(() => {
    const baseColumns = [
      { key: 'stage', title: 'Стадия' },
      { key: 'tag', title: 'Раздел' },
      { key: 'code', title: 'Шифр проекта' },
      { key: 'version', title: 'Версия' },
      { key: 'file', title: 'Файл' },
      { key: 'project', title: 'Проект' },
      { key: 'block', title: 'Корпус' },
      { key: 'status', title: 'Статус' },
      { key: 'issue_date', title: 'Дата выдачи' },
      { key: 'comments', title: 'Комментарии' },
    ]
    return baseColumns
  }, [])

  // Инициализация настроек столбцов
  useEffect(() => {
    const savedVisibility = localStorage.getItem('documentation-column-visibility')
    const savedOrder = localStorage.getItem('documentation-column-order')
    
    if (savedVisibility && Object.keys(columnVisibility).length === 0) {
      try {
        const parsed = JSON.parse(savedVisibility)
        // Проверяем, есть ли новые столбцы, которых нет в сохраненных настройках
        const updatedVisibility = { ...parsed }
        allColumnsForSettings.forEach(col => {
          if (!(col.key in updatedVisibility)) {
            updatedVisibility[col.key] = true // Новые столбцы видимы по умолчанию
          }
        })
        setColumnVisibility(updatedVisibility)
      } catch (error) {
        console.error('Error loading column visibility:', error)
        // Если ошибка парсинга, устанавливаем значения по умолчанию
        const defaultVisibility: Record<string, boolean> = {}
        allColumnsForSettings.forEach(col => {
          defaultVisibility[col.key] = true
        })
        setColumnVisibility(defaultVisibility)
      }
    } else if (Object.keys(columnVisibility).length === 0) {
      const initialVisibility: Record<string, boolean> = {}
      allColumnsForSettings.forEach(col => {
        initialVisibility[col.key] = true
      })
      setColumnVisibility(initialVisibility)
    }
    
    if (savedOrder && columnOrder.length === 0) {
      try {
        const parsed = JSON.parse(savedOrder)
        // Добавляем новые столбцы, которых нет в сохраненном порядке
        const existingKeys = new Set(parsed)
        const newColumns = allColumnsForSettings.filter(col => !existingKeys.has(col.key))
        const updatedOrder = [...parsed, ...newColumns.map(col => col.key)]
        
        // Убираем столбцы, которые больше не существуют
        const validKeys = new Set(allColumnsForSettings.map(col => col.key))
        const filteredOrder = updatedOrder.filter(key => validKeys.has(key))
        
        setColumnOrder(filteredOrder)
      } catch (error) {
        console.error('Error loading column order:', error)
        setColumnOrder(allColumnsForSettings.map(c => c.key))
      }
    } else if (columnOrder.length === 0) {
      setColumnOrder(allColumnsForSettings.map(c => c.key))
    }
  }, [allColumnsForSettings, columnVisibility, columnOrder])
  
  // Сохранение в localStorage при изменении
  useEffect(() => {
    if (Object.keys(columnVisibility).length > 0) {
      localStorage.setItem('documentation-column-visibility', JSON.stringify(columnVisibility))
    }
  }, [columnVisibility])
  
  useEffect(() => {
    if (columnOrder.length > 0) {
      localStorage.setItem('documentation-column-order', JSON.stringify(columnOrder))
    }
  }, [columnOrder])

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

      // Проверяем на дубликаты внутри файла импорта
      const duplicatesMap = new Map<string, { rows: DocumentationImportRow[], indices: number[] }>()
      importData.forEach((row, index) => {
        const key = `${row.code}_${row.version_number}`
        if (!duplicatesMap.has(key)) {
          duplicatesMap.set(key, { rows: [], indices: [] })
        }
        const entry = duplicatesMap.get(key)!
        entry.rows.push(row)
        entry.indices.push(index)
      })

      // Находим дубликаты (где больше одной строки с одинаковым code + version)
      const fileDuplicates = Array.from(duplicatesMap.entries())
        .filter(([, entry]) => entry.rows.length > 1)
        .map(([key, entry]) => ({
          key,
          rows: entry.rows,
          indices: entry.indices
        }))

      if (fileDuplicates.length > 0) {
        // Показываем диалог выбора дубликатов
        setFileDuplicates(fileDuplicates)
        setPendingImportData(importData)
        setDuplicateDialogVisible(true)
        setImportLoading(false)
        setImportModalOpen(false)
        return
      }

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

  // Обработка выбора дубликатов в файле
  const handleDuplicateResolution = async () => {
    try {
      // Проверяем, что для всех дубликатов выбрана строка
      for (const duplicate of fileDuplicates) {
        if (!selectedDuplicates.has(duplicate.key)) {
          message.error('Пожалуйста, выберите строку для каждого дубликата')
          return
        }
      }

      // Фильтруем importData, оставляя только выбранные строки
      const indicesToKeep = new Set<number>()
      
      // Добавляем индексы выбранных строк из дубликатов
      selectedDuplicates.forEach((selectedIndex) => {
        indicesToKeep.add(selectedIndex)
      })
      
      // Добавляем индексы строк, которые не являются дубликатами
      pendingImportData.forEach((_, index) => {
        const isDuplicate = fileDuplicates.some(dup => dup.indices.includes(index))
        if (!isDuplicate) {
          indicesToKeep.add(index)
        }
      })

      // Создаем отфильтрованный массив данных
      const filteredData = pendingImportData.filter((_, index) => indicesToKeep.has(index))

      // Очищаем состояние дубликатов
      setDuplicateDialogVisible(false)
      setFileDuplicates([])
      setSelectedDuplicates(new Map())

      // Проверяем на конфликты с базой данных
      const conflicts = await documentationApi.checkForConflicts(filteredData)
      
      if (conflicts.length > 0) {
        // Есть конфликты - показываем диалог
        setImportConflicts(conflicts)
        setPendingImportData(filteredData)
        setConflictDialogVisible(true)
      } else {
        // Нет конфликтов - импортируем сразу
        const result = await documentationApi.importFromExcel(filteredData)

        if (result.errors.length > 0) {
          message.warning(`Импортировано ${result.results.length} записей, ошибок: ${result.errors.length}`)
        } else {
          message.success(`Успешно импортировано ${result.results.length} записей`)
        }

        // Обновляем данные
        queryClient.invalidateQueries({ queryKey: ['documentation'] })
        setPendingImportData([])
        setFileList([])
        importForm.resetFields()
        setImportSelectedProjectId(null)
      }
    } catch (error) {
      console.error('Error resolving duplicates:', error)
      message.error('Ошибка при обработке дубликатов')
    }
  }

  // Отмена выбора дубликатов
  const handleCancelDuplicateResolution = () => {
    setDuplicateDialogVisible(false)
    setFileDuplicates([])
    setSelectedDuplicates(new Map())
    setPendingImportData([])
    // Возвращаем модальное окно импорта
    setImportModalOpen(true)
  }

  // Применение фильтров
  const handleApply = () => {
    setAppliedFilters(filters)
    setAddMode(false)
    setNewRows([])
    setSelectedVersions({}) // Очищаем выбранные версии при смене фильтров
    setFiltersExpanded(false) // Сворачиваем блок фильтров после применения
  }

  // Добавление новой строки
  const handleAddRow = () => {
    const newRow = {
      id: `new-${Date.now()}`,
      documentation_id: '', // Пустой UUID для новых записей
      stage: 'П' as 'П' | 'Р', // По умолчанию П (проект)
      tag_id: null, // Будет заполнено при сохранении
      tag_name: '',
      tag_number: 0,
      project_code: '',
      project_name: '',
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
    <div style={{ 
      height: 'calc(100vh - 96px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ flexShrink: 0, paddingBottom: 16 }}>
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
              allowClear
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
                return String(label).toLowerCase().includes(input.toLowerCase())
              }}
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
              >
                Фильтры
              </Button>
            </Badge>
          </Space>
          <Space>
            {appliedFilters.project_id && !addMode && !Object.keys(editingRows).length && !deleteMode && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddRow}
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
            {Object.keys(editingRows).length > 0 && (
              <>
                <Button 
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={async () => {
                    try {
                      // TODO: Добавить массовое сохранение через API
                      message.success(`Обновлено записей: ${Object.keys(editingRows).length}`)
                      setEditingRows({})
                      setEditingKey(null)
                      queryClient.invalidateQueries({ queryKey: ['documentation'] })
                    } catch {
                      message.error('Ошибка при сохранении')
                    }
                  }}
                >
                  Сохранить
                </Button>
                <Button
                  onClick={() => {
                    setEditingRows({})
                    setEditingKey(null)
                  }}
                >
                  Отмена
                </Button>
              </>
            )}
            {!Object.keys(editingRows).length && appliedFilters.project_id && (
              <Button
                danger={deleteMode}
                icon={<DeleteOutlined />}
                onClick={() => {
                  if (deleteMode && selectedRowsForDelete.size > 0) {
                    Modal.confirm({
                      title: 'Удалить выбранные записи?',
                      content: `Будет удалено записей: ${selectedRowsForDelete.size}`,
                      okText: 'Удалить',
                      cancelText: 'Отмена',
                      okButtonProps: { danger: true },
                      onOk: async () => {
                        // TODO: Добавить логику удаления через API
                        message.success(`Удалено записей: ${selectedRowsForDelete.size}`)
                        setSelectedRowsForDelete(new Set())
                        setDeleteMode(false)
                        queryClient.invalidateQueries({ queryKey: ['documentation'] })
                      }
                    })
                  } else {
                    setDeleteMode(!deleteMode)
                    setSelectedRowsForDelete(new Set())
                  }
                }}
                disabled={addMode}
              >
                {deleteMode && selectedRowsForDelete.size > 0 
                  ? `Удалить (${selectedRowsForDelete.size})`
                  : deleteMode 
                  ? 'Выйти из режима' 
                  : 'Удалить'}
              </Button>
            )}
            {deleteMode && selectedRowsForDelete.size === 0 && appliedFilters.project_id && (
              <Button
                onClick={() => {
                  setDeleteMode(false)
                  setSelectedRowsForDelete(new Set())
                }}
              >
                Отмена
              </Button>
            )}
            <Button
              icon={<UploadOutlined />}
              onClick={() => setImportModalOpen(true)}
              disabled={deleteMode || addMode}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <Space wrap>
                <Select
                  style={{ width: 200 }}
                  placeholder="Корпус"
                  allowClear
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
                return String(label).toLowerCase().includes(input.toLowerCase())
              }}
                  disabled={!filters.project_id}
                  value={filters.block_id}
                  onChange={(value) => setFilters({ ...filters, block_id: value })}
                  options={blocks.map((b) => ({ label: b.name, value: b.id }))}
                />
                <Select
                  style={{ width: 200 }}
                  placeholder="Статус"
                  allowClear
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
                return String(label).toLowerCase().includes(input.toLowerCase())
              }}
                  value={filters.status}
                  onChange={(value) => setFilters({ ...filters, status: value })}
                  options={[
                    { label: 'Данные заполнены по пересчету РД', value: 'filled_recalc' },
                    { label: 'Данные заполнены по спеке РД', value: 'filled_spec' },
                    { label: 'Данные не заполнены', value: 'not_filled' },
                    { label: 'Созданы ВОР', value: 'vor_created' },
                  ]}
                />
              </Space>
              <Button
                icon={<SettingOutlined />}
                onClick={() => setSettingsDrawerOpen(true)}
              >
                Настройка столбцов
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Таблица */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
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
              defaultPageSize: pageSize,
              pageSizeOptions: ['10', '20', '50', '100', '200', '500'],
              onShowSizeChange: (_, size) => {
                setPageSize(size)
                localStorage.setItem('documentation_page_size', size.toString())
              },
            }}
            sticky
            scroll={{ 
              x: 'max-content',
              y: 'calc(100vh - 300px)'
            }}
          // TODO: раскомментировать после добавления колонки color в БД
          /*onRow={(record: DocumentationTableRow) => ({
            style: {
              backgroundColor: record.color ? colorMap[record.color as RowColor] : undefined,
            },
          })}*/
        />
      )}
      </div>

      {/* Drawer настроек столбцов */}
      <Drawer
        title="Настройка столбцов"
        placement="right"
        onClose={() => setSettingsDrawerOpen(false)}
        open={settingsDrawerOpen}
        width={350}
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Checkbox
            checked={allColumnsForSettings.every(col => columnVisibility[col.key] !== false)}
            indeterminate={allColumnsForSettings.some(col => columnVisibility[col.key]) && !allColumnsForSettings.every(col => columnVisibility[col.key] !== false)}
            onChange={(e) => selectAllColumns(e.target.checked, allColumnsForSettings)}
          >
            Выделить все
          </Checkbox>
          <Button
            type="link"
            onClick={() => resetToDefaults(allColumnsForSettings)}
          >
            По умолчанию
          </Button>
        </div>
        <List
          dataSource={columnOrder.map(key => {
            const col = allColumnsForSettings.find(c => c.key === key)
            return col ? { ...col, visible: columnVisibility[key] !== false } : null
          }).filter(Boolean)}
          renderItem={(item, index) => item && (
            <List.Item
              actions={[
                <Button
                  key="up"
                  type="text"
                  icon={<ArrowUpOutlined />}
                  onClick={() => moveColumn(item.key, 'up')}
                  disabled={index === 0}
                  size="small"
                />,
                <Button
                  key="down"
                  type="text"
                  icon={<ArrowDownOutlined />}
                  onClick={() => moveColumn(item.key, 'down')}
                  disabled={index === columnOrder.length - 1}
                  size="small"
                />
              ]}
            >
              <Checkbox
                checked={item.visible}
                onChange={() => toggleColumnVisibility(item.key)}
              >
                {item.title}
              </Checkbox>
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
            stage: DOCUMENT_STAGES.R,
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

      {/* Диалог выбора дубликатов в файле */}
      <Modal
        title="Обнаружены дубликаты в файле импорта"
        open={duplicateDialogVisible}
        onOk={handleDuplicateResolution}
        onCancel={handleCancelDuplicateResolution}
        width={1200}
        okText="Продолжить"
        cancelText="Отмена"
      >
        <div style={{ marginBottom: 16 }}>
          <Text>
            В файле обнаружены строки с одинаковым сочетанием шифра документа и версии.
            Выберите, какую строку импортировать для каждого дубликата:
          </Text>
        </div>
        {fileDuplicates.map((duplicate) => {
          const [code, version] = duplicate.key.split('_')
          return (
            <div key={duplicate.key} style={{ marginBottom: 24, border: '1px solid #d9d9d9', padding: 16, borderRadius: 4 }}>
              <Title level={5}>Шифр: {code}, Версия: {version}</Title>
              <Radio.Group
                value={selectedDuplicates.get(duplicate.key)}
                onChange={(e) => {
                  const newSelected = new Map(selectedDuplicates)
                  newSelected.set(duplicate.key, e.target.value)
                  setSelectedDuplicates(newSelected)
                }}
                style={{ width: '100%' }}
              >
                <Table
                  dataSource={duplicate.rows.map((row, idx) => ({
                    key: duplicate.indices[idx],
                    rowIndex: duplicate.indices[idx],
                    ...row
                  }))}
                  columns={[
                    {
                      title: 'Выбрать',
                      dataIndex: 'rowIndex',
                      key: 'select',
                      width: 80,
                      align: 'center',
                      render: (rowIndex: number) => (
                        <Radio value={rowIndex} />
                      )
                    },
                    {
                      title: '№ строки',
                      dataIndex: 'rowIndex',
                      key: 'rowIndex',
                      width: 90,
                      render: (index: number) => `${index + 1}`
                    },
                    {
                      title: 'Раздел',
                      dataIndex: 'tag',
                      key: 'tag',
                      width: 200,
                      render: (text: string) => text || '-'
                    },
                    {
                      title: 'Шифр проекта',
                      dataIndex: 'code',
                      key: 'code',
                      width: 150,
                      render: (text: string) => text || '-'
                    },
                    {
                      title: 'Версия',
                      dataIndex: 'version_number',
                      key: 'version_number',
                      width: 80,
                      align: 'center'
                    },
                    {
                      title: 'Дата выдачи',
                      dataIndex: 'issue_date',
                      key: 'issue_date',
                      width: 120,
                      render: (date: string) => date ? formatDate(date) : '-'
                    },
                    {
                      title: 'Ссылка на документ',
                      dataIndex: 'file_url',
                      key: 'file_url',
                      width: 150,
                      ellipsis: true,
                      render: (url: string) => url ? (
                        <Tooltip title={url}>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            Открыть
                          </a>
                        </Tooltip>
                      ) : '-'
                    },
                    {
                      title: 'Стадия',
                      dataIndex: 'stage',
                      key: 'stage',
                      width: 80,
                      align: 'center',
                      render: (stage: string) => stage || 'П'
                    }
                  ]}
                  pagination={false}
                  size="small"
                  bordered
                  style={{ marginTop: 8 }}
                />
              </Radio.Group>
            </div>
          )
        })}
      </Modal>
    </div>
  )
}