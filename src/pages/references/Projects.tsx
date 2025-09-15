/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from 'react'
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Checkbox,
  Row,
  Col,
} from 'antd'
import type { TableProps } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import ProjectCardModal from '../../components/ProjectCardModal'
import { blocksApi, blockConnectionsApi } from '@/entities/projects'
import type { BlockType } from '@/entities/projects/model/types'
import CascadeDeleteProject from '../../components/CascadeDeleteProject'
import styles from './Projects.module.css'

interface BlockInfo {
  id: string
  name: string
  type_blocks?: BlockType
  bottom_floor?: number | null
  top_floor?: number | null
  bottom_underground_floor?: number | null
  top_ground_floor?: number | null
}

interface Project {
  id: string
  name: string
  address: string | null
  projects_blocks?:
    | {
        block_id: string
        blocks: BlockInfo | null
        v_block_floor_range?: { bottom_floor: number; top_floor: number }[] | null
      }[]
    | null
}

interface ProjectRow extends Project {
  blocks: BlockInfo[]
  blockNames: string[]
}

interface BlockRow {
  id: string
}

export default function Projects() {
  const { message } = App.useApp()
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | null>(null)
  const [currentProject, setCurrentProject] = useState<ProjectRow | null>(null)
  const [blocksCount, setBlocksCount] = useState(0)
  const [existingBlockIds, setExistingBlockIds] = useState<string[]>([])
  const [undergroundFloorsCount, setUndergroundFloorsCount] = useState<number | null>(null)
  const [useUndergroundForAll, setUseUndergroundForAll] = useState(false)
  const [showProjectCard, setShowProjectCard] = useState(false)
  const [form] = Form.useForm()

  // Функция для загрузки данных проекта для карточки с правильной обработкой стилобатов
  const loadProjectCardData = async (projectId: string) => {
    try {
      if (!supabase) throw new Error('Supabase not initialized')

      // 1. Загружаем все блоки проекта из базы данных
      const { data: projectBlocksData, error: projectBlocksError } = await supabase
        .from('projects_blocks')
        .select(`
          block_id,
          blocks (
            id,
            name,
            type_blocks
          )
        `)
        .eq('project_id', projectId)

      if (projectBlocksError) throw projectBlocksError

      const allProjectBlocks = projectBlocksData?.map(pb => pb.blocks).filter(Boolean) || []

      // 2. Загружаем диапазоны этажей для всех блоков проекта
      const blockIds = allProjectBlocks.map(b => b.id)
      const { data: floorData, error: floorError } = await supabase
        .from('block_floor_mapping')
        .select('block_id, floor_number, type_blocks')
        .in('block_id', blockIds)

      if (floorError) throw floorError

      // Создаем диапазоны этажей для каждого блока
      const blockFloorRanges: Record<string, { bottom_floor: number; top_floor: number; isStylebate: boolean }> = {}
      const stylobateBlockIds = new Set()

      floorData?.forEach(f => {
        if (f.type_blocks === 'Стилобат') {
          stylobateBlockIds.add(f.block_id)
        }

        if (!blockFloorRanges[f.block_id]) {
          blockFloorRanges[f.block_id] = {
            bottom_floor: f.floor_number,
            top_floor: f.floor_number,
            isStylebate: f.type_blocks === 'Стилобат'
          }
        } else {
          blockFloorRanges[f.block_id].bottom_floor = Math.min(blockFloorRanges[f.block_id].bottom_floor, f.floor_number)
          blockFloorRanges[f.block_id].top_floor = Math.max(blockFloorRanges[f.block_id].top_floor, f.floor_number)
          if (f.type_blocks === 'Стилобат') {
            blockFloorRanges[f.block_id].isStylebate = true
          }
        }
      })

      // 3. Разделяем блоки на обычные корпуса и стилобаты
      const regularBlocks = allProjectBlocks.filter(block =>
        // Fallback: если type_blocks не указан, используем старую логику по типам этажей
        block.type_blocks ? block.type_blocks === 'Типовой корпус' : !stylobateBlockIds.has(block.id)
      )
      const stylobateBlocks = allProjectBlocks.filter(block =>
        block.type_blocks ? block.type_blocks === 'Стилобат' : stylobateBlockIds.has(block.id)
      )

      // 4. Загружаем связи между блоками
      const { data: connections, error: connectionsError } = await supabase
        .from('block_connections_mapping')
        .select(`
          id,
          from_block_id,
          to_block_id,
          connection_type,
          floors_count
        `)
        .eq('project_id', projectId)

      if (connectionsError) throw connectionsError

      // 5. Создаем маппинг databaseId -> localId только для обычных корпусов
      const blockIdMapping: { [dbId: string]: number } = {}
      regularBlocks.forEach((block, index) => {
        blockIdMapping[block.id] = index + 1
      })


      // 6. Создаем структуру стилобатов с правильным позиционированием
      const stylobates = stylobateBlocks.map((stylobateBlock, index) => {
        // Попробуем несколько способов найти соединения для стилобата:

        // Способ 1: Стилобат как участник соединения (from_block_id или to_block_id)
        let stylobateConnections = connections?.filter(c =>
          c.connection_type === 'Стилобат' &&
          (c.from_block_id === stylobateBlock.id || c.to_block_id === stylobateBlock.id)
        ) || []

        // Способ 2: Поиск соединений типа "Стилобат" между обычными корпусами
        if (stylobateConnections.length === 0) {
          const stylobateTypeConnections = connections?.filter(c => c.connection_type === 'Стилобат') || []

          // Если есть соединения типа "Стилобат", берем соответствующее по индексу
          if (stylobateTypeConnections.length > index) {
            stylobateConnections = [stylobateTypeConnections[index]]
          }
        }

        let fromBlockId = 0, toBlockId = 0

        if (stylobateConnections.length > 0) {
          // Находим корпуса, участвующие в соединении
          const connectedBlockIds = new Set()
          stylobateConnections.forEach(conn => {
            connectedBlockIds.add(conn.from_block_id)
            if (conn.to_block_id) connectedBlockIds.add(conn.to_block_id)
          })

          // Исключаем сам стилобат из списка связанных блоков
          connectedBlockIds.delete(stylobateBlock.id)

          const connectedRegularBlocks = regularBlocks.filter(b => connectedBlockIds.has(b.id))

          if (connectedRegularBlocks.length >= 2) {
            // Стилобат между двумя корпусами
            fromBlockId = blockIdMapping[connectedRegularBlocks[0].id] || 0
            toBlockId = blockIdMapping[connectedRegularBlocks[1].id] || 0
          } else if (connectedRegularBlocks.length === 1) {
            // Стилобат примыкает к одному корпусу
            fromBlockId = blockIdMapping[connectedRegularBlocks[0].id] || 0
            toBlockId = fromBlockId + 1
          }
        }

        // Способ 3: Fallback - размещаем между первыми двумя корпусами
        if (fromBlockId === 0 && toBlockId === 0 && regularBlocks.length >= 2) {
          fromBlockId = 1
          toBlockId = 2
        }

        const floorInfo = blockFloorRanges[stylobateBlock.id]

        return {
          id: `stylobate-${index + 1}`,
          name: stylobateBlock.name,
          fromBlockId,
          toBlockId,
          floors: floorInfo ? floorInfo.top_floor - floorInfo.bottom_floor + 1 : 1,
          x: 0,
          y: 0,
        }
      })

      // 7. Создаем структуру подземной парковки
      const undergroundConnections = connections?.filter(c =>
        c.connection_type === 'Подземный паркинг' && c.to_block_id !== null
      ) || []

      // Подземный паркинг под отдельными корпусами (без соединений)
      const undergroundParkingIds = connections?.filter(c =>
        c.connection_type === 'Подземный паркинг' && c.to_block_id === null
      ).map(c => c.from_block_id) || []

      // Проверяем, что все ID соединений относятся к обычным корпусам (не стилобатам)
      const validUndergroundConnections = undergroundConnections.filter(conn => {
        const fromIsRegular = regularBlocks.some(b => b.id === conn.from_block_id)
        const toIsRegular = regularBlocks.some(b => b.id === conn.to_block_id)
        return fromIsRegular && toIsRegular
      })

      const validUndergroundParkingIds = undergroundParkingIds.filter(id =>
        regularBlocks.some(b => b.id === id)
      )

      const undergroundParking = {
        blockIds: validUndergroundParkingIds.map(dbId => blockIdMapping[dbId]).filter(id => id > 0),
        connections: validUndergroundConnections.map(conn => {
          const fromLocalId = blockIdMapping[conn.from_block_id] || 0
          const toLocalId = blockIdMapping[conn.to_block_id] || 0

          return {
            fromBlockId: fromLocalId,
            toBlockId: toLocalId,
          }
        }).filter(conn => conn.fromBlockId > 0 && conn.toBlockId > 0)
      }

      return {
        id: projectId,
        name: currentProject?.name || '',
        address: currentProject?.address || '',
        blocks: regularBlocks.map((block, index) => {
          const floorInfo = blockFloorRanges[block.id]
          return {
            id: index + 1,
            name: block.name || '',
            bottomFloor: floorInfo?.bottom_floor ?? 0,
            topFloor: floorInfo?.top_floor ?? 0,
            x: 0,
            y: 0,
          }
        }),
        stylobates,
        undergroundParking,
      }
    } catch (error) {
      console.error('Ошибка загрузки данных проекта для карточки:', error)
      throw error
    }
  }

  const {
    data: projects,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!supabase) return []
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, address')
        .order('name', { ascending: true })
      if (projectError) {
        message.error('Не удалось загрузить данные')
        throw projectError
      }
      const projects = projectData as Project[]
      const ids = projects.map((p) => p.id)
      if (!ids.length) return projects
      // Попробуем сначала запрос с новой структурой (v_block_floor_range)
      // Если не получится, используем старую структуру
      let linkData: any = null
      let linkError: any = null

      // Проверяем, какая структура используется - пытаемся сначала новую
      let hasNewStructure = false
      const { count: mappingCount } = await supabase
        .from('block_floor_mapping')
        .select('*', { count: 'exact', head: true })

      hasNewStructure = mappingCount !== null && mappingCount >= 0

      if (!hasNewStructure) {
        // Используем старую структуру
        const result = await supabase
          .from('projects_blocks')
          .select('project_id, block_id, blocks(name, type_blocks, bottom_underground_floor, top_ground_floor)')
          .in('project_id', ids)
        linkData = result.data
        linkError = result.error
      } else {
        // Используем новую структуру через join
        const result = await supabase
          .from('projects_blocks')
          .select(
            `
            project_id,
            block_id,
            blocks(name, type_blocks)
          `,
          )
          .in('project_id', ids)

        if (!result.error && result.data) {
          // Получаем диапазоны этажей отдельным запросом
          const blockIds = [...new Set(result.data.map((r: any) => r.block_id))]

          if (blockIds.length > 0) {
            const { data: floorRanges } = await supabase
              .from('block_floor_mapping')
              .select('block_id, floor_number')
              .in('block_id', blockIds)

            // Группируем по block_id и находим min/max
            const rangeMap: Record<string, { bottom_floor: number; top_floor: number }> = {}
            if (floorRanges && floorRanges.length > 0) {
              floorRanges.forEach((r: any) => {
                if (!rangeMap[r.block_id]) {
                  rangeMap[r.block_id] = {
                    bottom_floor: r.floor_number,
                    top_floor: r.floor_number,
                  }
                } else {
                  rangeMap[r.block_id].bottom_floor = Math.min(
                    rangeMap[r.block_id].bottom_floor,
                    r.floor_number,
                  )
                  rangeMap[r.block_id].top_floor = Math.max(
                    rangeMap[r.block_id].top_floor,
                    r.floor_number,
                  )
                }
              })
            }

            // Добавляем диапазоны к данным и к блокам
            linkData = result.data.map((r: any) => {
              const range = rangeMap[r.block_id]
              const blockWithRange = r.blocks
                ? {
                    ...r.blocks,
                    bottom_floor: range?.bottom_floor,
                    top_floor: range?.top_floor,
                  }
                : null

              return {
                ...r,
                blocks: blockWithRange,
                v_block_floor_range: range ? [range] : null,
              }
            })
          } else {
            linkData = result.data
          }
        } else {
          linkData = result.data
          linkError = result.error
        }
      }
      if (linkError) {
        message.error('Не удалось загрузить данные')
        throw linkError
      }
      const linkRows =
        (linkData as unknown as
          | {
              project_id: string
              block_id: string
              blocks: BlockInfo | null
              v_block_floor_range?: { bottom_floor: number; top_floor: number }[] | null
            }[]
          | null) ?? []
      const map = linkRows.reduce(
        (acc, row) => {
          const arr = acc[row.project_id] ?? []
          let blockWithFloors = row.blocks

          // Нормализуем данные для отображения
          if (blockWithFloors) {
            // Если поля bottom_floor/top_floor уже есть - используем их
            // Если нет - берём из старых полей или v_block_floor_range
            if (
              blockWithFloors.bottom_floor === undefined ||
              blockWithFloors.bottom_floor === null
            ) {
              if (
                blockWithFloors.bottom_underground_floor !== undefined &&
                blockWithFloors.bottom_underground_floor !== null
              ) {
                blockWithFloors = {
                  ...blockWithFloors,
                  bottom_floor: blockWithFloors.bottom_underground_floor,
                  top_floor: blockWithFloors.top_ground_floor,
                }
              } else if (row.v_block_floor_range?.[0]) {
                blockWithFloors = {
                  ...blockWithFloors,
                  bottom_floor: row.v_block_floor_range[0].bottom_floor,
                  top_floor: row.v_block_floor_range[0].top_floor,
                }
              }
            }
          }

          arr.push({
            block_id: row.block_id,
            blocks: blockWithFloors,
            v_block_floor_range: row.v_block_floor_range,
          })
          acc[row.project_id] = arr
          return acc
        },
        {} as Record<
          string,
          {
            block_id: string
            blocks: BlockInfo | null
            v_block_floor_range?: { bottom_floor: number; top_floor: number }[] | null
          }[]
        >,
      )
      return projects.map((p) => ({ ...p, projects_blocks: map[p.id] ?? [] }))
    },
  })

  const projectRows = useMemo<ProjectRow[]>(
    () =>
      (projects ?? []).map((p) => {
        const blocks =
          p.projects_blocks?.map((b) => b.blocks).filter((b): b is BlockInfo => !!b) ?? []
        return {
          ...p,
          blocks,
          blockNames: blocks.map((b) => b.name),
        }
      }),
    [projects],
  )

  const openAddModal = useCallback(() => {
    form.resetFields()
    setBlocksCount(0)
    setExistingBlockIds([])
    setUndergroundFloorsCount(null)
    setUseUndergroundForAll(false)
    setProjectCardData({ id: '', name: '', address: '', blocks: [] })
    setModalMode('add')
  }, [form])

  const openViewModal = useCallback((record: ProjectRow) => {
    setCurrentProject(record)
    setModalMode('view')
  }, [])

  const openEditModal = useCallback(
    (record: ProjectRow) => {
      setCurrentProject(record)
      const blocks = record.blocks
      const blockIds = record.projects_blocks?.map((b) => b.block_id) ?? []
      setExistingBlockIds(blockIds)

      // Фильтруем только блоки типа "Типовой корпус"
      const regularBlocks = blocks.filter(block =>
        block.type_blocks ? block.type_blocks === 'Типовой корпус' : true
      )
      const regularBlocksCount = regularBlocks.length

      setBlocksCount(regularBlocksCount)
      form.setFieldsValue({
        name: record.name,
        address: record.address,
        blocksCount: regularBlocksCount,
        blocks: regularBlocks, // Передаем только типовые корпуса
      })
      setModalMode('edit')
    },
    [form],
  )

  const handleBlocksCountChange = (value: number | null) => {
    const count = value ?? 0
    const current = form.getFieldValue('blocks') || []

    // Берем только существующие типовые корпуса, новые поля делаем пустыми
    const updated = Array.from(
      { length: count },
      (_, i) => {
        if (i < current.length) {
          // Сохраняем существующий типовой корпус
          return current[i]
        } else {
          // Новое поле - пустое
          return { name: '', bottom_floor: null, top_floor: null }
        }
      }
    )

    form.setFieldsValue({ blocks: updated })
    setBlocksCount(count)

    // Если включена опция "для всех корпусов" и есть количество ПЧ этажей
    if (useUndergroundForAll && undergroundFloorsCount !== null) {
      applyUndergroundFloorsToAll(count)
    }
  }

  const handleUndergroundFloorsChange = (value: number | null) => {
    setUndergroundFloorsCount(value)

    if (useUndergroundForAll && value !== null) {
      applyUndergroundFloorsToAll(blocksCount)
    }
  }

  const handleUseUndergroundForAllChange = (checked: boolean) => {
    setUseUndergroundForAll(checked)

    if (checked && undergroundFloorsCount !== null) {
      applyUndergroundFloorsToAll(blocksCount)
    } else if (!checked) {
      // Сбрасываем значения bottom_floor когда чекбокс отключен
      const current = form.getFieldValue('blocks') || []
      const updated = current.map((block: any) => ({
        ...block,
        bottom_floor: null,
      }))
      form.setFieldsValue({ blocks: updated })
    }
  }

  const applyUndergroundFloorsToAll = (count: number) => {
    if (undergroundFloorsCount === null) return

    const current = form.getFieldValue('blocks') || []
    const updated = Array.from({ length: count }, (_, i) => ({
      ...current[i],
      name: current[i]?.name || '',
      top_floor: current[i]?.top_floor || null,
      bottom_floor: -Math.abs(undergroundFloorsCount),
    }))

    form.setFieldsValue({ blocks: updated })
  }

  const [projectCardData, setProjectCardData] = useState({
    id: '',
    name: '',
    address: '',
    blocks: [] as Array<{ name: string; bottomFloor: number; topFloor: number }>,
  })

  const handleShowProjectCard = async () => {
    const values = form.getFieldsValue()
    if (!values.name || !values.address || !values.blocks?.length) {
      message.warning('Заполните все обязательные поля перед открытием карточки')
      return
    }

    try {
      if (modalMode === 'edit' && currentProject?.id) {
        // Для режима редактирования загружаем данные из БД и объединяем с данными из формы
        console.log('🔍 Loading existing project data for edit mode')
        const fullProjectData = await loadProjectCardData(currentProject.id)

        // Обновляем имя и адрес из формы
        fullProjectData.name = values.name
        fullProjectData.address = values.address

        // Заменяем корпуса данными из формы (форма содержит только типовые корпуса)
        const formBlocks = (values.blocks || []).map((block: any, index: number) => ({
          id: index + 1,
          name: block.name || '',
          bottomFloor: block.bottom_floor ?? 0,
          topFloor: block.top_floor ?? 0,
          x: 0,
          y: 0,
        }))

        // Обновляем только блоки, стилобаты и подземный паркинг остаются из БД
        fullProjectData.blocks = formBlocks

        console.log('🔍 Updated project data with form blocks:', {
          formBlocksCount: formBlocks.length,
          stylobatesCount: fullProjectData.stylobates.length,
          undergroundConnections: fullProjectData.undergroundParking.connections.length
        })

        setProjectCardData(fullProjectData)
        setShowProjectCard(true)
      } else {
        // Для режима добавления используем данные из формы
        console.log('🔍 Form values before mapping:', values.blocks)

        const projectCardData = {
          id: '', // Пустой ID для новых проектов
          name: values.name || '',
          address: values.address || '',
          blocks: (values.blocks || []).map((block: any, index: number) => ({
            id: index + 1,
            name: block.name || '',
            bottomFloor: block.bottom_floor ?? 0,
            topFloor: block.top_floor ?? 0,
            x: 0,
            y: 0,
          })),
          stylobates: [],
          undergroundParking: {
            blockIds: [],
            connections: []
          }
        }

        console.log('🔍 Mapped project data:', projectCardData)
        setProjectCardData(projectCardData)
        setShowProjectCard(true)
      }
    } catch (error) {
      console.error('Ошибка при подготовке карточки проекта:', error)
      message.error('Ошибка при подготовке карточки проекта')
    }
  }

  const handleProjectCardSave = async (cardData: {
    projectName: string
    projectAddress: string
    blocks: any[]
    stylobates: any[]
    undergroundParking: any
  }) => {
    try {
      if (!supabase) return

      // Используем данные из карточки проекта
      const projectData = {
        name: cardData.projectName,
        address: cardData.projectAddress,
      }

      let projectId: string

      if (modalMode === 'add') {
        // Создаём проект
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert(projectData)
          .select('id')
          .single()
        if (projectError) throw projectError
        projectId = project.id
      } else if (modalMode === 'edit' && currentProject) {
        // Обновляем проект
        const { error: projectError } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', currentProject.id)
        if (projectError) throw projectError
        projectId = currentProject.id

        // Удаляем все существующие данные проекта для пересоздания
        console.log('🗑️ Cleaning up existing project data for re-creation')

        // Удаляем связи блоков
        await supabase
          .from('block_connections_mapping')
          .delete()
          .eq('project_id', currentProject.id)

        // Удаляем этажи блоков
        if (existingBlockIds.length) {
          await supabase
            .from('block_floor_mapping')
            .delete()
            .in('block_id', existingBlockIds)
        }

        // Удаляем связи блоков с проектом
        await supabase
          .from('projects_blocks')
          .delete()
          .eq('project_id', currentProject.id)

        // Удаляем блоки
        if (existingBlockIds.length) {
          await supabase
            .from('blocks')
            .delete()
            .in('id', existingBlockIds)
        }
      } else {
        return
      }

      // Создаем блоки и все связанные данные
      const createdBlocks: { [key: number]: string } = {} // маппинг localId -> databaseId

      // 1. Создаем корпуса
      for (const block of cardData.blocks) {
        const createdBlock = await blocksApi.createBlock(block.name)
        createdBlocks[block.id] = createdBlock.id

        // Привязываем блок к проекту
        await blocksApi.linkBlockToProject(projectId, createdBlock.id)

        // Добавляем этажи к блоку
        const floors = []
        for (let floor = block.bottomFloor; floor <= block.topFloor; floor++) {
          let blockType: 'Подземный паркинг' | 'Типовой корпус' | 'Стилобат' | 'Кровля'

          // Определяем тип этажа
          if (floor === 0) {
            blockType = 'Кровля'
          } else if (floor > 0) {
            blockType = 'Типовой корпус'
          } else {
            // Подземные этажи: проверяем, есть ли паркинг под этим корпусом
            const hasUndergroundParking = cardData.undergroundParking.blockIds.includes(block.id)
            blockType = hasUndergroundParking ? 'Подземный паркинг' : 'Типовой корпус'
          }

          floors.push({ floor_number: floor, type_blocks: blockType })
        }

        await blocksApi.addFloorsToBlock(createdBlock.id, floors)
      }

      // 2. Создаем стилобаты
      for (const stylobate of cardData.stylobates) {
        const fromBlockDbId = createdBlocks[stylobate.fromBlockId]
        const toBlockDbId = createdBlocks[stylobate.toBlockId]

        if (fromBlockDbId && toBlockDbId) {
          await blockConnectionsApi.createBlockConnection(
            projectId,
            fromBlockDbId,
            toBlockDbId,
            'Стилобат',
            stylobate.floors,
          )

          // Создаем блок стилобата в таблице blocks
          const stylobateBlock = await blocksApi.createBlock(stylobate.name, 'Стилобат')
          await blocksApi.linkBlockToProject(projectId, stylobateBlock.id)

          // Добавляем этажи стилобата
          const stylobateFloors = []
          for (let floor = 1; floor <= stylobate.floors; floor++) {
            stylobateFloors.push({ floor_number: floor, type_blocks: 'Стилобат' as const })
          }
          await blocksApi.addFloorsToBlock(stylobateBlock.id, stylobateFloors)
        }
      }

      // 3. Создаем подземные соединения (подземный паркинг между корпусами)
      for (const connection of cardData.undergroundParking.connections) {
        const fromBlockDbId = createdBlocks[connection.fromBlockId]
        const toBlockDbId = createdBlocks[connection.toBlockId]

        if (fromBlockDbId && toBlockDbId) {
          await blockConnectionsApi.createBlockConnection(
            projectId,
            fromBlockDbId,
            toBlockDbId,
            'Подземный паркинг',
            1,
          )
        }
      }

      // 4. Создаем записи о паркингах под корпусами
      for (const blockId of cardData.undergroundParking.blockIds) {
        const blockDbId = createdBlocks[blockId]
        if (blockDbId) {
          await blockConnectionsApi.createBlockConnection(
            projectId,
            blockDbId,
            null,
            'Подземный паркинг',
            1,
          )
        }
      }

      message.success(modalMode === 'add' ? 'Проект добавлен' : 'Проект обновлён')
      setShowProjectCard(false)
      setModalMode(null)
      setCurrentProject(null)
      setBlocksCount(0)
      setExistingBlockIds([])
      setProjectCardData({ id: '', name: '', address: '', blocks: [] })
      await refetch()
    } catch {
      message.error('Не удалось сохранить')
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (!supabase) return
      const blocks: BlockInfo[] = values.blocks ?? []
      const projectData = {
        name: values.name,
        address: values.address,
      }
      if (modalMode === 'add') {
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert(projectData)
          .select('id')
          .single()
        if (projectError) throw projectError
        const projectRow = project as { id: string }
        if (blocks.length) {
          // Проверяем, какая структура БД используется
          const { count: mappingTableExists } = await supabase
            .from('block_floor_mapping')
            .select('*', { count: 'exact', head: true })

          const useNewStructure = mappingTableExists !== null

          if (useNewStructure) {
            // Новая структура - создаём блоки без полей этажей
            const { data: blocksData, error: blocksError } = await supabase
              .from('blocks')
              .insert(blocks.map((b) => ({ name: b.name })))
              .select('id')
            if (blocksError) throw blocksError
            const rows = blocksData as BlockRow[] | null

            // Создаём связи проект-корпус
            const projectBlocks = (rows ?? []).map((b) => ({
              project_id: projectRow.id,
              block_id: b.id,
            }))
            const { error: linkError } = await supabase
              .from('projects_blocks')
              .insert(projectBlocks)
            if (linkError) throw linkError

            // Создаём связи корпус-этажи напрямую в таблице маппинга
            for (let i = 0; i < rows!.length; i++) {
              const block = blocks[i]
              if (
                block.bottom_floor !== null &&
                block.bottom_floor !== undefined &&
                block.top_floor !== null &&
                block.top_floor !== undefined
              ) {
                const floorMappings = []
                const minFloor = Math.min(block.bottom_floor, block.top_floor)
                const maxFloor = Math.max(block.bottom_floor, block.top_floor)

                for (let floor = minFloor; floor <= maxFloor; floor++) {
                  floorMappings.push({
                    block_id: rows![i].id,
                    floor_number: floor,
                  })
                }

                if (floorMappings.length > 0) {
                  const { error: mappingError } = await supabase
                    .from('block_floor_mapping')
                    .insert(floorMappings)
                  if (mappingError) throw mappingError
                }
              }
            }
          } else {
            // Старая структура - создаём блоки с полями этажей
            const blocksToInsert = blocks.map((b) => ({
              name: b.name,
              bottom_underground_floor: b.bottom_floor ?? b.bottom_underground_floor,
              top_ground_floor: b.top_floor ?? b.top_ground_floor,
            }))

            const { data: blocksData, error: blocksError } = await supabase
              .from('blocks')
              .insert(blocksToInsert)
              .select('id')
            if (blocksError) throw blocksError
            const rows = blocksData as BlockRow[] | null

            // Создаём связи проект-корпус
            const projectBlocks = (rows ?? []).map((b) => ({
              project_id: projectRow.id,
              block_id: b.id,
            }))
            const { error: linkError } = await supabase
              .from('projects_blocks')
              .insert(projectBlocks)
            if (linkError) throw linkError
          }
        }
        message.success('Проект добавлен')
      }
      if (modalMode === 'edit' && currentProject) {
        const { error: projectError } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', currentProject.id)
        if (projectError) throw projectError
        if (existingBlockIds.length) {
          const { error: delError } = await supabase
            .from('blocks')
            .delete()
            .in('id', existingBlockIds)
          if (delError) throw delError
        }
        if (blocks.length) {
          // Проверяем, какая структура БД используется
          const { count: mappingTableExists } = await supabase
            .from('block_floor_mapping')
            .select('*', { count: 'exact', head: true })

          const useNewStructure = mappingTableExists !== null

          if (useNewStructure) {
            // Новая структура - создаём блоки без полей этажей
            const { data: blocksData, error: blocksError } = await supabase
              .from('blocks')
              .insert(blocks.map((b) => ({ name: b.name })))
              .select('id')
            if (blocksError) throw blocksError
            const rows = blocksData as BlockRow[] | null

            // Создаём связи проект-корпус
            const projectBlocks = (rows ?? []).map((b) => ({
              project_id: currentProject.id,
              block_id: b.id,
            }))
            const { error: linkError } = await supabase
              .from('projects_blocks')
              .insert(projectBlocks)
            if (linkError) throw linkError

            // Создаём связи корпус-этажи напрямую в таблице маппинга
            for (let i = 0; i < rows!.length; i++) {
              const block = blocks[i]
              if (
                block.bottom_floor !== null &&
                block.bottom_floor !== undefined &&
                block.top_floor !== null &&
                block.top_floor !== undefined
              ) {
                const floorMappings = []
                const minFloor = Math.min(block.bottom_floor, block.top_floor)
                const maxFloor = Math.max(block.bottom_floor, block.top_floor)

                for (let floor = minFloor; floor <= maxFloor; floor++) {
                  floorMappings.push({
                    block_id: rows![i].id,
                    floor_number: floor,
                  })
                }

                if (floorMappings.length > 0) {
                  const { error: mappingError } = await supabase
                    .from('block_floor_mapping')
                    .insert(floorMappings)
                  if (mappingError) throw mappingError
                }
              }
            }
          } else {
            // Старая структура - создаём блоки с полями этажей
            const blocksToInsert = blocks.map((b) => ({
              name: b.name,
              bottom_underground_floor: b.bottom_floor ?? b.bottom_underground_floor,
              top_ground_floor: b.top_floor ?? b.top_ground_floor,
            }))

            const { data: blocksData, error: blocksError } = await supabase
              .from('blocks')
              .insert(blocksToInsert)
              .select('id')
            if (blocksError) throw blocksError
            const rows = blocksData as BlockRow[] | null

            // Создаём связи проект-корпус
            const projectBlocks = (rows ?? []).map((b) => ({
              project_id: currentProject.id,
              block_id: b.id,
            }))
            const { error: linkError } = await supabase
              .from('projects_blocks')
              .insert(projectBlocks)
            if (linkError) throw linkError
          }
        }
        message.success('Проект обновлён')
      }
      setModalMode(null)
      setCurrentProject(null)
      setBlocksCount(0)
      setExistingBlockIds([])
      await refetch()
    } catch {
      message.error('Не удалось сохранить')
    }
  }

  const nameFilters = useMemo(
    () =>
      Array.from(new Set((projects ?? []).map((p) => p.name))).map((n) => ({
        text: n,
        value: n,
      })),
    [projects],
  )

  const addressFilters = useMemo(
    () =>
      Array.from(
        new Set((projects ?? []).map((p) => p.address).filter((a): a is string => !!a)),
      ).map((a) => ({
        text: a,
        value: a,
      })),
    [projects],
  )

  const blockNameFilters = useMemo(
    () =>
      Array.from(new Set(projectRows.flatMap((p) => p.blockNames))).map((n) => ({
        text: n,
        value: n,
      })),
    [projectRows],
  )

  const columns: TableProps<ProjectRow>['columns'] = useMemo(
    () => [
      {
        title: 'Название',
        dataIndex: 'name',
        sorter: (a: ProjectRow, b: ProjectRow) => a.name.localeCompare(b.name),
        filters: nameFilters,
        onFilter: (value: unknown, record: ProjectRow) => record.name === value,
      },
      {
        title: 'Адрес',
        dataIndex: 'address',
        sorter: (a: ProjectRow, b: ProjectRow) => (a.address ?? '').localeCompare(b.address ?? ''),
        filters: addressFilters,
        onFilter: (value: unknown, record: ProjectRow) => record.address === value,
      },
      {
        title: 'Корпуса',
        dataIndex: 'blockNames',
        sorter: (a: ProjectRow, b: ProjectRow) =>
          a.blockNames.join(';').localeCompare(b.blockNames.join(';')),
        filters: blockNameFilters,
        onFilter: (value: unknown, record: ProjectRow) =>
          record.blockNames.includes(value as string),
        render: (_: unknown, record: ProjectRow) =>
          record.blocks
            .map((b) => `${b.name} (${b.bottom_floor ?? ''}; ${b.top_floor ?? ''})`)
            .join('; '),
      },
      {
        title: 'Действия',
        dataIndex: 'actions',
        render: (_: unknown, record: ProjectRow) => (
          <Space>
            <Button
              icon={<EyeOutlined />}
              onClick={() => openViewModal(record)}
              aria-label="Просмотр"
            />
            <Button
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
              aria-label="Редактировать"
            />
            <CascadeDeleteProject
              projectId={record.id}
              projectName={record.name}
              onSuccess={() => {
                console.log('🎉 Проект успешно удален, обновляем список')
                refetch()
              }}
            >
              <Button danger icon={<DeleteOutlined />} aria-label="Удалить" />
            </CascadeDeleteProject>
          </Space>
        ),
      },
    ],
    [nameFilters, addressFilters, blockNameFilters, openViewModal, openEditModal, refetch],
  )

  return (
    <div className={styles.projectsPage}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" onClick={openAddModal}>
          Добавить
        </Button>
      </div>
      <div className={styles.projectsTableContainer}>
        <Table<ProjectRow>
          dataSource={projectRows}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 'max-content' }}
          className={styles.projectsTable}
        />
      </div>

      <Modal
        open={modalMode !== null}
        title={
          modalMode === 'add'
            ? 'Добавить проект'
            : modalMode === 'edit'
              ? 'Редактировать проект'
              : 'Просмотр проекта'
        }
        onCancel={() => {
          setModalMode(null)
          setCurrentProject(null)
          setBlocksCount(0)
          setExistingBlockIds([])
          setProjectCardData({ id: '', name: '', address: '', blocks: [] })
          form.resetFields()
        }}
        onOk={modalMode === 'view' ? () => setModalMode(null) : handleSave}
        okText={modalMode === 'view' ? 'Закрыть' : 'Сохранить'}
        cancelText="Отмена"
      >
        {modalMode === 'view' ? (
          <div>
            <p>Название: {currentProject?.name}</p>
            <p>Адрес: {currentProject?.address}</p>
            <p>Количество корпусов: {currentProject?.blocks.filter(block =>
              block.type_blocks ? block.type_blocks === 'Типовой корпус' : true
            ).length ?? 0}</p>
            <p>
              Корпуса:{' '}
              {(() => {
                if (!currentProject?.blocks || currentProject.blocks.length === 0) return ''

                // Фильтруем основные корпуса (не стилобаты)
                const mainBlocks = currentProject.blocks.filter(
                  (block) => !block.name.toLowerCase().includes('стилобат'),
                )

                // Проверяем наличие стилобатов и подземной парковки
                const hasStylebates = currentProject.blocks.some((block) =>
                  block.name.toLowerCase().includes('стилобат'),
                )
                const hasUndergroundParking = currentProject.blocks.some(
                  (block) => (block.bottom_floor ?? 0) < 0,
                )

                // Формируем описание основных корпусов
                let description = mainBlocks
                  .map((b) => `${b.name} (от ${b.bottom_floor ?? ''} до ${b.top_floor ?? ''})`)
                  .join('; ')

                // Добавляем информацию о дополнительных элементах
                const additionalFeatures = []
                if (hasStylebates) additionalFeatures.push('стилобат')
                if (hasUndergroundParking) additionalFeatures.push('подз.паркинг')

                if (additionalFeatures.length > 0) {
                  description += description
                    ? '; ' + additionalFeatures.join('; ')
                    : additionalFeatures.join('; ')
                }

                return description
              })()}
            </p>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <Button
                type="primary"
                onClick={async () => {
                  if (currentProject?.blocks && currentProject.blocks.length > 0) {
                    try {
                      console.log('🔍 Loading project card data for project:', currentProject.id)
                      const projectCardDataWithStylobates = await loadProjectCardData(currentProject.id)
                      console.log('🔍 Loaded project card data:', projectCardDataWithStylobates)
                      setProjectCardData(projectCardDataWithStylobates)
                      setShowProjectCard(true)
                    } catch (error) {
                      console.error('Ошибка загрузки данных карточки проекта:', error)
                      message.error('Ошибка при загрузке карточки проекта')
                    }
                  } else {
                    message.warning('У проекта нет корпусов для отображения карточки')
                  }
                }}
              >
                Открыть карточку проекта
              </Button>
            </div>
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              label="Название"
              name="name"
              rules={[{ required: true, message: 'Введите название' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Адрес"
              name="address"
              rules={[{ required: true, message: 'Введите адрес' }]}
            >
              <Input />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Количество корпусов"
                  name="blocksCount"
                  rules={[{ required: true, message: 'Введите количество корпусов' }]}
                >
                  <InputNumber min={1} onChange={handleBlocksCountChange} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Количество ПЧ этажей"
                  name="undergroundFloorsCount"
                  tooltip="Подземные этажи (техэтажи)"
                >
                  <InputNumber
                    min={1}
                    onChange={handleUndergroundFloorsChange}
                    addonAfter={
                      <Checkbox
                        checked={useUndergroundForAll}
                        onChange={(e) => handleUseUndergroundForAllChange(e.target.checked)}
                      >
                        для всех корпусов
                      </Checkbox>
                    }
                  />
                </Form.Item>
              </Col>
            </Row>
            {Array.from({ length: blocksCount }).map((_, index) => (
              <Space key={index} direction="vertical" style={{ width: '100%' }}>
                <Form.Item
                  label={`Название корпуса ${index + 1}`}
                  name={['blocks', index, 'name']}
                  rules={[{ required: true, message: 'Введите название корпуса' }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  label="Нижний этаж"
                  name={['blocks', index, 'bottom_floor']}
                  rules={[{ required: true, message: 'Введите нижний этаж' }]}
                >
                  <InputNumber />
                </Form.Item>
                <Form.Item
                  label="Верхний этаж"
                  name={['blocks', index, 'top_floor']}
                  rules={[{ required: true, message: 'Введите верхний этаж' }]}
                >
                  <InputNumber />
                </Form.Item>
              </Space>
            ))}

            {modalMode !== 'view' && (
              <div style={{ marginTop: 24, textAlign: 'left' }}>
                <Button type="default" onClick={handleShowProjectCard}>
                  Карточка
                </Button>
              </div>
            )}
          </Form>
        )}
      </Modal>

      <ProjectCardModal
        visible={showProjectCard}
        onCancel={() => {
          setShowProjectCard(false)
          setProjectCardData({ id: '', name: '', address: '', blocks: [] })
        }}
        onSave={handleProjectCardSave}
        projectData={projectCardData}
      />
    </div>
  )
}
