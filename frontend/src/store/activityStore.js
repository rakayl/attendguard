import { create } from 'zustand'
import * as services from '../api/services'

export const useActivityStore = create((set, get) => ({
  activities: [],
  filters: {
    date_preset: 'today',
    date_from: '',
    date_to: '',
    user_id: '',
  },
  loading: false,
  saving: false,
  error: '',

  setFilters: (next) => set((state) => ({
    filters: { ...state.filters, ...next },
  })),

  fetchActivities: async (overrides = {}) => {
    set({ loading: true, error: '' })
    const filters = { ...get().filters, ...overrides }
    try {
      const params = { ...filters }
      if (params.date_preset !== 'range') {
        delete params.date_from
        delete params.date_to
      }
      if (!params.user_id) delete params.user_id
      const res = await services.getActivities(params)
      set({ activities: res.data.activities || [], filters })
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to load activities' })
    } finally {
      set({ loading: false })
    }
  },

  createActivity: async (payload) => {
    set({ saving: true, error: '' })
    try {
      const res = await services.createActivity(payload)
      await get().fetchActivities()
      return res.data.activity
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to create activity'
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ saving: false })
    }
  },

  updateActivity: async (id, payload) => {
    set({ saving: true, error: '' })
    try {
      const res = await services.updateActivity(id, payload)
      await get().fetchActivities()
      return res.data.activity
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to update activity'
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ saving: false })
    }
  },

  deleteActivity: async (id) => {
    set({ saving: true, error: '' })
    try {
      await services.deleteActivity(id)
      await get().fetchActivities()
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to delete activity'
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ saving: false })
    }
  },
}))
