import { create } from 'zustand'
import * as services from '../api/services'

const extractData = (res) => res?.data?.data

const syncActivityInList = (activities, next) =>
  activities.map((item) => (item.id === next.id ? next : item))

export const useActivityStore = create((set, get) => ({
  activities: [],
  selectedActivity: null,
  logs: [],
  calendarMonth: '',
  calendarDays: [],
  calendarSelectedDate: '',
  calendarSelectedDay: null,
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
  setCalendarSelectedDate: (calendarSelectedDate) => set({ calendarSelectedDate }),

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
      const payload = extractData(res) || {}
      const activities = payload.activities || []
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
      const activity = extractData(activityRes)
      const logsPayload = extractData(logsRes) || {}
      set((state) => ({
        selectedActivity: activity,
        logs: logsPayload.logs || [],
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
      const activity = extractData(res)
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
      const activity = extractData(res)
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
      const payload = extractData(res) || {}
      set({ logs: payload.logs || [] })
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to load activity logs'
      set({ error: message })
      throw new Error(message)
    }
  },

  fetchCalendarMonth: async (month) => {
    set({ loading: true, error: '' })
    try {
      const res = await services.getActivityCalendar(month)
      const payload = extractData(res) || {}
      set({
        calendarMonth: payload.month || month || '',
        calendarDays: payload.days || [],
      })
      return payload
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to load calendar'
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ loading: false })
    }
  },

  fetchCalendarDate: async (date) => {
    set({ loading: true, error: '' })
    try {
      const res = await services.getActivityCalendarDate(date)
      const payload = extractData(res)
      set({
        calendarSelectedDate: date,
        calendarSelectedDay: payload,
      })
      return payload
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to load calendar day'
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ loading: false })
    }
  },

  createTask: async (activityId, payload) => {
    set({ saving: true, error: '' })
    try {
      const res = await services.createActivityTask(activityId, payload)
      const payloadData = extractData(res) || {}
      const activity = payloadData.activity
      set((state) => ({
        activities: syncActivityInList(state.activities, activity),
        selectedActivity: activity,
      }))
      await get().fetchLogs(activityId)
      return payloadData.task
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
      const payloadData = extractData(res) || {}
      const activity = payloadData.activity
      set((state) => ({
        activities: syncActivityInList(state.activities, activity),
        selectedActivity: activity,
      }))
      await get().fetchLogs(activity.id)
      return payloadData.task
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to update task'
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ saving: false })
    }
  },

  toggleTask: async (taskId, isCompleted) => {
    set({ error: '' })
    try {
      const res = await services.toggleTask(taskId, typeof isCompleted === 'boolean' ? { is_completed: isCompleted } : {})
      const payloadData = extractData(res) || {}
      const activity = payloadData.activity
      set((state) => ({
        activities: syncActivityInList(state.activities, activity),
        selectedActivity: activity,
      }))
      await get().fetchLogs(activity.id)
      return payloadData.task
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to update task'
      set({ error: message })
      throw new Error(message)
    }
  },

  deleteTask: async (taskId) => {
    set({ saving: true, error: '' })
    try {
      const res = await services.deleteTask(taskId)
      const activity = extractData(res)
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

  createComment: async (activityId, message) => {
    set({ saving: true, error: '' })
    try {
      const res = await services.createActivityComment(activityId, { message })
      const payloadData = extractData(res) || {}
      const activity = payloadData.activity
      set((state) => ({
        activities: syncActivityInList(state.activities, activity),
        selectedActivity: activity,
      }))
      await get().fetchLogs(activity.id)
      return payloadData.comment
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to create comment'
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ saving: false })
    }
  },

  updateComment: async (commentId, message) => {
    set({ saving: true, error: '' })
    try {
      const res = await services.updateComment(commentId, { message })
      const payloadData = extractData(res) || {}
      const activity = payloadData.activity
      set((state) => ({
        activities: syncActivityInList(state.activities, activity),
        selectedActivity: activity,
      }))
      await get().fetchLogs(activity.id)
      return payloadData.comment
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to update comment'
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ saving: false })
    }
  },

  deleteComment: async (commentId) => {
    set({ saving: true, error: '' })
    try {
      const res = await services.deleteComment(commentId)
      const activity = extractData(res)
      set((state) => ({
        activities: syncActivityInList(state.activities, activity),
        selectedActivity: activity,
      }))
      await get().fetchLogs(activity.id)
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to delete comment'
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ saving: false })
    }
  },
}))
