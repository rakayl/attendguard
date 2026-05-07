import { create } from 'zustand'
import * as services from '../api/services'

const syncActivityInList = (activities, next) =>
  activities.map((item) => (item.id === next.id ? next : item))

export const useActivityStore = create((set, get) => ({
  activities: [],
  selectedActivity: null,
  logs: [],
  filters: {
    date_preset: 'today',
    date_from: '',
    date_to: '',
    assigned_user: '',
    status: '',
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
      if (!params.assigned_user) delete params.assigned_user
      if (!params.status) delete params.status
      const res = await services.getActivities(params)
      const activities = res.data.activities || []
      const selectedId = get().selectedActivity?.id
      const selectedActivity = selectedId ? activities.find((item) => item.id === selectedId) || null : null
      set({ activities, filters, selectedActivity })
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to load activities' })
    } finally {
      set({ loading: false })
    }
  },

  fetchActivityDetail: async (id) => {
    set({ loading: true, error: '' })
    try {
      const [activityRes, logsRes] = await Promise.all([
        services.getActivity(id),
        services.getActivityLogs(id),
      ])
      const activity = activityRes.data.activity
      set((state) => ({
        selectedActivity: activity,
        logs: logsRes.data.logs || [],
        activities: state.activities.some((item) => item.id === activity.id)
          ? syncActivityInList(state.activities, activity)
          : [activity, ...state.activities],
      }))
      return activity
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to load activity detail'
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ loading: false })
    }
  },

  createActivity: async (payload) => {
    set({ saving: true, error: '' })
    try {
      const res = await services.createActivity(payload)
      const activity = res.data.activity
      set((state) => ({
        activities: [activity, ...state.activities],
        selectedActivity: activity,
        logs: [],
      }))
      return activity
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
      const activity = res.data.activity
      set((state) => ({
        activities: syncActivityInList(state.activities, activity),
        selectedActivity: state.selectedActivity?.id === id ? activity : state.selectedActivity,
      }))
      await get().fetchLogs(id)
      return activity
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
      set((state) => ({
        activities: state.activities.filter((item) => item.id !== id),
        selectedActivity: state.selectedActivity?.id === id ? null : state.selectedActivity,
        logs: state.selectedActivity?.id === id ? [] : state.logs,
      }))
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to delete activity'
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ saving: false })
    }
  },

  fetchLogs: async (activityId) => {
    try {
      const res = await services.getActivityLogs(activityId)
      set({ logs: res.data.logs || [] })
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to load activity logs'
      set({ error: message })
      throw new Error(message)
    }
  },

  createTask: async (activityId, payload) => {
    set({ saving: true, error: '' })
    try {
      const res = await services.createActivityTask(activityId, payload)
      const activity = res.data.activity
      set((state) => ({
        activities: syncActivityInList(state.activities, activity),
        selectedActivity: activity,
      }))
      await get().fetchLogs(activityId)
      return res.data.task
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to create task'
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ saving: false })
    }
  },

  updateTask: async (taskId, payload) => {
    set({ saving: true, error: '' })
    try {
      const res = await services.updateTask(taskId, payload)
      const activity = res.data.activity
      set((state) => ({
        activities: syncActivityInList(state.activities, activity),
        selectedActivity: activity,
      }))
      await get().fetchLogs(activity.id)
      return res.data.task
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to update task'
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ saving: false })
    }
  },

  updateTaskStatus: async (taskId, status) => {
    set({ error: '' })
    try {
      const res = await services.updateTaskStatus(taskId, { status })
      const activity = res.data.activity
      set((state) => ({
        activities: syncActivityInList(state.activities, activity),
        selectedActivity: activity,
      }))
      await get().fetchLogs(activity.id)
      return res.data.task
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to update task status'
      set({ error: message })
      throw new Error(message)
    }
  },

  deleteTask: async (taskId) => {
    set({ saving: true, error: '' })
    try {
      const res = await services.deleteTask(taskId)
      const activity = res.data.activity
      set((state) => ({
        activities: syncActivityInList(state.activities, activity),
        selectedActivity: activity,
      }))
      await get().fetchLogs(activity.id)
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to delete task'
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ saving: false })
    }
  },
}))
