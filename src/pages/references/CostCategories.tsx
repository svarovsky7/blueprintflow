import { useMemo, useState } from 'react'
import {
  App,
  Button,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
} from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import {
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons'

interface CostCategory {
  id: number
  name: string
  description: string | null
  unit_id: string | null
  created_at: string
  updated_at: string
}

interface DetailCostCategory {
  id: number
  cost_category_id: number
  location_id: number
  name: string
  description: string | null
  unit_id: string | null
  created_at: string
  updated_at: string
}

interface Unit {
  id: string
  name: string
}

interface Location {
  id: number
  name: string
}

type CostCategoryRow =
  | CostCategory
  | {
      id: 'new'
      name: string
      description: string
      unit_id: string | null
      created_at: string
      updated_at: string
    }

type DetailCostCategoryRow =
  | DetailCostCategory
  | {
      id: 'new'
      cost_category_id: number | null
      location_id: number | null
      name: string
      description: string
      unit_id: string | null
      created_at: string
      updated_at: string
    }

export default function CostCategories() {
  const { message } = App.useApp()

  const [editingCategoryId, setEditingCategoryId] = useState<number | 'new' | null>(null)
  const [categoryData, setCategoryData] = useState({
    name: '',
    description: '',
    unit_id: undefined as string | undefined,
  })

  const [editingDetailId, setEditingDetailId] = useState<number | 'new' | null>(null)
  const [detailData, setDetailData] = useState({
    cost_category_id: undefined as number | undefined,
    location_id: undefined as number | undefined,
    name: '',
    description: '',
    unit_id: undefined as string | undefined,
  })

  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('units').select('id, name')
      if (error) throw error
      return data as Unit[]
    },
  })

  const { data: locations } = useQuery({
    queryKey: ['location'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('location').select('id, name')
      if (error) throw error
      return data as Location[]
    },
  })

  const {
    data: categories,
    isLoading: categoriesLoading,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['cost_categories'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('cost_categories')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        message.error('Не удалось загрузить данные')
        throw error
      }
      return data as CostCategory[]
    },
  })

  const {
    data: detailCategories,
    isLoading: detailsLoading,
    refetch: refetchDetails,
  } = useQuery({
    queryKey: ['detail_cost_categories'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('detail_cost_categories')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        message.error('Не удалось загрузить данные')
        throw error
      }
      return data as DetailCostCategory[]
    },
  })

  const unitOptions = useMemo(
    () => units?.map((u) => ({ value: u.id, label: u.name })) ?? [],
    [units],
  )
  const categoryOptions = useMemo(
    () => categories?.map((c) => ({ value: c.id, label: c.name })) ?? [],
    [categories],
  )
  const locationOptions = useMemo(
    () => locations?.map((l) => ({ value: l.id, label: l.name })) ?? [],
    [locations],
  )

  const getUnitName = (id: string | null) =>
    units?.find((u) => u.id === id)?.name || ''
  const getCategoryName = (id: number) =>
    categories?.find((c) => c.id === id)?.name || ''
  const getLocationName = (id: number) =>
    locations?.find((l) => l.id === id)?.name || ''

  const startEditCategory = (record: CostCategory) => {
    setEditingCategoryId(record.id)
    setCategoryData({
      name: record.name,
      description: record.description ?? '',
      unit_id: record.unit_id ?? undefined,
    })
  }

  const handleAddCategory = () => {
    setEditingCategoryId('new')
    setCategoryData({ name: '', description: '', unit_id: undefined })
  }

  const cancelCategory = () => {
    setEditingCategoryId(null)
    setCategoryData({ name: '', description: '', unit_id: undefined })
  }

  const saveCategory = async (id: number | 'new') => {
    if (!categoryData.name.trim()) {
      message.error('Введите название')
      return
    }
    if (!supabase) return
    try {
      if (id === 'new') {
        const { error } = await supabase.from('cost_categories').insert({
          name: categoryData.name,
          description: categoryData.description || null,
          unit_id: categoryData.unit_id || null,
        })
        if (error) throw error
        message.success('Запись добавлена')
      } else {
        const { error } = await supabase
          .from('cost_categories')
          .update({
            name: categoryData.name,
            description: categoryData.description || null,
            unit_id: categoryData.unit_id || null,
          })
          .eq('id', id)
        if (error) throw error
        message.success('Запись обновлена')
      }
      cancelCategory()
      await refetchCategories()
    } catch {
      message.error('Не удалось сохранить')
    }
  }

  const deleteCategory = async (record: CostCategory) => {
    if (!supabase) return
    const { error } = await supabase.from('cost_categories').delete().eq('id', record.id)
    if (error) {
      message.error('Не удалось удалить')
    } else {
      message.success('Запись удалена')
      refetchCategories()
    }
  }

  const startEditDetail = (record: DetailCostCategory) => {
    setEditingDetailId(record.id)
    setDetailData({
      cost_category_id: record.cost_category_id,
      location_id: record.location_id,
      name: record.name,
      description: record.description ?? '',
      unit_id: record.unit_id ?? undefined,
    })
  }

  const handleAddDetail = () => {
    setEditingDetailId('new')
    setDetailData({
      cost_category_id: undefined,
      location_id: undefined,
      name: '',
      description: '',
      unit_id: undefined,
    })
  }

  const cancelDetail = () => {
    setEditingDetailId(null)
    setDetailData({
      cost_category_id: undefined,
      location_id: undefined,
      name: '',
      description: '',
      unit_id: undefined,
    })
  }

  const saveDetail = async (id: number | 'new') => {
    if (!detailData.cost_category_id || !detailData.location_id || !detailData.name.trim()) {
      message.error('Заполните все обязательные поля')
      return
    }
    if (!supabase) return
    try {
      if (id === 'new') {
        const { error } = await supabase.from('detail_cost_categories').insert({
          cost_category_id: detailData.cost_category_id,
          location_id: detailData.location_id,
          name: detailData.name,
          description: detailData.description || null,
          unit_id: detailData.unit_id || null,
        })
        if (error) throw error
        message.success('Запись добавлена')
      } else {
        const { error } = await supabase
          .from('detail_cost_categories')
          .update({
            cost_category_id: detailData.cost_category_id,
            location_id: detailData.location_id,
            name: detailData.name,
            description: detailData.description || null,
            unit_id: detailData.unit_id || null,
          })
          .eq('id', id)
        if (error) throw error
        message.success('Запись обновлена')
      }
      cancelDetail()
      await refetchDetails()
    } catch {
      message.error('Не удалось сохранить')
    }
  }

  const deleteDetail = async (record: DetailCostCategory) => {
    if (!supabase) return
    const { error } = await supabase
      .from('detail_cost_categories')
      .delete()
      .eq('id', record.id)
    if (error) {
      message.error('Не удалось удалить')
    } else {
      message.success('Запись удалена')
      refetchDetails()
    }
  }

  const categoryNameFilters = useMemo(
    () =>
      Array.from(new Set((categories ?? []).map((c) => c.name))).map((n) => ({
        text: n,
        value: n,
      })),
    [categories],
  )

  const categoryDescriptionFilters = useMemo(
    () =>
      Array.from(
        new Set((categories ?? []).map((c) => c.description).filter((d): d is string => !!d)),
      ).map((d) => ({
        text: d,
        value: d,
      })),
    [categories],
  )

  const detailNameFilters = useMemo(
    () =>
      Array.from(new Set((detailCategories ?? []).map((d) => d.name))).map((n) => ({
        text: n,
        value: n,
      })),
    [detailCategories],
  )

  const detailDescriptionFilters = useMemo(
    () =>
      Array.from(
        new Set(
          (detailCategories ?? []).map((d) => d.description).filter((d): d is string => !!d),
        ),
      ).map((d) => ({
        text: d,
        value: d,
      })),
    [detailCategories],
  )

  const categoryColumns = [
    {
      title: 'Название',
      dataIndex: 'name',
      sorter: (a: CostCategoryRow, b: CostCategoryRow) => a.name.localeCompare(b.name),
      filters: categoryNameFilters,
      onFilter: (value: unknown, record: CostCategoryRow) => record.name === value,
      render: (_: unknown, record: CostCategoryRow) =>
        record.id === editingCategoryId ? (
          <Input
            value={categoryData.name}
            onChange={(e) => setCategoryData({ ...categoryData, name: e.target.value })}
          />
        ) : (
          record.name
        ),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      sorter: (a: CostCategoryRow, b: CostCategoryRow) =>
        (a.description ?? '').localeCompare(b.description ?? ''),
      filters: categoryDescriptionFilters,
      onFilter: (value: unknown, record: CostCategoryRow) => record.description === value,
      render: (_: unknown, record: CostCategoryRow) =>
        record.id === editingCategoryId ? (
          <Input
            value={categoryData.description}
            onChange={(e) =>
              setCategoryData({ ...categoryData, description: e.target.value })
            }
          />
        ) : (
          record.description
        ),
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit_id',
      sorter: (a: CostCategoryRow, b: CostCategoryRow) =>
        getUnitName(a.unit_id).localeCompare(getUnitName(b.unit_id)),
      filters: unitOptions.map((u) => ({ text: u.label, value: u.value })),
      onFilter: (value: unknown, record: CostCategoryRow) => record.unit_id === value,
      render: (_: unknown, record: CostCategoryRow) =>
        record.id === editingCategoryId ? (
          <Select
            value={categoryData.unit_id}
            onChange={(v) => setCategoryData({ ...categoryData, unit_id: v })}
            options={unitOptions}
            allowClear
          />
        ) : (
          getUnitName(record.unit_id)
        ),
    },
    {
      title: 'Действия',
      dataIndex: 'actions',
      render: (_: unknown, record: CostCategoryRow) =>
        record.id === editingCategoryId ? (
          <Space>
            <Button
              icon={<CheckOutlined />}
              onClick={() => saveCategory(record.id)}
              aria-label="Сохранить"
            />
            <Button
              icon={<CloseOutlined />}
              onClick={cancelCategory}
              aria-label="Отмена"
            />
          </Space>
        ) : (
          record.id !== 'new' && (
            <Space>
              <Button
                icon={<EditOutlined />}
                onClick={() => startEditCategory(record as CostCategory)}
                aria-label="Редактировать"
              />
              <Popconfirm
                title="Удалить запись?"
                onConfirm={() => deleteCategory(record as CostCategory)}
              >
                <Button danger icon={<DeleteOutlined />} aria-label="Удалить" />
              </Popconfirm>
            </Space>
          )
        ),
    },
  ]

  const detailColumns = [
    {
      title: 'Категория',
      dataIndex: 'cost_category_id',
      sorter: (a: DetailCostCategoryRow, b: DetailCostCategoryRow) =>
        getCategoryName(a.cost_category_id as number).localeCompare(
          getCategoryName(b.cost_category_id as number),
        ),
      filters: categoryOptions.map((c) => ({ text: c.label, value: c.value })),
      onFilter: (value: unknown, record: DetailCostCategoryRow) =>
        record.cost_category_id === value,
      render: (_: unknown, record: DetailCostCategoryRow) =>
        record.id === editingDetailId ? (
          <Select
            value={detailData.cost_category_id}
            onChange={(v) => setDetailData({ ...detailData, cost_category_id: v })}
            options={categoryOptions}
          />
        ) : (
          getCategoryName(record.cost_category_id as number)
        ),
    },
    {
      title: 'Локализация',
      dataIndex: 'location_id',
      sorter: (a: DetailCostCategoryRow, b: DetailCostCategoryRow) =>
        getLocationName(a.location_id as number).localeCompare(
          getLocationName(b.location_id as number),
        ),
      filters: locationOptions.map((l) => ({ text: l.label, value: l.value })),
      onFilter: (value: unknown, record: DetailCostCategoryRow) =>
        record.location_id === value,
      render: (_: unknown, record: DetailCostCategoryRow) =>
        record.id === editingDetailId ? (
          <Select
            value={detailData.location_id}
            onChange={(v) => setDetailData({ ...detailData, location_id: v })}
            options={locationOptions}
          />
        ) : (
          getLocationName(record.location_id as number)
        ),
    },
    {
      title: 'Название',
      dataIndex: 'name',
      sorter: (a: DetailCostCategoryRow, b: DetailCostCategoryRow) =>
        a.name.localeCompare(b.name),
      filters: detailNameFilters,
      onFilter: (value: unknown, record: DetailCostCategoryRow) => record.name === value,
      render: (_: unknown, record: DetailCostCategoryRow) =>
        record.id === editingDetailId ? (
          <Input
            value={detailData.name}
            onChange={(e) => setDetailData({ ...detailData, name: e.target.value })}
          />
        ) : (
          record.name
        ),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      sorter: (a: DetailCostCategoryRow, b: DetailCostCategoryRow) =>
        (a.description ?? '').localeCompare(b.description ?? ''),
      filters: detailDescriptionFilters,
      onFilter: (value: unknown, record: DetailCostCategoryRow) =>
        record.description === value,
      render: (_: unknown, record: DetailCostCategoryRow) =>
        record.id === editingDetailId ? (
          <Input
            value={detailData.description}
            onChange={(e) =>
              setDetailData({ ...detailData, description: e.target.value })
            }
          />
        ) : (
          record.description
        ),
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit_id',
      sorter: (a: DetailCostCategoryRow, b: DetailCostCategoryRow) =>
        getUnitName(a.unit_id).localeCompare(getUnitName(b.unit_id)),
      filters: unitOptions.map((u) => ({ text: u.label, value: u.value })),
      onFilter: (value: unknown, record: DetailCostCategoryRow) =>
        record.unit_id === value,
      render: (_: unknown, record: DetailCostCategoryRow) =>
        record.id === editingDetailId ? (
          <Select
            value={detailData.unit_id}
            onChange={(v) => setDetailData({ ...detailData, unit_id: v })}
            options={unitOptions}
            allowClear
          />
        ) : (
          getUnitName(record.unit_id)
        ),
    },
    {
      title: 'Действия',
      dataIndex: 'actions',
      render: (_: unknown, record: DetailCostCategoryRow) =>
        record.id === editingDetailId ? (
          <Space>
            <Button
              icon={<CheckOutlined />}
              onClick={() => saveDetail(record.id)}
              aria-label="Сохранить"
            />
            <Button
              icon={<CloseOutlined />}
              onClick={cancelDetail}
              aria-label="Отмена"
            />
          </Space>
        ) : (
          record.id !== 'new' && (
            <Space>
              <Button
                icon={<EditOutlined />}
                onClick={() => startEditDetail(record as DetailCostCategory)}
                aria-label="Редактировать"
              />
              <Popconfirm
                title="Удалить запись?"
                onConfirm={() => deleteDetail(record as DetailCostCategory)}
              >
                <Button danger icon={<DeleteOutlined />} aria-label="Удалить" />
              </Popconfirm>
            </Space>
          )
        ),
    },
  ]

  const categoryDataSource: CostCategoryRow[] =
    editingCategoryId === 'new'
      ? [
          {
            id: 'new',
            name: categoryData.name,
            description: categoryData.description,
            unit_id: categoryData.unit_id || null,
            created_at: '',
            updated_at: '',
          },
          ...(categories ?? []),
        ]
      : (categories ?? [])

  const detailDataSource: DetailCostCategoryRow[] =
    editingDetailId === 'new'
      ? [
          {
            id: 'new',
            cost_category_id: detailData.cost_category_id ?? null,
            location_id: detailData.location_id ?? null,
            name: detailData.name,
            description: detailData.description,
            unit_id: detailData.unit_id || null,
            created_at: '',
            updated_at: '',
          },
          ...(detailCategories ?? []),
        ]
      : (detailCategories ?? [])

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2>Категории затрат</h2>
          <Button type="primary" onClick={handleAddCategory}>
            Добавить
          </Button>
        </div>
        <Table<CostCategoryRow>
          dataSource={categoryDataSource}
          columns={categoryColumns}
          rowKey="id"
          loading={categoriesLoading}
        />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2>Виды затрат</h2>
          <Button type="primary" onClick={handleAddDetail}>
            Добавить
          </Button>
        </div>
        <Table<DetailCostCategoryRow>
          dataSource={detailDataSource}
          columns={detailColumns}
          rowKey="id"
          loading={detailsLoading}
        />
      </div>
    </div>
  )
}

