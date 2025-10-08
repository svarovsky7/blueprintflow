export type PortalObjectType = 'page' | 'section' | 'feature' | 'action'

export interface PortalObject {
  id: string
  name: string
  code: string
  object_type: PortalObjectType
  description?: string | null
  route_path?: string | null
  parent_id?: string | null
  icon?: string | null
  sort_order: number
  is_visible: boolean
  is_system: boolean
  metadata?: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface PortalObjectWithChildren extends PortalObject {
  children?: PortalObjectWithChildren[]
}

export interface CreatePortalObjectDto {
  name: string
  code: string
  object_type: PortalObjectType
  description?: string
  route_path?: string
  parent_id?: string
  icon?: string
  sort_order?: number
  is_visible?: boolean
  metadata?: Record<string, any>
}

export interface UpdatePortalObjectDto {
  name?: string
  code?: string
  object_type?: PortalObjectType
  description?: string
  route_path?: string
  parent_id?: string
  icon?: string
  sort_order?: number
  is_visible?: boolean
  metadata?: Record<string, any>
}
