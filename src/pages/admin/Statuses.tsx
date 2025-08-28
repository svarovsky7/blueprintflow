import { useState } from 'react'
import { Table, Button, Space, Input, Modal, Form, message, Popconfirm, Switch, Select, Checkbox, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColumnsType } from 'antd/es/table'
import { supabase } from '@/lib/supabase'
import { PORTAL_PAGES, type PortalPageKey } from '@/shared/types'

interface Status {
  id: string
  name: string
  color?: string
  is_active: boolean
  applicable_pages?: PortalPageKey[]
  created_at: string
  updated_at: string
}

const colorOptions = [
  { label: 'Зеленый', value: 'green', color: '#52c41a' },
  { label: 'Желтый', value: 'yellow', color: '#faad14' },
  { label: 'Красный', value: 'red', color: '#ff4d4f' },
  { label: 'Синий', value: 'blue', color: '#c3b8cc' },
]

export default function Statuses() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Status | null>(null)
  const [form] = Form.useForm()

  // Загрузка статусов
  const { data: statuses = [], isLoading } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not initialized')
      const { data, error } = await supabase
        .from('statuses')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      return data as Status[]
    },
  })

  // Создание/обновление статуса
  const saveMutation = useMutation({
    mutationFn: async (values: Partial<Status>) => {
      if (!supabase) throw new Error('Supabase not initialized')
      
      if (editingRecord) {
        // Обновление
        const { error } = await supabase
          .from('statuses')
          .update(values)
          .eq('id', editingRecord.id)
        
        if (error) throw error
      } else {
        // Создание
        const { error } = await supabase
          .from('statuses')
          .insert([values])
        
        if (error) throw error
      }
    },
    onSuccess: () => {
      message.success(editingRecord ? 'Статус обновлен' : 'Статус создан')
      queryClient.invalidateQueries({ queryKey: ['statuses'] })
      setModalOpen(false)
      form.resetFields()
      setEditingRecord(null)
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  // Удаление статуса
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not initialized')
      const { error } = await supabase
        .from('statuses')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      message.success('Статус удален')
      queryClient.invalidateQueries({ queryKey: ['statuses'] })
    },
    onError: (error: Error) => {
      message.error(`Ошибка удаления: ${error.message}`)
    },
  })

  // Быстрое обновление активности
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (!supabase) throw new Error('Supabase not initialized')
      const { error } = await supabase
        .from('statuses')
        .update({ is_active })
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] })
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  // Обработчики
  const handleAdd = () => {
    setEditingRecord(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: Status) => {
    setEditingRecord(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const handleSave = () => {
    form.validateFields().then((values) => {
      saveMutation.mutate(values)
    })
  }

  const handleToggleActive = (id: string, is_active: boolean) => {
    toggleActiveMutation.mutate({ id, is_active })
  }

  // Колонки таблицы
  const columns: ColumnsType<Status> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      width: 250,
    },
    {
      title: 'Цвет',
      dataIndex: 'color',
      key: 'color',
      width: 120,
      render: (color: string) => {
        const colorOption = colorOptions.find(c => c.value === color)
        return colorOption ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 20,
                height: 20,
                backgroundColor: colorOption.color,
                borderRadius: 4,
              }}
            />
            <span>{colorOption.label}</span>
          </div>
        ) : '-'
      },
    },
    {
      title: 'Применяется к страницам',
      dataIndex: 'applicable_pages',
      key: 'applicable_pages',
      width: 400,
      render: (pages: PortalPageKey[]) => {
        if (!pages || pages.length === 0) {
          return <span style={{ color: '#999' }}>Не указано</span>
        }
        return (
          <Space size={4} wrap>
            {pages.map(pageKey => {
              const page = PORTAL_PAGES.find(p => p.key === pageKey)
              return page ? (
                <Tag key={pageKey} color="blue">
                  {page.label}
                </Tag>
              ) : null
            })}
          </Space>
        )
      },
    },
    {
      title: 'Активен',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      align: 'center',
      render: (is_active: boolean, record: Status) => (
        <Switch
          checked={is_active}
          onChange={(checked) => handleToggleActive(record.id, checked)}
        />
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_, record: Status) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Удалить статус?"
            description="Вы уверены, что хотите удалить этот статус?"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Отмена"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>Справочник статусов</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          Добавить статус
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={statuses}
        rowKey="id"
        loading={isLoading}
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
      />

      <Modal
        title={editingRecord ? 'Редактирование статуса' : 'Новый статус'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => {
          setModalOpen(false)
          form.resetFields()
          setEditingRecord(null)
        }}
        confirmLoading={saveMutation.isPending}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            is_active: true,
            applicable_pages: [],
          }}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название статуса' }]}
          >
            <Input placeholder="Введите название статуса" />
          </Form.Item>

          <Form.Item
            name="color"
            label="Цвет"
          >
            <Select
              placeholder="Выберите цвет"
              allowClear
              options={colorOptions.map(opt => ({
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        backgroundColor: opt.color,
                        borderRadius: 2,
                      }}
                    />
                    <span>{opt.label}</span>
                  </div>
                ),
                value: opt.value,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="applicable_pages"
            label="Применяется к страницам"
          >
            <Checkbox.Group style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {PORTAL_PAGES.map(page => (
                  <Checkbox key={page.key} value={page.key}>
                    {page.label}
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item
            name="is_active"
            valuePropName="checked"
          >
            <Switch checkedChildren="Активен" unCheckedChildren="Неактивен" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}