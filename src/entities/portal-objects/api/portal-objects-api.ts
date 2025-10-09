import { supabase } from '@/lib/supabase'
import type {
  PortalObject,
  PortalObjectWithChildren,
  CreatePortalObjectDto,
  UpdatePortalObjectDto,
  PortalObjectType,
} from '../model/types'

export async function getPortalObjects(): Promise<PortalObject[]> {
  const { data, error } = await supabase
    .from('portal_objects')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getPortalObjectsByType(type: PortalObjectType): Promise<PortalObject[]> {
  const { data, error } = await supabase
    .from('portal_objects')
    .select('*')
    .eq('object_type', type)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getPortalObjectById(objectId: string): Promise<PortalObject | null> {
  const { data, error } = await supabase
    .from('portal_objects')
    .select('*')
    .eq('id', objectId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getPortalObjectByCode(code: string): Promise<PortalObject | null> {
  const { data, error } = await supabase
    .from('portal_objects')
    .select('*')
    .eq('code', code)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createPortalObject(dto: CreatePortalObjectDto): Promise<PortalObject> {
  const { data, error } = await supabase
    .from('portal_objects')
    .insert([
      {
        name: dto.name,
        code: dto.code,
        object_type: dto.object_type,
        description: dto.description,
        route_path: dto.route_path,
        parent_id: dto.parent_id,
        icon: dto.icon,
        sort_order: dto.sort_order || 0,
        is_visible: dto.is_visible !== undefined ? dto.is_visible : true,
        metadata: dto.metadata,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePortalObject(
  objectId: string,
  dto: UpdatePortalObjectDto
): Promise<PortalObject> {
  const { data, error } = await supabase
    .from('portal_objects')
    .update(dto)
    .eq('id', objectId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePortalObject(objectId: string): Promise<void> {
  const { error } = await supabase.from('portal_objects').delete().eq('id', objectId)

  if (error) throw error
}

export function buildPortalObjectTree(objects: PortalObject[]): PortalObjectWithChildren[] {
  const objectMap = new Map<string, PortalObjectWithChildren>()
  const rootObjects: PortalObjectWithChildren[] = []

  objects.forEach((obj) => {
    objectMap.set(obj.id, { ...obj, children: [] })
  })

  objects.forEach((obj) => {
    const current = objectMap.get(obj.id)!
    if (obj.parent_id) {
      const parent = objectMap.get(obj.parent_id)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(current)
      } else {
        rootObjects.push(current)
      }
    } else {
      rootObjects.push(current)
    }
  })

  return rootObjects
}
