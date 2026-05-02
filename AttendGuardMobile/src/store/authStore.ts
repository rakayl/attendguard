import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authAPI } from '../api/services'

interface Permission {
  id: number
  name: string
  display_name: string
  module: string
}

interface Role {
  id: number
  name: string
  display_name: string
  permissions: Permission[]
}

interface User {
  id: number
  name: string
  email: string
  role_id: number | null
  role: Role | null
  is_active: boolean
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  // Actions
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
  loadFromStorage: () => Promise<void>
  can: (permission: string) => boolean
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  loadFromStorage: async () => {
    try {
      const [token, userStr] = await AsyncStorage.multiGet(['auth_token', 'auth_user'])
      const t = token[1]
      const u = userStr[1] ? JSON.parse(userStr[1]) : null
      if (t && u) {
        set({ token: t, user: u, isAuthenticated: true })
      }
    } catch {
      // ignore
    } finally {
      set({ isLoading: false })
    }
  },

  login: async (email, password) => {
    const res = await authAPI.login(email, password)
    const { token, user } = res.data
    await AsyncStorage.multiSet([
      ['auth_token', token],
      ['auth_user', JSON.stringify(user)],
    ])
    set({ token, user, isAuthenticated: true })
    // Refresh to get full role+permissions
    await get().refreshMe()
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['auth_token', 'auth_user'])
    set({ token: null, user: null, isAuthenticated: false })
  },

  refreshMe: async () => {
    try {
      const res = await authAPI.me()
      const user = res.data.user
      await AsyncStorage.setItem('auth_user', JSON.stringify(user))
      set({ user })
    } catch {
      // token might be expired
      get().logout()
    }
  },

  can: (permission: string) => {
    const { user } = get()
    if (!user) return false
    if (user.role?.name === 'admin') return true
    return (user.role?.permissions || []).some((p) => p.name === permission)
  },

  isAdmin: () => {
    const { user } = get()
    return user?.role?.name === 'admin'
  },
}))
