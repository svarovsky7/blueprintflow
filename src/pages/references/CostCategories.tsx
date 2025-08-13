import { useCallback, useMemo, useState } from 'react'
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

interface Unit {
  id: string
  name: string
}

interface Location {
  id: number
  name: string
}

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

type CostCategoryRow =
  | CostCategory
  | {
      id: 'new'
      name: string
      description: string | null
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
      description: string | null
      unit_id: string | null
      created_at: string
      updated_at: string
    }

export default function CostCategories() {
  const { message } = App.useApp()

  // Queries
  const { data: units } = useQuery({
    queryKey: ['units', 'short'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('units').select('id, name')
      if (error) throw error
      return data as Unit[]
    },
  })

  const { data: locations } = useQuery({
    queryKey: ['location', 'short'],
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
      if (error) throw error
      return data as CostCategory[]
    },
  })

  const {
    data: details,
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
      if (error) throw error
      return data as DetailCostCategory[]
    },
  })

  // Cost category editing state
  const [editingCategoryId, setEditingCategoryId] = useState<number | 'new' | null>(null)
  const [categoryValues, setCategoryValues] = useState({
    name: '',
    description: '',
    unit_id: null as string | null,
  })

  const handleAddCategory = () => {
    setEditingCategoryId('new')
    setCategoryValues({ name: '', description: '', unit_id: null })
  }

  const handleEditCategory = (record: CostCategory) => {
    setEditingCategoryId(record.id)
    setCategoryValues({
      name: record.name,
      description: record.description ?? '',
      unit_id: record.unit_id,
    })
  }

  const cancelCategory = () => {
    setEditingCategoryId(null)
    setCategoryValues({ name: '', description: '', unit_id: null })
  }

  const saveCategory = async (id: number | 'new') => {
    if (!categoryValues.name.trim()) {
      message.error('Введите название')
      return
    }
    if (!supabase) return
    try {
      if (id === 'new') {
        const { error } = await supabase.from('cost_categories').insert({
          name: categoryValues.name,
          description: categoryValues.description,
          unit_id: categoryValues.unit_id,
        })
        if (error) throw error
        message.success('Запись добавлена')
      } else {
        const { error } = await supabase
          .from('cost_categories')
          .update({
            name: categoryValues.name,
            description: categoryValues.description,
            unit_id: categoryValues.unit_id,
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
    const { error } = await supabase
      .from('cost_categories')
      .delete()
      .eq('id', record.id)
    if (error) {
      message.error('Не удалось удалить')
    } else {
      message.success('Запись удалена')
      refetchCategories()
    }
  }

  // Detail cost category editing state
  const [editingDetailId, setEditingDetailId] = useState<number | 'new' | null>(null)
  const [detailValues, setDetailValues] = useState({
    cost_category_id: null as number | null,
    location_id: null as number | null,
    name: '',
    description: '',
    unit_id: null as string | null,
  })

  const handleAddDetail = () => {
    setEditingDetailId('new')
    setDetailValues({
      cost_category_id: null,
      location_id: null,
      name: '',
      description: '',
      unit_id: null,
    })
  }

  const handleEditDetail = (record: DetailCostCategory) => {
    setEditingDetailId(record.id)
    setDetailValues({
      cost_category_id: record.cost_category_id,
      location_id: record.location_id,
      name: record.name,
      description: record.description ?? '',
      unit_id: record.unit_id,
    })
  }

  const cancelDetail = () => {
    setEditingDetailId(null)
    setDetailValues({
      cost_category_id: null,
      location_id: null,
      name: '',
      description: '',
      unit_id: null,
    })
  }

  const saveDetail = async (id: number | 'new') => {
    if (
      !detailValues.name.trim() ||
      !detailValues.cost_category_id ||
      !detailValues.location_id
    ) {
      message.error('Заполните обязательные поля')
      return
    }
    if (!supabase) return
    try {
      if (id === 'new') {
        const { error } = await supabase.from('detail_cost_categories').insert({
          cost_category_id: detailValues.cost_category_id,
          location_id: detailValues.location_id,
          name: detailValues.name,
          description: detailValues.description,
          unit_id: detailValues.unit_id,
        })
        if (error) throw error
        message.success('Запись добавлена')
      } else {
        const { error } = await supabase
          .from('detail_cost_categories')
          .update({
            cost_category_id: detailValues.cost_category_id,
            location_id: detailValues.location_id,
            name: detailValues.name,
            description: detailValues.description,
            unit_id: detailValues.unit_id,
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

  // Helpers
  const unitOptions = useMemo(
    () => (units ?? []).map((u) => ({ label: u.name, value: u.id })),
    [units],
  )

  const categoryOptions = useMemo(
    () => (categories ?? []).map((c) => ({ label: c.name, value: c.id })),
    [categories],
  )

  const locationOptions = useMemo(
    () => (locations ?? []).map((l) => ({ label: l.name, value: l.id })),
    [locations],
  )

  const getUnitName = useCallback(
    (id: string | null) => units?.find((u) => u.id === id)?.name || '',
    [units],
  )
  const getCategoryName = useCallback(
    (id: number) => categories?.find((c) => c.id === id)?.name || '',
    [categories],
  )
  const getLocationName = useCallback(
    (id: number) => locations?.find((l) => l.id === id)?.name || '',
    [locations],
  )

  // Filters for cost categories
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
        new Set(
          (categories ?? [])
            .map((c) => c.description)
            .filter((d): d is string => !!d),
        ),
      ).map((d) => ({
        text: d,
        value: d,
      })),
    [categories],
  )

  const categoryUnitFilters = useMemo(
    () =>
      Array.from(
        new Set(
          (categories ?? [])
            .map((c) => getUnitName(c.unit_id))
            .filter((n): n is string => !!n),
        ),
      ).map((n) => ({ text: n, value: n })),
    [categories, getUnitName],
  )

  const categoryColumns = [
    {
      title: 'Название',
      dataIndex: 'name',
      sorter: (a: CostCategoryRow, b: CostCategoryRow) =>
        a.name.localeCompare(b.name),
      filters: categoryNameFilters,
      onFilter: (value: unknown, record: CostCategoryRow) => record.name === value,
      render: (_: unknown, record: CostCategoryRow) =>
        record.id === editingCategoryId ? (
          <Input
            value={categoryValues.name}
            onChange={(e) =>
              setCategoryValues({ ...categoryValues, name: e.target.value })
            }
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
      onFilter: (value: unknown, record: CostCategoryRow) =>
        record.description === value,
      render: (_: unknown, record: CostCategoryRow) =>
        record.id === editingCategoryId ? (
          <Input
            value={categoryValues.description}
            onChange={(e) =>
              setCategoryValues({
                ...categoryValues,
                description: e.target.value,
              })
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
      filters: categoryUnitFilters,
      onFilter: (value: unknown, record: CostCategoryRow) =>
        getUnitName(record.unit_id) === value,
      render: (_: unknown, record: CostCategoryRow) =>
        record.id === editingCategoryId ? (
          <Select
            options={unitOptions}
            value={categoryValues.unit_id ?? undefined}
            onChange={(v) =>
              setCategoryValues({ ...categoryValues, unit_id: v })
            }
            style={{ width: '100%' }}
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
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => handleEditCategory(record as CostCategory)}
              aria-label="Редактировать"
            />
            <Popconfirm
              title="Удалить запись?"
              onConfirm={() => deleteCategory(record as CostCategory)}
            >
              <Button danger icon={<DeleteOutlined />} aria-label="Удалить" />
            </Popconfirm>
          </Space>
        ),
    },
  ]

  const categoryData: CostCategoryRow[] =
    editingCategoryId === 'new'
      ? [
          {
            id: 'new',
            name: categoryValues.name,
            description: categoryValues.description,
            unit_id: categoryValues.unit_id,
            created_at: '',
            updated_at: '',
          },
          ...(categories ?? []),
        ]
      : (categories ?? [])

  // Filters for detail cost categories
  const detailNameFilters = useMemo(
    () =>
      Array.from(new Set((details ?? []).map((d) => d.name))).map((n) => ({
        text: n,
        value: n,
      })),
    [details],
  )

  const detailDescriptionFilters = useMemo(
    () =>
      Array.from(
        new Set(
          (details ?? [])
            .map((d) => d.description)
            .filter((d): d is string => !!d),
        ),
      ).map((d) => ({
        text: d,
        value: d,
      })),
    [details],
  )

  const detailCategoryFilters = useMemo(
    () =>
      Array.from(new Set((details ?? []).map((d) => d.cost_category_id))).map(
        (id) => ({
          text: getCategoryName(id),
          value: id,
        }),
      ),
    [details, getCategoryName],
  )

  const detailLocationFilters = useMemo(
    () =>
      Array.from(new Set((details ?? []).map((d) => d.location_id))).map(
        (id) => ({
          text: getLocationName(id),
          value: id,
        }),
      ),
    [details, getLocationName],
  )

  const detailUnitFilters = useMemo(
    () =>
      Array.from(
        new Set(
          (details ?? [])
            .map((d) => getUnitName(d.unit_id))
            .filter((n): n is string => !!n),
        ),
      ).map((n) => ({ text: n, value: n })),
    [details, getUnitName],
  )

  const detailColumns = [
    {
      title: 'Категория',
      dataIndex: 'cost_category_id',
      sorter: (
        a: DetailCostCategoryRow,
        b: DetailCostCategoryRow,
      ) =>
        getCategoryName(a.cost_category_id!).localeCompare(
          getCategoryName(b.cost_category_id!),
        ),
      filters: detailCategoryFilters,
      onFilter: (value: unknown, record: DetailCostCategoryRow) =>
        record.cost_category_id === value,
      render: (_: unknown, record: DetailCostCategoryRow) =>
        record.id === editingDetailId ? (
          <Select
            options={categoryOptions}
            value={detailValues.cost_category_id ?? undefined}
            onChange={(v) =>
              setDetailValues({ ...detailValues, cost_category_id: v })
            }
            style={{ width: '100%' }}
          />
          ) : (
            getCategoryName(record.cost_category_id!)
          ),
    },
    {
      title: 'Локализация',
      dataIndex: 'location_id',
      sorter: (
        a: DetailCostCategoryRow,
        b: DetailCostCategoryRow,
      ) =>
        getLocationName(a.location_id!).localeCompare(
          getLocationName(b.location_id!),
        ),
      filters: detailLocationFilters,
      onFilter: (value: unknown, record: DetailCostCategoryRow) =>
        record.location_id === value,
      render: (_: unknown, record: DetailCostCategoryRow) =>
        record.id === editingDetailId ? (
          <Select
            options={locationOptions}
            value={detailValues.location_id ?? undefined}
            onChange={(v) =>
              setDetailValues({ ...detailValues, location_id: v })
            }
            style={{ width: '100%' }}
          />
          ) : (
            getLocationName(record.location_id!)
          ),
    },
    {
      title: 'Название',
      dataIndex: 'name',
      sorter: (a: DetailCostCategoryRow, b: DetailCostCategoryRow) =>
        a.name.localeCompare(b.name),
      filters: detailNameFilters,
      onFilter: (value: unknown, record: DetailCostCategoryRow) =>
        record.name === value,
      render: (_: unknown, record: DetailCostCategoryRow) =>
        record.id === editingDetailId ? (
          <Input
            value={detailValues.name}
            onChange={(e) =>
              setDetailValues({ ...detailValues, name: e.target.value })
            }
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
            value={detailValues.description}
            onChange={(e) =>
              setDetailValues({
                ...detailValues,
                description: e.target.value,
              })
            }
          />
        ) : (
          record.description
        ),
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit_id',
      sorter: (
        a: DetailCostCategoryRow,
        b: DetailCostCategoryRow,
      ) =>
        getUnitName(a.unit_id).localeCompare(getUnitName(b.unit_id)),
      filters: detailUnitFilters,
      onFilter: (value: unknown, record: DetailCostCategoryRow) =>
        getUnitName(record.unit_id) === value,
      render: (_: unknown, record: DetailCostCategoryRow) =>
        record.id === editingDetailId ? (
          <Select
            options={unitOptions}
            value={detailValues.unit_id ?? undefined}
            onChange={(v) =>
              setDetailValues({ ...detailValues, unit_id: v })
            }
            style={{ width: '100%' }}
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
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => handleEditDetail(record as DetailCostCategory)}
              aria-label="Редактировать"
            />
            <Popconfirm
              title="Удалить запись?"
              onConfirm={() => deleteDetail(record as DetailCostCategory)}
            >
              <Button danger icon={<DeleteOutlined />} aria-label="Удалить" />
            </Popconfirm>
          </Space>
        ),
    },
  ]

  const detailData: DetailCostCategoryRow[] =
    editingDetailId === 'new'
      ? [
          {
            id: 'new',
            cost_category_id: detailValues.cost_category_id,
            location_id: detailValues.location_id,
            name: detailValues.name,
            description: detailValues.description,
            unit_id: detailValues.unit_id,
            created_at: '',
            updated_at: '',
          },
          ...(details ?? []),
        ]
      : (details ?? [])

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Button type="primary" onClick={handleAddCategory}>
            Добавить
          </Button>
        </div>
        <Table<CostCategoryRow>
          dataSource={categoryData}
          columns={categoryColumns}
          rowKey="id"
          loading={categoriesLoading}
        />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Button type="primary" onClick={handleAddDetail}>
            Добавить
          </Button>
        </div>
        <Table<DetailCostCategoryRow>
          dataSource={detailData}
          columns={detailColumns}
          rowKey="id"
          loading={detailsLoading}
        />
      </div>
    </div>
  )
}
