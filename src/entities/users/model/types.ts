export interface User {
  id: string
  first_name: string
  last_name: string
  middle_name?: string | null
  display_name?: string | null
  position?: string | null
  department?: string | null
  phone?: string | null
  avatar_url?: string | null
  is_active: boolean
  last_login_at?: string | null
  created_at: string
  updated_at: string
}

export interface UserWithAuth extends User {
  auth_email?: string
  auth_created_at?: string
}

export interface CreateUserDto {
  email: string
  password: string
  first_name: string
  last_name: string
  middle_name?: string
  position?: string
  department?: string
  phone?: string
}

export interface UpdateUserDto {
  first_name?: string
  last_name?: string
  middle_name?: string
  display_name?: string
  position?: string
  department?: string
  phone?: string
  avatar_url?: string
  is_active?: boolean
}

export interface UserFilters {
  search?: string
  is_active?: boolean
  department?: string
  position?: string
}
