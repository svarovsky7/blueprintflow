import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  Typography,
  Button,
  Space,
  Table,
  Input,
  InputNumber,
  Select,
  Popconfirm,
  App,
} from 'antd'
import {
  PlusOutlined,
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
  CopyOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  getFinishingPieById,
  createFinishingPie,
  updateFinishingPie,
  getFinishingPieRows,
  createFinishingPieRow,
  updateFinishingPieRow,
  deleteFinishingPieRow,
  getRateUnitId,
  getFinishingPieTypes,
  createFinishingPieType,
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
  newTypeName?: string // Временное название нового типа
  newMaterialName?: string // Временное название нового материала
}

export default function FinishingPieType() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { scale } = useScale()
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  const params = new URLSearchParams(location.search)
  const projectId = params.get('projectId')
  const blockId = params.get('blockId')

  const [mode, setMode] = useState<Mode>('view')
  const [editingRows, setEditingRows] = useState<EditableRow[]>([])
  const [docName, setDocName] = useState('')
  const [selectedBlockId, setSelectedBlockId] = useState<string | undefined>(blockId || undefined)

  // Загрузка документа
  const { data: document, isLoading: docLoading } = useQuery({
    queryKey: ['finishing-pie', id],
    queryFn: () => getFinishingPieById(id!),
    enabled: !!id && id !== 'new',
  })

  // Загрузка строк табличной части
  const { data: rows = [], isLoading: rowsLoading } = useQuery<FinishingPieRow[]>({
    queryKey: ['finishing-pie-rows', id],
    queryFn: () => getFinishingPieRows(id!),
    enabled: !!id && id !== 'new',
  })

  // Загрузка типов для проекта
  const { data: pieTypes = [] } = useQuery({
    queryKey: ['finishing-pie-types', projectId],
    queryFn: () => getFinishingPieTypes(projectId!),
    enabled: !!projectId,
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

  // Загрузка корпусов для выбранного проекта
  const { data: blocks = [] } = useQuery({
    queryKey: ['blocks-for-finishing', projectId],
    queryFn: async () => {
      if (!projectId) return []

      const { data, error } = await supabase
        .from('projects_blocks')
        .select('block_id, blocks(id, name)')
        .eq('project_id', projectId)

      if (error) throw error
      return (
        data?.map((pb: any) => ({
          id: pb.blocks.id,
          name: pb.blocks.name,
        })) || []
      )
    },
    enabled: !!projectId,
  })

  useEffect(() => {
    if (document) {
      setDocName(document.name)
      setSelectedBlockId(document.block_id || undefined)
    }
  }, [document])

  // Мутация создания типа
  const createTypeMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!projectId) throw new Error('Не указан проект')
      return createFinishingPieType({ project_id: projectId, name })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishing-pie-types', projectId] })
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

  // Мутация создания материала
  const createMaterialMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('materials')
        .insert([{ name }])
        .select()
        .limit(1)

      if (error) throw error
      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials-for-finishing'] })
    },
  })

  const handleSaveDocument = async () => {
    if (!projectId) {
      message.error('Не указан проект')
      return
    }

    try {
      let documentId = id
      const isNewDocument = id === 'new' || !id

      // 1. Создать или обновить заголовок документа в finishing_pie
      if (isNewDocument) {
        if (!docName.trim()) {
          message.error('Введите название документа')
          return
        }

        const { data: newDocData, error: createError } = await supabase
          .from('finishing_pie')
          .insert([{ project_id: projectId, block_id: selectedBlockId || null, name: docName }])
          .select()
          .limit(1)

        if (createError) throw createError
        documentId = newDocData[0].id
      } else {
        // Обновляем существующий документ (только если название изменилось)
        if (docName.trim() && docName !== document?.name) {
          const { error: updateError } = await supabase
            .from('finishing_pie')
            .update({
              name: docName,
              block_id: selectedBlockId || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)

          if (updateError) throw updateError
        }
      }

      // 2. Создать новые типы (если есть) - уже созданы "на лету"
      // 3. Создать новые материалы (если есть) - уже созданы "на лету"

      // 4. Сохранить все строки табличной части
      for (const row of editingRows) {
        if (row.isNew) {
          // Создать новую строку
          await createFinishingPieRow({
            finishing_pie_id: documentId!,
            pie_type_id: row.pie_type_id || null,
            material_id: row.material_id || null,
            unit_id: row.unit_id || null,
            consumption: row.consumption || null,
            rate_id: row.rate_id || null,
            rate_unit_id: row.rate_unit_id || null,
          })
        } else if (row.isEditing) {
          // Обновить существующую строку
          await updateFinishingPieRow(row.id!, {
            pie_type_id: row.pie_type_id || null,
            material_id: row.material_id || null,
            unit_id: row.unit_id || null,
            consumption: row.consumption || null,
            rate_id: row.rate_id || null,
            rate_unit_id: row.rate_unit_id || null,
          })
        }
      }

      message.success('Документ сохранён')

      // 5. Перейти на страницу созданного документа (если это был новый документ)
      if (isNewDocument) {
        const blockParam = selectedBlockId ? `&blockId=${selectedBlockId}` : ''
        navigate(`/documents/finishing-pie-type/${documentId}?projectId=${projectId}${blockParam}`)
      }

      // 6. Очистить состояние и обновить данные
      setMode('view')
      setEditingRows([])
      queryClient.invalidateQueries({ queryKey: ['finishing-pie', documentId] })
      queryClient.invalidateQueries({ queryKey: ['finishing-pie-rows', documentId] })
    } catch (error: any) {
      message.error(`Ошибка сохранения: ${error.message}`)
    }
  }

  const handleAddRow = () => {
    setMode('add')
    setEditingRows([
      ...editingRows,
      {
        id: `new-${Date.now()}`,
        isNew: true,
        pie_type_id: null,
        material_id: null,
        unit_id: null,
        consumption: 1,
        rate_id: null,
        rate_unit_id: null,
      },
    ])
  }

  const handleCopyRow = (record: FinishingPieRow) => {
    setMode('add')
    setEditingRows([
      ...editingRows,
      {
        id: `new-${Date.now()}`,
        isNew: true,
        pie_type_id: record.pie_type_id,
        pie_type_name: record.pie_type_name,
        material_id: record.material_id,
        material_name: record.material_name,
        unit_id: record.unit_id,
        unit_name: record.unit_name,
        consumption: record.consumption,
        rate_id: record.rate_id,
        rate_name: record.rate_name,
        rate_unit_id: record.rate_unit_id,
        rate_unit_name: record.rate_unit_name,
      },
    ])
  }


  const handleCancelEdit = () => {
    setMode('view')
    setEditingRows([])
  }

  const handleDeleteSingleRow = async (rowId: string) => {
    try {
      await deleteRowMutation.mutateAsync(rowId)
      message.success('Строка удалена')
    } catch (error: any) {
      message.error(`Ошибка удаления: ${error.message}`)
    }
  }

  const handleUpdateEditingRow = (id: string, field: keyof EditableRow, value: any) => {
    setEditingRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )
  }

  const handleTypeChange = async (rowId: string, value: string | null) => {
    // Проверяем, существует ли тип в списке
    const existingType = pieTypes.find((t) => t.id === value)

    if (existingType) {
      // Тип существует - сохраняем его ID
      handleUpdateEditingRow(rowId, 'pie_type_id', value)
    } else if (value) {
      // Новый тип - создаём "на лету"
      try {
        const newType = await createTypeMutation.mutateAsync(value)
        handleUpdateEditingRow(rowId, 'pie_type_id', newType.id)
      } catch (error) {
        message.error('Ошибка создания типа')
        console.error(error)
      }
    } else {
      // Очистка
      handleUpdateEditingRow(rowId, 'pie_type_id', null)
    }
  }

  const handleMaterialChange = async (rowId: string, value: string | null) => {
    // Проверяем, существует ли материал в списке
    const existingMaterial = materials.find((m) => m.uuid === value)

    if (existingMaterial) {
      // Материал существует - сохраняем его ID
      handleUpdateEditingRow(rowId, 'material_id', value)
    } else if (value) {
      // Новый материал - создаём "на лету"
      try {
        const newMaterial = await createMaterialMutation.mutateAsync(value)
        handleUpdateEditingRow(rowId, 'material_id', newMaterial.uuid)
      } catch (error) {
        message.error('Ошибка создания материала')
        console.error(error)
      }
    } else {
      // Очистка
      handleUpdateEditingRow(rowId, 'material_id', null)
    }
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
      return [...rows, ...editingRows]
    }
    return rows
  }, [mode, editingRows, rows])

  const columns = [
    {
      title: '',
      key: 'actions',
      width: 80,
      align: 'center' as const,
      fixed: 'left' as const,
      render: (_: any, record: FinishingPieRow) => {
        if (mode === 'view') {
          return (
            <Space size="small">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                title="Редактировать строку"
                onClick={() => {
                  setMode('edit')
                  setEditingRows([{ ...record, isEditing: true }])
                }}
              />
              <Popconfirm
                title="Удалить эту строку?"
                onConfirm={() => handleDeleteSingleRow(record.id)}
                okText="Да"
                cancelText="Нет"
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  title="Удалить строку"
                />
              </Popconfirm>
            </Space>
          )
        }
        if (mode === 'add' || mode === 'edit') {
          return (
            <Space size="small">
              <Button
                type="text"
                icon={<PlusOutlined />}
                size="small"
                title="Добавить строку"
                onClick={handleAddRow}
              />
              <Button
                type="text"
                icon={<CopyOutlined />}
                size="small"
                title="Скопировать строку"
                onClick={() => handleCopyRow(record)}
              />
              <Popconfirm
                title="Удалить эту строку?"
                onConfirm={() => handleDeleteSingleRow(record.id)}
                okText="Да"
                cancelText="Нет"
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  title="Удалить строку"
                />
              </Popconfirm>
            </Space>
          )
        }
        return null
      },
    },
    {
      title: '№',
      key: 'index',
      width: 50,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Тип',
      dataIndex: 'pie_type_id',
      key: 'pie_type_id',
      width: 100,
      render: (value: string | null, record: EditableRow) => {
        if (mode === 'add' || mode === 'edit') {
          return (
            <Select
              value={value}
              onChange={(val) => handleTypeChange(record.id!, val)}
              onSearch={(searchValue) => {
                // Если пользователь ввёл текст, который не найден в списке
                if (
                  searchValue &&
                  !pieTypes.some((t) => t.name.toLowerCase().includes(searchValue.toLowerCase()))
                ) {
                  // Создаём новый тип "на лету"
                  handleTypeChange(record.id!, searchValue)
                }
              }}
              options={pieTypes.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Выберите или введите тип"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <div
                    style={{
                      padding: '8px',
                      borderTop: '1px solid #f0f0f0',
                      textAlign: 'center',
                      color: '#999',
                    }}
                  >
                    Начните вводить для создания нового
                  </div>
                </>
              )}
            />
          )
        }
        return record.pie_type_name || '-'
      },
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
              onChange={(val) => handleMaterialChange(record.id!, val)}
              onSearch={(searchValue) => {
                // Если пользователь ввёл текст, который не найден в списке
                if (
                  searchValue &&
                  !materials.some((m) => m.name.toLowerCase().includes(searchValue.toLowerCase()))
                ) {
                  // Создаём новый материал "на лету"
                  handleMaterialChange(record.id!, searchValue)
                }
              }}
              options={materials.map((m) => ({ value: m.uuid, label: m.name }))}
              placeholder="Выберите или введите материал"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <div
                    style={{
                      padding: '8px',
                      borderTop: '1px solid #f0f0f0',
                      textAlign: 'center',
                      color: '#999',
                    }}
                  >
                    Начните вводить для создания нового
                  </div>
                </>
              )}
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
      width: 80,
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
      width: 80,
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
        if (value == null) return '-'
        // Показываем дробную часть только если она есть
        return value % 1 === 0 ? value.toString() : value.toString()
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
        return (
          <div style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>
            {record.rate_name || '-'}
          </div>
        )
      },
    },
    {
      title: 'Ед.изм. работы',
      dataIndex: 'rate_unit_id',
      key: 'rate_unit_id',
      width: 80,
      render: (value: string | null, record: EditableRow) => {
        if (mode === 'add' || mode === 'edit') {
          const unitName = units.find((u) => u.id === value)?.name || '-'
          return <span>{unitName}</span>
        }
        return record.rate_unit_name || '-'
      },
    },
  ]

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

      {/* Название документа, корпус и кнопка сохранения - всё в одной строке */}
      <div style={{ padding: '0 24px 16px 24px', flexShrink: 0 }}>
        <Space>
          <span>Название:</span>
          <Input
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder="Тип-1, Тип-2, ..."
            style={{ width: 300 }}
          />
          <span>Корпус:</span>
          <Select
            value={selectedBlockId}
            onChange={setSelectedBlockId}
            options={blocks.map((b) => ({ value: b.id, label: b.name }))}
            placeholder="Выберите корпус"
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
            }
            style={{ width: 200 }}
          />
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveDocument}>
            Сохранить документ
          </Button>
        </Space>
      </div>

      {/* Кнопка Добавить/Отмена под полем Название слева */}
      <div style={{ padding: '0 24px 16px 24px', flexShrink: 0 }}>
        {mode === 'view' ? (
          <Button icon={<PlusOutlined />} onClick={handleAddRow}>
            Добавить
          </Button>
        ) : (
          <Button icon={<CloseOutlined />} onClick={handleCancelEdit}>
            Отмена
          </Button>
        )}
      </div>

      {/* Таблица - всегда видима */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 24px 24px 24px' }}>
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={docLoading || rowsLoading}
          pagination={{ defaultPageSize: 100, showSizeChanger: true }}
          scroll={{ y: 'calc(100vh - 400px)', x: 'max-content' }}
          locale={{ emptyText: 'Нет данных' }}
        />
      </div>
    </div>
  )
}