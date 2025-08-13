import { useMemo, useState } from 'react'
import {
  App,
  Button,
  Form,
  Input,
  Select,
  Space,
  Table,
  Popconfirm,
  Modal,
  Upload,
} from 'antd'
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { useQuery } from '@tanstack/react-query'
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
  costCategoryId: number
  locationId: number
  locationName: string | null
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
  location: string | null
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
  cost_category_id: number
  location_id: number
  units: { name: string } | null
  location: { name: string } | null
}

export default function CostCategories() {
  const { message } = App.useApp()
  const [addMode, setAddMode] = useState<'category' | 'detail' | null>(null)
  const [editing, setEditing] = useState<
    { type: 'category' | 'detail'; key: string; id: number } | null
  >(null)
  const [form] = Form.useForm()

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
          'id, name, description, unit_id, cost_category_id, location_id, units(name), location(name)',
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
        costCategoryId: d.cost_category_id,
        locationId: d.location_id,
        locationName: d.location?.name ?? null,
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
      const { data } = await supabase
        .from('location')
        .select('id, name')
        .order('name')
      return (data ?? []) as LocationOption[]
    },
  })

  type ConflictAction = 'write' | 'skip' | 'writeAll' | 'skipAll'

  const resolveConflict = (title: string): Promise<ConflictAction> =>
    new Promise((resolve) => {
      const modal = Modal.confirm({
        title,
        okText: 'Записать',
        cancelText: 'Не записывать',
        onOk: () => resolve('write'),
        onCancel: () => resolve('skip'),
        content: (
          <Space>
            <Button
              onClick={() => {
                resolve('writeAll')
                modal.destroy()
              }}
            >
              Записать все
            </Button>
            <Button
              onClick={() => {
                resolve('skipAll')
                modal.destroy()
              }}
            >
              Не записывать все
            </Button>
          </Space>
        ),
      })
    })

  const handleImport = async (file: File) => {
    if (!supabase) return false
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
        header: 1,
      })
      let imported = 0
      let errors = 0
      let global: 'writeAll' | 'skipAll' | null = null
      const categoryMap = new Map<string, number>()
      ;(categories ?? []).forEach((c) => categoryMap.set(c.name, c.id))
      const detailMap = new Map<string, number>()
      ;(details ?? []).forEach((d) =>
        detailMap.set(`${d.costCategoryId}|${d.name}|${d.locationName ?? ''}`, d.id),
      )

      for (let i = 1; i < rows.length; i += 1) {
        const row = rows[i]
        if (!row) continue
        const number = row[0] !== undefined && row[0] !== null ? Number(row[0]) : null
        const categoryName = row[1]?.toString().trim()
        if (!categoryName) continue
        const categoryUnitName = row[2]?.toString().trim()
        const detailName = row[3]?.toString().trim()
        const detailUnitName = row[4]?.toString().trim()
        const locationName = row[5]?.toString().trim()

        const categoryUnitId =
          units?.find((u) => u.name === categoryUnitName)?.id ?? null
        const detailUnitId =
          units?.find((u) => u.name === detailUnitName)?.id ?? null
        const locationId =
          locations?.find((l) => l.name === locationName)?.id ?? null

        let categoryId = categoryMap.get(categoryName) ?? null
        if (categoryId) {
          if (global !== 'writeAll' && global !== 'skipAll') {
            const res = await resolveConflict(
              `Категория "${categoryName}" уже существует`,
            )
            if (res === 'writeAll') global = 'writeAll'
            if (res === 'skipAll') global = 'skipAll'
            if (res === 'write' || res === 'writeAll') {
              const { error } = await supabase
                .from('cost_categories')
                .update({ number, unit_id: categoryUnitId })
                .eq('id', categoryId)
              if (error) {
                errors += 1
                continue
              }
            } else if (res === 'skip' || res === 'skipAll') {
              continue
            }
          } else if (global === 'writeAll') {
            const { error } = await supabase
              .from('cost_categories')
              .update({ number, unit_id: categoryUnitId })
              .eq('id', categoryId)
            if (error) {
              errors += 1
              continue
            }
          } else if (global === 'skipAll') {
            continue
          }
        } else {
          const { data: inserted, error } = await supabase
            .from('cost_categories')
            .insert({ number, name: categoryName, unit_id: categoryUnitId })
            .select('id')
            .single()
          if (error) {
            errors += 1
            continue
          }
          categoryId = inserted.id
          categoryMap.set(categoryName, categoryId!)
        }

        if (detailName) {
          const key = `${categoryId}|${detailName}|${locationName ?? ''}`
          const existingDetailId = detailMap.get(key)
          if (existingDetailId) {
            if (global !== 'writeAll' && global !== 'skipAll') {
              const res = await resolveConflict(
                `Вид затрат "${detailName}" уже существует`,
              )
              if (res === 'writeAll') global = 'writeAll'
              if (res === 'skipAll') global = 'skipAll'
              if (res === 'write' || res === 'writeAll') {
                const { error } = await supabase
                  .from('detail_cost_categories')
                  .update({
                    unit_id: detailUnitId,
                    location_id: locationId,
                    cost_category_id: categoryId,
                  })
                  .eq('id', existingDetailId)
                if (error) {
                  errors += 1
                  continue
                }
              } else if (res === 'skip' || res === 'skipAll') {
                continue
              }
            } else if (global === 'writeAll') {
              const { error } = await supabase
                .from('detail_cost_categories')
                .update({
                  unit_id: detailUnitId,
                  location_id: locationId,
                  cost_category_id: categoryId,
                })
                .eq('id', existingDetailId)
              if (error) {
                errors += 1
                continue
              }
            } else if (global === 'skipAll') {
              continue
            }
          } else {
            const { data: insertedDetail, error } = await supabase
              .from('detail_cost_categories')
              .insert({
                cost_category_id: categoryId,
                name: detailName,
                unit_id: detailUnitId,
                location_id: locationId,
              })
              .select('id')
              .single()
            if (error) {
              errors += 1
              continue
            }
            detailMap.set(key, insertedDetail.id)
          }
        }
        imported += 1
      }
      console.log(`Импортировано строк: ${imported}, ошибок: ${errors}`)
      await Promise.all([refetchCategories(), refetchDetails()])
    } catch (e) {
      console.log('Ошибка импорта', e)
    }
    return false
  }

  const selectedCategoryId = Form.useWatch('costCategoryId', form)
  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId)

  const rows = useMemo(() => {
    const result: TableRow[] = []
    const detailsByCategory = new Map<number, DetailCategory[]>(
      (details ?? []).map((d) => [d.costCategoryId, []]),
    )
    ;(details ?? []).forEach((d) => {
      const arr = detailsByCategory.get(d.costCategoryId)
      if (arr) arr.push(d)
    })
    ;(categories ?? []).forEach((c) => {
      const ds = detailsByCategory.get(c.id)
      if (ds && ds.length > 0) {
        ds.forEach((d) => {
          result.push({
            key: `detail-${d.id}`,
            number: c.number,
            categoryId: c.id,
            categoryName: c.name,
            categoryUnit: c.unitName,
            detailId: d.id,
            detailName: d.name,
            detailUnit: d.unitName,
            location: d.locationName,
          })
        })
      } else {
        result.push({
          key: `category-${c.id}`,
          number: c.number,
          categoryId: c.id,
          categoryName: c.name,
          categoryUnit: c.unitName,
          detailId: null,
          detailName: null,
          detailUnit: null,
          location: null,
        })
      }
    })
    return result
  }, [categories, details])

  const emptyRow: TableRow = {
    key: 'new',
    number: null,
    categoryId: null,
    categoryName: null,
    categoryUnit: null,
    detailId: null,
    detailName: null,
    detailUnit: null,
    location: null,
  }

  const dataSource: TableRow[] = addMode ? [emptyRow, ...rows] : rows

  const numberFilters = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.number).filter((n): n is number => n !== null)),
      ).map((n) => ({ text: String(n), value: n })),
    [rows],
  )

  const categoryFilters = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.categoryName).filter((n): n is string => !!n)),
      ).map((n) => ({ text: n, value: n })),
    [rows],
  )

  const categoryUnitFilters = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.categoryUnit).filter((n): n is string => !!n)),
      ).map((n) => ({ text: n, value: n })),
    [rows],
  )

  const detailFilters = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.detailName).filter((n): n is string => !!n)),
      ).map((n) => ({ text: n, value: n })),
    [rows],
  )

  const detailUnitFilters = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.detailUnit).filter((n): n is string => !!n)),
      ).map((n) => ({ text: n, value: n })),
    [rows],
  )

  const locationFilters = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.location).filter((n): n is string => !!n)),
      ).map((n) => ({ text: n, value: n })),
    [rows],
  )

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
      form.setFieldsValue({
        costCategoryId: detail?.costCategoryId,
        detailName: detail?.name,
        detailDescription: detail?.description,
        detailUnitId: detail?.unitId,
        locationId: detail?.locationId,
      })
      setEditing({ type: 'detail', key: record.key, id: record.detailId })
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
        if (categories?.some((c) => c.name === values.categoryName)) {
          message.error('Категория уже существует')
          return
        }
        const { error } = await supabase.from('cost_categories').insert({
          number: values.number,
          name: values.categoryName,
          description: values.categoryDescription,
          unit_id: values.categoryUnitId,
        })
        if (error) throw error
      }
      if (addMode === 'detail') {
        const { error } = await supabase.from('detail_cost_categories').insert({
          cost_category_id: values.costCategoryId,
          name: values.detailName,
          description: values.detailDescription,
          unit_id: values.detailUnitId,
          location_id: values.locationId,
        })
        if (error) throw error
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
        if (
          categories?.some(
            (c) => c.name === values.categoryName && c.id !== editing.id,
          )
        ) {
          message.error('Категория уже существует')
          return
        }
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
        const { error } = await supabase
          .from('detail_cost_categories')
          .update({
            cost_category_id: values.costCategoryId,
            name: values.detailName,
            description: values.detailDescription,
            unit_id: values.detailUnitId,
            location_id: values.locationId,
          })
          .eq('id', editing.id)
        if (error) throw error
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
      sorter: (a: TableRow, b: TableRow) =>
        (a.number ?? 0) - (b.number ?? 0),
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
          <Upload
            beforeUpload={handleImport}
            showUploadList={false}
            accept=".xlsx,.xls"
          >
            <Button icon={<UploadOutlined />} aria-label="Импорт из Excel" />
          </Upload>
        </Space>
      ),
      dataIndex: 'categoryName',
      sorter: (a: TableRow, b: TableRow) =>
        (a.categoryName ?? '').localeCompare(b.categoryName ?? ''),
      filters: categoryFilters,
      onFilter: (value: unknown, record: TableRow) =>
        record.categoryName === value,
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
      onFilter: (value: unknown, record: TableRow) =>
        record.categoryUnit === value,
      render: (value: string | null, record: TableRow) => {
        if (record.key === 'new') {
          if (addMode === 'category') {
            return (
              <Form.Item
                name="categoryUnitId"
                rules={[{ required: true, message: 'Выберите единицу' }]}
                style={{ margin: 0 }}
              >
                <Select
                  options={units?.map((u) => ({ value: u.id, label: u.name })) ?? []}
                />
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
                <Select
                  options={units?.map((u) => ({ value: u.id, label: u.name })) ?? []}
                />
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
      sorter: (a: TableRow, b: TableRow) =>
        (a.detailName ?? '').localeCompare(b.detailName ?? ''),
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
      sorter: (a: TableRow, b: TableRow) =>
        (a.detailUnit ?? '').localeCompare(b.detailUnit ?? ''),
      filters: detailUnitFilters,
      onFilter: (value: unknown, record: TableRow) =>
        record.detailUnit === value,
      render: (value: string | null, record: TableRow) => {
        if (record.key === 'new' && addMode === 'detail') {
          return (
            <Form.Item
              name="detailUnitId"
              rules={[{ required: true, message: 'Выберите единицу' }]}
              style={{ margin: 0 }}
            >
              <Select
                options={units?.map((u) => ({ value: u.id, label: u.name })) ?? []}
              />
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
              <Select
                options={units?.map((u) => ({ value: u.id, label: u.name })) ?? []}
              />
            </Form.Item>
          )
        }
        return value
      },
    },
    {
      title: 'Локализация',
      dataIndex: 'location',
      sorter: (a: TableRow, b: TableRow) =>
        (a.location ?? '').localeCompare(b.location ?? ''),
      filters: locationFilters,
      onFilter: (value: unknown, record: TableRow) => record.location === value,
      render: (value: string | null, record: TableRow) => {
        if (record.key === 'new' && addMode === 'detail') {
          return (
            <Form.Item
              name="locationId"
              rules={[{ required: true, message: 'Выберите локализацию' }]}
              style={{ margin: 0 }}
            >
              <Select
                options={
                  locations?.map((l) => ({ value: l.id, label: l.name })) ?? []
                }
              />
            </Form.Item>
          )
        }
        if (editing?.key === record.key && editing.type === 'detail') {
          return (
            <Form.Item
              name="locationId"
              rules={[{ required: true, message: 'Выберите локализацию' }]}
              style={{ margin: 0 }}
            >
              <Select
                options={
                  locations?.map((l) => ({ value: l.id, label: l.name })) ?? []
                }
              />
            </Form.Item>
          )
        }
        return value
      },
    },
    {
      key: 'actions',
      render: (_: unknown, record: TableRow) => {
        if (record.key === 'new') {
          return (
            <Space>
              <Button
                icon={<CheckOutlined />}
                onClick={handleSave}
                aria-label="Сохранить"
              />
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
              <Button
                icon={<CheckOutlined />}
                onClick={handleUpdate}
                aria-label="Сохранить"
              />
              <Button
                icon={<CloseOutlined />}
                onClick={cancelEdit}
                aria-label="Отменить"
              />
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
            <Popconfirm
              title="Удалить?"
              onConfirm={() => handleDelete(record)}
              okText="Да"
              cancelText="Нет"
            >
              <Button icon={<DeleteOutlined />} aria-label="Удалить" />
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  const loading = categoriesLoading || detailsLoading

  return (
    <Form form={form} component={false}>
      <Table<TableRow>
        dataSource={dataSource}
        columns={columns}
        rowKey="key"
        loading={loading}
      />
    </Form>
  )
}

