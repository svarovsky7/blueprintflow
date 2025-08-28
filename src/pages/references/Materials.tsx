import { useMemo, useState } from 'react'
import {
  App,
  AutoComplete,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Upload
} from 'antd'
import type { UploadProps } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { EyeOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

interface Material {
  id: string
  name: string
  created_at: string
  updated_at: string
  average_price: number | null
}

interface MaterialExcelRow {
  'Номенклатура': string
  'Цена'?: number
  'Дата'?: string | number | Date
}

export default function Materials() {
  const { message, modal } = App.useApp()
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | null>(null)
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(null)
  const [form] = Form.useForm()
  const [autoOptions, setAutoOptions] = useState<{ value: string }[]>([])
  const [searchText, setSearchText] = useState('')

  const { data: materials = [], isLoading, refetch } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      if (!supabase) return []
      const { data: mats, error } = await supabase.from('materials').select('*').order('name')
      if (error) throw error
      const { data: prices } = await supabase
        .from('material_prices')
        .select('material_id, price')
      const priceMap = new Map<string, { sum: number; count: number }>()
      prices?.forEach(p => {
        const entry = priceMap.get(p.material_id) || { sum: 0, count: 0 }
        entry.sum += p.price ?? 0
        entry.count += 1
        priceMap.set(p.material_id, entry)
      })
      return ((mats as Material[]) ?? []).map(m => ({
        ...m,
        average_price: priceMap.has(m.id) ? priceMap.get(m.id)!.sum / priceMap.get(m.id)!.count : null
      }))
    }
  })

  const filteredData = useMemo(
    () =>
      materials.filter(m => m.name.toLowerCase().startsWith(searchText.toLowerCase())),
    [materials, searchText]
  )

  const nameFilters = useMemo(
    () => Array.from(new Set(materials.map(m => m.name))).map(n => ({ text: n, value: n })),
    [materials]
  )

  const priceFilters = useMemo(
    () =>
      Array.from(new Set(materials.map(m => m.average_price).filter((p): p is number => p !== null))).map(p => ({
        text: p.toString(),
        value: p.toString()
      })),
    [materials]
  )

  const openAddModal = () => {
    form.resetFields()
    setModalMode('add')
    setCurrentMaterial(null)
  }

  const openViewModal = (record: Material) => {
    setCurrentMaterial(record)
    setModalMode('view')
  }

  const openEditModal = (record: Material) => {
    setCurrentMaterial(record)
    form.setFieldsValue({ name: record.name })
    setModalMode('edit')
  }

  const handleNameSearch = async (value: string) => {
    if (!supabase) return
    const { data } = await supabase
      .from('materials')
      .select('name')
      .ilike('name', `${value}%`)
      .limit(20)
    setAutoOptions((data ?? []).map((d: { name: string }) => ({ value: d.name })))
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const name: string = values.name.trim()
      const price: number | undefined = values.price
      if (!supabase) return
      let materialId: string
      const { data: existing } = await supabase
        .from('materials')
        .select('id')
        .eq('name', name)
        .maybeSingle()
      if (existing) {
        materialId = existing.id
        if (modalMode === 'edit' && currentMaterial && currentMaterial.id !== existing.id) {
          message.error('Номенклатура с таким названием уже существует')
          return
        }
      } else if (modalMode === 'add') {
        const { data: inserted, error } = await supabase
          .from('materials')
          .insert({ name })
          .select()
          .single()
        if (error) throw error
        materialId = inserted.id
      } else {
        if (currentMaterial) {
          await supabase.from('materials').update({ name }).eq('id', currentMaterial.id)
          materialId = currentMaterial.id
        } else {
          return
        }
      }

      if (modalMode === 'add' && existing && price !== undefined && price !== null) {
        await supabase.from('material_prices').insert({
          material_id: existing.id,
          price,
          purchase_date: dayjs().format('YYYY-MM-DD')
        })
      } else if (price !== undefined && price !== null) {
        await supabase.from('material_prices').insert({
          material_id: materialId,
          price,
          purchase_date: dayjs().format('YYYY-MM-DD')
        })
      }

      message.success('Сохранено')
      setModalMode(null)
      setCurrentMaterial(null)
      form.resetFields()
      await refetch()
    } catch {
      message.error('Не удалось сохранить')
    }
  }

  const handleDelete = async (record: Material) => {
    if (!supabase) return
    const { error } = await supabase.from('materials').delete().eq('id', record.id)
    if (error) {
      message.error('Не удалось удалить')
    } else {
      message.success('Запись удалена')
      refetch()
    }
  }

  const handleImport: UploadProps['beforeUpload'] = async (file) => {
    if (!supabase) return false
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: MaterialExcelRow[] = XLSX.utils.sheet_to_json<MaterialExcelRow>(sheet, { defval: null })
    for (const row of rows) {
      const name = row['Номенклатура']
      const price = row['Цена']
      const date = row['Дата']
      if (!name) continue
      let materialId: string
      const { data: existing } = await supabase.from('materials').select('id').eq('name', name).maybeSingle()
      if (existing) {
        materialId = existing.id
      } else {
        const { data: inserted } = await supabase
          .from('materials')
          .insert({ name })
          .select()
          .single()
        materialId = inserted!.id
      }
      if (price !== null && price !== undefined) {
        const purchaseDate = date ? dayjs(date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
        await supabase.from('material_prices').insert({
          material_id: materialId,
          price: Number(price),
          purchase_date: purchaseDate
        })
      }
    }
    message.success('Импорт завершён')
    refetch()
    return false
  }

  const columns = [
    {
      title: 'Номенклатура',
      dataIndex: 'name',
      sorter: (a: Material, b: Material) => a.name.localeCompare(b.name),
      filters: nameFilters,
      onFilter: (value: unknown, record: Material) => record.name === value
    },
    {
      title: 'Цена',
      dataIndex: 'average_price',
      sorter: (a: Material, b: Material) => (a.average_price ?? 0) - (b.average_price ?? 0),
      filters: priceFilters,
      onFilter: (value: unknown, record: Material) => record.average_price?.toString() === value
    },
    {
      title: 'Действия',
      dataIndex: 'actions',
      render: (_: unknown, record: Material) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => openViewModal(record)} aria-label="Просмотр" />
          <Button icon={<EditOutlined />} onClick={() => openEditModal(record)} aria-label="Редактировать" />
          <Button
            danger
            icon={<DeleteOutlined />}
            aria-label="Удалить"
            onClick={() =>
              modal.confirm({
                title: 'Удалить запись?',
                okText: 'Да',
                cancelText: 'Нет',
                onOk: () => handleDelete(record)
              })
            }
          />
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 16 }}>
        <Input
          placeholder="Поиск"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 200 }}
        />
        <Upload beforeUpload={handleImport} showUploadList={false} accept=".xlsx,.xls">
          <Button icon={<UploadOutlined />}>Импорт из Excel</Button>
        </Upload>
        <Button type="primary" onClick={openAddModal}>
          Добавить
        </Button>
      </div>
      <Table<Material>
        dataSource={filteredData}
        columns={columns}
        rowKey="id"
        loading={isLoading}
      />
      <Modal
        open={modalMode !== null}
        title={
          modalMode === 'add'
            ? 'Добавить материал'
            : modalMode === 'edit'
              ? 'Редактировать материал'
              : 'Просмотр материала'
        }
        onCancel={() => {
          setModalMode(null)
          setCurrentMaterial(null)
        }}
        onOk={modalMode === 'view' ? () => setModalMode(null) : handleSave}
        okText={modalMode === 'view' ? 'Закрыть' : 'Сохранить'}
        cancelText="Отмена"
      >
        {modalMode === 'view' ? (
          <div>
            <p>Номенклатура: {currentMaterial?.name}</p>
            <p>Средняя цена: {currentMaterial?.average_price ?? '-'}</p>
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              label="Номенклатура"
              name="name"
              rules={[{ required: true, message: 'Введите номенклатуру' }]}
            >
              {modalMode === 'add' ? (
                <AutoComplete
                  options={autoOptions}
                  onSearch={handleNameSearch}
                  filterOption={false}
                  listHeight={192}
                  style={{ width: '100%' }}
                >
                  <Input />
                </AutoComplete>
              ) : (
                <Input />
              )}
            </Form.Item>
            <Form.Item label="Цена" name="price">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

