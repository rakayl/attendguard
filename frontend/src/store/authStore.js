import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/axios'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) =>
        set({ token, user, isAuthenticated: true }),

      logout: () =>
        set({ token: null, user: null, isAuthenticated: false }),

      /** Refresh user + permissions from /me endpoint */
      refreshMe: async () => {
        try {
          const res = await api.get('/me')
          set({ user: res.data.user })
        } catch {
          get().logout()
        }
      },

      /** Check a single permission against the stored user's role */
      can: (perm) => {
        const { user } = get()
        if (!user) return false
        if (user.role?.name === 'admin') return true
        return (user.role?.permissions || []).some((p) => p.name === perm)
      },

      updateUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
