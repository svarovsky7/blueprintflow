import { useState, useMemo } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  Typography,
  Button,
  Space,
  Table,
  Select,
  Popconfirm,
  App,
  InputNumber,
  Input,
} from 'antd'
import {
  PlusOutlined,
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
  CopyOutlined,
  EditOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useScale } from '@/shared/contexts/ScaleContext'
import {
  getSurfaceTypes,
  getTypeCalculationRows,
  createTypeCalculationRow,
  updateTypeCalculationRow,
  deleteTypeCalculationRow,
  upsertTypeCalculationFloors,
} from '@/entities/calculation'
import { getRoomNumbersByProject, getOrCreateRoomNumber } from '@/entities/rooms'
import { updateFinishingPie, getFinishingPieById } from '@/entities/finishing'
import { FloorQuantitiesModal } from './FinishingCalculation/components/FloorQuantitiesModal'
import { StatusSelector } from './Finishing/components/StatusSelector'
import { PAGE_FORMATS } from '@/shared/constants/statusColors'

const { Title } = Typography

type Mode = 'view' | 'add' | 'edit' | 'delete'

// Парсинг диапазона этажей: "2-3" -> [2, 3], "1,3-5" -> [1, 3, 4, 5], "-2--1" -> [-2, -1]
function parseFloorRange(input: string): number[] {
  if (!input || !input.trim()) return []

  const floors: number[] = []
  const parts = input.split(',').map(p => p.trim())

  for (const part of parts) {
    // Проверяем, есть ли диапазон (но не в начале строки для отрицательных чисел)
    const rangeMatch = part.match(/^(-?\d+)\s*-\s*(-?\d+)$/)

    if (rangeMatch) {
      // Это диапазон, например "2-5" или "-3--1"
      const start = parseInt(rangeMatch[1], 10)
      const end = parseInt(rangeMatch[2], 10)

      if (!isNaN(start) && !isNaN(end)) {
        const step = start <= end ? 1 : -1
        for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
          if (!floors.includes(i)) floors.push(i)
        }
      }
    } else {
      // Одиночное число (может быть отрицательным)
      const floor = parseInt(part, 10)
      if (!isNaN(floor) && !floors.includes(floor)) {
        floors.push(floor)
      }
    }
  }

  return floors.sort((a, b) => a - b)
}

// Форматирование массива этажей в строку: [2, 3] -> "2-3", [1, 3, 4, 5] -> "1,3-5"
function formatFloorRange(floors: number[]): string {
  if (!floors || floors.length === 0) return ''

  const sorted = [...floors].sort((a, b) => a - b)
  const ranges: string[] = []
  let start = sorted[0]
  let end = sorted[0]

  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === end + 1) {
      end = sorted[i]
    } else {
      if (start === end) {
        ranges.push(start.toString())
      } else if (end === start + 1) {
        ranges.push(start.toString())
        ranges.push(end.toString())
      } else {
        ranges.push(`${start}-${end}`)
      }
      if (i < sorted.length) {
        start = sorted[i]
        end = sorted[i]
      }
    }
  }

  return ranges.join(',')
}

interface CalculationRow {
  id: string
  finishing_pie_id: string | null
  block_id: string | null
  block_name?: string
  location_id: number | null
  location_name?: string
  room_type_id: number | null
  room_type_name?: string
  room_number_id?: string | null
  room_number_name?: string | null
  pie_type_id: string | null
  pie_type_name?: string
  surface_type_id: string | null
  surface_type_name?: string
  floors?: Array<{
    type_calculation_mapping_id: string
    floor_number: number
    quantitySpec: number | null
    quantityRd: number | null
  }>
}

interface EditableRow extends Partial<CalculationRow> {
  isNew?: boolean
  isEditing?: boolean
  quantitySpec?: number | null
  quantityRd?: number | null
  floorRange?: string  // Строка диапазона этажей: "1-3", "2,4-6"
}

