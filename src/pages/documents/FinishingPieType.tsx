import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  Typography,
  Button,
  Space,
  Table,
  message,
  Input,
  InputNumber,
  Select,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  getFinishingPieTypeById,
  createFinishingPieType,
  updateFinishingPieType,
  getFinishingPieRows,
  createFinishingPieRow,
  updateFinishingPieRow,
  deleteFinishingPieRow,
  getRateUnitId,
} from '@/entities/finishing'
import type {
  FinishingPieRow,
  CreateFinishingPieRowDto,
  UpdateFinishingPieRowDto,
} from '@/entities/finishing'
import { useScale } from '@/shared/contexts/ScaleContext'

const { Title } = Typography

type Mode = 'view' | 'add' | 'edit' | 'delete'

interface EditableRow extends Partial<FinishingPieRow> {
  isNew?: boolean
  isEditing?: boolean
}

export default function FinishingPieType() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { scale } = useScale()
  const queryClient = useQueryClient()

  const projectId = new URLSearchParams(location.search).get('projectId')

  const [mode, setMode] = useState<Mode>('view')
  const [editingRows, setEditingRows] = useState<EditableRow[]>([])
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [docName, setDocName] = useState('')
  const [isNewDocument, setIsNewDocument] = useState(!id)

  // Загрузка документа
  const { data: document, isLoading: docLoading } = useQuery({
    queryKey: ['finishing-pie-type', id],
    queryFn: () => getFinishingPieTypeById(id!),
    enabled: !!id,
  })

  // Загрузка строк табличной части
  const { data: rows = [], isLoading: rowsLoading } = useQuery<FinishingPieRow[]>({
    queryKey: ['finishing-pie-rows', id],
    queryFn: () => getFinishingPieRows(id!),
    enabled: !!id,
  })

  // Загрузка материалов
  const { data: materials = [] } = useQuery({
    queryKey: ['materials-for-finishing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('uuid, name')
        .order('name')

      if (error) throw error
      return data || []
    },
  })

  // Загрузка единиц измерения
  const { data: units = [] } = useQuery({
    queryKey: ['units-for-finishing'],
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('id, name').order('name')

      if (error) throw error
      return data || []
    },
  })

  // Загрузка расценок
  const { data: rates = [] } = useQuery({
    queryKey: ['rates-for-finishing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rates')
        .select('id, work_name, unit_id')
        .order('work_name')

      if (error) throw error
      return data || []
    },
  })

  useEffect(() => {
    if (document) {
      setDocName(document.name)
    }
  }, [document])

  // Мутация создания документа
  const createDocMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!projectId) throw new Error('Не указан проект')
      return createFinishingPieType({ project_id: projectId, name })
    },
    onSuccess: (data) => {
      message.success('Документ создан')
      navigate(`/documents/finishing-pie-type/${data.id}?projectId=${projectId}`)
      setIsNewDocument(false)
    },
    onError: (error: any) => {
      message.error(`Ошибка создания документа: ${error.message}`)
    },
  })

  // Мутация обновления документа
  const updateDocMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!id) throw new Error('Не указан ID документа')
      return updateFinishingPieType(id, { name })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishing-pie-type', id] })
      message.success('Документ обновлён')
    },
    onError: (error: any) => {
      message.error(`Ошибка обновления документа: ${error.message}`)
    },
  })

  // Мутация создания строки
  const createRowMutation = useMutation({
    mutationFn: (dto: CreateFinishingPieRowDto) => createFinishingPieRow(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishing-pie-rows', id] })
    },
  })

  // Мутация обновления строки
  const updateRowMutation = useMutation({
    mutationFn: ({ rowId, dto }: { rowId: string; dto: UpdateFinishingPieRowDto }) =>
      updateFinishingPieRow(rowId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishing-pie-rows', id] })
    },
  })

  // Мутация удаления строки
  const deleteRowMutation = useMutation({
    mutationFn: (rowId: string) => deleteFinishingPieRow(rowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishing-pie-rows', id] })
    },
  })

  const handleSaveDocument = async () => {
    if (!docName.trim()) {
      message.error('Введите название документа')
      return
    }

    if (isNewDocument) {
      createDocMutation.mutate(docName)
    } else if (id) {
      updateDocMutation.mutate(docName)
    }
  }

  const handleAddRow = () => {
    if (isNewDocument) {
      message.error('Сначала сохраните документ')
      return
    }
    setMode('add')
    setEditingRows([
      {
        id: `new-${Date.now()}`,
        isNew: true,
        pie_type_id: id!,
        material_id: null,
        unit_id: null,
        consumption: null,
        rate_id: null,
        rate_unit_id: null,
      },
    ])
  }

  const handleCopyRow = (record: FinishingPieRow) => {
    if (isNewDocument) {
      message.error('Сначала сохраните документ')
      return
    }
    setMode('add')
    setEditingRows([
      {
        id: `new-${Date.now()}`,
        isNew: true,
        pie_type_id: id!,
        material_id: record.material_id,
        unit_id: record.unit_id,
        consumption: record.consumption,
        rate_id: record.rate_id,
        rate_unit_id: record.rate_unit_id,
      },
    ])
  }

  const handleEditRow = (record: FinishingPieRow) => {
    setMode('edit')
    setEditingRows([{ ...record, isEditing: true }])
  }

  const handleDeleteMode = () => {
    setMode('delete')
    setSelectedRowKeys([])
  }

  const handleCancelEdit = () => {
    setMode('view')
    setEditingRows([])
    setSelectedRowKeys([])
  }

  const handleSaveRows = async () => {
    try {
      for (const row of editingRows) {
        if (row.isNew) {
          await createRowMutation.mutateAsync({
            pie_type_id: id!,
            material_id: row.material_id || null,
            unit_id: row.unit_id || null,
            consumption: row.consumption || null,
            rate_id: row.rate_id || null,
            rate_unit_id: row.rate_unit_id || null,
          })
        } else if (row.isEditing && row.id) {
          await updateRowMutation.mutateAsync({
            rowId: row.id,
            dto: {
              material_id: row.material_id,
              unit_id: row.unit_id,
              consumption: row.consumption,
              rate_id: row.rate_id,
              rate_unit_id: row.rate_unit_id,
            },
          })
        }
      }
      message.success('Изменения сохранены')
      setMode('view')
      setEditingRows([])
    } catch (error: any) {
      message.error(`Ошибка сохранения: ${error.message}`)
    }
  }

  const handleDeleteRows = async () => {
    try {
      for (const key of selectedRowKeys) {
        await deleteRowMutation.mutateAsync(key as string)
      }
      message.success(`Удалено строк: ${selectedRowKeys.length}`)
      setMode('view')
      setSelectedRowKeys([])
    } catch (error: any) {
      message.error(`Ошибка удаления: ${error.message}`)
    }
  }

  const handleUpdateEditingRow = (id: string, field: keyof EditableRow, value: any) => {
    setEditingRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )
  }

  const handleRateChange = async (rowId: string, rateId: string | null) => {
    handleUpdateEditingRow(rowId, 'rate_id', rateId)

    if (rateId) {
      try {
        const unitId = await getRateUnitId(rateId)
        handleUpdateEditingRow(rowId, 'rate_unit_id', unitId)
      } catch (error) {
        console.error('Ошибка получения ед.изм. работы:', error)
      }
    } else {
      handleUpdateEditingRow(rowId, 'rate_unit_id', null)
    }
  }

  const dataSource = useMemo(() => {
    if (mode === 'add' || mode === 'edit') {
      return editingRows
    }
    return rows
  }, [mode, editingRows, rows])

  const columns = [
    {
      title: '№',
      key: 'index',
      width: 50,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Наименование материала',
      dataIndex: 'material_id',
      key: 'material_id',
      width: 250,
      render: (value: string | null, record: EditableRow) => {
        if (mode === 'add' || mode === 'edit') {
          return (
            <Select
              value={value}
              onChange={(val) => handleUpdateEditingRow(record.id!, 'material_id', val)}
              options={materials.map((m) => ({ value: m.uuid, label: m.name }))}
              placeholder="Выберите материал"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
            />
          )
        }
        return record.material_name || '-'
      },
    },
    {
      title: 'Ед.Изм.',
      dataIndex: 'unit_id',
      key: 'unit_id',
      width: 120,
      render: (value: string | null, record: EditableRow) => {
        if (mode === 'add' || mode === 'edit') {
          return (
            <Select
              value={value}
              onChange={(val) => handleUpdateEditingRow(record.id!, 'unit_id', val)}
              options={units.map((u) => ({ value: u.id, label: u.name }))}
              placeholder="Ед.изм."
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
            />
          )
        }
        return record.unit_name || '-'
      },
    },
    {
      title: 'Расход',
      dataIndex: 'consumption',
      key: 'consumption',
      width: 120,
      render: (value: number | null, record: EditableRow) => {
        if (mode === 'add' || mode === 'edit') {
          return (
            <InputNumber
              value={value}
              onChange={(val) => handleUpdateEditingRow(record.id!, 'consumption', val)}
              placeholder="0.0"
              style={{ width: '100%' }}
              min={0}
              precision={4}
            />
          )
        }
        return value != null ? value.toFixed(4) : '-'
      },
    },
    {
      title: 'Наименование работы',
      dataIndex: 'rate_id',
      key: 'rate_id',
      width: 250,
      render: (value: string | null, record: EditableRow) => {
        if (mode === 'add' || mode === 'edit') {
          return (
            <Select
              value={value}
              onChange={(val) => handleRateChange(record.id!, val)}
              options={rates.map((r) => ({ value: r.id, label: r.work_name }))}
              placeholder="Выберите работу"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
            />
          )
        }
        return record.rate_name || '-'
      },
    },
    {
      title: 'Ед.изм. работы',
      dataIndex: 'rate_unit_id',
      key: 'rate_unit_id',
      width: 120,
      render: (value: string | null, record: EditableRow) => {
        if (mode === 'add' || mode === 'edit') {
          const unitName = units.find((u) => u.id === value)?.name || '-'
          return <span>{unitName}</span>
        }
        return record.rate_unit_name || '-'
      },
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: FinishingPieRow) => {
        if (mode === 'view') {
          return (
            <Space>
              <Button
                type="text"
                icon={<CopyOutlined />}
                size="small"
                onClick={() => handleCopyRow(record)}
              />
              <Button
                type="text"
                icon={<DeleteOutlined />}
                size="small"
                onClick={() => handleEditRow(record)}
              />
            </Space>
          )
        }
        return null
      },
    },
  ]

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  }

  return (
    <div
      style={{
        height: 'calc(100vh - 96px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Заголовок */}
      <div style={{ padding: '16px 24px', flexShrink: 0 }}>
        <Title level={2} style={{ margin: 0, fontSize: Math.round(24 * scale) }}>
          Тип пирога отделки
        </Title>
      </div>

      {/* Название документа */}
      <div style={{ padding: '0 24px 16px 24px', flexShrink: 0 }}>
        <Space>
          <span>Название:</span>
          <Input
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder="Тип-1, Тип-2, ..."
            style={{ width: 300 }}
          />
          <Button type="primary" onClick={handleSaveDocument}>
            {isNewDocument ? 'Создать документ' : 'Обновить название'}
          </Button>
        </Space>
      </div>

      {/* Кнопки управления */}
      {!isNewDocument && (
        <div style={{ padding: '0 24px 16px 24px', flexShrink: 0 }}>
          <Space>
            {mode === 'view' && (
              <>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRow}>
                  Добавить строку
                </Button>
                <Button onClick={handleDeleteMode}>Удалить</Button>
              </>
            )}
            {(mode === 'add' || mode === 'edit') && (
              <>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveRows}>
                  Сохранить
                </Button>
                <Button icon={<CloseOutlined />} onClick={handleCancelEdit}>
                  Отмена
                </Button>
              </>
            )}
            {mode === 'delete' && (
              <>
                <Popconfirm
                  title={`Удалить выбранные строки (${selectedRowKeys.length})?`}
                  onConfirm={handleDeleteRows}
                  disabled={selectedRowKeys.length === 0}
                >
                  <Button type="primary" danger disabled={selectedRowKeys.length === 0}>
                    Удалить ({selectedRowKeys.length})
                  </Button>
                </Popconfirm>
                <Button icon={<CloseOutlined />} onClick={handleCancelEdit}>
                  Отмена
                </Button>
              </>
            )}
          </Space>
        </div>
      )}

      {/* Таблица */}
      {!isNewDocument && (
        <div style={{ flex: 1, overflow: 'hidden', padding: '0 24px 24px 24px' }}>
          <Table
            columns={columns}
            dataSource={dataSource}
            rowKey="id"
            loading={docLoading || rowsLoading}
            pagination={{ defaultPageSize: 100, showSizeChanger: true }}
            rowSelection={mode === 'delete' ? rowSelection : undefined}
            scroll={{ y: 'calc(100vh - 400px)' }}
            locale={{ emptyText: 'Нет данных' }}
          />
        </div>
      )}
    </div>
  )
}