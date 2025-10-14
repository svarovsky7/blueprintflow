import React, { useState, useCallback } from 'react'
import { Modal, Table, Button, InputNumber } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { parseNumberWithSeparators } from '@/shared/lib'

interface FloorModalRow {
  floor_number: number
  quantitySpec: number | null
  quantityRd: number | null
}

interface FloorModalInfo {
  block_name?: string | null
  location_name?: string | null
  room_type_name?: string | null
  pie_type_name?: string | null
  surface_type_name?: string | null
}

interface FloorQuantitiesModalProps {
  open: boolean
  info: FloorModalInfo
  floorData: FloorModalRow[]
  isEdit: boolean
  onClose: () => void
  onSave?: (floors: FloorModalRow[]) => void
}

export const FloorQuantitiesModal: React.FC<FloorQuantitiesModalProps> = ({
  open,
  info,
  floorData,
  isEdit,
  onClose,
  onSave,
}) => {
  const [localFloors, setLocalFloors] = useState<FloorModalRow[]>(floorData)

  React.useEffect(() => {
    setLocalFloors(floorData)
  }, [floorData])

  const addFloorRow = useCallback(() => {
    const maxFloor = localFloors.length > 0
      ? Math.max(...localFloors.map((f) => f.floor_number))
      : 0
    setLocalFloors([
      ...localFloors,
      { floor_number: maxFloor + 1, quantitySpec: null, quantityRd: null },
    ])
  }, [localFloors])

  const removeFloorRow = useCallback(
    (floorNumber: number) => {
      setLocalFloors(localFloors.filter((f) => f.floor_number !== floorNumber))
    },
    [localFloors]
  )

  const handleQuantityChange = useCallback(
    (floorNumber: number, field: 'quantitySpec' | 'quantityRd', value: number | null) => {
      setLocalFloors(
        localFloors.map((f) =>
          f.floor_number === floorNumber ? { ...f, [field]: value } : f
        )
      )
    },
    [localFloors]
  )

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(localFloors)
    }
    onClose()
  }, [localFloors, onSave, onClose])

  const columns = [
    {
      title: 'Этаж',
      dataIndex: 'floor_number',
      key: 'floor_number',
      width: 80,
    },
    {
      title: 'Кол-во по спеке РД',
      dataIndex: 'quantitySpec',
      key: 'quantitySpec',
      width: 160,
      render: (value: number | null, record: FloorModalRow) =>
        isEdit ? (
          <InputNumber
            value={value}
            onChange={(v) => handleQuantityChange(record.floor_number, 'quantitySpec', v)}
            min={0}
            precision={2}
            style={{ width: '100%' }}
            size="small"
            parser={parseNumberWithSeparators}
          />
        ) : (
          value ?? '-'
        ),
    },
    {
      title: 'Кол-во по пересчету РД',
      dataIndex: 'quantityRd',
      key: 'quantityRd',
      width: 180,
      render: (value: number | null, record: FloorModalRow) =>
        isEdit ? (
          <InputNumber
            value={value}
            onChange={(v) => handleQuantityChange(record.floor_number, 'quantityRd', v)}
            min={0}
            precision={2}
            style={{ width: '100%' }}
            size="small"
            parser={parseNumberWithSeparators}
          />
        ) : (
          value ?? '-'
        ),
    },
    ...(isEdit
      ? [
          {
            title: 'Действия',
            key: 'actions',
            width: 80,
            render: (_: unknown, record: FloorModalRow) => (
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeFloorRow(record.floor_number)}
                size="small"
              />
            ),
          },
        ]
      : []),
  ]

  return (
    <Modal
      title="Количество по этажам"
      open={open}
      onCancel={onClose}
      width={700}
      footer={
        isEdit ? (
          <>
            <Button onClick={onClose}>Отмена</Button>
            <Button type="primary" onClick={handleSave}>
              Сохранить
            </Button>
          </>
        ) : (
          <Button type="primary" onClick={onClose}>
            Закрыть
          </Button>
        )
      }
    >
      <div style={{ marginBottom: 16 }}>
        <div>
          <strong>Корпус:</strong> {info.block_name || '-'}
        </div>
        <div>
          <strong>Локализация:</strong> {info.location_name || '-'}
        </div>
        <div>
          <strong>Вид помещения:</strong> {info.room_type_name || '-'}
        </div>
        <div>
          <strong>Тип пирога:</strong> {info.pie_type_name || '-'}
        </div>
        <div>
          <strong>Тип поверхности:</strong> {info.surface_type_name || '-'}
        </div>
      </div>

      {isEdit && (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={addFloorRow}
          style={{ marginBottom: 16, width: '100%' }}
        >
          Добавить этаж
        </Button>
      )}

      <Table
        columns={columns}
        dataSource={localFloors}
        rowKey="floor_number"
        pagination={false}
        size="small"
        scroll={{ y: 400 }}
      />
    </Modal>
  )
}
