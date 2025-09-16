import { supabase } from '@/lib/supabase'
import type { BlockType } from '../model/types'

// Интерфейсы для проектов
export interface Project {
  id: string
  name: string
  address: string
}

export interface Block {
  id: string
  name: string
  type_blocks?: BlockType
}

export interface ProjectBlock {
  project_id: string
  block_id: string
  created_at: string
  updated_at: string
}

export interface BlockFloorMapping {
  id: string
  block_id: string
  floor_number: number
  type_blocks: BlockType
  created_at: string
  updated_at: string
}

export interface BlockConnectionsMapping {
  id: string
  project_id: string
  from_block_id: string
  to_block_id?: string
  connection_type: BlockType
  floors_count: number
  created_at: string
  updated_at: string
}

// API функции для работы с проектами
export const projectsApi = {
  // Получить все проекты
  async getProjects() {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Ошибка получения проектов:', error)
      throw error
    }

    return data as Project[]
  },

  // Получить проект по ID
  async getProjectById(id: string) {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase.from('projects').select('*').eq('id', id).single()

    if (error) {
      console.error('Ошибка получения проекта:', error)
      throw error
    }

    return data as Project
  },

  // Получить блоки проекта
  async getProjectBlocks(projectId: string) {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('projects_blocks')
      .select(
        `
        project_id,
        block_id,
        created_at,
        updated_at,
        blocks (
          id,
          name,
          type_blocks,
          created_at,
          updated_at
        )
      `,
      )
      .eq('project_id', projectId)

    if (error) {
      console.error('Ошибка получения блоков проекта:', error)
      throw error
    }

    return data
  },

  // Получить этажи блоков проекта
  async getProjectBlockFloors(projectId: string) {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('block_floor_mapping')
      .select(
        `
        id,
        block_id,
        floor_number,
        type_blocks,
        created_at,
        updated_at,
        blocks!inner (
          id,
          name,
          projects_blocks!inner (
            project_id
          )
        )
      `,
      )
      .eq('blocks.projects_blocks.project_id', projectId)
      .order('floor_number', { ascending: false })

    if (error) {
      console.error('Ошибка получения этажей блоков:', error)
      throw error
    }

    return data as BlockFloorMapping[]
  },

  // Получить связи между блоками проекта
  async getProjectBlockConnections(projectId: string) {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('block_connections_mapping')
      .select(
        `
        id,
        project_id,
        from_block_id,
        to_block_id,
        connection_type,
        floors_count,
        created_at,
        updated_at,
        from_block:blocks!from_block_id (
          id,
          name
        ),
        to_block:blocks!to_block_id (
          id,
          name
        )
      `,
      )
      .eq('project_id', projectId)

    if (error) {
      console.error('Ошибка получения связей блоков:', error)
      throw error
    }

    return data as BlockConnectionsMapping[]
  },
}

// API функции для работы с блоками
export const blocksApi = {
  // Создать новый блок
  async createBlock(name: string, type_blocks: BlockType = 'Типовой корпус') {
    if (!supabase) throw new Error('Supabase client not initialized')

    console.log('🔄 Создание блока:', name, 'типа:', type_blocks)

    // Пытаемся создать блок с type_blocks, если не получается - создаем без него (для обратной совместимости)
    let insertData: any = { name, type_blocks }
    let { data, error } = await supabase.from('blocks').insert(insertData).select().single()

    if (
      error &&
      error.message.includes('column "type_blocks" of relation "blocks" does not exist')
    ) {
      console.warn('⚠️ Колонка type_blocks не найдена, создаем блок без неё')
      insertData = { name }
      const fallbackResult = await supabase.from('blocks').insert(insertData).select().single()
      data = fallbackResult.data
      error = fallbackResult.error
    }

    if (error) {
      console.error('❌ Ошибка создания блока:', error)
      throw error
    }

    console.log('✅ Блок создан:', data)
    return data as Block
  },

  // Привязать блок к проекту
  async linkBlockToProject(projectId: string, blockId: string) {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('projects_blocks')
      .insert({ project_id: projectId, block_id: blockId })
      .select()
      .single()

    if (error) {
      console.error('Ошибка привязки блока к проекту:', error)
      throw error
    }

    return data as ProjectBlock
  },

  // Добавить этажи к блоку
  async addFloorsToBlock(
    blockId: string,
    floors: { floor_number: number; type_blocks: BlockFloorMapping['type_blocks'] }[],
  ) {
    const floorsData = floors.map((floor) => ({
      block_id: blockId,
      floor_number: floor.floor_number,
      type_blocks: floor.type_blocks,
    }))

    console.log('🔄 Создание этажей для блока:', blockId)
    console.log('📊 Количество этажей:', floorsData.length)
    console.log(
      '📋 Детали этажей:',
      floorsData.map((f) => `${f.floor_number}:${f.type_blocks}`).join(', '),
    )

    if (!supabase) throw new Error('Supabase client not initialized')

    // Проверяем данные перед отправкой
    for (const floor of floorsData) {
      if (!floor.block_id || typeof floor.floor_number !== 'number' || !floor.type_blocks) {
        console.error('❌ Некорректные данные этажа:', floor)
        throw new Error(`Некорректные данные этажа: ${JSON.stringify(floor)}`)
      }
    }

    const { error } = await supabase.from('block_floor_mapping').upsert(floorsData, {
      onConflict: 'block_id,floor_number',
      ignoreDuplicates: false,
    })

    if (error) {
      console.error('❌ Ошибка добавления этажей к блоку:', error)
      console.error('📊 Данные которые пытались вставить:', floorsData)
      throw error
    }

    console.log('✅ Успешно созданы этажи для блока:', blockId)
    return [] // Возвращаем пустой массив, так как нам не нужны данные обратно
  },
}

// API функции для работы со связями между блоками
export const blockConnectionsApi = {
  // Создать связь между блоками (стилобат или подземное соединение)
  async createBlockConnection(
    projectId: string,
    fromBlockId: string,
    toBlockId: string | null,
    connectionType: BlockConnectionsMapping['connection_type'],
    floorsCount: number = 1,
  ) {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('block_connections_mapping')
      .insert({
        project_id: projectId,
        from_block_id: fromBlockId,
        to_block_id: toBlockId,
        connection_type: connectionType,
        floors_count: floorsCount,
      })
      .select()
      .single()

    if (error) {
      console.error('Ошибка создания связи блоков:', error)
      throw error
    }

    return data as BlockConnectionsMapping
  },

  // Удалить связь между блоками
  async deleteBlockConnection(connectionId: string) {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { error } = await supabase
      .from('block_connections_mapping')
      .delete()
      .eq('id', connectionId)

    if (error) {
      console.error('Ошибка удаления связи блоков:', error)
      throw error
    }
  },

  // Обновить количество этажей стилобата
  async updateStylobateFloors(connectionId: string, floorsCount: number) {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { data, error } = await supabase
      .from('block_connections_mapping')
      .update({ floors_count: floorsCount, updated_at: new Date().toISOString() })
      .eq('id', connectionId)
      .select()
      .single()

    if (error) {
      console.error('Ошибка обновления этажей стилобата:', error)
      throw error
    }

    return data as BlockConnectionsMapping
  },
}