export default function FinishingCalculation() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { scale } = useScale()
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  const params = new URLSearchParams(location.search)
  const projectId = params.get('projectId')

  const [mode, setMode] = useState<Mode>('view')
  const [editingRows, setEditingRows] = useState<EditableRow[]>([])
  const [selectedFinishingPieId, setSelectedFinishingPieId] = useState<string | undefined>(id !== 'new' ? id : undefined)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  const [floorModalOpen, setFloorModalOpen] = useState(false)
  const [floorModalData, setFloorModalData] = useState<Array<{
    floor_number: number
    quantitySpec: number | null
    quantityRd: number | null
  }>>([])
  const [floorModalInfo, setFloorModalInfo] = useState<{
    block_name?: string | null
    location_name?: string | null
    room_type_name?: string | null
    pie_type_name?: string | null
    surface_type_name?: string | null
  }>({})
  const [floorModalRowId, setFloorModalRowId] = useState<string | null>(null)
  const [floorModalIsEdit, setFloorModalIsEdit] = useState(false)

  const { data: rows = [], isLoading: rowsLoading } = useQuery({
    queryKey: ['type-calculation-rows', selectedFinishingPieId],
    queryFn: () => getTypeCalculationRows(selectedFinishingPieId!),
    enabled: !!selectedFinishingPieId && selectedFinishingPieId !== 'new',
  })

  const { data: finishingPieDocuments = [] } = useQuery({
    queryKey: ['finishing-pie-for-calculation', projectId],
    queryFn: async () => {
      if (!projectId) return []

      const { data, error } = await supabase
        .from('finishing_pie')
        .select('id, name')
        .eq('project_id', projectId)
        .order('name')

      if (error) throw error
      return data || []
    },
    enabled: !!projectId,
  })

  // Загрузка полного документа finishing_pie для получения статуса
  const { data: finishingPieDocument } = useQuery({
    queryKey: ['finishing-pie', selectedFinishingPieId],
    queryFn: () => getFinishingPieById(selectedFinishingPieId!),
    enabled: !!selectedFinishingPieId && selectedFinishingPieId !== 'new',
  })

  const { data: blocks = [] } = useQuery({
    queryKey: ['blocks-for-calculation', projectId],
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

  // Загружаем строки типа пирога для получения вида затрат
  const { data: finishingPieRows = [] } = useQuery({
    queryKey: ['finishing-pie-rows-for-cost-type', selectedFinishingPieId],
    queryFn: async () => {
      if (!selectedFinishingPieId || selectedFinishingPieId === 'new') return []

      const { data, error } = await supabase
        .from('finishing_pie_mapping')
        .select('detail_cost_category_id')
        .eq('finishing_pie_id', selectedFinishingPieId)
        .limit(1)

      if (error) throw error
      return data || []
    },
    enabled: !!selectedFinishingPieId && selectedFinishingPieId !== 'new',
  })

  // Извлекаем detail_cost_category_id из первой строки
  const detailCostCategoryId = finishingPieRows[0]?.detail_cost_category_id

  const { data: locations = [] } = useQuery({
    queryKey: ['locations-for-calculation', detailCostCategoryId],
    queryFn: async () => {
      if (!detailCostCategoryId) {
        // Если нет вида затрат, загружаем все локализации
        const { data, error } = await supabase.from('location').select('id, name').order('name')
        if (error) throw error
        return data || []
      }

      // Загружаем локализации, связанные с видом затрат через detail_cost_categories_mapping
      const { data, error } = await supabase
        .from('detail_cost_categories_mapping')
        .select(`
          location_id,
          location:location_id(id, name)
        `)
        .eq('detail_cost_category_id', detailCostCategoryId)

      if (error) throw error

      // Извлекаем уникальные локализации и сортируем по имени
      const uniqueLocations = Array.from(
        new Map(data?.map((item: any) => [item.location?.id, item.location]) || []).values()
      ).filter(Boolean)

      return uniqueLocations.sort((a: any, b: any) => a.name.localeCompare(b.name)) || []
    },
    enabled: true,
  })

  const { data: roomTypes = [] } = useQuery({
    queryKey: ['room-types-for-calculation'],
    queryFn: async () => {
      const { data, error } = await supabase.from('type_rooms').select('id, name').order('name')

      if (error) throw error
      return data || []
    },
  })

  const { data: pieTypes = [] } = useQuery({
    queryKey: ['finishing-pie-types-calc', projectId],
    queryFn: async () => {
      if (!projectId) return []

      const { data, error } = await supabase
        .from('finishing_pie_types')
        .select('id, name')
        .eq('project_id', projectId)
        .order('name')

      if (error) throw error
      return data || []
    },
    enabled: !!projectId,
  })

  const { data: surfaceTypes = [] } = useQuery({
    queryKey: ['surface-types'],
    queryFn: getSurfaceTypes,
  })

  const { data: roomNumbers = [] } = useQuery({
    queryKey: ['room-numbers', projectId],
    queryFn: () => getRoomNumbersByProject(projectId!),
    enabled: !!projectId,
  })

  const { data: finishingPieData } = useQuery({
    queryKey: ['finishing-pie-cost-category', selectedFinishingPieId],
    queryFn: async () => {
      if (!selectedFinishingPieId || selectedFinishingPieId === 'new') return null

      const { data, error } = await supabase
        .from('finishing_pie')
        .select('cost_category_id')
        .eq('id', selectedFinishingPieId)
        .limit(1)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!selectedFinishingPieId && selectedFinishingPieId !== 'new',
  })

  const createMutation = useMutation({
    mutationFn: createTypeCalculationRow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['type-calculation-rows', selectedFinishingPieId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => updateTypeCalculationRow(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['type-calculation-rows', selectedFinishingPieId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTypeCalculationRow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['type-calculation-rows', selectedFinishingPieId] })
    },
  })

  // Мутация обновления статуса
  const updateStatusMutation = useMutation({
    mutationFn: async (statusId: string) => {
      await updateFinishingPie(selectedFinishingPieId!, { status_type_calculation: statusId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishing-pie', selectedFinishingPieId] })
      queryClient.invalidateQueries({ queryKey: ['finishing-pie-documents'] })
      message.success('Статус обновлен')
    },
    onError: () => {
      message.error('Ошибка при обновлении статуса')
    },
  })

  const handleSaveDocument = async () => {
    if (!selectedFinishingPieId) {
      message.error('Выберите документ Тип пирога отделки')
      return
    }

    console.log('🔍 LOG: handleSaveDocument - начало сохранения', { editingRows }) // LOG

    try {
      for (const row of editingRows) {
        console.log('🔍 LOG: обработка строки', { row }) // LOG

        if (row.isNew) {
          // Создаем новую строку расчета
          const newRow = await createMutation.mutateAsync({
            finishing_pie_id: selectedFinishingPieId,
            block_id: row.block_id || null,
            location_id: row.location_id || null,
            room_type_id: row.room_type_id || null,
            room_number_id: row.room_number_id || null,
            pie_type_id: row.pie_type_id || null,
            surface_type_id: row.surface_type_id || null,
          })

          console.log('🔍 LOG: создана новая строка', { newRow }) // LOG

          // Создаем массив этажей из floorRange и количеств
          let floorsToSave = row.floors || []

          // Если есть floorRange, создаем floors из него
          if (row.floorRange) {
            const floorNumbers = parseFloorRange(row.floorRange)
            console.log('🔍 LOG: распарсили этажи', { floorRange: row.floorRange, floorNumbers }) // LOG

            if (floorNumbers.length > 0) {
              // Если уже есть детальные данные по этажам (из модального окна), используем их
              if (!floorsToSave || floorsToSave.length === 0) {
                // Иначе создаем floors с равномерным распределением количеств
                const totalSpec = row.quantitySpec || 0
                const totalRd = row.quantityRd || 0
                const floorCount = floorNumbers.length

                floorsToSave = floorNumbers.map((floorNum) => ({
                  type_calculation_mapping_id: newRow.id,
                  floor_number: floorNum,
                  quantitySpec: totalSpec > 0 ? totalSpec / floorCount : null,
                  quantityRd: totalRd > 0 ? totalRd / floorCount : null,
                }))

                console.log('🔍 LOG: создали floors с равномерным распределением', { floorsToSave }) // LOG
              } else {
                console.log('🔍 LOG: используем существующие floors', { floorsToSave }) // LOG
              }
            }
          }

          // Сохраняем этажи, если они есть
          if (floorsToSave && floorsToSave.length > 0) {
            console.log('🔍 LOG: сохраняем этажи', { newRowId: newRow.id, floorsToSave }) // LOG
            await upsertTypeCalculationFloors(newRow.id, floorsToSave)
            console.log('🔍 LOG: этажи сохранены успешно') // LOG
          } else {
            console.log('🔍 LOG: нет этажей для сохранения') // LOG
          }

        } else if (row.isEditing) {
          // Обновляем существующую строку
          await updateMutation.mutateAsync({
            id: row.id!,
            dto: {
              block_id: row.block_id || null,
              location_id: row.location_id || null,
              room_type_id: row.room_type_id || null,
              room_number_id: row.room_number_id || null,
              pie_type_id: row.pie_type_id || null,
              surface_type_id: row.surface_type_id || null,
            },
          })

          // Создаем массив этажей из floorRange и количеств
          let floorsToSave = row.floors || []

          if (row.floorRange) {
            const floorNumbers = parseFloorRange(row.floorRange)

            if (floorNumbers.length > 0) {
              if (!floorsToSave || floorsToSave.length === 0) {
                const totalSpec = row.quantitySpec || 0
                const totalRd = row.quantityRd || 0
                const floorCount = floorNumbers.length

                floorsToSave = floorNumbers.map((floorNum) => ({
                  type_calculation_mapping_id: row.id!,
                  floor_number: floorNum,
                  quantitySpec: totalSpec > 0 ? totalSpec / floorCount : null,
                  quantityRd: totalRd > 0 ? totalRd / floorCount : null,
                }))
              }
            }
          }

          if (floorsToSave && floorsToSave.length > 0) {
            await upsertTypeCalculationFloors(row.id!, floorsToSave)
          }
        }
      }

      console.log('🔍 LOG: все строки сохранены успешно') // LOG

      // Присвоить статус "В работе" при первом сохранении
      const { data: currentDoc } = await supabase
        .from('finishing_pie')
        .select('status_type_calculation')
        .eq('id', selectedFinishingPieId)
        .limit(1)

      if (currentDoc && currentDoc.length > 0 && !currentDoc[0].status_type_calculation) {
        const { data: allStatuses } = await supabase
          .from('statuses')
          .select('id, name, applicable_pages')
          .eq('name', 'В работе')

        const status = allStatuses?.find(
          (s) => s.applicable_pages && s.applicable_pages.includes('documents/finishing')
        )

        if (status) {
          await supabase
            .from('finishing_pie')
            .update({ status_type_calculation: status.id })
            .eq('id', selectedFinishingPieId)
        }
      }

      message.success('Документ сохранён')
      setMode('view')
      setEditingRows([])

      // Обновляем данные из БД
      queryClient.invalidateQueries({ queryKey: ['type-calculation-rows', selectedFinishingPieId] })
    } catch (error: unknown) {
      const err = error as { message?: string }
      console.error('❌ LOG: ошибка сохранения', error) // LOG
      message.error(`Ошибка сохранения: ${err.message || 'Неизвестная ошибка'}`)
    }
  }

  const handleAddRow = (afterRowId?: string) => {
    setMode('add')
    const newRow = {
      id: `new-${Date.now()}`,
      isNew: true,
      finishing_pie_id: selectedFinishingPieId || null,
      block_id: null,
      location_id: null,
      room_type_id: null,
      pie_type_id: null,
      surface_type_id: null,
    }

    if (afterRowId) {
      const index = editingRows.findIndex(r => r.id === afterRowId)
      if (index !== -1) {
        const newEditingRows = [...editingRows]
        newEditingRows.splice(index + 1, 0, newRow)
        setEditingRows(newEditingRows)
      } else {
        setEditingRows([newRow, ...editingRows])
      }
    } else {
      setEditingRows([newRow, ...editingRows])
    }
  }

  const handleCopyRow = (record: CalculationRow, afterRowId?: string) => {
    setMode('add')
    const newRow = {
      id: `new-${Date.now()}`,
      isNew: true,
      finishing_pie_id: record.finishing_pie_id,
      block_id: record.block_id,
      block_name: record.block_name,
      location_id: record.location_id,
      location_name: record.location_name,
      room_type_id: record.room_type_id,
      room_type_name: record.room_type_name,
      room_number_id: record.room_number_id,
      room_number_name: record.room_number_name,
      pie_type_id: record.pie_type_id,
      pie_type_name: record.pie_type_name,
      surface_type_id: record.surface_type_id,
      surface_type_name: record.surface_type_name,
    }

    if (afterRowId) {
      const index = editingRows.findIndex(r => r.id === afterRowId)
      if (index !== -1) {
        const newEditingRows = [...editingRows]
        newEditingRows.splice(index + 1, 0, newRow)
        setEditingRows(newEditingRows)
      } else {
        setEditingRows([newRow, ...editingRows])
      }
    } else {
      setEditingRows([newRow, ...editingRows])
    }
  }

  const handleCancelEdit = () => {
    setMode('view')
    setEditingRows([])
    setSelectedRowKeys([])
  }

  const handleEnterDeleteMode = () => {
    setMode('delete')
    setSelectedRowKeys([])
  }

  const handleDeleteSelected = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Выберите строки для удаления')
      return
    }

    try {
      for (const key of selectedRowKeys) {
        await deleteMutation.mutateAsync(key as string)
      }
      message.success(`Удалено строк: ${selectedRowKeys.length}`)
      setMode('view')
      setSelectedRowKeys([])
    } catch (error: any) {
      message.error(`Ошибка удаления: ${error.message}`)
    }
  }

  const handleDeleteSingleRow = async (rowId: string) => {
    try {
      await deleteMutation.mutateAsync(rowId)
      message.success('Строка удалена')
    } catch (error: any) {
      message.error(`Ошибка удаления: ${error.message}`)
    }
  }

  const handleUpdateEditingRow = (id: string, field: keyof EditableRow, value: any) => {
    setEditingRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  const handleOpenFloorModal = (record: CalculationRow, isEdit: boolean) => {
    setFloorModalRowId(record.id)

    // Для новых строк создаем floors из диапазона этажей и распределяем количества
    let floorsData = record.floors || []
    if ((record as EditableRow).isNew || (record as EditableRow).isEditing) {
      const editableRecord = record as EditableRow
      const floorNumbers = parseFloorRange(editableRecord.floorRange || '')

      if (floorNumbers.length > 0) {
        // Если уже есть детальные данные по этажам, используем их
        if (editableRecord.floors && editableRecord.floors.length > 0) {
          floorsData = editableRecord.floors
        } else {
          // Иначе равномерно распределяем введенные количества между этажами
          const totalSpec = editableRecord.quantitySpec || 0
          const totalRd = editableRecord.quantityRd || 0
          const floorCount = floorNumbers.length

          floorsData = floorNumbers.map((floorNum) => ({
            type_calculation_mapping_id: record.id,
            floor_number: floorNum,
            quantitySpec: totalSpec > 0 ? totalSpec / floorCount : null,
            quantityRd: totalRd > 0 ? totalRd / floorCount : null,
          }))
        }
      }
    }

    setFloorModalData(floorsData)
    setFloorModalInfo({
      block_name: record.block_name,
      location_name: record.location_name,
      room_type_name: record.room_type_name,
      pie_type_name: record.pie_type_name,
      surface_type_name: record.surface_type_name,
    })
    setFloorModalIsEdit(isEdit)
    setFloorModalOpen(true)
  }

  const handleFloorModalSave = async (floors: Array<{
    floor_number: number
    quantitySpec: number | null
    quantityRd: number | null
  }>) => {
    if (!floorModalRowId) return

    // Если это новая строка, сохраняем количества в локальный state
    const editingRow = editingRows.find(r => r.id === floorModalRowId)
    if (editingRow && (editingRow.isNew || editingRow.isEditing)) {
      const totalSpec = floors.reduce((sum, f) => sum + (f.quantitySpec || 0), 0)
      const totalRd = floors.reduce((sum, f) => sum + (f.quantityRd || 0), 0)

      handleUpdateEditingRow(floorModalRowId, 'quantitySpec', totalSpec)
      handleUpdateEditingRow(floorModalRowId, 'quantityRd', totalRd)
      handleUpdateEditingRow(floorModalRowId, 'floors', floors)

      message.success('Данные по этажам обновлены')
      setFloorModalOpen(false)
      return
    }

    // Для существующих строк сохраняем в БД
    try {
      await upsertTypeCalculationFloors(floorModalRowId, floors)
      message.success('Этажи сохранены')
      queryClient.invalidateQueries({ queryKey: ['type-calculation-rows', selectedFinishingPieId] })
      setFloorModalOpen(false)
    } catch (error: unknown) {
      const err = error as { message?: string }
      message.error(`Ошибка сохранения этажей: ${err.message || 'Неизвестная ошибка'}`)
    }
  }

  const dataSource = useMemo(() => {
    if (mode === 'add') {
      return [...editingRows, ...rows]
    }
    if (mode === 'edit') {
      const editingMap = new Map(editingRows.map(r => [r.id, r]))
      return rows.map(r => editingMap.get(r.id) || r)
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
      render: (_: any, record: CalculationRow) => {
        if (mode === 'view') {
          return (
            <Space size="small">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                title="Редактировать строку"
                onClick={() => {
                  // Преобразуем floors в floorRange и количества для редактирования
                  const floorNumbers = record.floors?.map(f => f.floor_number).filter(n => n != null) || []
                  const floorRange = formatFloorRange(floorNumbers)
                  const quantitySpec = record.floors?.reduce((sum, f) => sum + (f.quantitySpec || 0), 0) || null
                  const quantityRd = record.floors?.reduce((sum, f) => sum + (f.quantityRd || 0), 0) || null

                  setMode('edit')
                  setEditingRows([{
                    ...record,
                    isEditing: true,
                    floorRange,
                    quantitySpec,
                    quantityRd,
                  }])
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
                onClick={() => handleAddRow(record.id)}
              />
              <Button
                type="text"
                icon={<CopyOutlined />}
                size="small"
                title="Скопировать строку"
                onClick={() => handleCopyRow(record, record.id)}
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
      title: 'Корпус',
      dataIndex: 'block_id',
      key: 'block_id',
      width: 150,
      render: (value: string | null, record: EditableRow) => {
        if ((mode === 'add' || mode === 'edit') && (record.isNew || record.isEditing)) {
          return (
            <Select
              value={value}
              onChange={(val) => handleUpdateEditingRow(record.id!, 'block_id', val)}
              options={blocks.map((b) => ({ value: b.id, label: b.name }))}
              placeholder="Выберите корпус"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
            />
          )
        }
        return record.block_name || '-'
      },
    },
    {
      title: 'Тип',
      dataIndex: 'pie_type_id',
      key: 'pie_type_id',
      width: 100,
      render: (value: string | null, record: EditableRow) => {
        if ((mode === 'add' || mode === 'edit') && (record.isNew || record.isEditing)) {
          return (
            <Select
              value={value}
              onChange={(val) => handleUpdateEditingRow(record.id!, 'pie_type_id', val)}
              options={pieTypes.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Выберите тип"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
            />
          )
        }
        return record.pie_type_name || '-'
      },
    },
    {
      title: 'Поверхность',
      dataIndex: 'surface_type_id',
      key: 'surface_type_id',
      width: 120,
      render: (value: string | null, record: EditableRow) => {
        if ((mode === 'add' || mode === 'edit') && (record.isNew || record.isEditing)) {
          return (
            <Select
              value={value}
              onChange={(val) => handleUpdateEditingRow(record.id!, 'surface_type_id', val)}
              options={surfaceTypes.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="Выберите"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
            />
          )
        }
        return record.surface_type_name || '-'
      },
    },
    {
      title: 'Этажи',
      key: 'floors',
      width: 120,
      render: (_: unknown, record: EditableRow) => {
        // В режиме добавления/редактирования - текстовое поле
        if ((mode === 'add' || mode === 'edit') && (record.isNew || record.isEditing)) {
          return (
            <Input
              value={record.floorRange || ''}
              onChange={(e) => handleUpdateEditingRow(record.id!, 'floorRange', e.target.value)}
              placeholder="1-3 или 1,3-5"
              style={{ width: '100%' }}
            />
          )
        }

        // В режиме просмотра - показываем диапазон или отдельные этажи
        const floorNumbers = record.floors?.map(f => f.floor_number).filter(n => n != null) || []
        return floorNumbers.length > 0 ? formatFloorRange(floorNumbers) : '-'
      },
    },
    {
      title: 'Кол-во по спецификации РД',
      key: 'quantitySpec',
      width: 180,
      render: (_: unknown, record: EditableRow) => {
        if ((mode === 'add' || mode === 'edit') && (record.isNew || record.isEditing)) {
          const floors = parseFloorRange(record.floorRange || '')
          const hasMultipleFloors = floors.length > 1

          return (
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                value={record.quantitySpec}
                onChange={(val) => handleUpdateEditingRow(record.id!, 'quantitySpec', val)}
                min={0}
                precision={2}
                style={{ width: hasMultipleFloors ? 'calc(100% - 32px)' : '100%' }}
                placeholder="0.00"
              />
              {hasMultipleFloors && (
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenFloorModal(record as CalculationRow, true)}
                  title="Детальный ввод по этажам"
                />
              )}
            </Space.Compact>
          )
        }

        // В режиме просмотра
        const total = record.floors?.reduce((sum, floor) => sum + (floor.quantitySpec || 0), 0) || 0
        const hasMultipleFloors = (record.floors?.length || 0) > 1

        if (total > 0 && hasMultipleFloors) {
          return (
            <Button
              type="link"
              onClick={() => handleOpenFloorModal(record as CalculationRow, false)}
              style={{ padding: 0, height: 'auto', textAlign: 'right', width: '100%' }}
            >
              {total.toFixed(2)}
            </Button>
          )
        }

        return total > 0 ? total.toFixed(2) : '-'
      },
    },
    {
      title: 'Кол-во по пересчету РД',
      key: 'quantityRd',
      width: 180,
      render: (_: unknown, record: EditableRow) => {
        if ((mode === 'add' || mode === 'edit') && (record.isNew || record.isEditing)) {
          const floors = parseFloorRange(record.floorRange || '')
          const hasMultipleFloors = floors.length > 1

          return (
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                value={record.quantityRd}
                onChange={(val) => handleUpdateEditingRow(record.id!, 'quantityRd', val)}
                min={0}
                precision={2}
                style={{ width: hasMultipleFloors ? 'calc(100% - 32px)' : '100%' }}
                placeholder="0.00"
              />
              {hasMultipleFloors && (
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenFloorModal(record as CalculationRow, true)}
                  title="Детальный ввод по этажам"
                />
              )}
            </Space.Compact>
          )
        }

        // В режиме просмотра
        const total = record.floors?.reduce((sum, floor) => sum + (floor.quantityRd || 0), 0) || 0
        const hasMultipleFloors = (record.floors?.length || 0) > 1

        if (total > 0 && hasMultipleFloors) {
          return (
            <Button
              type="link"
              onClick={() => handleOpenFloorModal(record as CalculationRow, false)}
              style={{ padding: 0, height: 'auto', textAlign: 'right', width: '100%' }}
            >
              {total.toFixed(2)}
            </Button>
          )
        }

        return total > 0 ? total.toFixed(2) : '-'
      },
    },
    {
      title: 'Вид помещения',
      dataIndex: 'room_type_id',
      key: 'room_type_id',
      width: 150,
      render: (value: number | null, record: EditableRow) => {
        if ((mode === 'add' || mode === 'edit') && (record.isNew || record.isEditing)) {
          return (
            <Select
              value={value}
              onChange={(val) => handleUpdateEditingRow(record.id!, 'room_type_id', val)}
              options={roomTypes.map((r) => ({ value: r.id, label: r.name }))}
              placeholder="Выберите вид"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
            />
          )
        }
        return record.room_type_name || '-'
      },
    },
    {
      title: 'Номер помещения',
      dataIndex: 'room_number_id',
      key: 'room_number_id',
      width: 150,
      render: (value: string | null, record: EditableRow) => {
        if ((mode === 'add' || mode === 'edit') && (record.isNew || record.isEditing)) {
          return (
            <Select
              mode="tags"
              value={record.room_number_name ? [record.room_number_name] : []}
              onChange={async (values) => {
                const newValue = values[values.length - 1]
                if (newValue && projectId) {
                  try {
                    const roomNumber = await getOrCreateRoomNumber(projectId, newValue)
                    handleUpdateEditingRow(record.id!, 'room_number_id', roomNumber.id)
                    handleUpdateEditingRow(record.id!, 'room_number_name', roomNumber.name)
                    queryClient.invalidateQueries({ queryKey: ['room-numbers', projectId] })
                  } catch (error) {
                    console.error('Ошибка создания номера помещения:', error)
                  }
                } else {
                  handleUpdateEditingRow(record.id!, 'room_number_id', null)
                  handleUpdateEditingRow(record.id!, 'room_number_name', null)
                }
              }}
              options={roomNumbers.map((rn) => ({ value: rn.name, label: rn.name }))}
              placeholder="Введите или выберите"
              allowClear
              showSearch
              maxTagCount={1}
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
            />
          )
        }
        return record.room_number_name || '-'
      },
    },
    {
      title: 'Локализация',
      dataIndex: 'location_id',
      key: 'location_id',
      width: 200,
      render: (value: number | null, record: EditableRow) => {
        if ((mode === 'add' || mode === 'edit') && (record.isNew || record.isEditing)) {
          return (
            <Select
              value={value}
              onChange={(val) => handleUpdateEditingRow(record.id!, 'location_id', val)}
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              placeholder="Выберите локализацию"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
            />
          )
        }
        return record.location_name || '-'
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
      <div style={{ padding: '16px 24px', flexShrink: 0 }}>
        <Space size="middle">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/documents/finishing?project=${projectId}`)}
          >
            Назад
          </Button>
          <Title level={2} style={{ margin: 0, fontSize: Math.round(24 * scale) }}>
            Расчет по типам
          </Title>
        </Space>
      </div>

      <div style={{ padding: '0 24px 16px 24px', flexShrink: 0 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <span>Название:</span>
            <Select
              value={selectedFinishingPieId}
              onChange={setSelectedFinishingPieId}
              placeholder="Выберите документ Тип пирога"
              style={{ width: 400 }}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              options={finishingPieDocuments.map((doc) => ({ value: doc.id, label: doc.name }))}
            />
          </Space>
          <Space>
            {mode === 'view' ? (
              <>
                {finishingPieDocument && (
                  <StatusSelector
                    statusId={finishingPieDocument.status_type_calculation}
                    pageKey={PAGE_FORMATS.TYPE_CALCULATION}
                    onChange={(statusId) => updateStatusMutation.mutate(statusId)}
                  />
                )}
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRow}>
                  Добавить
                </Button>
                <Button danger icon={<DeleteOutlined />} onClick={handleEnterDeleteMode}>
                  Удалить
                </Button>
              </>
            ) : mode === 'delete' ? (
              <>
                <Button
                  danger
                  type="primary"
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteSelected}
                  disabled={selectedRowKeys.length === 0}
                >
                  Удалить ({selectedRowKeys.length})
                </Button>
                <Button icon={<CloseOutlined />} onClick={handleCancelEdit}>
                  Отмена
                </Button>
              </>
            ) : (
              <>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveDocument}>
                  Сохранить
                </Button>
                <Button icon={<CloseOutlined />} onClick={handleCancelEdit}>
                  Отмена
                </Button>
              </>
            )}
          </Space>
        </Space>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '0 24px 24px 24px' }}>
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={rowsLoading}
          pagination={{ defaultPageSize: 100, showSizeChanger: true }}
          scroll={{ y: 'calc(100vh - 400px)', x: 'max-content' }}
          rowSelection={
            mode === 'delete'
              ? {
                  selectedRowKeys,
                  onChange: setSelectedRowKeys,
                }
              : undefined
          }
          locale={{ emptyText: 'Нет данных' }}
        />
      </div>

      <FloorQuantitiesModal
        open={floorModalOpen}
        info={floorModalInfo}
        floorData={floorModalData}
        isEdit={floorModalIsEdit}
        onClose={() => setFloorModalOpen(false)}
        onSave={handleFloorModalSave}
      />
    </div>
  )
}
