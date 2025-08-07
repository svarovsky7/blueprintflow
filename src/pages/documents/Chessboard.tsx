import { useState } from 'react'
import { Button, Input, Space, Table, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { supabase } from '../../lib/supabase'

interface RowData {
  key: string
  project: string
  material: string
  quantityPd: string
  quantitySpec: string
  quantityRd: string
  unit: string
}

const emptyRow = (): RowData => ({
  key: Math.random().toString(36).slice(2),
  project: '',
  material: '',
  quantityPd: '',
  quantitySpec: '',
  quantityRd: '',
  unit: '',
})

export default function Chessboard() {
  const [rows, setRows] = useState<RowData[]>([])
  const [viewData, setViewData] = useState<RowData[]>([])
  const [editing, setEditing] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  const addRow = () => setRows([...rows, emptyRow()])

  const handleChange = (key: string, field: keyof RowData, value: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }

  const handleAdd = () => {
    setEditing(true)
    if (rows.length === 0) addRow()
  }

  const handleSave = async () => {
    if (!supabase) return
    const payload = rows.map(({ key, quantityPd, quantitySpec, quantityRd, ...rest }) => {
      void key
      return {
        ...rest,
        quantityPd: quantityPd ? Number(quantityPd) : null,
        quantitySpec: quantitySpec ? Number(quantitySpec) : null,
        quantityRd: quantityRd ? Number(quantityRd) : null,
      }
    })
    const units = Array.from(new Set(payload.map((r) => r.unit).filter(Boolean))).map((name) => ({ name }))
    const { error: unitError } = await supabase.from('units').upsert(units, { onConflict: 'name' })
    if (unitError) {
      messageApi.error('Не удалось сохранить единицы измерения')
      return
    }
    const { error } = await supabase.from('chessboard').insert(payload)
    if (error) {
      messageApi.error('Не удалось сохранить данные')
      return
    }
    messageApi.success('Данные сохранены')
    setEditing(false)
  }

  const handleShow = async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('chessboard').select('*')
    if (error) {
      messageApi.error('Не удалось загрузить данные')
      return
    }
    setViewData((data as RowData[]) ?? [])
  }

  const columns = [
    {
      title: 'проект',
      dataIndex: 'project',
      render: (_: unknown, record: RowData) => (
        <Input value={record.project} onChange={(e) => handleChange(record.key, 'project', e.target.value)} />
      ),
    },
    {
      title: 'материал',
      dataIndex: 'material',
      render: (_: unknown, record: RowData) => (
        <Input value={record.material} onChange={(e) => handleChange(record.key, 'material', e.target.value)} />
      ),
    },
    {
      title: 'количество материала по проектной документации',
      dataIndex: 'quantityPd',
      render: (_: unknown, record: RowData) => (
        <Input value={record.quantityPd} onChange={(e) => handleChange(record.key, 'quantityPd', e.target.value)} />
      ),
    },
    {
      title: 'количество материала по спецификации',
      dataIndex: 'quantitySpec',
      render: (_: unknown, record: RowData) => (
        <Input value={record.quantitySpec} onChange={(e) => handleChange(record.key, 'quantitySpec', e.target.value)} />
      ),
    },
    {
      title: 'количество материала по рабочей документации',
      dataIndex: 'quantityRd',
      render: (_: unknown, record: RowData) => (
        <Input value={record.quantityRd} onChange={(e) => handleChange(record.key, 'quantityRd', e.target.value)} />
      ),
    },
    {
      title: 'единица измерения',
      dataIndex: 'unit',
      render: (_: unknown, record: RowData) => (
        <Input value={record.unit} onChange={(e) => handleChange(record.key, 'unit', e.target.value)} />
      ),
    },
    {
      title: '',
      dataIndex: 'actions',
      render: (_: unknown, __: RowData, index: number) =>
        index === rows.length - 1 ? (
          <Button type="text" icon={<PlusOutlined />} onClick={addRow} />
        ) : null,
    },
  ]

  const viewColumns = [
    { title: 'проект', dataIndex: 'project' },
    { title: 'материал', dataIndex: 'material' },
    { title: 'количество материала по проектной документации', dataIndex: 'quantityPd' },
    { title: 'количество материала по спецификации', dataIndex: 'quantitySpec' },
    { title: 'количество материала по рабочей документации', dataIndex: 'quantityRd' },
    { title: 'единица измерения', dataIndex: 'unit' },
  ]

  return (
    <div>
      {contextHolder}
      <Space style={{ marginBottom: 16 }}>
        <Button onClick={editing ? handleSave : handleAdd}>{editing ? 'Сохранить' : 'Добавить'}</Button>
        <Button onClick={handleShow}>Показать</Button>
      </Space>
      {editing && (
        <Table<RowData> dataSource={rows} columns={columns} pagination={false} rowKey="key" />
      )}
      {!editing && viewData.length > 0 && (
        <Table<RowData> dataSource={viewData} columns={viewColumns} pagination={false} rowKey="id" />
      )}
    </div>
  )
}
