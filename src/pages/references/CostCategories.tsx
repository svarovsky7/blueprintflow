import { useMemo, useState } from 'react'
import { App, Button, Form, Input, Select, Space, Table, Upload, Row, Col } from 'antd'
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'

interface Category {
  id: number
  number: number | null
  name: string
  description: string | null
  unitId: string | null
  unitName: string | null
}

interface DetailCategory {
  id: number
  name: string
  description: string | null
  unitId: string | null
  unitName: string | null
  mappings: Array<{
    costCategoryId: number
    costCategoryName: string
    locationId: number
    locationName: string
  }>
}

interface UnitOption {
  id: string
  name: string
}

interface LocationOption {
  id: number
  name: string
}

interface TableRow {
  key: string
  number: number | null
  categoryId: number | null
  categoryName: string | null
  categoryUnit: string | null
  detailId: number | null
  detailName: string | null
  detailUnit: string | null
  locations: string[] | null  // Массив названий локализаций
  locationIds: number[] | null // Массив ID локализаций
}

interface CategoryRowDB {
  id: number
  number: number | null
  name: string
  description: string | null
  unit_id: string | null
  units: { name: string } | null
}

interface DetailCategoryRowDB {
  id: number
  name: string
  description: string | null
  unit_id: string | null
  units: { name: string } | null
  detail_cost_categories_mapping: Array<{
    cost_category_id: number
    location_id: number
    cost_categories: {
      id: number
      name: string
    }
    location: {
      id: number
      name: string
    }
  }>
}

