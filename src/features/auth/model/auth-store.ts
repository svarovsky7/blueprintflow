import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { getUserPermissions } from '@/entities/permissions'
import { getUserRoles } from '@/entities/roles'
import { updateLastLogin } from '@/entities/users'
import type { UserPermissions } from '@/entities/permissions'
import type { Role } from '@/entities/roles'

interface AuthState {
  user: User | null
  roles: Role[]
  permissions: UserPermissions
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  checkAuth: () => Promise<void>
  setUser: (user: User | null) => void
  loadUserRolesAndPermissions: (userId: string) => Promise<void>
  hasPermission: (objectCode: string, action: 'view' | 'create' | 'edit' | 'delete') => boolean
  hasRole: (roleCode: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      roles: [],
      permissions: {},
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      loadUserRolesAndPermissions: async (userId: string) => {
        try {
          const [roles, permissions] = await Promise.all([
            getUserRoles(userId),
            getUserPermissions(userId),
          ])

          set({ roles, permissions })
        } catch (error) {
          console.error('Ошибка загрузки ролей и прав:', error)
          set({ roles: [], permissions: {} })
        }
      },

      hasPermission: (objectCode: string, action: 'view' | 'create' | 'edit' | 'delete') => {
        const { permissions } = get()
        if (!permissions[objectCode]) return false

        const actionMap = {
          view: 'view',
          create: 'create',
          edit: 'edit',
          delete: 'delete',
        }

        return permissions[objectCode][actionMap[action]] || false
      },

      hasRole: (roleCode: string) => {
        const { roles } = get()
        return roles.some((role) => role.code === roleCode)
      },

      signIn: async (email, password) => {
        if (!supabase) {
          throw new Error('Supabase is not configured')
        }
        set({ isLoading: true })
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          set({ isLoading: false })
          throw error
        }

        set({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
        })

        if (data.user) {
          await get().loadUserRolesAndPermissions(data.user.id)
          await updateLastLogin(data.user.id)
        }
      },

      signOut: async () => {
        if (!supabase) {
          throw new Error('Supabase is not configured')
        }
        set({ isLoading: true })
        const { error } = await supabase.auth.signOut()

        if (error) {
          set({ isLoading: false })
          throw error
        }

        set({
          user: null,
          roles: [],
          permissions: {},
          isAuthenticated: false,
          isLoading: false,
        })
      },

      signUp: async (email, password) => {
        if (!supabase) {
          throw new Error('Supabase is not configured')
        }
        set({ isLoading: true })
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          set({ isLoading: false })
          throw error
        }

        set({
          user: data.user,
          isAuthenticated: !!data.user,
          isLoading: false,
        })
      },

      checkAuth: async () => {
        if (!supabase) {
          set({ isLoading: false })
          return
        }
        set({ isLoading: true })
        const {
          data: { user },
        } = await supabase.auth.getUser()

        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        })

        if (user) {
          await get().loadUserRolesAndPermissions(user.id)
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    },
  ),
)
