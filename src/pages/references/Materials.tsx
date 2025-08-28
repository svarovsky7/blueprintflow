import { type Key, useEffect, useMemo, useRef, useState } from 'react'
import {
  App,
  AutoComplete,
  Button,
  DatePicker,
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
  const [priceDetails, setPriceDetails] = useState<{ id?: string; price: number; purchase_date: string }[]>([])

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'finished'>('idle')
  const [importProgress, setImportProgress] = useState<{ processed: number; total: number }>({ processed: 0, total: 0 })
  const [importResult, setImportResult] = useState(0)
  const importAbortRef = useRef(false)

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
      prices?.forEach((p: { material_id: string; price: number }) => {
        const entry = priceMap.get(p.material_id) || { sum: 0, count: 0 }
        entry.sum += Number(p.price) || 0
        entry.count += 1
        priceMap.set(p.material_id, entry)
      })
      return ((mats as Material[]) ?? []).map(m => ({
        ...m,
        average_price: priceMap.has(m.id)
          ? Math.round(priceMap.get(m.id)!.sum / priceMap.get(m.id)!.count)
          : null
      }))
    }
  })

  const filteredData = useMemo(
    () =>
      materials.filter(m => m.name.toLowerCase().startsWith(searchText.toLowerCase())),
    [materials, searchText]
  )

  const formatPrice = (value: number | null) =>
    value !== null && value !== undefined
      ? Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
      : '-'

  const openAddModal = () => {
    form.resetFields()
    setModalMode('add')
    setCurrentMaterial(null)
  }

  const openViewModal = async (record: Material) => {
    setCurrentMaterial(record)
    if (supabase) {
      const { data } = await supabase
        .from('material_prices')
        .select('price, purchase_date')
        .eq('material_id', record.id)
        .order('purchase_date', { ascending: false })
      setPriceDetails(data ?? [])
    }
    setModalMode('view')
  }

  const openEditModal = async (record: Material) => {
    setCurrentMaterial(record)
    if (supabase) {
      const { data } = await supabase
        .from('material_prices')
        .select('id, price, purchase_date')
        .eq('material_id', record.id)
        .order('purchase_date', { ascending: false })
      setPriceDetails(data ?? [])
    }
    setModalMode('edit')
  }

  useEffect(() => {
    if (modalMode === 'edit' && currentMaterial) {
      form.setFieldsValue({
        name: currentMaterial.name,
        prices: priceDetails.map(p => ({
          id: p.id,
          price: p.price,
          purchase_date: dayjs(p.purchase_date)
        }))
      })
    }
  }, [modalMode, currentMaterial, priceDetails, form])

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
      const price: number | undefined = modalMode === 'add' ? values.price : undefined
      const prices: { id?: string; price: number; purchase_date: dayjs.Dayjs }[] = values.prices || []
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

      const currentIds = prices.map(p => p.id).filter((v): v is string => Boolean(v))
      const removedIds = priceDetails
        .filter(p => p.id)
        .map(p => p.id as string)
        .filter(id => !currentIds.includes(id))

      for (const p of prices) {
        if (p.id) {
          await supabase
            .from('material_prices')
            .update({
              price: p.price,
              purchase_date: dayjs(p.purchase_date).format('YYYY-MM-DD')
            })
            .eq('id', p.id)
        } else {
          await supabase.from('material_prices').insert({
            material_id: materialId,
            price: p.price,
            purchase_date: dayjs(p.purchase_date).format('YYYY-MM-DD')
          })
        }
      }

      for (const id of removedIds) {
        await supabase.from('material_prices').delete().eq('id', id)
      }

      if (price !== undefined && price !== null) {
        const today = dayjs().format('YYYY-MM-DD')
        const { data: existingPrice } = await supabase
          .from('material_prices')
          .select('id')
          .eq('material_id', materialId)
          .eq('price', price)
          .eq('purchase_date', today)
          .maybeSingle()
        if (existingPrice) {
          await supabase
            .from('material_prices')
            .update({ price, purchase_date: today })
            .eq('id', existingPrice.id)
        } else {
          await supabase.from('material_prices').insert({
            material_id: materialId,
            price,
            purchase_date: today
          })
        }
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
    importAbortRef.current = false
    setImportStatus('processing')
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: MaterialExcelRow[] = XLSX.utils.sheet_to_json<MaterialExcelRow>(sheet, { defval: null })
    setImportProgress({ processed: 0, total: rows.length })
    const processedNames = new Set<string>()
    let successCount = 0
    for (let i = 0; i < rows.length; i++) {
      if (importAbortRef.current) break
      const row = rows[i]
      const rawName = row['Номенклатура']
      const name = rawName ? rawName.trim() : ''
      const price = row['Цена']
      const date = row['Дата']
      if (!name || processedNames.has(name)) {
        setImportProgress({ processed: i + 1, total: rows.length })
        continue
      }
      processedNames.add(name)
      let materialId: string
      let insertedSomething = false
      const { data: existing } = await supabase
        .from('materials')
        .select('id')
        .eq('name', name)
        .maybeSingle()
      if (existing) {
        materialId = existing.id
      } else {
        const { data: inserted, error } = await supabase
          .from('materials')
          .insert({ name })
          .select()
          .single()
        if (error) {
          setImportProgress({ processed: i + 1, total: rows.length })
          continue
        }
        materialId = inserted!.id
        insertedSomething = true
      }
      if (price !== null && price !== undefined) {
        const purchaseDate = date ? dayjs(date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
        const { data: existingPrice } = await supabase
          .from('material_prices')
          .select('id')
          .eq('material_id', materialId)
          .eq('price', Number(price))
          .eq('purchase_date', purchaseDate)
          .maybeSingle()
        if (existingPrice) {
          await supabase
            .from('material_prices')
            .update({ price: Number(price), purchase_date: purchaseDate })
            .eq('id', existingPrice.id)
          insertedSomething = true
        } else {
          await supabase.from('material_prices').insert({
            material_id: materialId,
            price: Number(price),
            purchase_date: purchaseDate
          })
          insertedSomething = true
        }
      }
      if (insertedSomething) successCount++
      setImportProgress({ processed: i + 1, total: rows.length })
    }
    if (importAbortRef.current) {
      importAbortRef.current = false
      return false
    }
    setImportResult(successCount)
    setImportStatus('finished')
    refetch()
    return false
  }

  const handleImportAbort = () => {
    importAbortRef.current = true
    setImportModalOpen(false)
    setImportStatus('idle')
    setImportProgress({ processed: 0, total: 0 })
    setImportResult(0)
  }

  const columns = [
    {
      title: 'Номенклатура',
      dataIndex: 'name',
      filters: materials.map(m => ({ text: m.name, value: m.name })),
      onFilter: (value: boolean | Key, record: Material) => record.name === value,
      sorter: (a: Material, b: Material) => a.name.localeCompare(b.name)
    },
    {
      title: 'Цена',
      dataIndex: 'average_price',
      sorter: (a: Material, b: Material) => (a.average_price ?? 0) - (b.average_price ?? 0),
      render: (value: number | null) => (value !== null ? formatPrice(value) : '-')
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
        <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>
          Импорт из Excel
        </Button>
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
          setPriceDetails([])
        }}
        onOk={modalMode === 'view' ? undefined : handleSave}
        okText={modalMode === 'view' ? undefined : 'Сохранить'}
        cancelText={modalMode === 'view' ? undefined : 'Отмена'}
        footer={
          modalMode === 'view'
            ? [
                <Button
                  key="close"
                  type="primary"
                  onClick={() => {
                    setModalMode(null)
                    setPriceDetails([])
                  }}
                >
                  Закрыть
                </Button>
              ]
            : undefined
        }
      >
        {modalMode === 'view' ? (
          <div>
            <p>Номенклатура: {currentMaterial?.name}</p>
            <p>Средняя цена: {formatPrice(currentMaterial?.average_price ?? null)}</p>
            {priceDetails.map((p) => (
              <p key={p.purchase_date + p.price}>
                {formatPrice(p.price)} от {dayjs(p.purchase_date).format('DD.MM.YYYY')}
              </p>
            ))}
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
            {modalMode === 'add' && (
              <Form.Item label="Цена" name="price">
                <InputNumber<number>
                  min={0}
                  step={0.01}
                  formatter={(v) => (v !== undefined && v !== null ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '')}
                  parser={(v) => (v ? parseFloat(v.replace(/\s/g, '').replace(',', '.')) : 0)}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            )}
            {modalMode === 'edit' && (
              <Form.List name="prices">
                {(fields, { remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                        <Form.Item {...restField} name={[name, 'id']} hidden>
                          <Input type="hidden" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'price']} label="Цена">
                          <InputNumber<number>
                            min={0}
                            step={0.01}
                            formatter={(v) =>
                              v !== undefined && v !== null
                                ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                                : ''
                            }
                            parser={(v) =>
                              v ? parseFloat(v.replace(/\s/g, '').replace(',', '.')) : 0
                            }
                            style={{ width: 150 }}
                          />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'purchase_date']} label="Дата">
                          <DatePicker format="DD.MM.YYYY" />
                        </Form.Item>
                        <Button
                          icon={<DeleteOutlined />}
                          onClick={() => remove(name)}
                          aria-label="Удалить цену"
                        />
                      </Space>
                    ))}
                  </>
                )}
              </Form.List>
            )}
          </Form>
        )}
      </Modal>
      <Modal
        open={importModalOpen}
        title="Импорт из Excel"
        onCancel={() => {
          if (importStatus === 'processing') return
          setImportModalOpen(false)
          setImportStatus('idle')
          setImportProgress({ processed: 0, total: 0 })
          setImportResult(0)
        }}
        footer={
          importStatus === 'finished'
            ? [
                <Button
                  key="ok"
                  type="primary"
                  onClick={() => {
                    setImportModalOpen(false)
                    setImportStatus('idle')
                    setImportProgress({ processed: 0, total: 0 })
                    setImportResult(0)
                  }}
                >
                  OK
                </Button>
              ]
            : importStatus === 'processing'
              ? [
                  <Button key="stop" onClick={handleImportAbort}>
                    Прервать
                  </Button>
                ]
              : null
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <p>Поля файла: Номенклатура, Цена, Дата</p>
            <Upload
              beforeUpload={handleImport}
              showUploadList={false}
              accept=".xlsx,.xls"
              disabled={importStatus === 'processing'}
            >
              <Button icon={<UploadOutlined />} disabled={importStatus === 'processing'}>
                Выбрать файл
              </Button>
            </Upload>
          </div>
          {importStatus !== 'idle' && (
            <p>
              Импортировано {importProgress.processed} / {importProgress.total}
            </p>
          )}
          {importStatus === 'finished' && (
            <p>Загружено {importResult} строк</p>
          )}
        </Space>
      </Modal>
    </div>
  )
}