export default function CostCategories() {
  const { message, modal } = App.useApp()
  const [addMode, setAddMode] = useState<'category' | 'detail' | null>(null)
  const [editing, setEditing] = useState<{
    type: 'category' | 'detail'
    key: string
    id: number
  } | null>(null)
  const [form] = Form.useForm()
  const [filters, setFilters] = useState({
    categoryId: undefined as number | undefined,
    detailId: undefined as number | undefined,
    locationId: undefined as number | undefined,
  })

  const {
    data: categories,
    isLoading: categoriesLoading,
    refetch: refetchCategories,
  } = useQuery<Category[]>({
    queryKey: ['cost_categories'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('cost_categories')
        .select('id, number, name, description, unit_id, units(name)')
        .order('id')
        .returns<CategoryRowDB[]>()
      if (error) {
        message.error('Не удалось загрузить категории')
        throw error
      }
      return (data ?? []).map((c) => ({
        id: c.id,
        number: c.number,
        name: c.name,
        description: c.description,
        unitId: c.unit_id,
        unitName: c.units?.name ?? null,
      }))
    },
  })

  const {
    data: details,
    isLoading: detailsLoading,
    refetch: refetchDetails,
  } = useQuery<DetailCategory[]>({
    queryKey: ['detail_cost_categories'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('detail_cost_categories')
        .select(
          'id, name, description, unit_id, units(name), detail_cost_categories_mapping(cost_category_id, location_id, cost_categories(id, name), location(id, name))',
        )
        .returns<DetailCategoryRowDB[]>()
      if (error) {
        message.error('Не удалось загрузить виды')
        throw error
      }
      return (data ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        unitId: d.unit_id,
        unitName: d.units?.name ?? null,
        mappings: (d.detail_cost_categories_mapping ?? []).map((m) => ({
          costCategoryId: m.cost_category_id,
          costCategoryName: m.cost_categories?.name ?? '',
          locationId: m.location_id,
          locationName: m.location?.name ?? '',
        })),
      }))
    },
  })

  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from('units').select('id, name').order('name')
      return (data ?? []) as UnitOption[]
    },
  })

  const { data: locations } = useQuery({
    queryKey: ['location'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from('location').select('id, name').order('name')
      return (data ?? []) as LocationOption[]
    },
  })

  const selectedCategoryId = Form.useWatch('costCategoryId', form)
  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId)

  const rows = useMemo(() => {
    const result: TableRow[] = []

    // Создаём строки на основе тройных связей из mappings
    ;(details ?? []).forEach((detail) => {
      detail.mappings.forEach((mapping) => {
        const category = categories?.find((c) => c.id === mapping.costCategoryId)
        result.push({
          key: `${detail.id}-${mapping.costCategoryId}-${mapping.locationId}`,
          number: category?.number ?? null,
          categoryId: mapping.costCategoryId,
          categoryName: mapping.costCategoryName,
          categoryUnit: category?.unitName ?? null,
          detailId: detail.id,
          detailName: detail.name,
          detailUnit: detail.unitName,
          locations: [mapping.locationName],
          locationIds: [mapping.locationId],
        })
      })
    })

    // Добавляем категории без деталей
    ;(categories ?? []).forEach((c) => {
      const hasDetails = result.some((r) => r.categoryId === c.id)
      if (!hasDetails) {
        result.push({
          key: `category-${c.id}`,
          number: c.number,
          categoryId: c.id,
          categoryName: c.name,
          categoryUnit: c.unitName,
          detailId: null,
          detailName: null,
          detailUnit: null,
          locations: null,
          locationIds: null,
        })
      }
    })
    return result
  }, [categories, details])

  const filteredRows = useMemo(() => {
    let filtered = rows
    if (filters.categoryId) {
      filtered = filtered.filter((row) => row.categoryId === filters.categoryId)
    }
    if (filters.detailId) {
      filtered = filtered.filter((row) => row.detailId === filters.detailId)
    }
    if (filters.locationId) {
      filtered = filtered.filter((row) => row.locationIds?.includes(filters.locationId!))
    }
    return filtered
  }, [rows, filters])

  const emptyRow: TableRow = {
    key: 'new',
    number: null,
    categoryId: null,
    categoryName: null,
    categoryUnit: null,
    detailId: null,
    detailName: null,
    detailUnit: null,
    locations: null,
    locationIds: null,
  }

  const dataSource: TableRow[] = addMode ? [emptyRow, ...filteredRows] : filteredRows

  const numberFilters = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.number).filter((n): n is number => n !== null))).map(
        (n) => ({ text: String(n), value: n }),
      ),
    [rows],
  )

  const categoryFilters = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.categoryName).filter((n): n is string => !!n))).map(
        (n) => ({ text: n, value: n }),
      ),
    [rows],
  )

  const categoryUnitFilters = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.categoryUnit).filter((n): n is string => !!n))).map(
        (n) => ({ text: n, value: n }),
      ),
    [rows],
  )

  const detailFilters = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.detailName).filter((n): n is string => !!n))).map(
        (n) => ({ text: n, value: n }),
      ),
    [rows],
  )

  const detailUnitFilters = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.detailUnit).filter((n): n is string => !!n))).map(
        (n) => ({ text: n, value: n }),
      ),
    [rows],
  )

  const locationFilters = useMemo(
    () =>
      Array.from(
        new Set(rows.flatMap((r) => r.locations ?? []).filter((n): n is string => !!n)),
      ).map((n) => ({
        text: n,
        value: n,
      })),
    [rows],
  )

  const handleImport = async (file: File) => {
    if (!supabase || !units || !locations) return false
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 })

      let imported = 0
      const errors: string[] = []

      const categoriesMap = new Map<string, Category>()
      ;(categories ?? []).forEach((c) => categoriesMap.set(c.name, c))

      const detailsMap = new Map<string, DetailCategory>()
      ;(details ?? []).forEach((d) => detailsMap.set(d.name, d))

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        const number = row[0] as number | undefined
        const categoryName = (row[1] as string | undefined)?.trim()
        const categoryUnitName = (row[2] as string | undefined)?.trim()
        const detailName = (row[3] as string | undefined)?.trim()
        const detailUnitName = (row[4] as string | undefined)?.trim()
        const locationName = (row[5] as string | undefined)?.trim()

        if (!categoryName || !detailName) {
          errors.push(`Строка ${i + 1}: отсутствует категория или вид`)
          continue
        }

        const categoryUnit = units.find((u) => u.name === categoryUnitName)
        const detailUnit = units.find((u) => u.name === detailUnitName)
        const location = locations.find((l) => l.name === locationName)

        if (!categoryUnit || !detailUnit || !location) {
          errors.push(`Строка ${i + 1}: неизвестные единицы измерения или локализация`)
          continue
        }

        let category = categoriesMap.get(categoryName)
        if (!category) {
          const { data: catData, error: catError } = await supabase
            .from('cost_categories')
            .insert({
              number: number ?? null,
              name: categoryName,
              unit_id: categoryUnit.id,
            })
            .select()
            .single()
          if (catError || !catData) {
            errors.push(`Строка ${i + 1}: не удалось добавить категорию`)
            continue
          }
          category = {
            id: catData.id,
            number: catData.number,
            name: catData.name,
            description: catData.description,
            unitId: catData.unit_id,
            unitName: categoryUnit.name,
          }
          categoriesMap.set(categoryName, category)
        }

        const detailKey = detailName
        let existingDetail = detailsMap.get(detailKey)

        if (!existingDetail) {
          // Попытаться найти существующий вид затрат по имени
          const { data: foundDetail } = await supabase
            .from('detail_cost_categories')
            .select('id, name, description, unit_id')
            .eq('name', detailName)
            .single()

          if (foundDetail) {
            existingDetail = {
              id: foundDetail.id,
              name: foundDetail.name,
              description: foundDetail.description,
              unitId: foundDetail.unit_id,
              unitName: detailUnit.name,
              mappings: [],
            }
          } else {
            // Создать новый вид затрат (БЕЗ cost_category_id)
            const { data: detData, error: detError } = await supabase
              .from('detail_cost_categories')
              .insert({
                name: detailName,
                unit_id: detailUnit.id,
              })
              .select()
              .single()
            if (detError || !detData) {
              errors.push(`Строка ${i + 1}: не удалось добавить вид`)
              continue
            }
            existingDetail = {
              id: detData.id,
              name: detData.name,
              description: detData.description,
              unitId: detData.unit_id,
              unitName: detailUnit.name,
              mappings: [],
            }
          }
          detailsMap.set(detailKey, existingDetail)
        }

        // Проверить существует ли тройная связь
        const hasMapping = existingDetail.mappings.some(
          (m) => m.costCategoryId === category.id && m.locationId === location.id,
        )
        if (!hasMapping) {
          // Создать тройную связь в маппинге
          const { error: mappingError } = await supabase
            .from('detail_cost_categories_mapping')
            .insert({
              cost_category_id: category.id,
              detail_cost_category_id: existingDetail.id,
              location_id: location.id,
            })
          if (mappingError) {
            errors.push(`Строка ${i + 1}: не удалось добавить связь`)
            continue
          }
          existingDetail.mappings.push({
            costCategoryId: category.id,
            costCategoryName: category.name,
            locationId: location.id,
            locationName: location.name,
          })
        }
        imported++
      }

      console.log(`Импортировано строк: ${imported}`)
      if (errors.length) console.log('Ошибки:', errors)

      await Promise.all([refetchCategories(), refetchDetails()])
    } catch {
      message.error('Не удалось импортировать файл')
    }
    return false
  }
  const startAdd = (mode: 'category' | 'detail') => {
    form.resetFields()
    setEditing(null)
    setAddMode(mode)
  }

  const startEdit = (record: TableRow) => {
    if (addMode) return
    form.resetFields()
    if (record.detailId) {
      const detail = details?.find((d) => d.id === record.detailId)
      if (detail) {
        // Найти маппинг для текущей категории
        const mapping = detail.mappings.find((m) => m.costCategoryId === record.categoryId)
        form.setFieldsValue({
          costCategoryId: record.categoryId,
          detailName: detail.name,
          detailDescription: detail.description,
          detailUnitId: detail.unitId,
          locationIds: mapping ? [mapping.locationId] : [],
        })
        setEditing({ type: 'detail', key: record.key, id: record.detailId })
      }
    } else if (record.categoryId) {
      const category = categories?.find((c) => c.id === record.categoryId)
      form.setFieldsValue({
        number: category?.number,
        categoryName: category?.name,
        categoryDescription: category?.description,
        categoryUnitId: category?.unitId,
      })
      setEditing({ type: 'category', key: record.key, id: record.categoryId })
    }
  }

  const cancelEdit = () => {
    setEditing(null)
    form.resetFields()
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (!supabase) return
      if (addMode === 'category') {
        const { error } = await supabase.from('cost_categories').insert({
          number: values.number,
          name: values.categoryName,
          description: values.categoryDescription,
          unit_id: values.categoryUnitId,
        })
        if (error) throw error
      }
      if (addMode === 'detail') {
        if (values.locationIds && values.locationIds.length > 0) {
          // Шаг 1: Найти или создать вид затрат
          let detailData
          const { data: existing } = await supabase
            .from('detail_cost_categories')
            .select('id')
            .eq('name', values.detailName)
            .single()

          if (existing) {
            detailData = existing
          } else {
            const { data, error: detailError } = await supabase
              .from('detail_cost_categories')
              .insert({
                name: values.detailName,
                description: values.detailDescription,
                unit_id: values.detailUnitId,
              })
              .select()
              .single()

            if (detailError || !data) throw detailError
            detailData = data
          }

          // Шаг 2: Создать тройные связи в маппинге
          const mappingRecords = values.locationIds.map((locationId: number) => ({
            cost_category_id: values.costCategoryId,
            detail_cost_category_id: detailData.id,
            location_id: locationId,
          }))

          const { error: mappingError } = await supabase
            .from('detail_cost_categories_mapping')
            .insert(mappingRecords)

          if (mappingError) throw mappingError
        }
      }
      message.success('Запись добавлена')
      setAddMode(null)
      form.resetFields()
      await Promise.all([refetchCategories(), refetchDetails()])
    } catch {
      message.error('Не удалось сохранить')
    }
  }

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields()
      if (!supabase || !editing) return
      if (editing.type === 'category') {
        const { error } = await supabase
          .from('cost_categories')
          .update({
            number: values.number,
            name: values.categoryName,
            description: values.categoryDescription,
            unit_id: values.categoryUnitId,
          })
          .eq('id', editing.id)
        if (error) throw error
      }
      if (editing.type === 'detail') {
        // Обновить только базовые поля (БЕЗ cost_category_id)
        const { error: updateError } = await supabase
          .from('detail_cost_categories')
          .update({
            name: values.detailName,
            description: values.detailDescription,
            unit_id: values.detailUnitId,
          })
          .eq('id', editing.id)
        if (updateError) throw updateError

        // Удалить старые тройные связи для этой категории и детали
        const { error: deleteError } = await supabase
          .from('detail_cost_categories_mapping')
          .delete()
          .eq('detail_cost_category_id', editing.id)
          .eq('cost_category_id', values.costCategoryId)
        if (deleteError) throw deleteError

        // Создать новые тройные связи
        if (values.locationIds && values.locationIds.length > 0) {
          const mappingRecords = values.locationIds.map((locationId: number) => ({
            cost_category_id: values.costCategoryId,
            detail_cost_category_id: editing.id,
            location_id: locationId,
          }))

          const { error: insertError } = await supabase
            .from('detail_cost_categories_mapping')
            .insert(mappingRecords)
          if (insertError) throw insertError
        }
      }
      message.success('Запись обновлена')
      cancelEdit()
      await Promise.all([refetchCategories(), refetchDetails()])
    } catch {
      message.error('Не удалось сохранить')
    }
  }

  const handleDelete = async (record: TableRow) => {
    try {
      if (!supabase) return
      if (record.detailId) {
        const { error } = await supabase
          .from('detail_cost_categories')
          .delete()
          .eq('id', record.detailId)
        if (error) throw error
      } else if (record.categoryId) {
        const { error } = await supabase
          .from('cost_categories')
          .delete()
          .eq('id', record.categoryId)
        if (error) throw error
      }
      message.success('Запись удалена')
      await Promise.all([refetchCategories(), refetchDetails()])
    } catch {
      message.error('Не удалось удалить')
    }
  }

  const columns = [
    {
      title: '№',
      dataIndex: 'number',
      sorter: (a: TableRow, b: TableRow) => (a.number ?? 0) - (b.number ?? 0),
      filters: numberFilters,
      onFilter: (value: unknown, record: TableRow) => record.number === value,
      render: (_: unknown, record: TableRow) => {
        if (record.key === 'new') {
          return (
            <Space>
              {addMode === 'category' ? (
                <Form.Item
                  name="number"
                  rules={[{ required: true, message: 'Введите номер' }]}
                  style={{ margin: 0 }}
                >
                  <Input style={{ width: 80 }} />
                </Form.Item>
              ) : (
                <span>{selectedCategory?.number ?? ''}</span>
              )}
            </Space>
          )
        }
        if (editing?.key === record.key) {
          if (editing.type === 'category') {
            return (
              <Form.Item
                name="number"
                rules={[{ required: true, message: 'Введите номер' }]}
                style={{ margin: 0 }}
              >
                <Input style={{ width: 80 }} />
              </Form.Item>
            )
          }
          return <span>{selectedCategory?.number ?? ''}</span>
        }
        return record.number
      },
    },
    {
      title: () => (
        <Space>
          Категория затрат
          <Button
            icon={<PlusOutlined />}
            onClick={() => startAdd('category')}
            aria-label="Добавить категорию"
          />
        </Space>
      ),
      dataIndex: 'categoryName',
      sorter: (a: TableRow, b: TableRow) =>
        (a.categoryName ?? '').localeCompare(b.categoryName ?? ''),
      filters: categoryFilters,
      onFilter: (value: unknown, record: TableRow) => record.categoryName === value,
      render: (value: string | null, record: TableRow) => {
        if (record.key === 'new') {
          if (addMode === 'category') {
            return (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Form.Item
                  name="categoryName"
                  rules={[{ required: true, message: 'Введите название' }]}
                  style={{ marginBottom: 8 }}
                >
                  <Input />
                </Form.Item>
                <Form.Item name="categoryDescription" style={{ margin: 0 }}>
                  <Input placeholder="Описание" />
                </Form.Item>
              </div>
            )
          }
          if (addMode === 'detail') {
            return (
              <Form.Item
                name="costCategoryId"
                rules={[{ required: true, message: 'Выберите категорию' }]}
                style={{ margin: 0 }}
              >
                <Select
                  options={
                    categories?.map((c) => ({
                      value: c.id,
                      label: `${c.number ?? ''} ${c.name}`,
                    })) ?? []
                  }
                />
              </Form.Item>
            )
          }
        }
        if (editing?.key === record.key) {
          if (editing.type === 'category') {
            return (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Form.Item
                  name="categoryName"
                  rules={[{ required: true, message: 'Введите название' }]}
                  style={{ marginBottom: 8 }}
                >
                  <Input />
                </Form.Item>
                <Form.Item name="categoryDescription" style={{ margin: 0 }}>
                  <Input placeholder="Описание" />
                </Form.Item>
              </div>
            )
          }
          if (editing.type === 'detail') {
            return (
              <Form.Item
                name="costCategoryId"
                rules={[{ required: true, message: 'Выберите категорию' }]}
                style={{ margin: 0 }}
              >
                <Select
                  options={
                    categories?.map((c) => ({
                      value: c.id,
                      label: `${c.number ?? ''} ${c.name}`,
                    })) ?? []
                  }
                />
              </Form.Item>
            )
          }
        }
        return value
      },
    },
    {
      title: 'Ед.Изм.',
      dataIndex: 'categoryUnit',
      sorter: (a: TableRow, b: TableRow) =>
        (a.categoryUnit ?? '').localeCompare(b.categoryUnit ?? ''),
      filters: categoryUnitFilters,
      onFilter: (value: unknown, record: TableRow) => record.categoryUnit === value,
      render: (value: string | null, record: TableRow) => {
        if (record.key === 'new') {
          if (addMode === 'category') {
            return (
              <Form.Item
                name="categoryUnitId"
                rules={[{ required: true, message: 'Выберите единицу' }]}
                style={{ margin: 0 }}
              >
                <Select options={units?.map((u) => ({ value: u.id, label: u.name })) ?? []} />
              </Form.Item>
            )
          }
          if (addMode === 'detail') {
            return selectedCategory?.unitName ?? ''
          }
        }
        if (editing?.key === record.key) {
          if (editing.type === 'category') {
            return (
              <Form.Item
                name="categoryUnitId"
                rules={[{ required: true, message: 'Выберите единицу' }]}
                style={{ margin: 0 }}
              >
                <Select options={units?.map((u) => ({ value: u.id, label: u.name })) ?? []} />
              </Form.Item>
            )
          }
          if (editing.type === 'detail') {
            return selectedCategory?.unitName ?? ''
          }
        }
        return value
      },
    },
    {
      title: () => (
        <Space>
          Вид затрат
          <Button
            icon={<PlusOutlined />}
            onClick={() => startAdd('detail')}
            aria-label="Добавить вид"
          />
        </Space>
      ),
      dataIndex: 'detailName',
      sorter: (a: TableRow, b: TableRow) => (a.detailName ?? '').localeCompare(b.detailName ?? ''),
      filters: detailFilters,
      onFilter: (value: unknown, record: TableRow) => record.detailName === value,
      render: (value: string | null, record: TableRow) => {
        if (record.key === 'new') {
          if (addMode === 'detail') {
            return (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Form.Item
                  name="detailName"
                  rules={[{ required: true, message: 'Введите название' }]}
                  style={{ marginBottom: 8 }}
                >
                  <Input />
                </Form.Item>
                <Form.Item name="detailDescription" style={{ margin: 0 }}>
                  <Input placeholder="Описание" />
                </Form.Item>
              </div>
            )
          }
        }
        if (editing?.key === record.key && editing.type === 'detail') {
          return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Form.Item
                name="detailName"
                rules={[{ required: true, message: 'Введите название' }]}
                style={{ marginBottom: 8 }}
              >
                <Input />
              </Form.Item>
              <Form.Item name="detailDescription" style={{ margin: 0 }}>
                <Input placeholder="Описание" />
              </Form.Item>
            </div>
          )
        }
        return value
      },
    },
    {
      title: 'Ед.Изм.',
      dataIndex: 'detailUnit',
      sorter: (a: TableRow, b: TableRow) => (a.detailUnit ?? '').localeCompare(b.detailUnit ?? ''),
      filters: detailUnitFilters,
      onFilter: (value: unknown, record: TableRow) => record.detailUnit === value,
      render: (value: string | null, record: TableRow) => {
        if (record.key === 'new' && addMode === 'detail') {
          return (
            <Form.Item
              name="detailUnitId"
              rules={[{ required: true, message: 'Выберите единицу' }]}
              style={{ margin: 0 }}
            >
              <Select options={units?.map((u) => ({ value: u.id, label: u.name })) ?? []} />
            </Form.Item>
          )
        }
        if (editing?.key === record.key && editing.type === 'detail') {
          return (
            <Form.Item
              name="detailUnitId"
              rules={[{ required: true, message: 'Выберите единицу' }]}
              style={{ margin: 0 }}
            >
              <Select options={units?.map((u) => ({ value: u.id, label: u.name })) ?? []} />
            </Form.Item>
          )
        }
        return value
      },
    },
    {
      title: 'Локализация',
      dataIndex: 'locations',
      sorter: (a: TableRow, b: TableRow) => {
        const aLoc = Array.isArray(a.locations) ? a.locations.join(', ') : (a.locations ?? '')
        const bLoc = Array.isArray(b.locations) ? b.locations.join(', ') : (b.locations ?? '')
        return aLoc.localeCompare(bLoc)
      },
      filters: locationFilters,
      onFilter: (value: unknown, record: TableRow) => {
        if (Array.isArray(record.locations)) {
          return record.locations.some(loc => loc === value)
        }
        return record.locations === value
      },
      render: (value: string[] | null, record: TableRow) => {
        if (record.key === 'new' && addMode === 'detail') {
          return (
            <Form.Item
              name="locationIds"
              rules={[{ required: true, message: 'Выберите локализации' }]}
              style={{ margin: 0 }}
            >
              <Select
                mode="multiple"
                placeholder="Выберите локализации"
                options={locations?.map((l) => ({ value: l.id, label: l.name })) ?? []}
              />
            </Form.Item>
          )
        }
        if (editing?.key === record.key && editing.type === 'detail') {
          return (
            <Form.Item
              name="locationIds"
              rules={[{ required: true, message: 'Выберите локализации' }]}
              style={{ margin: 0 }}
            >
              <Select
                mode="multiple"
                placeholder="Выберите локализации"
                options={locations?.map((l) => ({ value: l.id, label: l.name })) ?? []}
              />
            </Form.Item>
          )
        }

        // Отображение множественных локализаций
        if (Array.isArray(value) && value.length > 0) {
          return (
            <div style={{ lineHeight: '1.4' }}>
              {value.map((location, index) => (
                <div key={index}>{location}</div>
              ))}
            </div>
          )
        }

        return value || '-'
      },
    },
    {
      key: 'actions',
      render: (_: unknown, record: TableRow) => {
        if (record.key === 'new') {
          return (
            <Space>
              <Button icon={<CheckOutlined />} onClick={handleSave} aria-label="Сохранить" />
              <Button
                icon={<CloseOutlined />}
                onClick={() => {
                  setAddMode(null)
                  form.resetFields()
                }}
                aria-label="Отменить"
              />
            </Space>
          )
        }
        if (editing?.key === record.key) {
          return (
            <Space>
              <Button icon={<CheckOutlined />} onClick={handleUpdate} aria-label="Сохранить" />
              <Button icon={<CloseOutlined />} onClick={cancelEdit} aria-label="Отменить" />
            </Space>
          )
        }
        return (
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => startEdit(record)}
              aria-label="Редактировать"
            />
            <Button
              icon={<DeleteOutlined />}
              aria-label="Удалить"
              onClick={() =>
                modal.confirm({
                  title: 'Удалить?',
                  okText: 'Да',
                  cancelText: 'Нет',
                  onOk: () => handleDelete(record),
                })
              }
            />
          </Space>
        )
      },
    },
  ]

  const loading = categoriesLoading || detailsLoading

  const availableDetails = useMemo(() => {
    if (!filters.categoryId) return details ?? []
    return (details ?? []).filter((d) =>
      d.mappings.some((m) => m.costCategoryId === filters.categoryId),
    )
  }, [details, filters.categoryId])

  const handleFilterChange = (key: keyof typeof filters, value: number | undefined) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value }
      // Сброс зависимых фильтров
      if (key === 'categoryId') {
        newFilters.detailId = undefined
      }
      return newFilters
    })
  }

  const clearFilters = () => {
    setFilters({
      categoryId: undefined,
      detailId: undefined,
      locationId: undefined,
    })
  }

  return (
    <div style={{ height: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Блок фильтров */}
      <div style={{ flexShrink: 0, paddingBottom: 16 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Select
              placeholder="Выберите категорию затрат"
              style={{ width: '100%' }}
              allowClear
              showSearch
              value={filters.categoryId}
              onChange={(value) => handleFilterChange('categoryId', value)}
              filterOption={(input, option) => {
                const text = option?.label?.toString() || ""
                return text.toLowerCase().includes(input.toLowerCase())
              }}
              options={
                categories?.map((c) => ({
                  value: c.id,
                  label: `${c.number ?? ''} ${c.name}`,
                })) ?? []
              }
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="Выберите вид затрат"
              style={{ width: '100%' }}
              allowClear
              showSearch
              value={filters.detailId}
              onChange={(value) => handleFilterChange('detailId', value)}
              disabled={!filters.categoryId}
              filterOption={(input, option) => {
                const text = option?.label?.toString() || ""
                return text.toLowerCase().includes(input.toLowerCase())
              }}
              options={
                availableDetails.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))
              }
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="Выберите локализацию"
              style={{ width: '100%' }}
              allowClear
              showSearch
              value={filters.locationId}
              onChange={(value) => handleFilterChange('locationId', value)}
              filterOption={(input, option) => {
                const text = option?.label?.toString() || ""
                return text.toLowerCase().includes(input.toLowerCase())
              }}
              options={
                locations?.map((l) => ({
                  value: l.id,
                  label: l.name,
                })) ?? []
              }
            />
          </Col>
          <Col span={6}>
            <Space>
              <Button onClick={clearFilters}>Сбросить фильтры</Button>
              <Upload
                beforeUpload={(file) => {
                  void handleImport(file)
                  return false
                }}
                showUploadList={false}
                accept=".xlsx,.xls"
              >
                <Button icon={<UploadOutlined />}>Импорт</Button>
              </Upload>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Кнопки управления режимами */}
      {addMode && (
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleSave}
            >
              Сохранить
            </Button>
            <Button
              icon={<CloseOutlined />}
              onClick={() => {
                setAddMode(null)
                form.resetFields()
              }}
            >
              Отменить
            </Button>
          </Space>
        </div>
      )}

      {/* Контейнер таблицы */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Form form={form} component={false}>
          <Table<TableRow>
            dataSource={dataSource}
            columns={columns}
            rowKey="key"
            loading={loading}
            sticky
            scroll={{
              x: 'max-content',
              y: 'calc(100vh - 300px)',
            }}
            pagination={{
              pageSize: 100,
              pageSizeOptions: ['10', '20', '50', '100', '200', '500'],
              showSizeChanger: true,
            }}
          />
        </Form>
      </div>
    </div>
  )
}
