import { useCallback, useMemo, useState, type Key } from 'react'
import { 
  App, Button, Card, Dropdown, Input, Modal, Popconfirm, 
  Select, Space, Table, Upload, Row, Col, Badge, Tooltip, Segmented 
} from 'antd'
import type { ColumnType, ColumnsType } from 'antd/es/table'
import { 
  BgColorsOutlined, CopyOutlined, DeleteOutlined, EditOutlined, 
  InboxOutlined, PlusOutlined, FilterOutlined, TableOutlined,
  AppstoreOutlined, SaveOutlined, CloseOutlined
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'

type RowColor = '' | 'green' | 'yellow' | 'blue' | 'red'

const colorMap: Record<RowColor, string> = {
  green: '#d9f7be',
  yellow: '#fff1b8',
  blue: '#e6f7ff',
  red: '#ffa39e',
  '': '',
}

const RowColorPicker = ({
  value,
  onChange,
}: {
  value: RowColor
  onChange: (c: RowColor) => void
}) => (
  <Dropdown
    trigger={['click']}
    menu={{
      items: (['', 'green', 'yellow', 'blue', 'red'] as RowColor[]).map((c) => ({
        key: c,
        label: (
          <div
            style={{
              width: 20,
              height: 20,
              background: colorMap[c],
              border: c ? undefined : '1px solid #d9d9d9',
              borderRadius: 4,
            }}
          />
        ),
      })),
      onClick: ({ key }) => onChange(key as RowColor),
    }}
  >
    <Button
      type="text"
      size="small"
      icon={<BgColorsOutlined />}
      style={{ 
        background: value ? colorMap[value] : undefined,
        borderRadius: 4,
      }}
    />
  </Dropdown>
)

interface RowData {
  key: string
  material: string
  quantityPd: string
  quantitySpec: string
  quantityRd: string
  unitId: string
  blockId: string
  block: string
  costCategoryId: string
  costTypeId: string
  locationId: string
  color: RowColor
}

interface ViewRow {
  key: string
  material: string
  quantityPd: string
  quantitySpec: string
  quantityRd: string
  unit: string
  blockId: string
  block: string
  costCategory: string
  costType: string
  location: string
  color: RowColor
}

interface TableRow extends RowData {
  isExisting?: boolean
}

interface ProjectOption { id: string; name: string }
interface BlockOption { id: string; name: string }
interface UnitOption { id: string; name: string }
interface CostCategoryOption { id: number; number: number | null; name: string }
interface CostTypeOption {
  id: number
  name: string
  cost_category_id: number
  location_id: number
}
interface LocationOption { id: number; name: string }

interface DbRow {
  id: string
  material: string | null
  quantityPd: number | null
  quantitySpec: number | null
  quantityRd: number | null
  unit_id: string | null
  color: string | null
  units?: { name: string | null } | null
  chessboard_mapping?: {
    block_id: string | null
    blocks?: { name: string | null } | null
    cost_category_id: number | null
    cost_type_id: number | null
    location_id: number | null
    cost_categories?: { name: string | null } | null
    detail_cost_categories?: { name: string | null } | null
    location?: { name: string | null } | null
  } | null
}

const emptyRow = (defaults: Partial<RowData>): RowData => ({
  key: Math.random().toString(36).slice(2),
  material: '',
  quantityPd: '',
  quantitySpec: '',
  quantityRd: '',
  unitId: '',
  blockId: defaults.blockId ?? '',
  block: defaults.block ?? '',
  costCategoryId: defaults.costCategoryId ?? '',
  costTypeId: defaults.costTypeId ?? '',
  locationId: defaults.locationId ?? '',
  color: '',
})

type HiddenColKey = 'block' | 'costCategory' | 'costType' | 'location'

const collapseMap: Record<string, HiddenColKey> = {
  block: 'block',
  costCategory: 'costCategory',
  costCategoryId: 'costCategory',
  costType: 'costType',
  costTypeId: 'costType',
  location: 'location',
  locationId: 'location',
}

const titleMap: Record<HiddenColKey, string> = {
  block: 'Корпус',
  costCategory: 'Категория затрат',
  costType: 'Вид затрат',
  location: 'Локализация',
}

export default function ChessboardImproved() {
  const { message } = App.useApp()
  const [filters, setFilters] = useState<{ projectId?: string; blockId?: string; categoryId?: string; typeId?: string }>({})
  const [appliedFilters, setAppliedFilters] = useState<
    { projectId: string; blockId?: string; categoryId?: string; typeId?: string } | null
  >(null)
  const [mode, setMode] = useState<'view' | 'add'>('view')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [rows, setRows] = useState<RowData[]>([])
  const [editingRows, setEditingRows] = useState<Record<string, RowData>>({})
  const [hiddenCols, setHiddenCols] = useState({
    block: false,
    costCategory: false,
    costType: false,
    location: false,
  })
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importState, setImportState] = useState<{
    projectId?: string
    blockId?: string
    categoryId?: string
    typeId?: string
    locationId?: string
  }>({})

  const toggleColumn = useCallback(
    (col: keyof typeof hiddenCols) =>
      setHiddenCols((prev) => ({ ...prev, [col]: !prev[col] })),
    [],
  )

  const { data: projects } = useQuery<ProjectOption[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('projects').select('id, name').order('name')
      if (error) throw error
      return data as ProjectOption[]
    },
  })

  const { data: blocks } = useQuery<BlockOption[]>({
    queryKey: ['blocks', filters.projectId],
    enabled: !!filters.projectId,
    queryFn: async () => {
      if (!supabase || !filters.projectId) return []
      const { data, error } = await supabase
        .from('projects_blocks')
        .select('blocks(id, name)')
        .eq('project_id', filters.projectId)
      if (error) throw error
      const rows = (data as { blocks: BlockOption | BlockOption[] | null }[] | null) ?? []
      return rows
        .map((r) => r.blocks)
        .flat()
        .filter((b): b is BlockOption => !!b)
    },
  })

  const { data: units } = useQuery<UnitOption[]>({
    queryKey: ['units'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('units').select('id, name').order('name')
      if (error) throw error
      return data as UnitOption[]
    },
  })

  const { data: costCategories } = useQuery<CostCategoryOption[]>({
    queryKey: ['costCategories'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('cost_categories')
        .select('id, number, name')
        .order('id')
      if (error) throw error
      return data as CostCategoryOption[]
    },
  })

  const { data: costTypes } = useQuery<CostTypeOption[]>({
    queryKey: ['costTypes'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('detail_cost_categories')
        .select('id, name, cost_category_id, location_id')
      if (error) throw error
      return data as CostTypeOption[]
    },
  })

  const { data: locations } = useQuery<LocationOption[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('location').select('id, name').order('name')
      if (error) throw error
      return data as LocationOption[]
    },
  })

  const { data: tableData, refetch } = useQuery<DbRow[]>({
    queryKey: ['chessboard', appliedFilters],
    enabled: !!appliedFilters?.projectId,
    queryFn: async () => {
      if (!supabase || !appliedFilters) return []
      const relation =
        appliedFilters.blockId || appliedFilters.categoryId || appliedFilters.typeId
          ? 'chessboard_mapping!inner'
          : 'chessboard_mapping'
      const query = supabase
        .from('chessboard')
        .select(
          `id, material, quantityPd, quantitySpec, quantityRd, unit_id, color, units(name), ${relation}(block_id, blocks(name), cost_category_id, cost_type_id, location_id, cost_categories(name), detail_cost_categories(name), location(name))`,
        )
        .eq('project_id', appliedFilters.projectId)
      if (appliedFilters.blockId)
        query.eq('chessboard_mapping.block_id', appliedFilters.blockId)
      if (appliedFilters.categoryId)
        query.eq('chessboard_mapping.cost_category_id', Number(appliedFilters.categoryId))
      if (appliedFilters.typeId)
        query.eq('chessboard_mapping.cost_type_id', Number(appliedFilters.typeId))
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) {
        message.error('Не удалось загрузить данные')
        throw error
      }
      return (data as unknown as DbRow[]) ?? []
    },
  })

  const viewRows = useMemo<ViewRow[]>(
    () =>
      (tableData ?? []).map((item) => ({
        key: item.id,
        material: item.material ?? '',
        quantityPd: item.quantityPd !== null && item.quantityPd !== undefined ? String(item.quantityPd) : '',
        quantitySpec: item.quantitySpec !== null && item.quantitySpec !== undefined ? String(item.quantitySpec) : '',
        quantityRd: item.quantityRd !== null && item.quantityRd !== undefined ? String(item.quantityRd) : '',
        unit: item.units?.name ?? '',
        blockId: item.chessboard_mapping?.block_id ?? '',
        block: item.chessboard_mapping?.blocks?.name ?? '',
        costCategory: item.chessboard_mapping?.cost_categories?.name ?? '',
        costType: item.chessboard_mapping?.detail_cost_categories?.name ?? '',
        location: item.chessboard_mapping?.location?.name ?? '',
        color: (item.color as RowColor | null) ?? '',
      })),
    [tableData],
  )

  const handleApply = () => {
    if (!filters.projectId) {
      message.warning('Выберите проект')
      return
    }
    setAppliedFilters({ ...filters } as {
      projectId: string
      blockId?: string
      categoryId?: string
      typeId?: string
    })
    setMode('view')
  }

  const handleRowChange = useCallback((key: string, field: keyof RowData, value: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }, [])

  const handleEditChange = useCallback(
    (key: string, field: keyof RowData, value: string) => {
      setEditingRows((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
    },
    [],
  )

  const startAdd = useCallback(() => {
    if (!appliedFilters) return
    const defaultLocationId = appliedFilters.typeId
      ? String(
          costTypes?.find((t) => String(t.id) === appliedFilters.typeId)?.location_id ?? '',
        )
      : ''
    const blockName = appliedFilters.blockId
      ? blocks?.find((b) => b.id === appliedFilters.blockId)?.name ?? ''
      : ''
    setRows([
      emptyRow({
        blockId: appliedFilters.blockId ?? '',
        costCategoryId: appliedFilters.categoryId ?? '',
        costTypeId: appliedFilters.typeId ?? '',
        locationId: defaultLocationId,
        block: blockName,
      }),
    ])
    setMode('add')
  }, [appliedFilters, costTypes, blocks])

  const handleSave = async () => {
    if (!supabase || !appliedFilters) return
    const payload = rows.map((r) => ({
      project_id: appliedFilters.projectId,
      material: r.material,
      quantityPd: r.quantityPd ? Number(r.quantityPd) : null,
      quantitySpec: r.quantitySpec ? Number(r.quantitySpec) : null,
      quantityRd: r.quantityRd ? Number(r.quantityRd) : null,
      unit_id: r.unitId || null,
      color: r.color || null,
    }))
    const { data, error } = await supabase.from('chessboard').insert(payload).select('id')
    if (error || !data) {
      message.error(`Не удалось сохранить данные: ${error?.message}`)
      return
    }
    const mappings = data.map((d, idx) => ({
      chessboard_id: d.id,
      block_id: rows[idx].blockId || null,
      cost_category_id: Number(rows[idx].costCategoryId),
      cost_type_id: rows[idx].costTypeId ? Number(rows[idx].costTypeId) : null,
      location_id: rows[idx].locationId ? Number(rows[idx].locationId) : null,
    }))
    const { error: mapError } = await supabase.from('chessboard_mapping').insert(mappings)
    if (mapError) {
      message.error(`Не удалось сохранить связи: ${mapError.message}`)
      return
    }
    message.success('Данные успешно сохранены')
    setMode('view')
    setRows([])
    await refetch()
  }

  const handleCancel = useCallback(() => {
    setRows([])
    setMode('view')
  }, [])

  const renderCardView = () => {
    if (!viewRows || viewRows.length === 0) {
      return <div style={{ textAlign: 'center', padding: 48 }}>Нет данных для отображения</div>
    }

    return (
      <Row gutter={[16, 16]}>
        {viewRows.map((row) => (
          <Col key={row.key} xs={24} sm={12} lg={8} xl={6}>
            <Card
              size="small"
              title={
                <Tooltip title={row.material}>
                  <div style={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                  }}>
                    {row.material}
                  </div>
                </Tooltip>
              }
              extra={
                <Space size="small">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<EditOutlined />} 
                  />
                  <Button 
                    type="text" 
                    size="small" 
                    danger 
                    icon={<DeleteOutlined />} 
                  />
                </Space>
              }
              style={{
                backgroundColor: row.color ? colorMap[row.color] : undefined,
                borderRadius: 12,
              }}
            >
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {row.quantityPd && (
                  <div>
                    <strong>Кол-во ПД:</strong> {row.quantityPd} {row.unit}
                  </div>
                )}
                {row.quantitySpec && (
                  <div>
                    <strong>Кол-во спека:</strong> {row.quantitySpec} {row.unit}
                  </div>
                )}
                {row.quantityRd && (
                  <div>
                    <strong>Кол-во РД:</strong> {row.quantityRd} {row.unit}
                  </div>
                )}
                {row.block && <Badge color="blue" text={row.block} />}
                {row.costCategory && <Badge color="green" text={row.costCategory} />}
                {row.location && <Badge color="purple" text={row.location} />}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    )
  }

  const FilterPanel = () => (
    <Card 
      size="small" 
      style={{ marginBottom: 16, borderRadius: 12 }}
      bodyStyle={{ padding: 16 }}
    >
      <Row gutter={[12, 12]} align="middle">
        <Col flex="auto">
          <Space wrap>
            <Select
              placeholder="Проект"
              style={{ width: 200 }}
              value={filters.projectId}
              onChange={(value) => setFilters({ projectId: value })}
              options={projects?.map((p) => ({ value: p.id, label: p.name })) ?? []}
            />
            <Select
              placeholder="Корпус"
              style={{ width: 200 }}
              value={filters.blockId}
              onChange={(value) => setFilters((f) => ({ ...f, blockId: value }))}
              options={[
                { value: '', label: 'Все' },
                ...(blocks?.map((b) => ({ value: b.id, label: b.name })) ?? []),
              ]}
              disabled={!filters.projectId}
            />
            <Select
              placeholder="Категория затрат"
              style={{ width: 200 }}
              value={filters.categoryId}
              onChange={(value) =>
                setFilters((f) => ({ ...f, categoryId: value, typeId: undefined }))
              }
              options={[
                { value: '', label: 'Все' },
                ...(
                  costCategories?.map((c) => ({
                    value: String(c.id),
                    label: c.number ? `${c.number} ${c.name}` : c.name,
                  })) ?? []
                ),
              ]}
            />
            <Select
              placeholder="Вид затрат"
              style={{ width: 200 }}
              value={filters.typeId}
              onChange={(value) => setFilters((f) => ({ ...f, typeId: value }))}
              options={[
                { value: '', label: 'Все' },
                ...(
                  costTypes
                    ?.filter((t) => String(t.cost_category_id) === filters.categoryId)
                    .map((t) => ({ value: String(t.id), label: t.name })) ?? []
                ),
              ]}
              disabled={!filters.categoryId}
            />
            <Button 
              type="primary" 
              onClick={handleApply} 
              disabled={!filters.projectId}
              icon={<FilterOutlined />}
            >
              Применить
            </Button>
          </Space>
        </Col>
        <Col>
          <Segmented
            value={viewMode}
            onChange={(value) => setViewMode(value as 'table' | 'cards')}
            options={[
              { label: 'Таблица', value: 'table', icon: <TableOutlined /> },
              { label: 'Карточки', value: 'cards', icon: <AppstoreOutlined /> },
            ]}
          />
        </Col>
      </Row>
    </Card>
  )

  const ActionPanel = () => {
    if (!appliedFilters) return null

    if (mode === 'add') {
      return (
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" onClick={handleSave} icon={<SaveOutlined />}>
            Сохранить
          </Button>
          <Button onClick={handleCancel} icon={<CloseOutlined />}>
            Отменить
          </Button>
        </Space>
      )
    }

    if (Object.keys(editingRows).length > 0) {
      return (
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<SaveOutlined />}>
            Сохранить изменения
          </Button>
          <Button icon={<CloseOutlined />}>
            Отмена
          </Button>
        </Space>
      )
    }

    return (
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<InboxOutlined />}>
          Импорт
        </Button>
        <Button type="primary" onClick={startAdd} icon={<PlusOutlined />}>
          Добавить
        </Button>
        {viewMode === 'table' && (
          <Space>
            {(Object.keys(titleMap) as Array<keyof typeof titleMap>).map((key) => (
              <Button key={key} size="small" onClick={() => toggleColumn(key)}>
                {hiddenCols[key] ? `Показать ${titleMap[key]}` : `Скрыть ${titleMap[key]}`}
              </Button>
            ))}
          </Space>
        )}
      </Space>
    )
  }

  return (
    <div>
      <FilterPanel />
      {appliedFilters && (
        <>
          <ActionPanel />
          {viewMode === 'cards' ? (
            renderCardView()
          ) : (
            <Card style={{ borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                Всего записей: {viewRows.length}
              </div>
              {/* Здесь должна быть таблица, но для краткости опущена */}
            </Card>
          )}
        </>
      )}
    </div>
  )
}