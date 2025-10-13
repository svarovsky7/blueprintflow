import { type Key, useEffect, useRef, useState } from 'react'
import {
  App,
  AutoComplete,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Upload,
} from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

// supplier_names - название номенклатуры у поставщиков
interface Material {
  id: string // id из supplier_names
  nomenclature_id: string // id внутренней номенклатуры
  nomenclature_name: string // название внутренней номенклатуры
  name: string // название у поставщика (supplier_names.name)
  unit_name?: string
  unit_id?: string
  material_group?: string
  average_price: number | null
}

interface PriceDetail {
  id?: string
  price: number
  delivery_price?: number
  document_number?: string
  purchase_date: string
}

interface MaterialExcelRow {
  Номенклатура: string
  'Наименование поставщика'?: string
  'Ед.изм.'?: string
  'Группа материалов'?: string
  'Номер документа'?: string
  Цена?: number
  'Цена доставки'?: number
  Дата?: string | number | Date
}

interface SupplierFormValue {
  id?: string
  name: string
}

interface UnitOption {
  value: string
  label: string
}

interface ImportStats {
  inserted_nomenclature: number
  inserted_supplier_names: number
  updated_supplier_names: number
  inserted_mappings: number
  inserted_prices: number
  updated_prices: number
  total_prices: number
}

