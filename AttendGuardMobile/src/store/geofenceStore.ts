import { create } from 'zustand'
import { geofenceAPI } from '../api/services'

interface GeofencePoint {
  id: number
  zone_id: number
  lat: number
  long: number
  sequence: number
}

interface GeofenceZone {
  id: number
  name: string
  description: string
  color: string
  is_active: boolean
  points: GeofencePoint[]
  created_at: string
}

interface ZoneCheckResult {
  inside_any_zone: boolean
  zone_name?: string
  zone_id?: number
  distance_out_meters?: number
}

interface GeofenceState {
  zones: GeofenceZone[]
  activeZones: GeofenceZone[]
  loading: boolean
  fetchZones: () => Promise<void>
  fetchActiveZones: () => Promise<GeofenceZone[]>
  checkPoint: (lat: number, long: number) => Promise<ZoneCheckResult>
  toggleZone: (id: number) => Promise<void>
  deleteZone: (id: number) => Promise<void>
}

export const useGeofenceStore = create<GeofenceState>((set, get) => ({
  zones: [],
  activeZones: [],
  loading: false,

  fetchZones: async () => {
    set({ loading: true })
    try {
      const res = await geofenceAPI.all()
      set({ zones: res.data.zones || [] })
    } catch {
    } finally {
      set({ loading: false })
    }
  },

  fetchActiveZones: async () => {
    try {
      const res = await geofenceAPI.active()
      const zones = res.data.zones || []
      set({ activeZones: zones })
      return zones
    } catch {
      return []
    }
  },

  checkPoint: async (lat, long) => {
    try {
      const res = await geofenceAPI.checkPoint(lat, long)
      return res.data.result
    } catch (err: any) {
      if (err.response?.status === 403) return err.response.data.result
      return { inside_any_zone: true } // open mode fallback
    }
  },

  toggleZone: async (id) => {
    await geofenceAPI.toggle(id)
    await get().fetchZones()
  },

  deleteZone: async (id) => {
    await geofenceAPI.delete(id)
    await get().fetchZones()
  },
}))
