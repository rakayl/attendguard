import { create } from 'zustand'
import { attendanceAPI, CheckInPayload } from '../api/services'

interface FraudFlag {
  id: number
  type: string
  score: number
  description: string
}

interface AttendanceLog {
  id: number
  user_id: number
  lat: number
  long: number
  accuracy: number
  check_in_at: string | null
  check_out_at: string | null
  device_time: string | null
  server_time: string
  fraud_score: number
  fraud_status: 'SAFE' | 'SUSPICIOUS' | 'FRAUD'
  is_mock: boolean
  device_id: string
  fraud_flags: FraudFlag[]
}

interface BlockedError {
  blocked: true
  code: 'FAKE_GPS' | 'OUTSIDE_ZONE'
  error: string
}

interface AttendanceState {
  history: AttendanceLog[]
  currentAttendance: AttendanceLog | null
  loading: boolean
  error: string | null
  fetchHistory: () => Promise<void>
  checkIn: (payload: CheckInPayload) => Promise<{ success: boolean; data?: AttendanceLog; blocked?: boolean; code?: string; error?: string }>
  checkOut: (payload: Partial<CheckInPayload>) => Promise<{ success: boolean; data?: AttendanceLog; blocked?: boolean; code?: string; error?: string }>
  clearError: () => void
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  history: [],
  currentAttendance: null,
  loading: false,
  error: null,

  fetchHistory: async () => {
    set({ loading: true, error: null })
    try {
      const res = await attendanceAPI.history()
      const logs: AttendanceLog[] = res.data.attendance || []
      const active = logs.find((l) => l.check_in_at && !l.check_out_at) || null
      set({ history: logs, currentAttendance: active })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to load history' })
    } finally {
      set({ loading: false })
    }
  },

  checkIn: async (payload) => {
    set({ loading: true, error: null })
    try {
      const res = await attendanceAPI.checkIn(payload)
      const att: AttendanceLog = res.data.attendance
      set((state) => ({
        history: [att, ...state.history],
        currentAttendance: att,
      }))
      return { success: true, data: att }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Check-in failed'
      const blocked = err.response?.status === 403
      const code = err.response?.data?.code
      set({ error: msg })
      return { success: false, error: msg, blocked, code }
    } finally {
      set({ loading: false })
    }
  },

  checkOut: async (payload) => {
    set({ loading: true, error: null })
    try {
      const res = await attendanceAPI.checkOut(payload as any)
      const att: AttendanceLog = res.data.attendance
      set((state) => ({
        history: state.history.map((h) => (h.id === att.id ? att : h)),
        currentAttendance: null,
      }))
      return { success: true, data: att }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Check-out failed'
      const blocked = err.response?.status === 403
      const code = err.response?.data?.code
      set({ error: msg })
      return { success: false, error: msg, blocked, code }
    } finally {
      set({ loading: false })
    }
  },

  clearError: () => set({ error: null }),
}))