export default function Nomenclature() {
  const { message, modal } = App.useApp()
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | null>(null)
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(null)
  const [form] = Form.useForm()
  const [autoOptions, setAutoOptions] = useState<{ value: string }[]>([])
  const [supplierOptions, setSupplierOptions] = useState<{ value: string }[]>([])
  const [searchText, setSearchText] = useState('')
  const [supplierSearchText, setSupplierSearchText] = useState('')
  const [priceDetails, setPriceDetails] = useState<PriceDetail[]>([])
  const [supplierDetails, setSupplierDetails] = useState<{ id: string; name: string }[]>([])
  const [unitOptions, setUnitOptions] = useState<UnitOption[]>([])

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'finished'>('idle')
  const [importProgress, setImportProgress] = useState<{ processed: number; total: number }>({
    processed: 0,
    total: 0,
  })
  const [importResult, setImportResult] = useState<ImportStats | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const importAbortRef = useRef(false)

  const {
    data: materials = [],
    isLoading,
    refetch,
  } = useQuery<Material[]>({
    queryKey: ['nomenclature', searchText, supplierSearchText],
    queryFn: async () => {
      if (!supabase) return []

      let supplierIds: string[] = []

      // Если есть поиск по номенклатуре, сначала ищем в nomenclature
      if (searchText) {
        const { data: nomenclatures, error: nomenclatureError } = await supabase
          .from('nomenclature')
          .select('id')
          .ilike('name', `%${searchText}%`)

        if (nomenclatureError) throw nomenclatureError

        const nomenclatureIds = (nomenclatures ?? []).map((n) => n.id)

        if (nomenclatureIds.length > 0) {
          // Находим связанные supplier_names через mapping
          const { data: mappings, error: mappingError } = await supabase
            .from('nomenclature_supplier_mapping')
            .select('supplier_id')
            .in('nomenclature_id', nomenclatureIds)

          if (mappingError) throw mappingError

          supplierIds = (mappings ?? []).map((m) => m.supplier_id)
        }

        if (supplierIds.length === 0) {
          return []
        }
      }

      // Загружаем supplier_names
      let query = supabase
        .from('supplier_names')
        .select(
          `
          id,
          name,
          unit_id,
          material_group,
          units(name)
        `,
        )
        .order('name')

      // Если есть поиск по номенклатуре, фильтруем по найденным supplier_ids
      if (searchText && supplierIds.length > 0) {
        query = query.in('id', supplierIds)
      }

      // Если есть поиск по поставщику, добавляем фильтр
      if (supplierSearchText) {
        query = query.ilike('name', `%${supplierSearchText}%`)
      }

      const { data: suppliers, error } = await query
      if (error) throw error

      const finalSupplierIds = (suppliers ?? []).map((s) => s.id)

      // Загрузка nomenclature через nomenclature_supplier_mapping
      const nomenclatureMap = new Map<string, { id: string; name: string }>()
      const mappingChunkSize = 100
      for (let i = 0; i < finalSupplierIds.length; i += mappingChunkSize) {
        const chunk = finalSupplierIds.slice(i, i + mappingChunkSize)
        const { data: mappingsChunk, error: mappingError } = await supabase
          .from('nomenclature_supplier_mapping')
          .select('supplier_id, nomenclature(id, name)')
          .in('supplier_id', chunk)
        if (mappingError) throw mappingError

        const mappingsData = (mappingsChunk ?? []) as unknown as {
          supplier_id: string
          nomenclature: { id: string; name: string } | null
        }[]
        mappingsData.forEach((m) => {
          if (m.nomenclature) {
            nomenclatureMap.set(m.supplier_id, m.nomenclature)
          }
        })
      }

      // Загрузка цен (material_prices.supplier_names_id)
      interface PriceRow {
        supplier_names_id: string
        price: number
      }
      const priceMap = new Map<string, { sum: number; count: number }>()
      const chunkSize = 100
      for (let i = 0; i < finalSupplierIds.length; i += chunkSize) {
        const chunk = finalSupplierIds.slice(i, i + chunkSize)
        const { data: pricesChunk, error: priceError } = await supabase
          .from('material_prices')
          .select('supplier_names_id, price')
          .in('supplier_names_id', chunk)
        if (priceError) throw priceError

        pricesChunk?.forEach((p: PriceRow) => {
          const priceVal = Number(p.price)
          if (!Number.isNaN(priceVal)) {
            const entry = priceMap.get(p.supplier_names_id) || { sum: 0, count: 0 }
            entry.sum += priceVal
            entry.count += 1
            priceMap.set(p.supplier_names_id, entry)
          }
        })
      }

      // Преобразование в Material[]
      const materials = (suppliers ?? []).map((s) => {
        const nomenclature = nomenclatureMap.get(s.id)
        const unitsData = s.units as { name: string } | null

        return {
          id: s.id,
          nomenclature_id: nomenclature?.id || '',
          nomenclature_name: nomenclature?.name || '',
          name: s.name,
          unit_id: s.unit_id || undefined,
          unit_name: unitsData?.name || undefined,
          material_group: s.material_group || undefined,
          average_price: priceMap.has(s.id)
            ? Math.round(priceMap.get(s.id)!.sum / priceMap.get(s.id)!.count)
            : null,
        } as Material
      })

      return materials
    },
  })

  const formatPrice = (value: number | null) =>
    value !== null && value !== undefined
      ? Math.round(value)
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
      : '-'

  const openAddModal = () => {
    form.resetFields()
    setSupplierDetails([])
    setModalMode('add')
    setCurrentMaterial(null)
  }

  const openViewModal = async (record: Material) => {
    setCurrentMaterial(record)
    if (supabase) {
      // material_prices.supplier_names_id - цены относятся к названию поставщика
      const { data } = await supabase
        .from('material_prices')
        .select('price, delivery_price, document_number, purchase_date')
        .eq('supplier_names_id', record.id)
        .order('purchase_date', { ascending: false })
      setPriceDetails(data ?? [])
    }
    setModalMode('view')
  }

  const openEditModal = async (record: Material) => {
    setCurrentMaterial(record)
    if (supabase) {
      // material_prices.supplier_names_id - цены относятся к названию поставщика
      const { data: pricesData } = await supabase
        .from('material_prices')
        .select('id, price, delivery_price, document_number, purchase_date')
        .eq('supplier_names_id', record.id)
        .order('purchase_date', { ascending: false })

      setPriceDetails(pricesData ?? [])
    }
    setModalMode('edit')
  }

  useEffect(() => {
    const loadUnits = async () => {
      if (!supabase) return
      const { data } = await supabase.from('units').select('id, name').order('name')
      setUnitOptions(
        (data ?? []).map((u: { id: string; name: string }) => ({
          value: u.id,
          label: u.name,
        })),
      )
    }
    loadUnits()
  }, [])

  useEffect(() => {
    if (modalMode === 'edit' && currentMaterial) {
      form.setFieldsValue({
        name: currentMaterial.name,
        nomenclature_name: currentMaterial.nomenclature_name,
        unit_id: currentMaterial.unit_id,
        material_group: currentMaterial.material_group,
        prices: priceDetails.map((p) => ({
          id: p.id,
          price: p.price,
          delivery_price: p.delivery_price,
          document_number: p.document_number,
          purchase_date: dayjs(p.purchase_date),
        })),
      })
    }
  }, [modalMode, currentMaterial, priceDetails, form])

  const handleNameSearch = async (value: string) => {
    if (!supabase) return
    const { data } = await supabase
      .from('nomenclature')
      .select('name')
      .ilike('name', `%${value}%`)
      .limit(20)
    setAutoOptions((data ?? []).map((d: { name: string }) => ({ value: d.name })))
  }

  const handleSupplierSearch = async (value: string) => {
    if (!supabase) return
    const { data } = await supabase
      .from('supplier_names')
      .select('name')
      .ilike('name', `%${value}%`)
      .limit(20)
    setSupplierOptions((data ?? []).map((d: { name: string }) => ({ value: d.name })))
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (!supabase) return

      // supplier_names - название номенклатуры у поставщиков
      const supplierName: string = values.name?.trim() || ''
      const nomenclatureName: string = values.nomenclature_name?.trim() || ''
      const unitId: string | undefined = values.unit_id
      const materialGroup: string | undefined = values.material_group?.trim()
      const price: number | undefined = modalMode === 'add' ? values.price : undefined
      const deliveryPrice: number | undefined = modalMode === 'add' ? values.delivery_price : undefined
      const documentNumber: string | undefined = modalMode === 'add' ? values.document_number?.trim() : undefined

      const prices: {
        id?: string
        price: number
        delivery_price?: number
        document_number?: string
        purchase_date: dayjs.Dayjs
      }[] = values.prices || []

      if (!supplierName) {
        message.error('Укажите наименование поставщика')
        return
      }

      // 1. Работа с nomenclature (внутренняя номенклатура)
      let nomenclatureId: string | undefined
      if (nomenclatureName) {
        const { data: existingNomenclature } = await supabase
          .from('nomenclature')
          .select('id')
          .eq('name', nomenclatureName)
          .maybeSingle()

        if (existingNomenclature) {
          nomenclatureId = existingNomenclature.id
        } else {
          const { data: insertedNomenclature, error } = await supabase
            .from('nomenclature')
            .insert({ name: nomenclatureName })
            .select()
            .single()
          if (error) throw error
          nomenclatureId = insertedNomenclature.id
        }
      }

      // 2. Работа с supplier_names (название номенклатуры у поставщиков)
      let supplierId: string
      if (modalMode === 'edit' && currentMaterial) {
        // Обновление существующего supplier_names
        const { error } = await supabase
          .from('supplier_names')
          .update({
            name: supplierName,
            unit_id: unitId || null,
            material_group: materialGroup || null,
          })
          .eq('id', currentMaterial.id)
        if (error) throw error
        supplierId = currentMaterial.id
      } else {
        // Добавление нового supplier_names
        const { data: existingSupplier } = await supabase
          .from('supplier_names')
          .select('id')
          .eq('name', supplierName)
          .maybeSingle()

        if (existingSupplier) {
          // Обновляем существующего поставщика
          const { error } = await supabase
            .from('supplier_names')
            .update({
              unit_id: unitId || null,
              material_group: materialGroup || null,
            })
            .eq('id', existingSupplier.id)
          if (error) throw error
          supplierId = existingSupplier.id
        } else {
          // Создаём нового поставщика
          const { data: insertedSupplier, error: supplierError } = await supabase
            .from('supplier_names')
            .insert({
              name: supplierName,
              unit_id: unitId || null,
              material_group: materialGroup || null,
            })
            .select()
            .single()
          if (supplierError) throw supplierError
          supplierId = insertedSupplier.id
        }
      }

      // 3. Создание связи nomenclature ↔ supplier_names
      if (nomenclatureId) {
        await supabase
          .from('nomenclature_supplier_mapping')
          .insert({ nomenclature_id: nomenclatureId, supplier_id: supplierId })
          .select()
          .maybeSingle()
      }

      // 4. Работа с ценами (material_prices.supplier_names_id)
      const currentIds = prices.map((p) => p.id).filter((v): v is string => Boolean(v))
      const removedIds = priceDetails
        .filter((p) => p.id)
        .map((p) => p.id as string)
        .filter((id) => !currentIds.includes(id))

      // Обновление и добавление цен
      for (const p of prices) {
        const priceData = {
          price: p.price,
          delivery_price: p.delivery_price || null,
          document_number: p.document_number?.trim() || null,
          purchase_date: dayjs(p.purchase_date).format('YYYY-MM-DD'),
        }

        if (p.id) {
          await supabase.from('material_prices').update(priceData).eq('id', p.id)
        } else {
          await supabase
            .from('material_prices')
            .insert({
              supplier_names_id: supplierId,
              ...priceData,
            })
        }
      }

      // Удаление удалённых цен
      for (const id of removedIds) {
        await supabase.from('material_prices').delete().eq('id', id)
      }

      // Добавление цены из режима добавления
      if (modalMode === 'add' && price !== undefined && price !== null) {
        const today = dayjs().format('YYYY-MM-DD')
        await supabase.from('material_prices').insert({
          supplier_names_id: supplierId,
          price,
          delivery_price: deliveryPrice || null,
          document_number: documentNumber || null,
          purchase_date: today,
        })
      }

      message.success('Сохранено')
      setModalMode(null)
      setCurrentMaterial(null)
      form.resetFields()
      await refetch()
    } catch (err) {
      console.error('Save error:', err)
      message.error('Не удалось сохранить')
    }
  }

  const handleDelete = async (record: Material) => {
    if (!supabase) return
    // Удаляем supplier_names (название номенклатуры поставщика)
    const { error } = await supabase.from('supplier_names').delete().eq('id', record.id)
    if (error) {
      message.error('Не удалось удалить')
    } else {
      message.success('Запись удалена')
      refetch()
    }
  }

  const handleFileSelect: UploadProps['beforeUpload'] = (file) => {
    setImportFile(file)
    return false
  }

  const handleStartImport = async () => {
    if (!importFile || !supabase) return

    importAbortRef.current = false
    setImportStatus('processing')
    const data = await importFile.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: MaterialExcelRow[] = XLSX.utils.sheet_to_json<MaterialExcelRow>(sheet, {
      defval: null,
    })
    setImportProgress({ processed: 0, total: rows.length })
    const chunkSize = 200 // Уменьшен для избежания timeout при большом объёме данных

    // Подсчитываем статистику из данных Excel
    const uniqueNomenclature = new Set<string>()
    const uniqueSuppliers = new Set<string>()
    let pricesCount = 0

    rows.forEach((row) => {
      const nomenclatureName = row['Номенклатура']?.trim()
      const supplierName = row['Наименование поставщика']?.trim()
      const priceVal = row['Цена']

      if (nomenclatureName) {
        uniqueNomenclature.add(nomenclatureName)
      }
      if (supplierName) {
        uniqueSuppliers.add(supplierName)
      }
      if (
        priceVal !== undefined &&
        priceVal !== null &&
        !Number.isNaN(Number(priceVal)) &&
        supplierName
      ) {
        pricesCount++
      }
    })

    // Получаем существующие nomenclature и supplier_names для определения новых/обновлённых
    const { data: existingNomenclature } = await supabase
      .from('nomenclature')
      .select('name')
      .in('name', Array.from(uniqueNomenclature))

    const { data: existingSuppliers } = await supabase
      .from('supplier_names')
      .select('name')
      .in('name', Array.from(uniqueSuppliers))

    const existingNomenclatureNames = new Set(
      (existingNomenclature || []).map((n: { name: string }) => n.name),
    )
    const existingSupplierNames = new Set(
      (existingSuppliers || []).map((s: { name: string }) => s.name),
    )

    const newNomenclatureCount = Array.from(uniqueNomenclature).filter(
      (name) => !existingNomenclatureNames.has(name),
    ).length
    const newSupplierCount = Array.from(uniqueSuppliers).filter(
      (name) => !existingSupplierNames.has(name),
    ).length
    const updateSupplierCount = Array.from(uniqueSuppliers).filter((name) =>
      existingSupplierNames.has(name),
    ).length

    const totalStats: ImportStats = {
      inserted_nomenclature: newNomenclatureCount,
      inserted_supplier_names: newSupplierCount,
      updated_supplier_names: updateSupplierCount,
      inserted_mappings: uniqueNomenclature.size,
      inserted_prices: 0,
      updated_prices: 0,
      total_prices: pricesCount,
    }

    for (let i = 0; i < rows.length; i += chunkSize) {
      if (importAbortRef.current) break
      const chunk = rows
        .slice(i, i + chunkSize)
        .map((row) => {
          const priceVal = row['Цена']
          const price =
            priceVal !== undefined && priceVal !== null && !Number.isNaN(Number(priceVal))
              ? Number(priceVal)
              : null

          const deliveryPriceVal = row['Цена доставки']
          const deliveryPrice =
            deliveryPriceVal !== undefined &&
            deliveryPriceVal !== null &&
            !Number.isNaN(Number(deliveryPriceVal))
              ? Number(deliveryPriceVal)
              : null

          const dateVal = row['Дата']
          const parsedDate = dateVal ? dayjs(dateVal) : null
          const date = parsedDate && parsedDate.isValid() ? parsedDate.format('YYYY-MM-DD') : null

          return {
            name: row['Номенклатура']?.trim(),
            supplier: row['Наименование поставщика']?.trim(),
            unit_name: row['Ед.изм.']?.trim(),
            material_group: row['Группа материалов']?.trim(),
            document_number: row['Номер документа']?.trim(),
            price,
            delivery_price: deliveryPrice,
            date,
          }
        })
        .filter((r) => r.name)
      if (chunk.length === 0) {
        setImportProgress({ processed: Math.min(i + chunkSize, rows.length), total: rows.length })
        continue
      }
      const { error } = await supabase.rpc('import_nomenclature', { rows: chunk })
      if (error) {
        console.error(error)
        message.error('Ошибка импорта данных')
      }
      setImportProgress({ processed: Math.min(i + chunkSize, rows.length), total: rows.length })

      // Небольшая задержка между чанками для стабильности
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    if (importAbortRef.current) {
      importAbortRef.current = false
      return
    }
    setImportResult(totalStats)
    setImportStatus('finished')
    refetch()
  }

  const handleImportAbort = () => {
    importAbortRef.current = true
    setImportModalOpen(false)
    setImportStatus('idle')
    setImportProgress({ processed: 0, total: 0 })
    setImportResult(null)
    setImportFile(null)
  }

  const handleImportCancel = () => {
    setImportModalOpen(false)
    setImportStatus('idle')
    setImportProgress({ processed: 0, total: 0 })
    setImportResult(null)
    setImportFile(null)
  }

  // Фильтры для столбцов
  const nomenclatureFilters = Array.from(new Set(materials.map((m) => m.nomenclature_name)))
    .filter(Boolean)
    .map((name) => ({ text: name, value: name }))

  const supplierFilters = Array.from(new Set(materials.map((m) => m.name)))
    .filter(Boolean)
    .map((name) => ({ text: name, value: name }))

  const unitFilters = Array.from(new Set(materials.map((m) => m.unit_name)))
    .filter(Boolean)
    .map((name) => ({ text: name, value: name }))

  const materialGroupFilters = Array.from(new Set(materials.map((m) => m.material_group)))
    .filter(Boolean)
    .map((name) => ({ text: name, value: name }))

  const columns = [
    {
      title: 'Номенклатура',
      dataIndex: 'nomenclature_name',
      filters: nomenclatureFilters,
      onFilter: (value: boolean | Key, record: Material) => record.nomenclature_name === value,
      sorter: (a: Material, b: Material) => a.nomenclature_name.localeCompare(b.nomenclature_name),
    },
    {
      title: 'Наименование поставщика',
      dataIndex: 'name',
      filters: supplierFilters,
      onFilter: (value: boolean | Key, record: Material) => record.name === value,
      sorter: (a: Material, b: Material) => a.name.localeCompare(b.name),
    },
    {
      title: 'Ед.изм.',
      dataIndex: 'unit_name',
      filters: unitFilters,
      onFilter: (value: boolean | Key, record: Material) => record.unit_name === value,
      sorter: (a: Material, b: Material) =>
        (a.unit_name || '').localeCompare(b.unit_name || ''),
      render: (value: string | undefined) => value || '-',
    },
    {
      title: 'Группа материалов',
      dataIndex: 'material_group',
      filters: materialGroupFilters,
      onFilter: (value: boolean | Key, record: Material) => record.material_group === value,
      sorter: (a: Material, b: Material) =>
        (a.material_group || '').localeCompare(b.material_group || ''),
      render: (value: string | undefined) => value || '-',
    },
    {
      title: 'Цена',
      dataIndex: 'average_price',
      sorter: (a: Material, b: Material) => (a.average_price ?? 0) - (b.average_price ?? 0),
      render: (value: number | null) => (value !== null ? formatPrice(value) : '-'),
    },
    {
      title: 'Действия',
      dataIndex: 'actions',
      render: (_: unknown, record: Material) => (
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
          <Button
            danger
            icon={<DeleteOutlined />}
            aria-label="Удалить"
            onClick={() =>
              modal.confirm({
                title: 'Удалить запись?',
                okText: 'Да',
                cancelText: 'Нет',
                onOk: () => handleDelete(record),
              })
            }
          />
        </Space>
      ),
    },
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
        <Input
          placeholder="Поиск по поставщику"
          value={supplierSearchText}
          onChange={(e) => setSupplierSearchText(e.target.value)}
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
        dataSource={materials}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        sticky
        scroll={{
          y: 'calc(100vh - 350px)',
        }}
        pagination={{
          pageSize: 100,
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
        }}
      />
      <Modal
        open={modalMode !== null}
        title={
          modalMode === 'add'
            ? 'Добавить номенклатуру'
            : modalMode === 'edit'
              ? 'Редактировать номенклатуру'
              : 'Просмотр номенклатуры'
        }
        onCancel={() => {
          setModalMode(null)
          setCurrentMaterial(null)
          setPriceDetails([])
          setSupplierDetails([])
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
                    setSupplierDetails([])
                  }}
                >
                  Закрыть
                </Button>,
              ]
            : undefined
        }
      >
        {modalMode === 'view' ? (
          <div>
            <p>
              <strong>Внутренняя номенклатура:</strong> {currentMaterial?.nomenclature_name || '-'}
            </p>
            <p>
              <strong>Наименование поставщика:</strong> {currentMaterial?.name}
            </p>
            <p>
              <strong>Ед.изм.:</strong> {currentMaterial?.unit_name || '-'}
            </p>
            <p>
              <strong>Группа материалов:</strong> {currentMaterial?.material_group || '-'}
            </p>
            <p>
              <strong>Средняя цена:</strong> {formatPrice(currentMaterial?.average_price ?? null)}
            </p>
            <div style={{ marginTop: 16 }}>
              <strong>Список всех закупок:</strong>
              {priceDetails.length > 0 ? (
                priceDetails.map((p, index) => (
                  <p key={`${p.purchase_date}-${p.price}-${index}`} style={{ marginLeft: 16 }}>
                    Цена: {formatPrice(p.price)} руб.
                    {p.delivery_price !== null &&
                      p.delivery_price !== undefined &&
                      `, Цена доставки: ${formatPrice(p.delivery_price)} руб.`}
                    {p.document_number && `, № Документа: ${p.document_number}`}, Дата:{' '}
                    {dayjs(p.purchase_date).format('DD.MM.YYYY')}
                  </p>
                ))
              ) : (
                <p style={{ marginLeft: 16, color: '#999' }}>Нет данных о закупках</p>
              )}
            </div>
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item label="Внутренняя номенклатура" name="nomenclature_name">
              <AutoComplete
                options={autoOptions}
                onSearch={handleNameSearch}
                filterOption={false}
                listHeight={192}
                placeholder="Начните вводить для поиска"
              />
            </Form.Item>
            <Form.Item
              label="Наименование поставщика"
              name="name"
              rules={[{ required: true, message: 'Введите наименование поставщика' }]}
            >
              <AutoComplete
                options={supplierOptions}
                onSearch={handleSupplierSearch}
                filterOption={false}
                listHeight={192}
                placeholder="Начните вводить для поиска"
              />
            </Form.Item>
            <Form.Item label="Ед.изм." name="unit_id">
              <Select
                options={unitOptions}
                allowClear
                showSearch
                placeholder="Выберите единицу измерения"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
            <Form.Item label="Группа материалов" name="material_group">
              <Input placeholder="Введите группу материалов" />
            </Form.Item>
            {modalMode === 'add' && (
              <>
                <Form.Item label="Цена" name="price">
                  <InputNumber<number>
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    formatter={(v) =>
                      v !== undefined && v !== null
                        ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                        : ''
                    }
                    parser={(v) => (v ? parseFloat(v.replace(/\s/g, '').replace(',', '.')) : 0)}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                <Form.Item label="Цена доставки" name="delivery_price">
                  <InputNumber<number>
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    formatter={(v) =>
                      v !== undefined && v !== null
                        ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                        : ''
                    }
                    parser={(v) => (v ? parseFloat(v.replace(/\s/g, '').replace(',', '.')) : 0)}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                <Form.Item label="Номер документа" name="document_number">
                  <Input placeholder="Введите номер документа" />
                </Form.Item>
              </>
            )}
            {modalMode === 'edit' && (
              <Form.List name="prices">
                {(fields, { remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space
                        key={key}
                        align="baseline"
                        style={{ display: 'flex', marginBottom: 8, flexWrap: 'wrap' }}
                      >
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
                            style={{ width: 120 }}
                          />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'delivery_price']}
                          label="Цена доставки"
                        >
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
                            style={{ width: 120 }}
                          />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'document_number']}
                          label="№ документа"
                        >
                          <Input style={{ width: 150 }} />
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
          handleImportCancel()
        }}
        footer={
          importStatus === 'finished'
            ? [
                <Button key="ok" type="primary" onClick={handleImportCancel}>
                  OK
                </Button>,
              ]
            : importStatus === 'processing'
              ? [
                  <Button key="stop" onClick={handleImportAbort}>
                    Прервать
                  </Button>,
                ]
              : [
                  <Button key="cancel" onClick={handleImportCancel}>
                    Отмена
                  </Button>,
                  <Button
                    key="import"
                    type="primary"
                    onClick={handleStartImport}
                    disabled={!importFile}
                  >
                    Импортировать
                  </Button>,
                ]
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <p>
              Поля файла: Номенклатура, Наименование поставщика, Ед.изм., Группа материалов,
              Номер документа, Цена, Цена доставки, Дата
            </p>
            <Upload
              beforeUpload={handleFileSelect}
              showUploadList={true}
              accept=".xlsx,.xls"
              disabled={importStatus === 'processing'}
              maxCount={1}
              fileList={importFile ? [importFile as unknown as UploadFile] : []}
              onRemove={() => setImportFile(null)}
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
          {importStatus === 'finished' && importResult && (
            <div style={{ marginTop: 16 }}>
              <p>
                <strong>Результаты импорта:</strong>
              </p>
              <ul style={{ marginLeft: 20, marginTop: 8 }}>
                <li>Добавлено номенклатур: {importResult.inserted_nomenclature}</li>
                <li>
                  Добавлено наименований поставщиков: {importResult.inserted_supplier_names}
                </li>
                <li>
                  Обновлено наименований поставщиков: {importResult.updated_supplier_names}
                </li>
                <li>Создано связей номенклатура ↔ поставщик: {importResult.inserted_mappings}</li>
                <li>Добавлено цен: {importResult.inserted_prices}</li>
                <li>Обновлено цен: {importResult.updated_prices}</li>
                <li>
                  <strong>Всего обработано цен: {importResult.total_prices}</strong>
                </li>
              </ul>
            </div>
          )}
        </Space>
      </Modal>
    </div>
  )
}
