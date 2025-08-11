import { useState } from 'react'
import { App, Button, Input, Space, Table } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { supabase } from '../../lib/supabase'

interface RowData {
  key: string
  id?: string
  name: string
  description: string
}

const emptyRow = (): RowData => ({
  key: Math.random().toString(36).slice(2),
  name: '',
  description: '',
})

export default function Projects() {
  const [mode, setMode] = useState<'add' | 'show' | 'edit' | null>(null)
  const [rows, setRows] = useState<RowData[]>([])
  const [viewRows, setViewRows] = useState<RowData[]>([])
  const { message } = App.useApp()

  const addRow = () => setRows([...rows, emptyRow()])

  const handleChange = (
    key: string,
    field: keyof Pick<RowData, 'name' | 'description'>,
    value: string
  ) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }

  const handleAddClick = () => {
    setMode('add')
    setRows([emptyRow()])
  }

  const handleShow = async () => {
    setMode('show')
    if (!supabase) {
      setViewRows([])
      return
    }
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, description')
      .limit(100)
    if (error) {
      console.error('Error fetching projects:', error)
      message.error('Не удалось загрузить данные')
      setViewRows([])
      return
    }
    setViewRows(
      (data as { id: string; name: string; description: string | null }[] | null)?.map(
        (p) => ({
          key: p.id,
          name: p.name,
          description: p.description ?? '',
        })
      ) ?? []
    )
  }

  const handleEdit = async () => {
    setMode('edit')
    if (!supabase) {
      setRows([])
      return
    }
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, description')
      .limit(100)
    if (error) {
      console.error('Error fetching projects for edit:', error)
      message.error('Не удалось загрузить данные')
      setRows([])
      return
    }
    setRows(
      (data as { id: string; name: string; description: string | null }[] | null)?.map(
        (p) => ({
          key: p.id,
          id: p.id,
          name: p.name,
          description: p.description ?? '',
        })
      ) ?? []
    )
  }

  const handleSave = async () => {
    if (!supabase) {
      console.error('Supabase client is not configured')
      return
    }
    const payload = rows.map(({ id, name, description }) => ({ id, name, description }))
    const { error } = await supabase.from('projects').upsert(payload)
    if (error) {
      console.error('Error inserting projects:', error)
      message.error(`Не удалось сохранить данные: ${error.message}`)
    } else {
      message.success('Данные успешно сохранены')
    }
  }

  const columns = [
    {
      title: 'название',
      dataIndex: 'name',
      render: (_: unknown, record: RowData) => (
        <Input
          value={record.name}
          onChange={(e) => handleChange(record.key, 'name', e.target.value)}
        />
      ),
    },
    {
      title: 'описание',
      dataIndex: 'description',
      render: (_: unknown, record: RowData) => (
        <Input
          value={record.description}
          onChange={(e) => handleChange(record.key, 'description', e.target.value)}
        />
      ),
    },
    {
      title: '',
      dataIndex: 'actions',
      render: (_: unknown, __: RowData, index: number) =>
        mode === 'add' && index === rows.length - 1 ? (
          <Button type="text" icon={<PlusOutlined />} onClick={addRow} />
        ) : null,
    },
  ]

  const viewColumns = [
    { title: 'название', dataIndex: 'name' },
    { title: 'описание', dataIndex: 'description' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Space>
          <Button onClick={handleAddClick}>Добавить</Button>
          <Button onClick={handleShow}>Показать</Button>
          <Button onClick={handleEdit}>Редактировать</Button>
        </Space>
      </div>
      {mode === 'add' && (
        <>
          <Space style={{ marginBottom: 16 }}>
            <Button onClick={handleSave}>Сохранить</Button>
          </Space>
          <Table<RowData> dataSource={rows} columns={columns} pagination={false} rowKey="key" />
        </>
      )}
      {mode === 'show' && (
        <Table<RowData> dataSource={viewRows} columns={viewColumns} pagination={false} rowKey="key" />
      )}
      {mode === 'edit' && (
        <>
          <Space style={{ marginBottom: 16 }}>
            <Button onClick={handleSave}>Сохранить</Button>
          </Space>
          <Table<RowData> dataSource={rows} columns={columns} pagination={false} rowKey="key" />
        </>
      )}
    </div>
  )
}
