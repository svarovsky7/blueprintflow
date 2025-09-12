/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from 'react'
import { App, Button, Form, Input, InputNumber, Modal, Space, Table, Checkbox, Row, Col } from 'antd'
import type { TableProps } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import ProjectCardModal from '../../components/ProjectCardModal'
import CustomPopconfirm from '../../components/CustomPopconfirm'
import CascadeDeleteProject from '../../components/CascadeDeleteProject'
import styles from './Projects.module.css'

interface BlockInfo {
  name: string
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
          .select('project_id, block_id, blocks(name, bottom_underground_floor, top_ground_floor)')
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
            blocks(name)
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
    setProjectCardData({ name: '', address: '', blocks: [] })
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
      setBlocksCount(blocks.length)
      form.setFieldsValue({
        name: record.name,
        address: record.address,
        blocksCount: blocks.length,
        blocks,
      })
      setModalMode('edit')
    },
    [form],
  )

  const handleBlocksCountChange = (value: number | null) => {
    const count = value ?? 0
    const current = form.getFieldValue('blocks') || []
    const updated = Array.from(
      { length: count },
      (_, i) => current[i] || { name: '', bottom_floor: null, top_floor: null },
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
    name: '',
    address: '',
    blocks: [] as Array<{ name: string; bottomFloor: number; topFloor: number }>
  })

  const handleShowProjectCard = () => {
    const values = form.getFieldsValue()
    if (!values.name || !values.address || !values.blocks?.length) {
      message.warning('Заполните все обязательные поля перед открытием карточки')
      return
    }
    
    setProjectCardData({
      name: values.name || '',
      address: values.address || '',
      blocks: (values.blocks || []).map((block: any) => ({
        name: block.name || '',
        bottomFloor: block.bottom_floor || 0,
        topFloor: block.top_floor || 0,
      }))
    })
    setShowProjectCard(true)
  }

  const handleProjectCardSave = async (cardData: {
    blocks: any[]
    stylobates: any[]
    undergroundParking: any
  }) => {
    try {
      if (!supabase) return
      
      // Получаем основные данные проекта
      const values = await form.validateFields()
      const projectData = {
        name: values.name,
        address: values.address,
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
        
        // Удаляем существующие блоки
        if (existingBlockIds.length) {
          const { error: delError } = await supabase
            .from('blocks')
            .delete()
            .in('id', existingBlockIds)
          if (delError) throw delError
        }
      } else {
        return
      }

      // Создаём обычные корпуса
      const regularBlocks = cardData.blocks
      const allBlocksToCreate = [...regularBlocks]

      // Добавляем стилобаты как блоки
      cardData.stylobates.forEach(stylobate => {
        allBlocksToCreate.push({
          name: stylobate.name,
          bottomFloor: 1,
          topFloor: stylobate.floors,
          isStylebat: true
        })
      })

      if (allBlocksToCreate.length) {
        // Создаём все блоки
        const { data: blocksData, error: blocksError } = await supabase
          .from('blocks')
          .insert(allBlocksToCreate.map(b => ({ name: b.name })))
          .select('id, name')
        if (blocksError) throw blocksError

        // Создаём связи проект-блок
        const projectBlocks = blocksData.map(b => ({
          project_id: projectId,
          block_id: b.id,
        }))
        const { error: linkError } = await supabase
          .from('projects_blocks')
          .insert(projectBlocks)
        if (linkError) throw linkError

        // Создаём маппинг этажей для всех блоков
        const floorMappings = []
        
        blocksData.forEach((dbBlock, index) => {
          const sourceBlock = allBlocksToCreate[index]
          const minFloor = Math.min(sourceBlock.bottomFloor, sourceBlock.topFloor)
          const maxFloor = Math.max(sourceBlock.bottomFloor, sourceBlock.topFloor)

          for (let floor = minFloor; floor <= maxFloor; floor++) {
            let blockType: 'Типовой корпус' | 'Стилобат' | 'Подземная парковка' = 'Типовой корпус'
            
            if (sourceBlock.isStylebat) {
              blockType = 'Стилобат'
            } else if (floor < 0) {
              blockType = 'Подземная парковка'
            }

            floorMappings.push({
              block_id: dbBlock.id,
              floor_number: floor,
              type_blocks: blockType
            })
          }
        })

        if (floorMappings.length > 0) {
          const { error: mappingError } = await supabase
            .from('block_floor_mapping')
            .insert(floorMappings)
          if (mappingError) throw mappingError
        }
      }

      message.success(modalMode === 'add' ? 'Проект добавлен' : 'Проект обновлён')
      setShowProjectCard(false)
      setModalMode(null)
      setCurrentProject(null)
      setBlocksCount(0)
      setExistingBlockIds([])
      setProjectCardData({ name: '', address: '', blocks: [] })
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
          setProjectCardData({ name: '', address: '', blocks: [] })
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
            <p>Количество корпусов: {currentProject?.blocks.length ?? 0}</p>
            <p>
              Корпуса:{' '}
              {currentProject?.blocks
                .map((b) => `${b.name} (от ${b.bottom_floor ?? ''} до ${b.top_floor ?? ''})`)
                .join('; ')}
            </p>
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
          setProjectCardData({ name: '', address: '', blocks: [] })
        }}
        onSave={handleProjectCardSave}
        projectData={projectCardData}
      />
    </div>
  )
}
