export interface Room {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export interface LocationRoomMapping {
  location_id: number
  room_id: number
}