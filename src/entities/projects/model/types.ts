// Типы для работы с проектами и блоками

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
  type_blocks: 'Подземный паркинг' | 'Типовой корпус' | 'Стилобат' | 'Кровля'
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

// Типы для UI компонентов
export interface UIBlock {
  id: number
  name: string
  bottomFloor: number
  topFloor: number
  x: number
  y: number
}

export interface UIStylobate {
  id: string
  name: string
  fromBlockId: number
  toBlockId: number
  floors: number
  x: number
  y: number
}

export interface UIUndergroundParking {
  blockIds: number[]
  connections: Array<{ fromBlockId: number; toBlockId: number }>
}

export interface ProjectCardData {
  blocks: UIBlock[]
  stylobates: UIStylobate[]
  undergroundParking: UIUndergroundParking
}

export type BlockType = 'Подземный паркинг' | 'Типовой корпус' | 'Стилобат' | 'Кровля'
