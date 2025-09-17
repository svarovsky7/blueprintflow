import React, { useState, useCallback, useMemo } from 'react'
import { Modal, Checkbox, InputNumber, Typography, Table, message } from 'antd'
import { type UIBlock, type UIStylobate, type UIUndergroundParking } from '@/entities/projects'
import { useScale } from '@/shared/contexts/ScaleContext'

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
  /* font-size удален - применяется через scalingStyles */
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
  const { scale } = useScale()
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

  // НОВАЯ ЛОГИКА масштабирования согласно требованиям:
  // ≤40 этажей: стандартная высота 12px, без прокрутки
  // 41-60 этажей: масштабирование чтобы все поместилось, без прокрутки
  // >60 этажей: стандартная высота 12px + прокрутка
  const scalingInfo = useMemo(() => {
    if (!blocks.length)
      return {
        totalFloors: 0,
        needsScrolling: false,
        rowHeight: 12,
        maxTopFloor: 0,
        minBottomFloor: 0,
        tableScrollHeight: undefined as string | undefined,
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

    // Высота модального окна изменена на 95vh
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900
    const modalHeight = viewportHeight * 0.95 // 95vh
    const controlsAndPaddingHeight = 200 // УМЕНЬШЕНО: место под заголовок, управляющие элементы и отступы
    const availableTableHeight = modalHeight - controlsAndPaddingHeight

    let rowHeight = 12 // Стандартная высота строки
    let tableScrollHeight: string | undefined = undefined
    let needsScrolling = false

    if (totalFloors <= 48) {
      // ≤48 этажей: стандартная высота строки 12px, без прокрутки
      rowHeight = 12
      tableScrollHeight = undefined
      needsScrolling = false
    } else {
      // >48 этажей: всегда используем прокрутку со стандартной высотой строк
      rowHeight = 12
      tableScrollHeight = `${availableTableHeight}px`
      needsScrolling = true
      console.log('🔍 Прокрутка >48 этажей:', {
        totalFloors,
        availableTableHeight,
        tableScrollHeight,
      })
    }

    const result = {
      totalFloors,
      needsScrolling,
      rowHeight: Math.round(rowHeight),
      maxTopFloor,
      minBottomFloor,
      tableScrollHeight,
    }

    console.log('🔍 ProjectCardModal: УПРОЩЕННАЯ логика прокрутки:', {
      totalFloors,
      category: totalFloors <= 48 ? '≤48 floors (standard 12px)' : '>48 floors (scrolled)',
      needsScrolling,
      availableTableHeight,
      finalRowHeight: rowHeight,
      tableScrollHeight,
      expectedTableHeight: totalFloors * rowHeight,
    })

    return result
  }, [blocks])

  const tableData = useMemo(() => {
    if (!blocks.length) return []

    const data = []

    // ИСПРАВЛЕНО: вычисляем значения напрямую для предотвращения рассинхронизации
    const maxTopFloor = Math.max(...blocks.map((block) => block.topFloor))
    const minBottomFloor = Math.min(...blocks.map((block) => block.bottomFloor))

    console.log('🔍 ProjectCardModal: TableData generation - floors range:', {
      maxTopFloor,
      minBottomFloor,
      totalFloors: maxTopFloor - minBottomFloor + 1,
      blocks: blocks.map(b => `${b.name}: ${b.bottomFloor}-${b.topFloor}`),
      generatedFloors: `from ${maxTopFloor} down to ${minBottomFloor}`
    })

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

    console.log('🔍 ProjectCardModal: Generated table data:', {
      totalRows: data.length,
      firstFloor: data[0]?.floor,
      lastFloor: data[data.length - 1]?.floor,
      hasNegativeFloors: data.some(row => row.floor < 0),
      negativeFloors: data.filter(row => row.floor < 0).map(row => row.floor)
    })

    return data
  }, [blocks, stylobates, undergroundParking])

  // УБРАНО: масштабирование больше не используется, только прокрутка для >48 этажей
  const scalingStyles = useMemo(() => {
    // МАСШТАБИРУЕМЫЕ СТИЛИ ЗАГОЛОВКОВ - применяются ВСЕГДА
    let styles = `
      /* Масштабируемые стили для заголовков таблицы с повышенной специфичностью */
      .building-table.ant-table-wrapper .ant-table-thead th,
      .building-table .ant-table .ant-table-thead th {
        font-size: ${Math.round(10 * scale)}px !important;
      }
      .building-table.ant-table-wrapper .ant-table-thead > tr > th,
      .building-table .ant-table .ant-table-thead > tr > th {
        font-size: ${Math.round(12 * scale)}px !important;
      }
      /* Дополнительные селекторы для полной совместимости */
      .ant-modal .building-table .ant-table-thead th {
        font-size: ${Math.round(10 * scale)}px !important;
      }
      .ant-modal .building-table .ant-table-thead > tr > th {
        font-size: ${Math.round(12 * scale)}px !important;
      }
    `

    // Дополнительные стили для скроллируемых таблиц >48 этажей
    if (scalingInfo.needsScrolling && scalingInfo.tableScrollHeight) {
      // Добавляем запас для прокрутки до отрицательных этажей
      const scrollHeight = parseFloat(scalingInfo.tableScrollHeight)
      const adjustedScrollHeight = `${Math.max(400, scrollHeight - 40)}px` // Уменьшаем на 40px для лучшей прокрутки

      console.log('🔍 Scroll adjustments:', {
        originalHeight: scalingInfo.tableScrollHeight,
        adjustedHeight: adjustedScrollHeight,
        totalRows: scalingInfo.totalFloors,
        expectedTableHeight: scalingInfo.totalFloors * 12
      })

      styles += `
        .building-table-scrollable .ant-table-container {
          height: ${adjustedScrollHeight} !important;
          max-height: ${adjustedScrollHeight} !important;
        }
        .building-table-scrollable .ant-table-body {
          height: ${adjustedScrollHeight} !important;
          max-height: ${adjustedScrollHeight} !important;
          overflow-y: scroll !important;
        }
      `
    }

    console.log('🔍 ProjectCardModal: Финальные scalingStyles:', {
      stylesLength: styles.length,
      hasHeaderStyles: styles.includes('ant-table-thead'),
      stylesPreview: styles.substring(0, 200)
    })

    return styles
  }, [scalingInfo, scale])

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

    // Рассчитываем ширину колонок заранее (изменено на 95vw)
    const totalBlocks = blocks.length
    const totalConnections = Math.max(0, blocks.length - 1)
    const modalWidth = typeof window !== 'undefined' ? window.innerWidth * 0.95 - 64 : 1800 // 64px = 32px padding с каждой стороны
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
          scalingInfo.needsScrolling
            ? `Карточка проекта (${scalingInfo.totalFloors} этажей - с прокруткой)`
            : scalingInfo.totalFloors > 0
              ? `Карточка проекта (${scalingInfo.totalFloors} этажей - масштабируется)`
              : 'Карточка проекта'
        }
        onCancel={onCancel}
        onOk={handleSave}
        width="95vw"
        centered={true}
        styles={{
          body: {
            // ИСПРАВЛЕНО: правильная высота для Ant Design 5 модального окна 95% экрана
            height: 'calc(95vh - 110px)', // 110px на заголовок и кнопки в Ant Design 5
            maxHeight: 'calc(95vh - 110px)',
            overflow: 'hidden', // Прокрутка только внутри таблицы, если нужна
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
          },
          content: {
            // Настройка самого модального окна для 95% высоты экрана
            height: '95vh',
            maxHeight: '95vh',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            flexShrink: 0,
          }}
        >
          {/* Информация о проекте */}
          <div style={{ flex: '0 0 auto' }}>
            <Title level={4} style={{ marginBottom: 8 }}>
              {projectData.name}
            </Title>
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
            flex: 1, // Занимает оставшееся место в модальном окне
            overflow: 'hidden', // Прокрутка только для таблицы
            minHeight: 0, // Важно для корректной работы flex
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Table
            dataSource={tableData}
            columns={tableColumns}
            pagination={false}
            scroll={{
              x: tableColumns.reduce((sum, col) => sum + col.width, 0),
              // НОВАЯ ЛОГИКА: для зданий >60 этажей используем прокрутку, для ≤60 - без прокрутки
              ...(scalingInfo.needsScrolling && scalingInfo.tableScrollHeight
                ? { y: parseInt(scalingInfo.tableScrollHeight) }
                : {}),
            }}
            size="small"
            bordered={false}
            showHeader={true}
            tableLayout="fixed"
            style={{
              backgroundColor: 'transparent',
              flex: 1, // Таблица занимает всё доступное место в контейнере
              height: 'auto',
            }}
            className={(() => {
              // УПРОЩЕННАЯ ЛОГИКА: ≤48 этажей - стандартные стили, >48 - прокрутка
              const className = scalingInfo.needsScrolling
                ? 'building-table building-table-scrollable'
                : 'building-table'
              console.log(
                '🔍 ProjectCardModal: Applied className:',
                className,
                'Scrolling:',
                scalingInfo.needsScrolling,
                'Scroll height:',
                scalingInfo.tableScrollHeight,
                'Total floors:',
                scalingInfo.totalFloors,
                'Table data rows:',
                tableData.length,
                'Min floor:',
                scalingInfo.minBottomFloor,
                'Max floor:',
                scalingInfo.maxTopFloor
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
            overflow: hidden !important;
          }
          .building-table-scaled .ant-table-container {
            overflow: visible !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .building-table-scrollable .ant-table-container {
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .building-table .ant-table-content {
            overflow: auto !important;
          }
          .building-table-scaled .ant-table-content {
            overflow: visible !important;
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .building-table-scrollable .ant-table-content {
            overflow: hidden !important;
            height: 100% !important;
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .building-table .ant-table-body {
            overflow: auto !important;
          }
          .building-table-scaled .ant-table-body {
            overflow: visible !important;
            flex: 1 !important;
          }
          .building-table-scrollable .ant-table-body {
            overflow-x: hidden !important;
            flex: 1 !important;
          }
          .building-table .ant-table-tbody {
            overflow: visible !important;
          }
          .building-table-scrollable .ant-table-tbody {
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
            /* font-size: 12px удален - применяется через scalingStyles */
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
