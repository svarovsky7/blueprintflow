import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  checkAuth: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

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
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    },
  ),
)