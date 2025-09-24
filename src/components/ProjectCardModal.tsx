import React, { useState, useCallback, useMemo } from 'react'
import { Modal, Typography, Table, message } from 'antd'
import { PlusOutlined, MinusOutlined } from '@ant-design/icons'
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
      technicalFloors?: number[]
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

  // Сохраняем исходные данные для возможности отмены изменений
  const [originalBlocks, setOriginalBlocks] = useState<Block[]>([])
  const [originalStylobates, setOriginalStylobates] = useState<Stylobate[]>([])
  const [originalUndergroundParking, setOriginalUndergroundParking] = useState<UndergroundParking>({
    blockIds: [],
    connections: [],
  })

  // Режим технического этажа
  const [technicalFloorMode, setTechnicalFloorMode] = useState<boolean>(false)

  React.useEffect(() => {
    if (visible && projectData.blocks.length > 0) {
      const generatedBlocks: Block[] = projectData.blocks.map((block, index) => ({
        id: block.id || index + 1,
        name: block.name,
        bottomFloor: block.bottomFloor,
        topFloor: block.topFloor,
        x: block.x || 0,
        y: block.y || 0,
        technicalFloors: block.technicalFloors || [],
      }))
      setBlocks(generatedBlocks)
      setOriginalBlocks(generatedBlocks) // Сохраняем исходное состояние

      // Устанавливаем стилобаты, если они переданы
      const initialStylobates = projectData.stylobates || []
      setStylobates(initialStylobates)
      setOriginalStylobates(initialStylobates) // Сохраняем исходное состояние

      // Устанавливаем подземную парковку, если она передана
      const initialParking = projectData.undergroundParking || {
        blockIds: [],
        connections: [],
      }
      setUndergroundParking(initialParking)
      setOriginalUndergroundParking(initialParking) // Сохраняем исходное состояние
    }
  }, [visible, projectData])

  // Удалена неиспользуемая функция generateStylobateName

  // Удалены неиспользуемые функции handleStylobateChange, handleStylobateFloorsChange,
  // handleUndergroundParkingBlockChange, handleUndergroundConnectionChange
  // Их заменила новая логика через handleConnectionSpaceClick и handleBlockParkingToggle

  // Функции управления этажами
  const handleAddTopFloor = useCallback((blockId: number) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId ? { ...block, topFloor: block.topFloor + 1 } : block,
      ),
    )
  }, [])

  const handleRemoveTopFloor = useCallback((blockId: number) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId && block.topFloor > block.bottomFloor
          ? { ...block, topFloor: block.topFloor - 1 }
          : block,
      ),
    )
  }, [])

  const handleAddBottomFloor = useCallback((blockId: number) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId ? { ...block, bottomFloor: block.bottomFloor - 1 } : block,
      ),
    )
  }, [])

  const handleRemoveBottomFloor = useCallback((blockId: number) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId && block.bottomFloor < block.topFloor
          ? { ...block, bottomFloor: block.bottomFloor + 1 }
          : block,
      ),
    )
  }, [])

  // УБРАНО: функция createParkingBlock - паркинг теперь не отдельный корпус

  // Функция изменения названия корпуса
  const handleBlockNameChange = useCallback((blockId: number, newName: string) => {
    setBlocks(prev => prev.map(block =>
      block.id === blockId ? { ...block, name: newName } : block
    ))

    // Обновляем названия стилобатов при изменении названий корпусов
    setStylobates(prev => prev.map(stylobate => {
      const fromBlock = blocks.find(b => b.id === stylobate.fromBlockId)
      const toBlock = blocks.find(b => b.id === stylobate.toBlockId)

      if ((stylobate.fromBlockId === blockId || stylobate.toBlockId === blockId) && fromBlock && toBlock) {
        const fromName = stylobate.fromBlockId === blockId ? newName : fromBlock.name
        const toName = stylobate.toBlockId === blockId ? newName : toBlock.name
        return {
          ...stylobate,
          name: `Стилобат ${fromName}-${toName}`
        }
      }
      return stylobate
    }))

    console.log('🔍 Название корпуса изменено:', { blockId, newName }) // LOG
  }, [blocks])

  // Функция добавления нового корпуса
  const handleAddNewBlock = useCallback(() => {
    console.log('🔍 AddNewBlock clicked') // LOG
    const newBlockNumber = blocks.length + 1
    const newBlockId = Math.max(...blocks.map(b => b.id || 0)) + 1

    const newBlock: Block = {
      id: newBlockId,
      name: `Корпус ${newBlockNumber}`,
      bottomFloor: 1,
      topFloor: 5,
      x: 0,
      y: 0,
    }

    setBlocks((prev) => [...prev, newBlock])
    message.success(`Добавлен ${newBlock.name}`)
  }, [blocks])

  // Функция удаления корпуса
  const handleDeleteBlock = useCallback((blockId: number) => {
    const blockToDelete = blocks.find(b => b.id === blockId)
    if (!blockToDelete) return

    // Проверяем минимальное количество корпусов
    if (blocks.length <= 1) {
      message.warning('Проект должен содержать минимум один корпус')
      return
    }

    // Подтверждение удаления
    Modal.confirm({
      title: 'Удалить корпус?',
      content: (
        <div>
          <p>Вы уверены, что хотите удалить корпус <strong>"{blockToDelete.name}"</strong>?</p>
          <p style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '8px' }}>
            ⚠️ Будут также удалены все стилобаты и подземные связи этого корпуса
          </p>
        </div>
      ),
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: () => {
        console.log('🔍 Deleting block:', blockId, blockToDelete.name) // LOG

        // Удаляем корпус из списка блоков
        setBlocks(prev => prev.filter(b => b.id !== blockId))

        // Удаляем все стилобаты, связанные с этим корпусом
        setStylobates(prev => prev.filter(s =>
          s.fromBlockId !== blockId && s.toBlockId !== blockId
        ))

        // Удаляем все подземные связи с этим корпусом
        setUndergroundParking(prev => ({
          ...prev,
          blockIds: prev.blockIds.filter(id => id !== blockId),
          connections: prev.connections.filter(conn =>
            conn.fromBlockId !== blockId && conn.toBlockId !== blockId
          )
        }))

        message.success(`Корпус "${blockToDelete.name}" удален`)
      },
    })
  }, [blocks])

  // Функции управления стилобатами
  const handleAddTopFloorStylobate = useCallback((stylobateId: string | number) => {
    setStylobates(prev => prev.map(stylobate => {
      if (stylobate.id === stylobateId) {
        const newTopFloor = (stylobate.topFloor ?? stylobate.floors) + 1
        return {
          ...stylobate,
          topFloor: newTopFloor,
          floors: newTopFloor - (stylobate.bottomFloor ?? 1) + 1
        }
      }
      return stylobate
    }))
  }, [])

  const handleRemoveTopFloorStylobate = useCallback((stylobateId: string | number) => {
    setStylobates(prev => prev.map(stylobate => {
      if (stylobate.id === stylobateId) {
        const bottomFloor = stylobate.bottomFloor ?? 1
        const currentTopFloor = stylobate.topFloor ?? stylobate.floors
        if (currentTopFloor > bottomFloor) {
          const newTopFloor = currentTopFloor - 1
          return {
            ...stylobate,
            topFloor: newTopFloor,
            floors: newTopFloor - bottomFloor + 1
          }
        }
      }
      return stylobate
    }))
  }, [])

  const handleDeleteStylobate = useCallback((stylobateId: string | number) => {
    const stylobateToDelete = stylobates.find(s => s.id === stylobateId)
    if (!stylobateToDelete) return

    Modal.confirm({
      title: 'Удалить стилобат?',
      content: (
        <div>
          <p>Вы уверены, что хотите удалить стилобат <strong>"{stylobateToDelete.name}"</strong>?</p>
        </div>
      ),
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: () => {
        setStylobates(prev => prev.filter(s => s.id !== stylobateId))
        message.success(`Стилобат "${stylobateToDelete.name}" удален`)
      },
    })
  }, [stylobates])

  // Функция обработки кликов по пространству между корпусами
  const handleConnectionSpaceClick = useCallback((fromBlockId: number, toBlockId: number, floor: number) => {
    console.log('🔍 ConnectionSpaceClick:', { fromBlockId, toBlockId, floor }) // LOG

    // Проверяем есть ли уже подземная связь
    const hasUndergroundConnection = undergroundParking.connections.some(
      conn => conn.fromBlockId === fromBlockId && conn.toBlockId === toBlockId
    )

    // Проверяем есть ли стилобат
    const existingStylobate = stylobates.find(
      s => s.fromBlockId === fromBlockId && s.toBlockId === toBlockId
    )

    console.log('🔍 Состояние до клика:', { // LOG
      hasUndergroundConnection,
      existingStylobate: existingStylobate ? { floors: existingStylobate.floors } : null,
      clickedFloor: floor
    })

    if (floor <= 0) {
      // При клике ниже и включая 0 этаж между корпусами
      if (hasUndergroundConnection) {
        // Если паркинг есть - убираем
        setUndergroundParking(prev => ({
          ...prev,
          connections: prev.connections.filter(
            conn => !(conn.fromBlockId === fromBlockId && conn.toBlockId === toBlockId)
          )
        }))
        console.log('🔍 Подземная связь удалена') // LOG
      } else {
        // Если паркинга нет - появляется паркинг, соединяющий корпуса
        setUndergroundParking(prev => ({
          ...prev,
          connections: [...prev.connections, { fromBlockId, toBlockId }]
        }))
        console.log('🔍 Подземная связь добавлена') // LOG
      }

      // УБРАНО: вызов createParkingBlock - паркинг теперь не отдельный корпус
    } else if (floor > 0) {
      // При клике выше 0 этажа между корпусами
      if (existingStylobate) {
        // Стилобат существует
        if (floor === 1) {
          // 1. Клик по 1 этажу стилобата уменьшает количество этажей стилобата на один этаж
          const newFloors = existingStylobate.floors - 1
          if (newFloors <= 0) {
            // Если не остается этажей - удаляем стилобат полностью
            setStylobates(prev => prev.filter(
              s => !(s.fromBlockId === fromBlockId && s.toBlockId === toBlockId)
            ))
            console.log('🔍 Клик по 1 этажу - стилобат полностью удален') // LOG
          } else {
            // Уменьшаем количество этажей стилобата на 1
            setStylobates(prev => prev.map(s =>
              s.fromBlockId === fromBlockId && s.toBlockId === toBlockId
                ? {
                    ...s,
                    floors: newFloors,
                    topFloor: (s.bottomFloor ?? 1) + newFloors - 1
                  }
                : s
            ))
            console.log('🔍 Клик по 1 этажу - убран верхний этаж стилобата, осталось:', newFloors) // LOG
          }
        } else if (floor === existingStylobate.floors) {
          // 2. Клик по последнему этажу стилобата прибавляет один этаж
          setStylobates(prev => prev.map(s =>
            s.fromBlockId === fromBlockId && s.toBlockId === toBlockId
              ? {
                  ...s,
                  floors: s.floors + 1,
                  topFloor: (s.bottomFloor ?? 1) + s.floors
                }
              : s
          ))
          console.log('🔍 Клик по последнему этажу - добавлен 1 этаж стилобата, всего:', existingStylobate.floors + 1) // LOG
        } else if (floor === existingStylobate.floors + 1) {
          // 3. При клике на ячейку сразу выше стилобата - добавляем 1 этаж
          setStylobates(prev => prev.map(s =>
            s.fromBlockId === fromBlockId && s.toBlockId === toBlockId
              ? {
                  ...s,
                  floors: s.floors + 1,
                  topFloor: (s.bottomFloor ?? 1) + s.floors
                }
              : s
          ))
          console.log('🔍 Клик выше стилобата на 1 этаж - добавлен 1 этаж стилобата, всего:', existingStylobate.floors + 1) // LOG
        } else if (floor > existingStylobate.floors + 1) {
          // Клик выше стилобата более чем на 1 этаж - ничего не происходит
          console.log('🔍 Клик выше стилобата более чем на 1 этаж - ничего не происходит') // LOG
        } else {
          // Клики по промежуточным этажам стилобата (от 2 до предпоследнего) - ничего не делаем
          console.log('🔍 Клик по промежуточному этажу стилобата - ничего не происходит') // LOG
        }
      } else {
        // Когда нет стилобата - при клике между корпусами выше 0 этажа появляется 1 этаж стилобата
        if (floor === 1) {
          // Создаем новый стилобат с 1 этажом только при клике по 1 этажу
          const fromBlock = blocks.find(b => b.id === fromBlockId)
          const toBlock = blocks.find(b => b.id === toBlockId)
          // Определяем, есть ли паркинг под стилобатом
          const hasUndergroundParking = undergroundParking.connections.some(
            conn => conn.fromBlockId === fromBlockId && conn.toBlockId === toBlockId
          )

          const newStylobate: UIStylobate = {
            id: `${Math.max(0, ...stylobates.map(s => typeof s.id === 'number' ? s.id : parseInt(s.id) || 0)) + 1}`,
            name: `Стилобат ${fromBlock?.name || fromBlockId}-${toBlock?.name || toBlockId}`,
            fromBlockId,
            toBlockId,
            floors: 1,
            bottomFloor: hasUndergroundParking ? 1 : 1, // Стилобат всегда начинается с 1 этажа
            topFloor: 1,
            x: 0,
            y: 0,
          }
          setStylobates(prev => [...prev, newStylobate])
          console.log('🔍 Создан новый стилобат с 1 этажом') // LOG
        } else {
          // Клик по пустым ячейкам выше 1 этажа - ничего не делаем, так как стилобата нет
          console.log('🔍 Клик по пустой ячейке выше 1 этажа без стилобата - ничего не происходит') // LOG
        }
      }
    }
  }, [undergroundParking.connections, stylobates, blocks])

  // Функция переключения подземной парковки для блока
  const handleBlockParkingToggle = useCallback((blockId: number, floor: number) => {
    // При клике по подземному этажу корпуса он становится парковкой
    const isCurrentlyParking = undergroundParking.blockIds.includes(blockId)

    console.log('🔍 Block parking toggle:', { blockId, floor, isCurrentlyParking }) // LOG

    if (isCurrentlyParking) {
      // Убираем блок из парковки
      setUndergroundParking(prev => ({
        ...prev,
        blockIds: prev.blockIds.filter(id => id !== blockId)
      }))

      // При отключении парковки корпус может начинаться с более низких этажей
      // Но если минимальный этаж стал положительным - начинаем с 1 этажа
      setBlocks(prev => prev.map(block => {
        if (block.id === blockId && block.bottomFloor < 0) {
          return {
            ...block,
            bottomFloor: Math.max(1, block.bottomFloor) // Не выше 1 этажа
          }
        }
        return block
      }))
    } else {
      // Добавляем блок в парковку
      setUndergroundParking(prev => ({
        ...prev,
        blockIds: [...prev.blockIds, blockId]
      }))

      // При включении парковки корпус должен иметь подземные этажи
      setBlocks(prev => prev.map(block => {
        if (block.id === blockId) {
          return {
            ...block,
            // Если у корпуса нет подземных этажей - добавляем парковочные этажи
            bottomFloor: block.bottomFloor >= 1 ? -2 : Math.min(block.bottomFloor, -1)
          }
        }
        return block
      }))
    }
  }, [undergroundParking.blockIds])

  // Функция переключения технического этажа
  const handleTechnicalFloorToggle = useCallback((blockId: number, floor: number) => {
    setBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block

      const technicalFloors = block.technicalFloors || []
      const isCurrentlyTechnical = technicalFloors.includes(floor)

      if (isCurrentlyTechnical) {
        // Убираем из технических этажей
        return {
          ...block,
          technicalFloors: technicalFloors.filter(f => f !== floor)
        }
      } else {
        // Добавляем в технические этажи
        return {
          ...block,
          technicalFloors: [...technicalFloors, floor].sort((a, b) => b - a) // Сортируем по убыванию
        }
      }
    }))
  }, [])

  // Функция сброса изменений к исходному состоянию
  const handleReset = useCallback(() => {
    console.log('🔍 Сброс изменений к исходному состоянию') // LOG
    setBlocks([...originalBlocks])
    setStylobates([...originalStylobates])
    setUndergroundParking({ ...originalUndergroundParking })
  }, [originalBlocks, originalStylobates, originalUndergroundParking])

  // Проверка наличия несохраненных изменений
  const hasUnsavedChanges = useMemo(() => {
    return (
      JSON.stringify(blocks) !== JSON.stringify(originalBlocks) ||
      JSON.stringify(stylobates) !== JSON.stringify(originalStylobates) ||
      JSON.stringify(undergroundParking) !== JSON.stringify(originalUndergroundParking)
    )
  }, [blocks, stylobates, undergroundParking, originalBlocks, originalStylobates, originalUndergroundParking])

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

      // После успешного сохранения обновляем исходные данные
      setOriginalBlocks([...blocks])
      setOriginalStylobates([...stylobates])
      setOriginalUndergroundParking({ ...undergroundParking })

      message.success('Данные проекта успешно сохранены')
      console.log('🔍 Данные проекта сохранены, исходное состояние обновлено') // LOG
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
        floor: floor as number,
      }

      // Для каждого корпуса проверяем, есть ли этот этаж
      blocks.forEach((block) => {
        const blockKey = `block_${block.id}`
        if (floor <= block.topFloor && floor >= block.bottomFloor) {
          // Определяем тип этажа и цвет
          let backgroundColor
          const hasUndergroundParking = undergroundParking.blockIds.includes(block.id)
          const isTechnicalFloor = block.technicalFloors?.includes(floor) || false

          if (floor === 0) {
            backgroundColor = '#fff2e8' // Кровля
          } else if (isTechnicalFloor) {
            backgroundColor = '#003d82' // Технический этаж
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
        // Если ничего не найдено, создаем пустую ячейку с правильным floor
        else {
          row[connectionKey] = {
            floor,
            backgroundColor: 'transparent',
            type: 'empty',
          }
        }
      }


      data.push(row)
    }

    console.log('🔍 ProjectCardModal: Generated table data:', {
      totalRows: data.length,
      firstFloor: data[0]?.floor,
      lastFloor: data[data.length - 1]?.floor,
      hasNegativeFloors: data.some(row => (row.floor as number) < 0),
      negativeFloors: data.filter(row => (row.floor as number) < 0).map(row => row.floor as number)
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
      title: React.ReactNode
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
        title: (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 0' }}>
            <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
              <button
                onClick={() => handleAddTopFloor(block.id)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '9px',
                  padding: '1px',
                  color: '#1677ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={`Добавить этаж сверху (${block.name})`}
              >
                <PlusOutlined />
              </button>
              <button
                onClick={() => handleRemoveTopFloor(block.id)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '9px',
                  padding: '1px',
                  color: '#1677ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={`Удалить верхний этаж (${block.name})`}
              >
                <MinusOutlined />
              </button>
            </div>
            <input
              value={block.name}
              onChange={(e) => handleBlockNameChange(block.id, e.target.value)}
              style={{
                fontSize: '10px',
                fontWeight: 'bold',
                margin: '1px 0',
                textAlign: 'center',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                padding: '2px 4px',
                width: '80px',
                background: '#fff'
              }}
              title={`Изменить название корпуса`}
            />
            {/* Кнопка удаления корпуса */}
            <button
              onClick={() => handleDeleteBlock(block.id)}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '10px',
                padding: '1px',
                color: '#ff4d4f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '2px 0'
              }}
              title={`Удалить корпус "${block.name}"`}
            >
              ✕
            </button>
            <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
              <button
                onClick={() => handleAddBottomFloor(block.id)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '9px',
                  padding: '1px',
                  color: '#1677ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={`Добавить этаж снизу (${block.name})`}
              >
                <PlusOutlined />
              </button>
              <button
                onClick={() => handleRemoveBottomFloor(block.id)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '9px',
                  padding: '1px',
                  color: '#1677ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={`Удалить нижний этаж (${block.name})`}
              >
                <MinusOutlined />
              </button>
            </div>
          </div>
        ),
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

          // Определяем, подземный ли это этаж
          const isUndergroundFloor = cell.floor < 0
          const isParking = undergroundParking.blockIds.includes(block.id)

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
                cursor: isUndergroundFloor || (technicalFloorMode && cell.floor > 0) ? 'pointer' : 'default',
                position: 'relative',
              }}
              onClick={
                isUndergroundFloor
                  ? () => handleBlockParkingToggle(block.id, cell.floor)
                  : technicalFloorMode && cell.floor > 0
                    ? () => handleTechnicalFloorToggle(block.id, cell.floor)
                    : undefined
              }
              title={
                isUndergroundFloor
                  ? isParking
                    ? "Подземная парковка (кликните для отключения)"
                    : "Подземный этаж (кликните для включения парковки)"
                  : technicalFloorMode && cell.floor > 0
                    ? (block.technicalFloors?.includes(cell.floor) ? "Тех.этаж (кликните для отключения)" : "Обычный этаж (кликните для превращения в тех.этаж)")
                    : undefined
              }
            >
              {cell.floor}
              {isUndergroundFloor && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '4px',
                  opacity: 0.7,
                  pointerEvents: 'none'
                }}>
                  {isParking ? '🚗' : '⏸'}
                </div>
              )}
            </div>
          )
        },
      })

      // Добавляем промежуток между корпусами (кроме последнего корпуса)
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
            // Получаем floor из самой ячейки
            const floor = cell?.floor || 0

            if (!cell || cell.type === 'empty') {
              return (
                <div
                  style={{
                    height: '100%',
                    width: '100%',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={() => handleConnectionSpaceClick(block.id, nextBlock.id, floor)}
                  title={
                    floor < 0
                      ? "Кликните для переключения подземной связи"
                      : floor > 0
                      ? "Кликните для переключения стилобата"
                      : "Кликните для добавления связи"
                  }
                >
                  <div style={{ fontSize: '6px', color: '#ccc' }}>+</div>
                </div>
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
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onClick={() => handleConnectionSpaceClick(block.id, nextBlock.id, floor)}
                title={
                  floor < 0
                    ? "Подземная связь (кликните для отключения)"
                    : "Стилобат (кликните для удаления)"
                }
              >
                {cell.floor}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '6px',
                  opacity: 0.7
                }}>
                  ×
                </div>
              </div>
            )
          },
        })
      }
    })



    // Добавляем кнопку для добавления нового корпуса
    columns.push({
      title: (
        <button
          onClick={handleAddNewBlock}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#1677ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%'
          }}
          title="Добавить новый корпус"
        >
          +
        </button>
      ),
      dataIndex: 'add_block_button',
      key: 'add_block_button',
      width: 50,
      render: () => null, // Пустая колонка, кнопка только в заголовке
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
  }, [blocks, stylobates, undergroundParking.blockIds, technicalFloorMode, handleAddNewBlock, handleDeleteBlock, handleAddTopFloor, handleRemoveTopFloor, handleAddBottomFloor, handleRemoveBottomFloor, handleConnectionSpaceClick, handleBlockParkingToggle, handleTechnicalFloorToggle, handleBlockNameChange])

  return (
    <>
      <style>{tableStyles + scalingStyles}</style>
      <Modal
        open={visible}
        title={
          <span>
            {scalingInfo.needsScrolling
              ? `Карточка проекта (${scalingInfo.totalFloors} этажей - с прокруткой)`
              : scalingInfo.totalFloors > 0
                ? `Карточка проекта (${scalingInfo.totalFloors} этажей - масштабируется)`
                : 'Карточка проекта'}
            {hasUnsavedChanges && (
              <span style={{ color: '#ff4d4f', marginLeft: '8px' }}>
                • Есть несохраненные изменения
              </span>
            )}
          </span>
        }
        onCancel={() => {
          if (hasUnsavedChanges) {
            Modal.confirm({
              title: 'Несохраненные изменения',
              content: 'У вас есть несохраненные изменения. Вы действительно хотите закрыть окно без сохранения?',
              okText: 'Да, закрыть',
              cancelText: 'Отмена',
              onOk: onCancel,
            })
          } else {
            onCancel()
          }
        }}
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
        footer={(_, { OkBtn, CancelBtn }) => (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {hasUnsavedChanges && (
                <button
                  onClick={handleReset}
                  style={{
                    background: 'none',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    padding: '4px 15px',
                    cursor: 'pointer',
                    color: '#666',
                    fontSize: '14px'
                  }}
                  title="Сбросить все несохраненные изменения"
                >
                  Сбросить изменения
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <CancelBtn />
              <OkBtn />
            </div>
          </div>
        )}
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
          <div style={{ flex: 1, minWidth: 500 }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {/* Инструкции по управлению - Этажи корпусов */}
              <div style={{ flex: '1 1 240px' }}>
                <Text strong style={{ fontSize: '1.1em', marginBottom: 8, display: 'block' }}>
                  Управление:
                </Text>
                <div style={{ fontSize: '0.95em', color: '#666', lineHeight: 1.4 }}>
                  <strong>Этажи корпусов:</strong><br/>
                  • <strong>Кнопки ↑↓</strong> в заголовках - добавить/убрать этажи<br/>
                  • <strong>Клик по подземному этажу</strong> - переключить парковку 🚗
                </div>
              </div>

              {/* Связи между корпусами - отдельная колонка справа */}
              <div style={{ flex: '1 1 240px' }}>
                <Text strong style={{ fontSize: '1.1em', marginBottom: 8, display: 'block', opacity: 0 }}>
                  .
                </Text>
                <div style={{ fontSize: '0.95em', color: '#666', lineHeight: 1.4 }}>
                  <strong>Связи между корпусами:</strong><br/>
                  • <strong>Подземные этажи:</strong> подземные связи<br/>
                  • <strong>Стилобаты:</strong> клик выше корпусов = добавить, клик по этажу = убрать<br/>
                  • <strong>Клик по активной связи</strong> для удаления
                </div>
              </div>

              {/* Технический этаж - чек-бокс */}
              <div style={{ flex: '1 1 200px' }}>
                <Text strong style={{ fontSize: '1.1em', marginBottom: 8, display: 'block', opacity: 0 }}>
                  .
                </Text>
                <div style={{ fontSize: '0.95em', color: '#666', lineHeight: 1.4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={technicalFloorMode}
                      onChange={(e) => setTechnicalFloorMode(e.target.checked)}
                      style={{ margin: 0 }}
                    />
                    <strong>Технический этаж</strong>
                  </label>
                  <div style={{ marginTop: 4, fontSize: '0.85em' }}>
                    При активном режиме кликайте на этажи корпусов для переключения в тех.этаж
                  </div>
                </div>
              </div>
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
                gridTemplateRows: '1fr 1fr 1fr',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: '0.8em',
                    height: '0.8em',
                    backgroundColor: '#003d82',
                    border: '1px solid #001529',
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
                <Text style={{ fontSize: '0.7em', lineHeight: 1.2 }}>Тех.этаж</Text>
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
