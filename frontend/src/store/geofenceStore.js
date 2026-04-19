import { create } from 'zustand'
import * as geoApi from '../api/geofence'

export const useGeofenceStore = create((set, get) => ({
  zones: [],
  activeZones: [],
  loading: false,
  error: null,

  fetchZones: async () => {
    set({ loading: true, error: null })
    try {
      const res = await geoApi.getAllZones()
      set({ zones: res.data.zones || [] })
    } catch (e) {
      set({ error: e.response?.data?.error || 'Failed to load zones' })
    } finally {
      set({ loading: false })
    }
  },

  fetchActiveZones: async () => {
    try {
      const res = await geoApi.getActiveZones()
      set({ activeZones: res.data.zones || [] })
      return res.data.zones || []
    } catch {
      return []
    }
  },

  createZone: async (payload) => {
    const res = await geoApi.createZone(payload)
    await get().fetchZones()
    return res.data.zone
  },

  updateZone: async (id, payload) => {
    const res = await geoApi.updateZone(id, payload)
    await get().fetchZones()
    return res.data.zone
  },

  deleteZone: async (id) => {
    await geoApi.deleteZone(id)
    await get().fetchZones()
  },

  toggleZone: async (id) => {
    await geoApi.toggleZone(id)
    await get().fetchZones()
  },

  checkPoint: async (lat, long) => {
    try {
      const res = await geoApi.checkPoint(lat, long)
      return res.data.result
    } catch (e) {
      // 403 means outside zone
      if (e.response?.status === 403) return e.response.data.result
      throw e
    }
  },
}))
