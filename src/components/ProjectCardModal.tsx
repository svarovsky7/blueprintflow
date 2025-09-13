import React, { useState, useCallback } from 'react'
import { Modal, Checkbox, InputNumber, Typography } from 'antd'

const { Title, Text } = Typography

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
      // Находим максимальный верхний этаж и минимальный нижний этаж
      const maxTopFloor = Math.max(...projectData.blocks.map((block) => block.topFloor))
      const minBottomFloor = Math.min(...projectData.blocks.map((block) => block.bottomFloor))

      // Общая высота от самого нижнего до самого верхнего этажа
      const totalFloorsHeight = (maxTopFloor - minBottomFloor + 1) * 15

      // Центрируем все корпуса в доступном пространстве (700px высота контейнера)
      // Оставляем место сверху и снизу для элементов управления
      const availableHeight = 700 - 100 // 100px для отступов и элементов управления
      const startY = Math.max(50, (availableHeight - totalFloorsHeight) / 2 + 50)

      // Базовая линия нулевого этажа
      const groundLineY = startY + maxTopFloor * 15

      const generatedBlocks: Block[] = projectData.blocks.map((block, index) => {
        // Вычисляем Y позицию так, чтобы нулевой этаж был на одной линии
        const blockY = groundLineY - block.topFloor * 15

        return {
          id: index + 1,
          name: block.name,
          bottomFloor: block.bottomFloor,
          topFloor: block.topFloor,
          x: 100 + index * 200,
          y: blockY,
        }
      })
      setBlocks(generatedBlocks)
    }
  }, [visible, projectData.blocks])

  const generateStylobateName = (fromBlock: Block, toBlock: Block) => {
    const getShortName = (blockName: string) => {
      // Если имя корпуса - это число, используем номер
      if (/^\d+$/.test(blockName)) {
        return blockName
      }
      // Иначе берём первые 3 буквы
      return blockName.substring(0, 3)
    }

    const fromName = getShortName(fromBlock.name)
    const toName = getShortName(toBlock.name)

    return `Стилобат ${fromName}-${toName}`
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
          x: 100 + (fromBlockId - 1) * 200 + 100,
          y: 150,
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

  const renderBlock = (block: Block) => {
    const hasUndergroundParking = undergroundParking.blockIds.includes(block.id)
    const floors = []
    for (let floor = block.topFloor; floor >= block.bottomFloor; floor--) {
      let backgroundColor
      if (floor === 0) {
        backgroundColor = '#fff2e8' // Кровля (оранжевый)
      } else if (floor > 0) {
        backgroundColor = '#f6ffed' // Типовой корпус (салатовый)
      } else {
        // Подземные этажи
        backgroundColor = hasUndergroundParking ? '#e6f7ff' : '#f6ffed' // Подземная парковка (голубой) или типовой корпус
      }

      floors.push(
        <div
          key={floor}
          style={{
            height: 15,
            border: '1px solid #d9d9d9',
            backgroundColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
          }}
        >
          {floor}
        </div>,
      )
    }
    return (
      <div
        key={block.id}
        style={{
          position: 'absolute',
          left: block.x,
          top: block.y,
          width: 120,
        }}
      >
        <div
          style={{
            textAlign: 'center',
            marginBottom: 4,
            fontSize: 12,
            fontWeight: 'bold',
          }}
        >
          {block.name}
        </div>
        <div style={{ border: '2px solid #1890ff', marginBottom: 10 }}>{floors}</div>
      </div>
    )
  }

  const renderGroundLine = () => {
    const maxX = Math.max(...blocks.map((b) => b.x + 120))

    // Вычисляем позицию линии земли на основе текущего позиционирования корпусов
    const maxTopFloor = Math.max(...blocks.map((block) => block.topFloor))
    const minBottomFloor = Math.min(...blocks.map((block) => block.bottomFloor))
    const totalFloorsHeight = (maxTopFloor - minBottomFloor + 1) * 15
    const availableHeight = 700 - 100
    const startY = Math.max(50, (availableHeight - totalFloorsHeight) / 2 + 50)
    const groundLineY = startY + maxTopFloor * 15

    return (
      <div
        style={{
          position: 'absolute',
          left: 50,
          top: groundLineY,
          width: maxX - 30,
          height: 2,
          backgroundColor: '#8B4513',
          zIndex: 1,
        }}
      />
    )
  }

  const renderStylobateControls = () => {
    const controls = []
    for (let i = 0; i < blocks.length - 1; i++) {
      const fromBlock = blocks[i]
      const toBlock = blocks[i + 1]
      const stylobate = stylobates.find(
        (s) => s.fromBlockId === fromBlock.id && s.toBlockId === toBlock.id,
      )
      const isChecked = !!stylobate

      controls.push(
        <div
          key={`stylobate-${fromBlock.id}-${toBlock.id}`}
          style={{
            position: 'absolute',
            left: fromBlock.x + 60,
            top: 135,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Checkbox
            checked={isChecked}
            onChange={(e) => handleStylobateChange(fromBlock.id, toBlock.id, e.target.checked)}
          />
          {isChecked && (
            <InputNumber
              size="small"
              min={1}
              value={stylobate?.floors || 1}
              onChange={(value) => handleStylobateFloorsChange(stylobate!.id, value || 1)}
              style={{ width: 60, marginTop: 4 }}
            />
          )}
        </div>,
      )
    }
    return controls
  }

  const renderUndergroundControls = () => {
    // Вычисляем позицию ниже границ корпусов
    const maxTopFloor = Math.max(...blocks.map((block) => block.topFloor))
    const minBottomFloor = Math.min(...blocks.map((block) => block.bottomFloor))
    const totalFloorsHeight = (maxTopFloor - minBottomFloor + 1) * 15
    const availableHeight = 700 - 100
    const startY = Math.max(50, (availableHeight - totalFloorsHeight) / 2 + 50)

    // Позиция ниже самого нижнего этажа корпусов + отступ
    const checkboxesY = startY + totalFloorsHeight + 30
    const controls = []

    // Подземная парковка под корпусами - первый и последний чекбокс по центру корпусов
    blocks.forEach((block, index) => {
      const isChecked = undergroundParking.blockIds.includes(block.id)
      controls.push(
        <div
          key={`underground-${block.id}`}
          style={{
            position: 'absolute',
            left: block.x + 50, // Центр корпуса (120px ширина / 2 = 60, но 50 для центрирования чекбокса)
            top: checkboxesY,
          }}
        >
          <Checkbox
            checked={isChecked}
            onChange={(e) => handleUndergroundParkingBlockChange(block.id, e.target.checked)}
          />
        </div>,
      )
    })

    // Подземные связи между корпусами - размещаем посередине между корпусами
    for (let i = 0; i < blocks.length - 1; i++) {
      const fromBlock = blocks[i]
      const toBlock = blocks[i + 1]
      const isChecked = undergroundParking.connections.some(
        (conn) => conn.fromBlockId === fromBlock.id && conn.toBlockId === toBlock.id,
      )

      // Позиция посередине между корпусами
      const middleX = (fromBlock.x + 120 + toBlock.x) / 2

      controls.push(
        <div
          key={`underground-connection-${fromBlock.id}-${toBlock.id}`}
          style={{
            position: 'absolute',
            left: middleX - 10, // -10 для центрирования чекбокса
            top: checkboxesY,
          }}
        >
          <Checkbox
            checked={isChecked}
            onChange={(e) =>
              handleUndergroundConnectionChange(fromBlock.id, toBlock.id, e.target.checked)
            }
          />
        </div>,
      )
    }

    return controls
  }

  const renderUndergroundConnections = () => {
    const connections = []

    undergroundParking.connections.forEach((connection) => {
      const fromBlock = blocks.find((b) => b.id === connection.fromBlockId)
      const toBlock = blocks.find((b) => b.id === connection.toBlockId)

      if (!fromBlock || !toBlock) return

      // Вычисляем позицию и размеры соединения
      const startX = fromBlock.x + 120 // Правый край первого корпуса
      const endX = toBlock.x // Левый край второго корпуса
      const connectionWidth = endX - startX

      // Используем ту же логику позиционирования, что и в renderBlock
      const maxTopFloor = Math.max(...blocks.map((block) => block.topFloor))
      const minBottomFloor = Math.min(...blocks.map((block) => block.bottomFloor))
      const totalFloorsHeight = (maxTopFloor - minBottomFloor + 1) * 15
      const availableHeight = 700 - 100
      const startY = Math.max(50, (availableHeight - totalFloorsHeight) / 2 + 50)
      const groundLineY = startY + maxTopFloor * 15

      // Находим общие подземные этажи между корпусами (самый верхний из нижних этажей)
      const connectionMinBottomFloor = Math.max(fromBlock.bottomFloor, toBlock.bottomFloor)
      const connectionFloors = []

      // Создаем этажи соединения от -1 до минимального нижнего этажа
      for (let floor = -1; floor >= connectionMinBottomFloor; floor--) {
        // Для расчета используем логику из renderBlock:
        // block.y = groundLineY - block.topFloor * 15
        // В контейнере этаж с номером floor находится на смещении (block.topFloor - floor) * 15
        // Плюс учитываем заголовок корпуса (примерно 20px)
        const blockY = groundLineY - fromBlock.topFloor * 15
        const headerHeight = 18 // Заголовок корпуса (fontSize: 12) + marginBottom: 4 + line-height
        const floorOffsetInBlock = (fromBlock.topFloor - floor) * 15
        const floorY = blockY + headerHeight + floorOffsetInBlock

        connectionFloors.push(
          <div
            key={`connection-${connection.fromBlockId}-${connection.toBlockId}-floor-${floor}`}
            style={{
              position: 'absolute',
              left: startX,
              top: floorY,
              width: connectionWidth,
              height: 15,
              backgroundColor: '#e6f7ff', // Цвет подземной парковки
              border: '1px solid #d9d9d9',
              borderLeft: 'none', // Убираем границу слева для плавного соединения
              borderRight: 'none', // Убираем границу справа для плавного соединения
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
            }}
          >
            {floor}
          </div>,
        )
      }

      connections.push(...connectionFloors)
    })

    return connections
  }

  return (
    <Modal
      open={visible}
      title="Карточка проекта"
      onCancel={onCancel}
      onOk={handleSave}
      width="95vw"
      style={{ height: '95vh' }}
      styles={{ body: { height: 'calc(95vh - 110px)', overflow: 'auto' } }}
      okText="Сохранить"
      cancelText="Отмена"
    >
      <div
        style={{
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <Title level={3}>{projectData.name}</Title>
          <Text>{projectData.address}</Text>
          <br />
          <Text>
            Количество корпусов: {blocks.length} (
            {blocks.map((b) => `${b.bottomFloor}; ${b.topFloor}`).join(', ')})
          </Text>
        </div>

        {/* Цветовая легенда */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minWidth: 300,
            maxWidth: '30%',
            flexShrink: 0,
          }}
        >
          <Text strong style={{ fontSize: '1em', marginBottom: 4 }}>
            Легенда:
          </Text>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: '1em',
                  height: '1em',
                  backgroundColor: '#e6f7ff',
                  border: '1px solid #91d5ff',
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              />
              <Text style={{ fontSize: '0.75em', lineHeight: 1.2 }}>Подземная парковка</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: '1em',
                  height: '1em',
                  backgroundColor: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              />
              <Text style={{ fontSize: '0.75em', lineHeight: 1.2 }}>Типовой корпус</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: '1em',
                  height: '1em',
                  backgroundColor: '#fffbe6',
                  border: '1px solid #ffe58f',
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              />
              <Text style={{ fontSize: '0.75em', lineHeight: 1.2 }}>Стилобат</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: '1em',
                  height: '1em',
                  backgroundColor: '#fff2e8',
                  border: '1px solid #ffbb96',
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              />
              <Text style={{ fontSize: '0.75em', lineHeight: 1.2 }}>Кровля</Text>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          height: 700,
          border: '1px solid #d9d9d9',
          backgroundColor: '#fafafa',
          overflow: 'hidden',
        }}
      >
        {blocks.map(renderBlock)}
        {renderUndergroundConnections()}
        {renderStylobateControls()}
        {renderUndergroundControls()}

        {/* Надпись "Подземный паркинг" */}
        {blocks.length > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 10,
              top: (() => {
                const maxTopFloor = Math.max(...blocks.map((block) => block.topFloor))
                const minBottomFloor = Math.min(...blocks.map((block) => block.bottomFloor))
                const totalFloorsHeight = (maxTopFloor - minBottomFloor + 1) * 15
                const availableHeight = 700 - 100
                const startY = Math.max(50, (availableHeight - totalFloorsHeight) / 2 + 50)
                // Позиционируем напротив -1 этажа (на 15px ниже нулевого этажа)
                return startY + maxTopFloor * 15 + 15 - 7 // -7 для центрирования по высоте этажа
              })(),
              fontSize: 12,
              fontWeight: 'bold',
              color: '#1890ff',
              lineHeight: '14px',
            }}
          >
            Подземный
            <br />
            паркинг
          </div>
        )}
      </div>
    </Modal>
  )
}
