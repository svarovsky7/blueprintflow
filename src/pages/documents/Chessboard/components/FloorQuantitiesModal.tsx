import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Modal, Table, Button, Input, InputNumber } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { FloorModalRow, FloorModalInfo, FloorQuantities } from '../types'

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
  const [data, setData] = useState<FloorModalRow[]>(floorData)

  // Обновляем локальное состояние при изменении props
  useEffect(() => {
    setData(floorData)
  }, [floorData])

  const handleFloorChange = useCallback((index: number, field: keyof FloorModalRow, value: any) => {
    setData((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }, [])

  const addFloorRow = useCallback(() => {
    setData((prev) => [...prev, { floor: 0, quantityPd: '', quantitySpec: '', quantityRd: '' }])
  }, [])

  const removeFloorRow = useCallback((index: number) => {
    setData((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSave = useCallback(() => {
    onSave?.(data)
    onClose()
  }, [data, onSave, onClose])

  const handleCancel = useCallback(() => {
    setData(floorData)
    onClose()
  }, [floorData, onClose])

  const columns = useMemo<ColumnsType<FloorModalRow>>(
    () => [
      {
        title: 'Этаж',
        dataIndex: 'floor',
        width: 80,
        render: (_, record) => record.floor, // Этаж НЕ редактируется, согласно требованию
      },
      {
        title: 'Кол-во по ПД',
        dataIndex: 'quantityPd',
        width: 120,
        render: (_, record, index) =>
          isEdit ? (
            <Input
              value={record.quantityPd}
              onChange={(e) => handleFloorChange(index, 'quantityPd', e.target.value)}
              style={{ width: '100%' }}
            />
          ) : (
            record.quantityPd
          ),
      },
      {
        title: 'Кол-во по спеке РД',
        dataIndex: 'quantitySpec',
        width: 140,
        render: (_, record, index) =>
          isEdit ? (
            <Input
              value={record.quantitySpec}
              onChange={(e) => handleFloorChange(index, 'quantitySpec', e.target.value)}
              style={{ width: '100%' }}
            />
          ) : (
            record.quantitySpec
          ),
      },
      {
        title: 'Кол-во по пересчету РД',
        dataIndex: 'quantityRd',
        width: 160,
        render: (_, record, index) =>
          isEdit ? (
            <Input
              value={record.quantityRd}
              onChange={(e) => handleFloorChange(index, 'quantityRd', e.target.value)}
              style={{ width: '100%' }}
            />
          ) : (
            record.quantityRd
          ),
      },
      ...(isEdit
        ? [
            {
              title: 'Действия',
              key: 'actions',
              width: 80,
              render: (_: any, __: FloorModalRow, index: number) => (
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => removeFloorRow(index)}
                />
              ),
            },
          ]
        : []),
    ],
    [isEdit, handleFloorChange, removeFloorRow],
  )

  return (
    <Modal
      title="Количество по этажам"
      open={open}
      onCancel={handleCancel}
      onOk={isEdit ? handleSave : undefined}
      okText="Сохранить"
      cancelText={isEdit ? 'Отменить' : 'Закрыть'}
      footer={
        isEdit
          ? undefined
          : [
              <Button key="close" onClick={handleCancel}>
                Закрыть
              </Button>,
            ]
      }
      width={800}
    >
      <div style={{ marginBottom: 16 }}>
        <div>Шифр проекта: {info.projectCode || '-'}</div>
        <div>Название проекта: {info.projectName || '-'}</div>
        <div>Наименование работ: {info.workName || '-'}</div>
        <div>
          Материал: {info.material} ({info.unit})
        </div>
      </div>

      <Table
        dataSource={data.map((d, i) => ({ ...d, key: i }))}
        columns={columns}
        pagination={false}
        rowKey="key"
        size="small"
        scroll={{ x: 'max-content' }}
      />

      {isEdit && (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={addFloorRow}
          style={{ marginTop: 8, width: '100%' }}
        >
          Добавить этаж
        </Button>
      )}
    </Modal>
  )
}
