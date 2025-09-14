import React, { useState, useCallback } from 'react'
import { Modal, Checkbox, InputNumber, Typography, Table } from 'antd'

const { Title, Text } = Typography

// CSS стили для правильного отображения таблицы на полную высоту
const tableStyles = `
.building-table .ant-table {
  height: 100% !important;
  margin: 0 !important;
}
.building-table .ant-table-container {
  height: 100% !important;
  padding: 0 !important;
}
.building-table .ant-table-content {
  height: 100% !important;
  overflow: visible !important;
}
.building-table .ant-table-body {
  height: 100% !important;
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
  height: calc(100% - 20px) !important;
}
`

export type BlockType = 'Подземная парковка' | 'Типовой корпус' | 'Стилобат' | 'Кровля'

interface Block {
  id: number
  name: string
  bottomFloor: number
  topFloor: number
  x: number
  y: number
}

interface Stylobate {
  id: string
  name: string
  fromBlockId: number
  toBlockId: number
  floors: number
  x: number
  y: number
}

interface UndergroundParking {
  blockIds: number[]
  connections: Array<{ fromBlockId: number; toBlockId: number }>
}

interface ProjectCardModalProps {
  visible: boolean
  onCancel: () => void
  onSave: (data: {
    blocks: Block[]
    stylobates: Stylobate[]
    undergroundParking: UndergroundParking
  }) => void
  projectData: {
    name: string
    address: string
    blocks: Array<{
      name: string
      bottomFloor: number
      topFloor: number
    }>
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
        id: index + 1,
        name: block.name,
        bottomFloor: block.bottomFloor,
        topFloor: block.topFloor,
        x: 0,
        y: 0,
      }))
      setBlocks(generatedBlocks)
    }
  }, [visible, projectData.blocks])

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

  const handleSave = () => {
    onSave({
      blocks,
      stylobates,
      undergroundParking,
    })
  }

  const createBuildingTableData = () => {
    if (!blocks.length) return []

    // Находим диапазон этажей
    const maxTopFloor = Math.max(...blocks.map((block) => block.topFloor))
    const minBottomFloor = Math.min(...blocks.map((block) => block.bottomFloor))

    console.log('🏢 Generating table data for floor range:', minBottomFloor, 'to', maxTopFloor)

    const tableData = []

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
      }

      tableData.push(row)
    }

    console.log('📋 Generated table data:', tableData.length, 'rows')
    console.log('🔍 Sample row keys:', Object.keys(tableData[0] || {}))

    return tableData
  }

  const createTableColumns = () => {
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

    console.log('🏗️ Creating table columns for blocks:', blocks.length)

    // Используем длину tableData для расчётов размера шрифта
    const totalRows = tableData.length

    // Добавляем левый отступ 50px
    columns.push({
      title: '',
      dataIndex: 'left_margin',
      key: 'left_margin',
      width: 50,
      render: () => null, // Пустая колонка для отступа
    })
    console.log('✅ Added left margin column: 50px')

    // Добавляем колонки для каждого корпуса и промежутки между ними
    blocks.forEach((block, index) => {
      // Колонка корпуса - фиксированная ширина 100px
      columns.push({
        title: block.name,
        dataIndex: `block_${block.id}`,
        key: `block_${block.id}`,
        width: 100,
        render: (cell: { floor: number; backgroundColor: string; blockName?: string } | null) => {
          if (!cell) return null
          return (
            <div
              style={{
                backgroundColor: cell.backgroundColor,
                height: '100%',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: Math.max(8, Math.min(12, totalRows > 0 ? 300 / totalRows : 10)),
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
      console.log(`✅ Added building column [${index}]: ${block.name} - 100px`)

      // Добавляем промежуток между корпусами (кроме последнего корпуса) - фиксированная ширина 100px
      if (index < blocks.length - 1) {
        const nextBlock = blocks[index + 1]

        // Колонка промежутка (для стилобатов и подземных соединений)
        columns.push({
          title: '', // Пустой заголовок для промежутка
          dataIndex: `connection_${block.id}_${nextBlock.id}`,
          key: `connection_${block.id}_${nextBlock.id}`,
          width: 100,
          render: (
            cell: { floor: number; backgroundColor: string; type?: string; name?: string } | null,
          ) => {
            if (!cell) return null
            return (
              <div
                style={{
                  backgroundColor: cell.backgroundColor,
                  height: '100%',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: Math.max(7, Math.min(10, totalRows > 0 ? 250 / totalRows : 8)),
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
        console.log(
          `✅ Added connection column [${index}]: ${block.name} -> ${nextBlock.name} - 100px`,
        )
      }
    })

    // Рассчитываем правый отступ: ширина модального окна минус все колонки
    // Модальное окно: 98vw (примерно ~1900px на широком экране)
    // Корпуса и промежутки по 100px каждый
    // Используем константу для расчёта
    const modalWidth = typeof window !== 'undefined' ? window.innerWidth * 0.98 : 1900
    const usedWidth = columns.reduce((sum, col) => sum + col.width, 0)
    const rightPadding = Math.max(0, modalWidth - usedWidth)

    // Добавляем правый отступ как последнюю колонку
    columns.push({
      title: '',
      dataIndex: 'right_margin',
      key: 'right_margin',
      width: rightPadding,
      render: () => null, // Пустая колонка для правого отступа
    })

    console.log('📊 Total columns created:', columns.length)
    console.log('📏 Used width (without right margin):', usedWidth + 'px')
    console.log('🖥️ Modal width:', modalWidth + 'px')
    console.log('➡️ Right padding calculated:', rightPadding + 'px')
    console.log('📏 Total expected width:', columns.reduce((sum, col) => sum + col.width, 0) + 'px')
    console.log(
      '📋 Column details:',
      columns.map((col) => `${col.key}: ${col.width}px`),
    )

    return columns
  }

  const tableData = createBuildingTableData()
  const tableColumns = createTableColumns()

  // Рассчитываем динамическую высоту строк
  const totalRows = tableData.length
  const dynamicRowHeight = totalRows > 0 ? `calc((100vh - 300px) / ${totalRows})` : '20px'

  console.log('🎯 Rendering ProjectCardModal with:')
  console.log('   - Table data rows:', tableData.length)
  console.log('   - Table columns:', tableColumns.length)
  console.log('   - Dynamic row height:', dynamicRowHeight)

  return (
    <>
      <style>{tableStyles}</style>
      <Modal
        open={visible}
        title="Карточка проекта"
        onCancel={onCancel}
        onOk={handleSave}
        width="98vw"
        style={{ top: 20, height: 'calc(100vh - 40px)' }}
        styles={{
          body: {
            height: 'calc(100vh - 140px)',
            overflow: 'hidden',
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
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            flexShrink: 0,
          }}
        >
          {/* Информация о проекте */}
          <div style={{ flex: '0 0 auto' }}>
            <Title level={3}>{projectData.name}</Title>
            <Text>{projectData.address}</Text>
            <br />
            <Text>
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

              {/* Подземная парковка */}
              <div>
                <Text strong style={{ fontSize: '0.75em', marginRight: 8 }}>
                  Подз.парковка:
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
                <Text style={{ fontSize: '0.7em', lineHeight: 1.2 }}>Подземная парковка</Text>
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
            flex: 1,
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          <Table
            dataSource={tableData}
            columns={tableColumns}
            pagination={false}
            scroll={{
              x: tableColumns.reduce((sum, col) => sum + col.width, 0),
              y: undefined
            }}
            size="small"
            bordered={false}
            showHeader={true}
            tableLayout="fixed"
            style={{
              backgroundColor: 'transparent',
              height: '100%',
            }}
            className="building-table"
            onHeaderRow={() => {
              console.log('🔍 Table header rendered')
              return {}
            }}
            onRow={() => {
              console.log('🔍 Table row rendered')
              return {}
            }}
          />
        </div>
        <style>{`
          .building-table .ant-table {
            table-layout: fixed !important;
            height: 100% !important;
            width: 100% !important;
          }
          .building-table .ant-table-container {
            height: 100% !important;
            overflow: auto !important;
          }
          .building-table .ant-table-content {
            height: 100% !important;
          }
          .building-table .ant-table-body {
            height: calc(100% - 40px) !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }
          .building-table .ant-table-tbody {
            height: 100% !important;
          }
          .building-table .ant-table-tbody > tr {
            height: ${dynamicRowHeight} !important;
          }
          .building-table .ant-table-tbody > tr > td {
            padding: 0 !important;
            border: 1px solid #d9d9d9 !important;
            vertical-align: middle !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            height: ${dynamicRowHeight} !important;
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
