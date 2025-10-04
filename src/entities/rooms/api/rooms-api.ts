import { supabase } from '@/lib/supabase'
import type { Room, LocationRoomMapping } from '../model/types'

export const roomsApi = {
  // Получить все помещения
  async getAll(): Promise<Room[]> {
    const { data, error } = await supabase
      .from('type_rooms')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Failed to fetch rooms:', error)
      throw error
    }

    return data as Room[]
  },

  // Получить помещения для конкретной локализации
  async getByLocationId(locationId: number): Promise<Room[]> {
    const { data, error } = await supabase
      .from('location_rooms_mapping')
      .select('room_id, type_rooms(*)')
      .eq('location_id', locationId)

    if (error) {
      console.error('Failed to fetch rooms for location:', error)
      throw error
    }

    return (data as Array<{ type_rooms: Room }>).map((item) => item.type_rooms)
  },

  // Получить локализации для конкретного помещения
  async getLocationsByRoomId(roomId: number): Promise<number[]> {
    const { data, error } = await supabase
      .from('location_rooms_mapping')
      .select('location_id')
      .eq('room_id', roomId)

    if (error) {
      console.error('Failed to fetch locations for room:', error)
      throw error
    }

    return data.map((item) => item.location_id)
  },

  // Создать помещение
  async create(name: string): Promise<Room> {
    const { data, error } = await supabase.from('type_rooms').insert({ name }).select().single()

    if (error) {
      console.error('Failed to create room:', error)
      throw error
    }

    return data as Room
  },

  // Обновить помещение
  async update(id: number, name: string): Promise<Room> {
    const { data, error } = await supabase
      .from('type_rooms')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update room:', error)
      throw error
    }

    return data as Room
  },

  // Удалить помещение
  async delete(id: number): Promise<void> {
    const { error } = await supabase.from('type_rooms').delete().eq('id', id)

    if (error) {
      console.error('Failed to delete room:', error)
      throw error
    }
  },

  // Связать помещение с локализацией
  async linkToLocation(locationId: number, roomId: number): Promise<void> {
    const { error } = await supabase
      .from('location_rooms_mapping')
      .insert({ location_id: locationId, room_id: roomId })

    if (error) {
      console.error('Failed to link room to location:', error)
      throw error
    }
  },

  // Отвязать помещение от локализации
  async unlinkFromLocation(locationId: number, roomId: number): Promise<void> {
    const { error } = await supabase
      .from('location_rooms_mapping')
      .delete()
      .eq('location_id', locationId)
      .eq('room_id', roomId)

    if (error) {
      console.error('Failed to unlink room from location:', error)
      throw error
    }
  },

  // Обновить все связи помещений для локализации
  async updateLocationRooms(locationId: number, roomIds: number[]): Promise<void> {
    // Сначала удаляем все существующие связи
    const { error: deleteError } = await supabase
      .from('location_rooms_mapping')
      .delete()
      .eq('location_id', locationId)

    if (deleteError) {
      console.error('Failed to delete existing room links:', deleteError)
      throw deleteError
    }

    // Затем добавляем новые связи, если есть
    if (roomIds.length > 0) {
      const mappings: LocationRoomMapping[] = roomIds.map((roomId) => ({
        location_id: locationId,
        room_id: roomId,
      }))

      const { error: insertError } = await supabase
        .from('location_rooms_mapping')
        .insert(mappings)

      if (insertError) {
        console.error('Failed to insert room links:', insertError)
        throw insertError
      }
    }
  },
}