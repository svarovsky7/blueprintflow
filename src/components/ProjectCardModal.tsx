import React, { useState, useCallback, useMemo } from 'react'
import { Modal, Checkbox, InputNumber, Typography, Table, message } from 'antd'
import { type UIBlock, type UIStylobate, type UIUndergroundParking } from '@/entities/projects'

const { Title, Text } = Typography

// CSS стили для правильного отображения таблицы на полную высоту
const tableStyles = `
.building-table .ant-table {
  margin: 0 !important;
  width: 100% !important;
  table-layout: fixed !important;
}
.building-table .ant-table-container {
  padding: 0 !important;
  overflow: visible !important;
}
.building-table .ant-table-content {
  overflow: visible !important;
}
.building-table .ant-table-body {
  overflow: visible !important;
  padding: 0 !important;
}
.building-table .ant-table-thead {
  position: sticky;
  top: 0;
  z-index: 1;
  margin: 0 !important;
}
.building-table .ant-table-thead th {
  padding: 2px 4px !important;
  height: 20px !important;
  background: #fafafa !important;
  border-bottom: 1px solid #d9d9d9 !important;
  vertical-align: middle !important;
  line-height: 1 !important;
  font-size: 10px !important;
}
.building-table .ant-table-tbody td {
  padding: 0 !important;
  border: 1px solid #d9d9d9 !important;
  vertical-align: middle !important;
  line-height: 1 !important;
}
.building-table .ant-table-tbody {
  overflow: visible !important;
}
`

export type BlockType = 'Подземный паркинг' | 'Типовой корпус' | 'Стилобат' | 'Кровля'

// Переиспользуем типы из entities/projects
type Block = UIBlock
type Stylobate = UIStylobate
type UndergroundParking = UIUndergroundParking

interface ProjectCardModalProps {
  visible: boolean
  onCancel: () => void
  onSave: (data: {
    projectName: string
    projectAddress: string
    blocks: Block[]
    stylobates: Stylobate[]
    undergroundParking: UndergroundParking
  }) => Promise<void>
  projectData: {
    id: string // ID проекта (пустая строка для новых проектов)
    name: string
    address: string
    blocks: Array<{
      id?: number
      name: string
      bottomFloor: number
      topFloor: number
      x?: number
      y?: number
    }>
    stylobates?: Array<{
      id: string
      name: string
      fromBlockId: number
      toBlockId: number
      floors: number
      x: number
      y: number
    }>
    undergroundParking?: {
      blockIds: number[]
      connections: Array<{ fromBlockId: number; toBlockId: number }>
    }
  }
}

