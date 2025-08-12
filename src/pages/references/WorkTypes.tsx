import { useMemo, useState } from 'react'
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Upload,
} from 'antd'
import type { UploadProps } from 'antd'
import { UploadOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

interface WorkType {
  id: string
  uid: string
  name: string
  unit: string
  cost: number
  created_at: string
}

export default function WorkTypes() {
  const { message } = App.useApp()
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | null>(null)
  const [currentWorkType, setCurrentWorkType] = useState<WorkType | null>(null)
  const [form] = Form.useForm()

  const { data: workTypes, isLoading, refetch } = useQuery({
    queryKey: ['work-types'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('work_types')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        message.error('Не удалось загрузить данные')
        throw error
      }
      return data as WorkType[]
    },
  })

  const openAddModal = () => {
    form.resetFields()
    setModalMode('add')
  }

  const openViewModal = (record: WorkType) => {
    setCurrentWorkType(record)
    setModalMode('view')
  }

  const openEditModal = (record: WorkType) => {
    setCurrentWorkType(record)
    form.setFieldsValue({
      uid: record.uid,
      name: record.name,
      unit: record.unit,
      cost: record.cost,
    })
    setModalMode('edit')
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (!supabase) return
      if (modalMode === 'add') {
        const { error } = await supabase
          .from('work_types')
          .insert({
            uid: values.uid,
            name: values.name,
            unit: values.unit,
            cost: values.cost,
          })
        if (error) throw error
        message.success('Запись добавлена')
      }
      if (modalMode === 'edit' && currentWorkType) {
        const { error } = await supabase
          .from('work_types')
          .update({
            uid: values.uid,
            name: values.name,
            unit: values.unit,
            cost: values.cost,
          })
          .eq('id', currentWorkType.id)
        if (error) throw error
        message.success('Запись обновлена')
      }
      setModalMode(null)
      setCurrentWorkType(null)
      await refetch()
    } catch {
      message.error('Не удалось сохранить')
    }
  }

  const handleDelete = async (record: WorkType) => {
    if (!supabase) return
    const { error } = await supabase.from('work_types').delete().eq('id', record.id)
    if (error) {
      message.error('Не удалось удалить')
    } else {
      message.success('Запись удалена')
      refetch()
    }
  }

  const handleImport: UploadProps['beforeUpload'] = async (file) => {
    try {
      if (!supabase) return false
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet)
      for (const row of json) {
        const uid = String(row.uid ?? row.UID ?? '')
        const name = String(row.name ?? '')
        const unit = String(row.unit ?? '')
        const cost = Number(row.cost ?? 0)
        if (uid && name && unit) {
          await supabase
            .from('work_types')
            .insert({ uid, name, unit, cost })
        }
      }
      message.success('Импорт завершён')
      refetch()
    } catch {
      message.error('Не удалось импортировать файл')
    }
    return false
  }

  const uidFilters = useMemo(
    () =>
      Array.from(new Set((workTypes ?? []).map((w) => w.uid))).map((u) => ({
        text: u,
        value: u,
      })),
    [workTypes],
  )

  const nameFilters = useMemo(
    () =>
      Array.from(new Set((workTypes ?? []).map((w) => w.name))).map((n) => ({
        text: n,
        value: n,
      })),
    [workTypes],
  )

  const unitFilters = useMemo(
    () =>
      Array.from(new Set((workTypes ?? []).map((w) => w.unit))).map((u) => ({
        text: u,
        value: u,
      })),
    [workTypes],
  )

  const columns = [
    {
      title: 'УИД',
      dataIndex: 'uid',
      sorter: (a: WorkType, b: WorkType) => a.uid.localeCompare(b.uid),
      filters: uidFilters,
      onFilter: (value: unknown, record: WorkType) => record.uid === value,
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      sorter: (a: WorkType, b: WorkType) => a.name.localeCompare(b.name),
      filters: nameFilters,
      onFilter: (value: unknown, record: WorkType) => record.name === value,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      sorter: (a: WorkType, b: WorkType) => a.unit.localeCompare(b.unit),
      filters: unitFilters,
      onFilter: (value: unknown, record: WorkType) => record.unit === value,
    },
    {
      title: 'Стоимость',
      dataIndex: 'cost',
      sorter: (a: WorkType, b: WorkType) => a.cost - b.cost,
    },
    {
      title: 'Действия',
      dataIndex: 'actions',
      render: (_: unknown, record: WorkType) => (
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Upload beforeUpload={handleImport} showUploadList={false} accept=".xlsx,.xls">
          <Button icon={<UploadOutlined />}>Импорт из Excel</Button>
        </Upload>
        <Button type="primary" onClick={openAddModal}>
          Добавить
        </Button>
      </div>
      <Table<WorkType>
        dataSource={workTypes ?? []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
      />

      <Modal
        open={modalMode !== null}
        title={
          modalMode === 'add'
            ? 'Добавить вид работ'
            : modalMode === 'edit'
              ? 'Редактировать вид работ'
              : 'Просмотр вида работ'
        }
        onCancel={() => {
          setModalMode(null)
          setCurrentWorkType(null)
        }}
        onOk={modalMode === 'view' ? () => setModalMode(null) : handleSave}
        okText={modalMode === 'view' ? 'Закрыть' : 'Сохранить'}
        cancelText="Отмена"
      >
        {modalMode === 'view' ? (
          <div>
            <p>УИД: {currentWorkType?.uid}</p>
            <p>Наименование: {currentWorkType?.name}</p>
            <p>Ед. изм.: {currentWorkType?.unit}</p>
            <p>Стоимость: {currentWorkType?.cost}</p>
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              label="УИД"
              name="uid"
              rules={[{ required: true, message: 'Введите УИД' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Наименование"
              name="name"
              rules={[{ required: true, message: 'Введите наименование' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Ед. изм."
              name="unit"
              rules={[{ required: true, message: 'Введите единицу измерения' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Стоимость"
              name="cost"
              rules={[{ required: true, message: 'Введите стоимость' }]}
            >
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

