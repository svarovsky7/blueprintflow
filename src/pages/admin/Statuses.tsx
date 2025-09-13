import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Space,
  Input,
  Modal,
  Form,
  message,
  Popconfirm,
  Switch,
  Select,
  Checkbox,
  Tag,
  List,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColumnsType } from 'antd/es/table'
import { supabase } from '@/lib/supabase'
import { PORTAL_PAGES, type PortalPageKey } from '@/shared/types'
import { normalizeColorToHex } from '@/shared/constants/statusColors'
import { kanbanStatusOrderApi } from '@/entities/statuses'

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
  { label: 'Зеленый', value: '#52c41a', color: '#52c41a' },
  { label: 'Желтый', value: '#faad14', color: '#faad14' },
  { label: 'Красный', value: '#ff4d4f', color: '#ff4d4f' },
  { label: 'Синий', value: '#1890ff', color: '#1890ff' },
  { label: 'Серый', value: '#888888', color: '#888888' },
  { label: 'Архивный', value: '#d9d9d9', color: '#d9d9d9' },
  { label: 'Оранжевый', value: '#fa8c16', color: '#fa8c16' },
  { label: 'Фиолетовый', value: '#722ed1', color: '#722ed1' },
]

const KANBAN_PAGE_ID = 'project-analysis'