export default function ProjectCardModal({
  visible,
  onCancel,
  onSave,
  projectData,
}: ProjectCardModalProps) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [stylobates, setStylobates] = useState<Stylobate[]>([])
  const [undergroundParking, setUndergroundParking] = useState<UndergroundParking>({
    blockIds: [],
    connections: [],
  })

  React.useEffect(() => {
    if (visible && projectData.blocks.length > 0) {
      const generatedBlocks: Block[] = projectData.blocks.map((block, index) => ({
        id: block.id || index + 1,
        name: block.name,
        bottomFloor: block.bottomFloor,
        topFloor: block.topFloor,
        x: block.x || 0,
        y: block.y || 0,
      }))
      setBlocks(generatedBlocks)

      // Устанавливаем стилобаты, если они переданы
      if (projectData.stylobates) {
        setStylobates(projectData.stylobates)
      } else {
        setStylobates([])
      }

      // Устанавливаем подземную парковку, если она передана
      if (projectData.undergroundParking) {
        setUndergroundParking(projectData.undergroundParking)
      } else {
        setUndergroundParking({
          blockIds: [],
          connections: [],
        })
      }
    }
  }, [visible, projectData])

  const generateStylobateName = (fromBlock: Block, toBlock: Block) => {
    return `Стилобат (${fromBlock.name}-${toBlock.name})`
  }

  const handleStylobateChange = useCallback(
    (fromBlockId: number, toBlockId: number, checked: boolean) => {
      if (checked) {
        const fromBlock = blocks.find((b) => b.id === fromBlockId)!
        const toBlock = blocks.find((b) => b.id === toBlockId)!

        const newStylobate: Stylobate = {
          id: `stylobate-${fromBlockId}-${toBlockId}`,
          name: generateStylobateName(fromBlock, toBlock),
          fromBlockId,
          toBlockId,
          floors: 1,
          x: 0,
          y: 0,
        }
        setStylobates((prev) => [...prev, newStylobate])
      } else {
        setStylobates((prev) =>
          prev.filter((s) => s.fromBlockId !== fromBlockId || s.toBlockId !== toBlockId),
        )
      }
    },
    [blocks],
  )

  const handleStylobateFloorsChange = useCallback(
    (stylobateId: string, floors: number) => {
      setStylobates((prev) =>
        prev.map((s) => {
          if (s.id === stylobateId) {
            const fromBlock = blocks.find((b) => b.id === s.fromBlockId)!
            const toBlock = blocks.find((b) => b.id === s.toBlockId)!
            return { ...s, floors, name: generateStylobateName(fromBlock, toBlock) }
          }
          return s
        }),
      )
    },
    [blocks],
  )

  const handleUndergroundParkingBlockChange = useCallback((blockId: number, checked: boolean) => {
    setUndergroundParking((prev) => ({
      ...prev,
      blockIds: checked
        ? [...prev.blockIds, blockId]
        : prev.blockIds.filter((id) => id !== blockId),
    }))
  }, [])

  const handleUndergroundConnectionChange = useCallback(
    (fromBlockId: number, toBlockId: number, checked: boolean) => {
      setUndergroundParking((prev) => ({
        ...prev,
        connections: checked
          ? [...prev.connections, { fromBlockId, toBlockId }]
          : prev.connections.filter(
              (conn) => !(conn.fromBlockId === fromBlockId && conn.toBlockId === toBlockId),
            ),
      }))
    },
    [],
  )

  const handleSave = async () => {
    try {
      // Передаем все данные в родительский компонент для сохранения
      await onSave({
        projectName: projectData.name,
        projectAddress: projectData.address,
        blocks,
        stylobates,
        undergroundParking,
      })

      message.success('Данные проекта успешно сохранены')
    } catch (error) {
      console.error('Ошибка сохранения данных проекта:', error)
      message.error('Ошибка при сохранении данных проекта')
    }
  }

  // Вычисляем масштабирование для высоких зданий
  const scalingInfo = useMemo(() => {
    if (!blocks.length)
      return {
        totalFloors: 0,
        needsScaling: false,
        rowHeight: 12,
        maxTopFloor: 0,
        minBottomFloor: 0,
      }

    console.log(
      '🔍 ProjectCardModal: Calculating scaling for blocks:',
      blocks.map((b) => ({
        name: b.name,
        bottomFloor: b.bottomFloor,
        topFloor: b.topFloor,
      })),
    )

    const maxTopFloor = Math.max(...blocks.map((block) => block.topFloor))
    const minBottomFloor = Math.min(...blocks.map((block) => block.bottomFloor))
    const totalFloors = maxTopFloor - minBottomFloor + 1

    // Применяем масштабирование если этажей 43 и больше
    const needsScaling = totalFloors >= 43

    // Стандартная высота строки - 12px (было 20px)
    const standardRowHeight = 12
    // Минимальная высота строки при масштабировании
    const minRowHeight = 8

    let rowHeight = standardRowHeight
    if (needsScaling) {
      // Для очень высоких зданий (80+ этажей) используем более агрессивный расчет
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900

      // Уменьшаем отступы для максимального использования пространства
      const modalPadding = totalFloors > 70 ? 80 : 120 // Уменьшаем отступы для очень высоких зданий
      const controlsHeight = totalFloors > 70 ? 140 : 180 // Сжимаем управляющие элементы
      const headerHeight = totalFloors > 70 ? 25 : 40 // Уменьшаем высоту заголовка

      // Для зданий больше 70 этажей используем практически весь экран
      const availableHeight = viewportHeight - modalPadding - controlsHeight - headerHeight

      // Вычисляем оптимальную высоту строки
      const calculatedHeight = availableHeight / totalFloors

      // Для очень высоких зданий позволяем минимальную высоту строки до 6px
      const effectiveMinRowHeight = totalFloors > 70 ? 6 : minRowHeight
      rowHeight = Math.max(calculatedHeight, effectiveMinRowHeight)

      console.log('🔍 ProjectCardModal: Enhanced scaling calculation:', {
        viewportHeight,
        totalFloors,
        modalPadding,
        controlsHeight,
        headerHeight,
        availableHeight,
        calculatedHeight,
        effectiveMinRowHeight,
        finalRowHeight: rowHeight,
        isVeryTallBuilding: totalFloors > 70,
      })
    }

    const result = {
      totalFloors,
      needsScaling,
      rowHeight: Math.round(rowHeight),
      maxTopFloor,
      minBottomFloor,
    }

    console.log('🔍 ProjectCardModal: Scaling info calculated:', result)

    return result
  }, [blocks])

  const tableData = useMemo(() => {
    if (!blocks.length) return []

    const data = []

    // Используем значения из scalingInfo
    const { maxTopFloor, minBottomFloor } = scalingInfo

    // Создаем данные для каждого этажа
    for (let floor = maxTopFloor; floor >= minBottomFloor; floor--) {
      const row: Record<string, unknown> = {
        key: floor,
        floor: floor,
      }

      // Для каждого корпуса проверяем, есть ли этот этаж
      blocks.forEach((block) => {
        const blockKey = `block_${block.id}`
        if (floor <= block.topFloor && floor >= block.bottomFloor) {
          // Определяем тип этажа и цвет
          let backgroundColor
          const hasUndergroundParking = undergroundParking.blockIds.includes(block.id)

          if (floor === 0) {
            backgroundColor = '#fff2e8' // Кровля
          } else if (floor > 0) {
            backgroundColor = '#f6ffed' // Типовой корпус
          } else {
            backgroundColor = hasUndergroundParking ? '#e6f7ff' : '#f6ffed'
          }

          row[blockKey] = {
            floor,
            backgroundColor,
            blockName: block.name,
          }
        } else {
          row[blockKey] = null
        }
      })

      // Проверяем стилобаты и подземные соединения между корпусами
      for (let i = 0; i < blocks.length - 1; i++) {
        const fromBlock = blocks[i]
        const toBlock = blocks[i + 1]
        const connectionKey = `connection_${fromBlock.id}_${toBlock.id}`

        const stylobate = stylobates.find(
          (s) => s.fromBlockId === fromBlock.id && s.toBlockId === toBlock.id,
        )
        const connection = undergroundParking.connections.find(
          (c) => c.fromBlockId === fromBlock.id && c.toBlockId === toBlock.id,
        )

        // Стилобат - только для положительных этажей
        if (stylobate && floor > 0 && floor <= stylobate.floors) {
          row[connectionKey] = {
            floor,
            backgroundColor: '#fffbe6', // Цвет стилобата
            type: 'stylobate',
            name: stylobate.name,
          }
        }
        // Подземное соединение - для этажа 0 и отрицательных этажей
        // И только в диапазоне этажей обоих корпусов
        else if (connection && floor <= 0) {
          const minBottomFloor = Math.max(fromBlock.bottomFloor, toBlock.bottomFloor)
          if (floor >= minBottomFloor) {
            // Определяем цвет: 0 этаж - как кровля, отрицательные - как подземная парковка
            const backgroundColor = floor === 0 ? '#fff2e8' : '#e6f7ff'
            row[connectionKey] = {
              floor,
              backgroundColor,
              type: 'underground',
            }
          }
        }
        // Если ничего не найдено, оставляем пустую ячейку
        else {
          row[connectionKey] = null
        }
      }

      data.push(row)
    }

    return data
  }, [blocks, stylobates, undergroundParking, scalingInfo])

  // Динамические стили для масштабирования
  const scalingStyles = useMemo(() => {
    if (!scalingInfo.needsScaling) {
      console.log('🔍 ProjectCardModal: No scaling needed')
      return ''
    }

    const isVeryTallBuilding = scalingInfo.totalFloors > 70
    const styles = `
      .building-table-scaled.building-table .ant-table-tbody tr {
        height: ${scalingInfo.rowHeight}px !important;
        min-height: ${scalingInfo.rowHeight}px !important;
        max-height: ${scalingInfo.rowHeight}px !important;
      }
      .building-table-scaled.building-table .ant-table-tbody tr td {
        height: ${scalingInfo.rowHeight}px !important;
        min-height: ${scalingInfo.rowHeight}px !important;
        max-height: ${scalingInfo.rowHeight}px !important;
        font-size: ${Math.max(5, Math.round(scalingInfo.rowHeight * 0.6))}px !important;
        line-height: 1 !important;
        padding: 0 ${isVeryTallBuilding ? 0 : 1}px !important;
        vertical-align: middle !important;
      }
      .building-table-scaled.building-table .ant-table-thead tr th {
        height: ${isVeryTallBuilding ? Math.max(15, scalingInfo.rowHeight + 3) : Math.max(20, scalingInfo.rowHeight + 8)}px !important;
        font-size: ${Math.max(6, Math.round(scalingInfo.rowHeight * 0.7))}px !important;
        padding: ${isVeryTallBuilding ? '0 1px' : '1px 2px'} !important;
        vertical-align: middle !important;
      }
      .building-table-scaled.building-table .ant-table,
      .building-table-scaled.building-table .ant-table-content,
      .building-table-scaled.building-table .ant-table-body,
      .building-table-scaled.building-table .ant-table-tbody {
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
      }
      .building-table-scaled.building-table .ant-table-container {
        overflow-x: auto !important;
        overflow-y: visible !important;
        height: auto !important;
      }
    `

    console.log('🔍 ProjectCardModal: Generated scaling styles:', styles)
    return styles
  }, [scalingInfo])

  const tableColumns = useMemo(() => {
    const columns: Array<{
      title: string
      dataIndex: string
      key: string
      width: number
      render: (
        cell: {
          floor: number
          backgroundColor: string
          blockName?: string
          type?: string
          name?: string
        } | null,
      ) => React.ReactNode
    }> = []

    // Добавляем левый отступ 50px
    columns.push({
      title: '',
      dataIndex: 'left_margin',
      key: 'left_margin',
      width: 50,
      render: () => null, // Пустая колонка для отступа
    })

    // Рассчитываем ширину колонок заранее
    const totalBlocks = blocks.length
    const totalConnections = Math.max(0, blocks.length - 1)
    const modalWidth = typeof window !== 'undefined' ? window.innerWidth * 0.98 - 64 : 1836 // 64px = 32px padding с каждой стороны
    const requiredWidth = 50 + (totalBlocks + totalConnections) * 100 // 50px левый отступ + по 100px на колонку

    let blockWidth = 100
    let connectionWidth = 100

    if (requiredWidth > modalWidth) {
      // Уменьшаем ширину колонок чтобы избежать скролла
      const availableWidthForBlocks = modalWidth - 50 // Вычитаем левый отступ
      blockWidth = Math.floor(availableWidthForBlocks / (totalBlocks + totalConnections))
      connectionWidth = blockWidth
    }

    // Добавляем колонки для каждого корпуса и промежутки между ними
    blocks.forEach((block, index) => {
      // Колонка корпуса - динамическая ширина
      columns.push({
        title: block.name,
        dataIndex: `block_${block.id}`,
        key: `block_${block.id}`,
        width: blockWidth,
        render: (cell: { floor: number; backgroundColor: string; blockName?: string } | null) => {
          if (!cell) {
            return (
              <div
                style={{
                  height: '100%',
                  width: '100%',
                  border: 'none',
                  backgroundColor: 'transparent',
                }}
              />
            )
          }
          return (
            <div
              style={{
                backgroundColor: cell.backgroundColor,
                height: '100%',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 8,
                fontWeight: 'bold',
                margin: 0,
                padding: 0,
                boxSizing: 'border-box',
              }}
            >
              {cell.floor}
            </div>
          )
        },
      })

      // Добавляем промежуток между корпусами (кроме последнего корпуса) - фиксированная ширина 100px
      if (index < blocks.length - 1) {
        const nextBlock = blocks[index + 1]

        // Найдем стилобат между этими корпусами
        const stylobateBetween = stylobates.find(
          (s) => s.fromBlockId === block.id && s.toBlockId === nextBlock.id,
        )

        // Колонка промежутка (для стилобатов и подземных соединений)
        columns.push({
          title: stylobateBetween ? stylobateBetween.name : '', // Показываем название стилобата
          dataIndex: `connection_${block.id}_${nextBlock.id}`,
          key: `connection_${block.id}_${nextBlock.id}`,
          width: connectionWidth,
          render: (
            cell: { floor: number; backgroundColor: string; type?: string; name?: string } | null,
          ) => {
            if (!cell) {
              return (
                <div
                  style={{
                    height: '100%',
                    width: '100%',
                    border: 'none',
                    backgroundColor: 'transparent',
                  }}
                />
              )
            }
            return (
              <div
                style={{
                  backgroundColor: cell.backgroundColor,
                  height: '100%',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 8,
                  margin: 0,
                  padding: 0,
                  boxSizing: 'border-box',
                }}
              >
                {cell.floor}
              </div>
            )
          },
        })
      }
    })

    // Рассчитываем правый отступ
    const finalUsedWidth = columns.reduce((sum, col) => sum + col.width, 0)
    const rightPadding = Math.max(0, modalWidth - finalUsedWidth)

    // Добавляем правый отступ как последнюю колонку только если есть свободное место
    if (rightPadding > 10) {
      columns.push({
        title: '',
        dataIndex: 'right_margin',
        key: 'right_margin',
        width: rightPadding,
        render: () => null, // Пустая колонка для правого отступа
      })
    }

    return columns
  }, [blocks, stylobates])

  return (
    <>
      <style>{tableStyles + scalingStyles}</style>
      <Modal
        open={visible}
        title={
          scalingInfo.needsScaling
            ? `Карточка проекта (${scalingInfo.totalFloors} этажей - ${scalingInfo.totalFloors > 70 ? 'ультра-масштабирование' : 'масштабируется'})`
            : 'Карточка проекта'
        }
        onCancel={onCancel}
        onOk={handleSave}
        width="98vw"
        style={{
          top: 10,
          // Убираем фиксированную высоту для высотных зданий
          height: scalingInfo.totalFloors > 59 ? 'auto' : 'calc(100vh - 40px)',
          maxHeight: scalingInfo.totalFloors > 59 ? 'calc(100vh - 20px)' : undefined,
        }}
        styles={{
          body: {
            // Динамическая высота для высотных зданий
            height: scalingInfo.totalFloors > 59 ? 'auto' : 'calc(100vh - 140px)',
            maxHeight: scalingInfo.totalFloors > 59 ? 'calc(100vh - 120px)' : undefined,
            overflow: scalingInfo.totalFloors > 59 ? 'auto' : 'hidden',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <div
          style={{
            marginBottom: scalingInfo.totalFloors > 70 ? 12 : 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: scalingInfo.totalFloors > 70 ? 12 : 16,
            flexShrink: 0,
          }}
        >
          {/* Информация о проекте */}
          <div style={{ flex: '0 0 auto' }}>
            <Title
              level={scalingInfo.totalFloors > 70 ? 4 : 3}
              style={{ marginBottom: scalingInfo.totalFloors > 70 ? 8 : undefined }}
            >
              {projectData.name}
            </Title>
            <Text style={{ fontSize: scalingInfo.totalFloors > 70 ? '12px' : undefined }}>
              {projectData.address}
            </Text>
            <br />
            <Text style={{ fontSize: scalingInfo.totalFloors > 70 ? '11px' : undefined }}>
              Количество корпусов: {blocks.length} (
              {blocks.map((b) => `${b.bottomFloor}; ${b.topFloor}`).join(', ')})
            </Text>
          </div>

          {/* Элементы управления */}
          <div style={{ flex: 1, minWidth: 400 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {/* Стилобаты */}
              {blocks.length > 1 && (
                <div>
                  <Text strong style={{ fontSize: '0.75em', marginRight: 8 }}>
                    Стилобаты:
                  </Text>
                  {blocks.slice(0, -1).map((block, index) => {
                    const nextBlock = blocks[index + 1]
                    const stylobate = stylobates.find(
                      (s) => s.fromBlockId === block.id && s.toBlockId === nextBlock.id,
                    )
                    const isChecked = !!stylobate

                    return (
                      <span
                        key={`stylobate-${block.id}-${nextBlock.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          marginRight: 12,
                        }}
                      >
                        <Checkbox
                          checked={isChecked}
                          onChange={(e) =>
                            handleStylobateChange(block.id, nextBlock.id, e.target.checked)
                          }
                        />
                        <Text style={{ fontSize: '0.7em' }}>
                          {block.name}↔{nextBlock.name}
                        </Text>
                        {isChecked && (
                          <InputNumber
                            size="small"
                            min={1}
                            value={stylobate?.floors || 1}
                            onChange={(value) =>
                              handleStylobateFloorsChange(stylobate!.id, value || 1)
                            }
                            style={{ width: 40, marginLeft: 4 }}
                          />
                        )}
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Подземный паркинг */}
              <div>
                <Text strong style={{ fontSize: '0.75em', marginRight: 8 }}>
                  Подз.паркинг:
                </Text>
                {blocks.map((block) => {
                  const isChecked = undergroundParking.blockIds.includes(block.id)
                  return (
                    <span
                      key={`underground-${block.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        marginRight: 12,
                      }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onChange={(e) =>
                          handleUndergroundParkingBlockChange(block.id, e.target.checked)
                        }
                      />
                      <Text style={{ fontSize: '0.7em' }}>{block.name}</Text>
                    </span>
                  )
                })}
              </div>

              {/* Подземные соединения */}
              {blocks.length > 1 && (
                <div>
                  <Text strong style={{ fontSize: '0.75em', marginRight: 8 }}>
                    Подз.соединения:
                  </Text>
                  {blocks.slice(0, -1).map((block, index) => {
                    const nextBlock = blocks[index + 1]
                    const isChecked = undergroundParking.connections.some(
                      (conn) => conn.fromBlockId === block.id && conn.toBlockId === nextBlock.id,
                    )

                    return (
                      <span
                        key={`underground-connection-${block.id}-${nextBlock.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          marginRight: 12,
                        }}
                      >
                        <Checkbox
                          checked={isChecked}
                          onChange={(e) =>
                            handleUndergroundConnectionChange(
                              block.id,
                              nextBlock.id,
                              e.target.checked,
                            )
                          }
                        />
                        <Text style={{ fontSize: '0.7em' }}>
                          {block.name}↔{nextBlock.name}
                        </Text>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Цветовая легенда */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              minWidth: 250,
              flexShrink: 0,
            }}
          >
            <Text strong style={{ fontSize: '0.9em', marginBottom: 4 }}>
              Легенда:
            </Text>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: '1fr 1fr',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: '0.8em',
                    height: '0.8em',
                    backgroundColor: '#e6f7ff',
                    border: '1px solid #91d5ff',
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
                <Text style={{ fontSize: '0.7em', lineHeight: 1.2 }}>Подземный паркинг</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: '0.8em',
                    height: '0.8em',
                    backgroundColor: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
                <Text style={{ fontSize: '0.7em', lineHeight: 1.2 }}>Типовой корпус</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: '0.8em',
                    height: '0.8em',
                    backgroundColor: '#fffbe6',
                    border: '1px solid #ffe58f',
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
                <Text style={{ fontSize: '0.7em', lineHeight: 1.2 }}>Стилобат</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: '0.8em',
                    height: '0.8em',
                    backgroundColor: '#fff2e8',
                    border: '1px solid #ffbb96',
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
                <Text style={{ fontSize: '0.7em', lineHeight: 1.2 }}>Кровля</Text>
              </div>
            </div>
          </div>
        </div>

        {/* Табличное отображение корпусов */}
        <div
          style={{
            backgroundColor: '#fafafa',
            border: '1px solid #d9d9d9',
            // Для высотных зданий убираем flex и задаем высоту по содержимому
            flex: scalingInfo.totalFloors > 59 ? 'none' : 1,
            overflow: scalingInfo.totalFloors > 59 ? 'visible' : 'hidden',
            minHeight: scalingInfo.totalFloors > 59 ? 'auto' : 0,
            display: 'flex',
            flexDirection: 'column',
            // Для высотных зданий явно задаем высоту контейнера
            height:
              scalingInfo.totalFloors > 59
                ? `${scalingInfo.totalFloors * scalingInfo.rowHeight + 50}px` // +50px для заголовка и отступов
                : undefined,
          }}
        >
          <Table
            dataSource={tableData}
            columns={tableColumns}
            pagination={false}
            scroll={{
              x: tableColumns.reduce((sum, col) => sum + col.width, 0),
              // Для высотных зданий НЕ ограничиваем вертикальную прокрутку
              y: scalingInfo.totalFloors > 59 ? undefined : 'calc(100vh - 300px)',
            }}
            size="small"
            bordered={false}
            showHeader={true}
            tableLayout="fixed"
            style={{
              backgroundColor: 'transparent',
              // Для высотных зданий убираем flex и задаем точную высоту
              flex: scalingInfo.totalFloors > 59 ? 'none' : 1,
              height:
                scalingInfo.totalFloors > 59
                  ? `${scalingInfo.totalFloors * scalingInfo.rowHeight + 40}px` // +40px для заголовка
                  : 'auto',
            }}
            className={(() => {
              const className = scalingInfo.needsScaling
                ? 'building-table building-table-scaled'
                : 'building-table'
              console.log(
                '🔍 ProjectCardModal: Applied className:',
                className,
                'Total height:',
                scalingInfo.totalFloors > 59
                  ? `${scalingInfo.totalFloors * scalingInfo.rowHeight + 40}px`
                  : 'auto',
              )
              return className
            })()}
          />
        </div>
        <style>{`
          .building-table .ant-table {
            table-layout: fixed !important;
            width: 100% !important;
          }
          .building-table .ant-table-container {
            overflow: visible !important;
          }
          .building-table-scaled .ant-table-container {
            overflow: visible !important;
          }
          .building-table .ant-table-content {
            overflow: visible !important;
          }
          .building-table .ant-table-body {
            overflow: visible !important;
          }
          .building-table .ant-table-tbody {
            overflow: visible !important;
          }
          .building-table .ant-table-tbody > tr {
            height: 12px !important;
            min-height: 12px !important;
          }
          .building-table .ant-table-tbody > tr > td {
            padding: 0 !important;
            border: none !important;
            vertical-align: middle !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            height: 12px !important;
            min-height: 12px !important;
          }
          .building-table .ant-table-tbody > tr > td > div:not([style*="transparent"]) {
            border: 1px solid #d9d9d9 !important;
          }
          .building-table .ant-table-thead > tr > th {
            padding: 2px 4px !important;
            background: #fafafa !important;
            border: 1px solid #d9d9d9 !important;
            text-align: center !important;
            font-size: 12px !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            height: 40px !important;
          }
          .building-table .ant-table-tbody > tr:hover > td {
            background: transparent !important;
          }
        `}</style>
      </Modal>
    </>
  )
}
