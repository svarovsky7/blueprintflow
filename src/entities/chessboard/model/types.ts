import type { BaseEntity } from '@/shared/types'

export interface ChessboardRow extends BaseEntity {
  material: string
  quantityPd: string
  quantitySpec: string
  quantityRd: string
  unitId: string
  blockId: string
  block: string
  costCategoryId: string
  costTypeId: string
  locationId: string
  floors: string
  color: 'green' | 'yellow' | 'blue' | 'red' | 'purple' | ''
}