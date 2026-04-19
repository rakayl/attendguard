import { create } from 'zustand'
import * as services from '../api/services'

export const useAttendanceStore = create((set, get) => ({
  history: [],
  currentAttendance: null,
  adminAttendance: [],
  fraudAttendance: [],
  loading: false,
  error: null,

  fetchHistory: async () => {
    set({ loading: true, error: null })
    try {
      const res = await services.getHistory()
      const logs = res.data.attendance || []
      set({ history: logs })

      // Find active check-in (has check_in_at but no check_out_at)
      const active = logs.find((l) => l.check_in_at && !l.check_out_at)
      set({ currentAttendance: active || null })
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to load history' })
    } finally {
      set({ loading: false })
    }
  },

  checkIn: async (payload) => {
    set({ loading: true, error: null })
    try {
      const res = await services.checkIn(payload)
      const att = res.data.attendance
      set((state) => ({
        history: [att, ...state.history],
        currentAttendance: att,
      }))
      return { success: true, data: att }
    } catch (err) {
      const msg = err.response?.data?.error || 'Check-in failed'
      set({ error: msg })
      return { success: false, error: msg, blocked: err.response?.status === 403, code: err.response?.data?.code }
    } finally {
      set({ loading: false })
    }
  },

  checkOut: async (payload) => {
    set({ loading: true, error: null })
    try {
      const res = await services.checkOut(payload)
      const att = res.data.attendance
      set((state) => ({
        history: state.history.map((h) => (h.id === att.id ? att : h)),
        currentAttendance: null,
      }))
      return { success: true, data: att }
    } catch (err) {
      const msg = err.response?.data?.error || 'Check-out failed'
      set({ error: msg })
      return { success: false, error: msg, blocked: err.response?.status === 403, code: err.response?.data?.code }
    } finally {
      set({ loading: false })
    }
  },

  fetchAdminAttendance: async () => {
    set({ loading: true, error: null })
    try {
      const res = await services.getAllAttendance()
      set({ adminAttendance: res.data.attendance || [] })
    } catch (err) {
      set({ error: 'Failed to load admin attendance' })
    } finally {
      set({ loading: false })
    }
  },

  fetchFraudAttendance: async () => {
    set({ loading: true, error: null })
    try {
      const res = await services.getFraudAttendance()
      set({ fraudAttendance: res.data.attendance || [] })
    } catch (err) {
      set({ error: 'Failed to load fraud data' })
    } finally {
      set({ loading: false })
    }
  },

  clearError: () => set({ error: null }),
}))
