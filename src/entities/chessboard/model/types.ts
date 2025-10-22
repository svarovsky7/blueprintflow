import type { BaseEntity } from '@/shared/types'

export interface ChessboardRow extends BaseEntity {
  material: string
  unitId: string
  blockId: string
  block: string
  costCategoryId: string
  costTypeId: string
  workUnit: string
  locationId: string
  floors: string
  color: 'green' | 'yellow' | 'blue' | 'red' | 'purple' | ''
  created_by?: string | null
  updated_by?: string | null
}