export default function Statuses() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [kanbanModalOpen, setKanbanModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Status | null>(null)
  const [statusOrder, setStatusOrder] = useState<string[]>([])
  const [form] = Form.useForm()
  const [kanbanForm] = Form.useForm()

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

  // Загрузка порядка статусов для канбан-доски
  const { data: kanbanOrder } = useQuery({
    queryKey: ['kanban-status-order', KANBAN_PAGE_ID],
    queryFn: async () => {
      return await kanbanStatusOrderApi.getStatusOrder(KANBAN_PAGE_ID)
    },
  })

  // Инициализация порядка статусов при открытии модального окна
  useEffect(() => {
    if (kanbanModalOpen) {
      // Фильтруем только статусы для Шахматки
      const chessboardStatuses = statuses.filter(
        (s) => s.applicable_pages?.includes('documents/chessboard') && s.is_active,
      )

      if (kanbanOrder && kanbanOrder.length > 0) {
        // Используем сохраненный порядок
        const orderMap = new Map(kanbanOrder.map((item) => [item.status_id, item.order_position]))
        const sortedIds = chessboardStatuses
          .sort((a, b) => {
            const orderA = orderMap.get(a.id) ?? Number.MAX_VALUE
            const orderB = orderMap.get(b.id) ?? Number.MAX_VALUE
            return orderA - orderB
          })
          .map((s) => s.id)
        setStatusOrder(sortedIds)
      } else {
        // Используем порядок по умолчанию
        setStatusOrder(chessboardStatuses.map((s) => s.id))
      }
    }
  }, [kanbanModalOpen, statuses, kanbanOrder])

  // Функции для изменения порядка статусов
  const moveStatusUp = (statusId: string) => {
    const index = statusOrder.indexOf(statusId)
    if (index > 0) {
      const newOrder = [...statusOrder]
      ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
      setStatusOrder(newOrder)
    }
  }

  const moveStatusDown = (statusId: string) => {
    const index = statusOrder.indexOf(statusId)
    if (index < statusOrder.length - 1) {
      const newOrder = [...statusOrder]
      ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
      setStatusOrder(newOrder)
    }
  }

  // Создание/обновление статуса
  const saveMutation = useMutation({
    mutationFn: async (values: Partial<Status>) => {
      if (!supabase) throw new Error('Supabase not initialized')

      if (editingRecord) {
        // Обновление
        const { error } = await supabase.from('statuses').update(values).eq('id', editingRecord.id)

        if (error) throw error
      } else {
        // Создание
        const { error } = await supabase.from('statuses').insert([values])

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
      const { error } = await supabase.from('statuses').delete().eq('id', id)

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
      const { error } = await supabase.from('statuses').update({ is_active }).eq('id', id)

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
        const hexColor = normalizeColorToHex(color)
        const colorOption = colorOptions.find((c) => c.value === hexColor)
        return hexColor ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 20,
                height: 20,
                backgroundColor: hexColor,
                borderRadius: 4,
                border: '1px solid #d9d9d9',
              }}
            />
            <span>{colorOption?.label || hexColor}</span>
          </div>
        ) : (
          '-'
        )
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
            {pages.map((pageKey) => {
              const page = PORTAL_PAGES.find((p) => p.key === pageKey)
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
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>Справочник статусов</h2>
        <Space>
          <Button onClick={() => setKanbanModalOpen(true)}>КАНБАН</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Добавить статус
          </Button>
        </Space>
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

          <Form.Item name="color" label="Цвет">
            <Select
              placeholder="Выберите цвет"
              allowClear
              showSearch
              filterOption={(input, option) => {
                const label = colorOptions.find((c) => c.value === option?.value)?.label || ''
                return label.toLowerCase().includes(input.toLowerCase())
              }}
              options={colorOptions.map((opt) => ({
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        backgroundColor: opt.color,
                        borderRadius: 2,
                        border: '1px solid #d9d9d9',
                      }}
                    />
                    <span>{opt.label}</span>
                  </div>
                ),
                value: opt.value,
              }))}
            />
          </Form.Item>

          <Form.Item name="applicable_pages" label="Применяется к страницам">
            <Checkbox.Group style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {PORTAL_PAGES.map((page) => (
                  <Checkbox key={page.key} value={page.key}>
                    {page.label}
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item name="is_active" valuePropName="checked">
            <Switch checkedChildren="Активен" unCheckedChildren="Неактивен" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно настройки КАНБАН */}
      <Modal
        title="Настройка КАНБАН представлений"
        open={kanbanModalOpen}
        onCancel={() => {
          setKanbanModalOpen(false)
          kanbanForm.resetFields()
        }}
        onOk={async () => {
          try {
            await kanbanStatusOrderApi.saveStatusOrder(KANBAN_PAGE_ID, statusOrder)
            message.success('Порядок статусов сохранен')
            setKanbanModalOpen(false)
          } catch (error) {
            message.error('Ошибка сохранения порядка статусов')
          }
        }}
        okText="Сохранить порядок"
        cancelText="Отмена"
        width={900}
      >
        <Form form={kanbanForm} layout="vertical">
          <Form.Item label="Выберите страницы, где будут использоваться КАНБАН доски:">
            <div style={{ marginBottom: 16 }}>
              <h4>Доступные КАНБАН представления:</h4>
              <ul>
                <li>
                  <strong>Анализ проектов</strong> - Канбан-доска для отслеживания статусов проектов
                  по комплектам шахматки
                  <br />
                  <small>Путь: Отчеты → Анализ проектов</small>
                </li>
              </ul>
            </div>

            <div style={{ marginTop: 24 }}>
              <h4>Порядок статусов для канбан-доски "Анализ проектов":</h4>
              <List
                dataSource={statusOrder}
                style={{ marginBottom: 24, maxHeight: 300, overflowY: 'auto' }}
                renderItem={(statusId, index) => {
                  const status = statuses.find((s) => s.id === statusId)
                  if (!status) return null
                  return (
                    <List.Item
                      actions={[
                        <Button
                          key="up"
                          type="text"
                          icon={<ArrowUpOutlined />}
                          disabled={index === 0}
                          onClick={() => moveStatusUp(statusId)}
                        />,
                        <Button
                          key="down"
                          type="text"
                          icon={<ArrowDownOutlined />}
                          disabled={index === statusOrder.length - 1}
                          onClick={() => moveStatusDown(statusId)}
                        />,
                      ]}
                    >
                      <Tag color={status.color}>
                        {index + 1}. {status.name}
                      </Tag>
                    </List.Item>
                  )
                }}
              />

              <h4>Настройка статусов для страниц:</h4>
              <Table
                dataSource={PORTAL_PAGES.filter((page) => page.key === 'documents/chessboard')}
                columns={[
                  {
                    title: 'Страница',
                    dataIndex: 'label',
                    key: 'label',
                  },
                  {
                    title: 'Активные статусы',
                    key: 'statuses',
                    render: () => {
                      const pageStatuses = statuses.filter(
                        (s) => s.applicable_pages?.includes('documents/chessboard') && s.is_active,
                      )
                      return (
                        <Space size={4} wrap>
                          {pageStatuses.map((status) => (
                            <Tag key={status.id} color={status.color}>
                              {status.name}
                            </Tag>
                          ))}
                          {pageStatuses.length === 0 && (
                            <span style={{ color: '#999' }}>Нет активных статусов</span>
                          )}
                        </Space>
                      )
                    },
                  },
                  {
                    title: 'Описание',
                    key: 'description',
                    render: () => 'Статусы используются в канбан-доске "Анализ проектов"',
                  },
                ]}
                rowKey="key"
                pagination={false}
                size="small"
              />
              <div style={{ marginTop: 16, padding: 16, background: '#f0f0f0', borderRadius: 4 }}>
                <strong>Инструкция:</strong>
                <ol style={{ marginBottom: 0, paddingLeft: 20 }}>
                  <li>Создайте необходимые статусы в справочнике</li>
                  <li>Укажите для каждого статуса применимую страницу "Шахматка"</li>
                  <li>Активируйте статусы, которые должны отображаться в канбан-доске</li>
                  <li>Настройте порядок отображения статусов с помощью стрелок</li>
                  <li>Нажмите "Сохранить порядок" для применения изменений</li>
                </ol>
              </div>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
