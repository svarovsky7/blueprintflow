import { useEffect, useMemo, useState } from 'react'
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
} from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import TopBar from '../../components/TopBar'

interface CostCategory {
  id: string
  code: string
  name: string
  level: number
  parentId: string | null
  description: string | null
  created_at: string
}

export default function CostCategories() {
  const { message } = App.useApp()
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | null>(null)
  const [currentCategory, setCurrentCategory] = useState<CostCategory | null>(null)
  const [form] = Form.useForm()

  const { data: categories, isLoading, refetch } = useQuery({
    queryKey: ['cost_categories'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('cost_categories')
        .select('*')
        .order('code')
      if (error) {
        message.error('Не удалось загрузить данные')
        throw error
      }
      return ((data ?? []) as {
        id: string
        code: string
        name: string
        level: number
        parent_id: string | null
        description: string | null
        created_at: string
      }[]).map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        level: c.level,
        parentId: c.parent_id,
        description: c.description,
        created_at: c.created_at,
      })) as CostCategory[]
    },
  })

  const openAddModal = () => {
    form.resetFields()
    form.setFieldsValue({ level: 1 })
    setModalMode('add')
  }

  const openViewModal = (record: CostCategory) => {
    setCurrentCategory(record)
    setModalMode('view')
  }

  const openEditModal = (record: CostCategory) => {
    setCurrentCategory(record)
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      level: record.level,
      parentId: record.parentId,
      description: record.description,
    })
    setModalMode('edit')
  }

  const level = Form.useWatch('level', form)
  const parentId = Form.useWatch('parentId', form)

  useEffect(() => {
    if (!categories) return
    if (modalMode === 'view') return
    if (level === 1) {
      if (modalMode === 'add') form.setFieldsValue({ code: undefined, parentId: null })
      return
    }
    const parent = categories.find((c) => c.id === parentId)
    if (!parent) return
    if (
      modalMode === 'edit' &&
      level === currentCategory?.level &&
      parentId === currentCategory?.parentId
    ) {
      return
    }
    const siblings = categories.filter(
      (c) => c.parentId === parent.id && c.id !== currentCategory?.id,
    )
    const numbers = siblings.map((s) => {
      const parts = s.code.split('.')
      return parseInt(parts[parts.length - 1], 10)
    })
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
    const newCode = `${parent.code}.${String(nextNumber).padStart(2, '0')}`
    form.setFieldsValue({ code: newCode })
  }, [level, parentId, categories, modalMode, currentCategory, form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (!supabase) return
      const payload = {
        code: values.code,
        name: values.name,
        level: values.level,
        parent_id: values.level === 1 ? null : values.parentId,
        description: values.description,
      }
      if (modalMode === 'add') {
        const { error } = await supabase.from('cost_categories').insert(payload)
        if (error) throw error
        message.success('Запись добавлена')
      }
      if (modalMode === 'edit' && currentCategory) {
        const { error } = await supabase
          .from('cost_categories')
          .update(payload)
          .eq('id', currentCategory.id)
        if (error) throw error
        message.success('Запись обновлена')
      }
      setModalMode(null)
      setCurrentCategory(null)
      await refetch()
    } catch {
      message.error('Не удалось сохранить')
    }
  }

  const handleDelete = async (record: CostCategory) => {
    if (!supabase) return
    const { error } = await supabase.from('cost_categories').delete().eq('id', record.id)
    if (error) {
      message.error('Не удалось удалить')
    } else {
      message.success('Запись удалена')
      refetch()
    }
  }

  const codeFilters = useMemo(
    () =>
      Array.from(new Set((categories ?? []).map((c) => c.code))).map((c) => ({
        text: c,
        value: c,
      })),
    [categories],
  )

  const nameFilters = useMemo(
    () =>
      Array.from(new Set((categories ?? []).map((c) => c.name))).map((n) => ({
        text: n,
        value: n,
      })),
    [categories],
  )

  const levelFilters = useMemo(
    () =>
      Array.from(new Set((categories ?? []).map((c) => c.level))).map((l) => ({
        text: String(l),
        value: l,
      })),
    [categories],
  )

  const parentFilters = useMemo(
    () =>
      Array.from(
        new Set((categories ?? []).map((c) => c.parentId).filter((p): p is string => !!p)),
      ).map((pid) => ({
        text: categories?.find((c) => c.id === pid)?.name || '-',
        value: pid,
      })),
    [categories],
  )

  const descriptionFilters = useMemo(
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

  const columns = [
    {
      title: 'Номер',
      dataIndex: 'code',
      sorter: (a: CostCategory, b: CostCategory) => a.code.localeCompare(b.code),
      filters: codeFilters,
      onFilter: (value: unknown, record: CostCategory) => record.code === value,
    },
    {
      title: 'Название',
      dataIndex: 'name',
      sorter: (a: CostCategory, b: CostCategory) => a.name.localeCompare(b.name),
      filters: nameFilters,
      onFilter: (value: unknown, record: CostCategory) => record.name === value,
    },
    {
      title: 'Уровень',
      dataIndex: 'level',
      sorter: (a: CostCategory, b: CostCategory) => a.level - b.level,
      filters: levelFilters,
      onFilter: (value: unknown, record: CostCategory) => record.level === value,
    },
    {
      title: 'Родитель',
      dataIndex: 'parentId',
      render: (pid: string | null) =>
        categories?.find((c) => c.id === pid)?.name || '-',
      sorter: (a: CostCategory, b: CostCategory) =>
        (categories?.find((c) => c.id === a.parentId)?.name || '').localeCompare(
          categories?.find((c) => c.id === b.parentId)?.name || '',
        ),
      filters: parentFilters,
      onFilter: (value: unknown, record: CostCategory) => record.parentId === value,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      sorter: (a: CostCategory, b: CostCategory) =>
        (a.description ?? '').localeCompare(b.description ?? ''),
      filters: descriptionFilters,
      onFilter: (value: unknown, record: CostCategory) => record.description === value,
    },
    {
      title: 'Действия',
      dataIndex: 'actions',
      render: (_: unknown, record: CostCategory) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => openViewModal(record)}
            aria-label="Просмотр"
          />
          <Button
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
            aria-label="Редактировать"
          />
          <Popconfirm title="Удалить запись?" onConfirm={() => handleDelete(record)}>
            <Button danger icon={<DeleteOutlined />} aria-label="Удалить" />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <TopBar>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" onClick={openAddModal}>
            Добавить
          </Button>
        </div>
      </TopBar>
      <Table<CostCategory>
        dataSource={categories ?? []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        sticky={{ offsetHeader: 64 }}
      />

      <Modal
        open={modalMode !== null}
        title={
          modalMode === 'add'
            ? 'Добавить категорию'
            : modalMode === 'edit'
              ? 'Редактировать категорию'
              : 'Просмотр категории'
        }
        onCancel={() => {
          setModalMode(null)
          setCurrentCategory(null)
        }}
        onOk={modalMode === 'view' ? () => setModalMode(null) : handleSave}
        okText={modalMode === 'view' ? 'Закрыть' : 'Сохранить'}
        cancelText="Отмена"
      >
        {modalMode === 'view' ? (
          <div>
            <p><strong>Номер:</strong> {currentCategory?.code}</p>
            <p><strong>Название:</strong> {currentCategory?.name}</p>
            <p><strong>Уровень:</strong> {currentCategory?.level}</p>
            <p>
              <strong>Родитель:</strong> {
                categories?.find((c) => c.id === currentCategory?.parentId)?.name || '-'
              }
            </p>
            <p><strong>Описание:</strong> {currentCategory?.description}</p>
          </div>
        ) : (
          <Form form={form} layout="vertical" initialValues={{ level: 1 }}>
            <Form.Item
              label="Номер категории"
              name="code"
              rules={level === 1 ? [{ required: true, message: 'Введите номер' }] : []}
            >
              <Input disabled={level !== 1} />
            </Form.Item>
            <Form.Item
              label="Название"
              name="name"
              rules={[{ required: true, message: 'Введите название' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Уровень"
              name="level"
              rules={[{ required: true, message: 'Выберите уровень' }]}
            >
              <Select options={[1, 2, 3].map((v) => ({ value: v, label: v }))} />
            </Form.Item>
            {level > 1 && (
              <Form.Item
                label="Родительская категория"
                name="parentId"
                rules={[{ required: true, message: 'Выберите родительскую категорию' }]}
              >
                <Select
                  options={
                    categories
                      ?.filter((c) => c.level === level - 1)
                      .map((c) => ({ value: c.id, label: `${c.code} ${c.name}` })) ?? []
                  }
                />
              </Form.Item>
            )}
            <Form.Item label="Описание" name="description">
              <Input />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

