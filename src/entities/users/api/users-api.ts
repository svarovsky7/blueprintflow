import { supabase } from '@/lib/supabase'
import type { User, CreateUserDto, UpdateUserDto, UserFilters } from '../model/types'

export async function getUsers(filters?: UserFilters): Promise<User[]> {
  let query = supabase.from('users').select('*').order('last_name')

  if (filters?.search) {
    query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`)
  }

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }

  if (filters?.department) {
    query = query.eq('department', filters.department)
  }

  if (filters?.position) {
    query = query.eq('position', filters.position)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createUser(dto: CreateUserDto): Promise<User> {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: dto.email,
    password: dto.password,
  })

  if (authError) throw authError
  if (!authData.user) throw new Error('Failed to create auth user')

  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        id: authData.user.id,
        first_name: dto.first_name,
        last_name: dto.last_name,
        middle_name: dto.middle_name,
        position: dto.position,
        department: dto.department,
        phone: dto.phone,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateUser(userId: string, dto: UpdateUserDto): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update(dto)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase.from('users').delete().eq('id', userId)

  if (error) throw error
}

export async function deactivateUser(userId: string): Promise<User> {
  return updateUser(userId, { is_active: false })
}

export async function activateUser(userId: string): Promise<User> {
  return updateUser(userId, { is_active: true })
}

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) return null

  return getUserById(authUser.id)
}

export async function updateLastLogin(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) throw error
}
