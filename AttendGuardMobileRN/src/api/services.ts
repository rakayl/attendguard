import api from './client'
import type { AuthResponse, DailyActivity } from '../types'

export const unwrapData = (data: any) => data?.data ?? data

export const login = async (email: string, password: string) => {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
  return data
}

export const getMe = async () => {
  const { data } = await api.get('/me')
  return data.user
}

export const getHistory = async () => {
  const { data } = await api.get('/attendance/history')
  return data.data || data.attendance || []
}

export const checkIn = async (payload: any) => {
  const { data } = await api.post('/attendance/check-in', payload)
  return data
}

export const checkOut = async (payload: any) => {
  const { data } = await api.post('/attendance/check-out', payload)
  return data
}

export const getActivities = async () => {
  const { data } = await api.get('/daily-activities')
  return (data.data || data.activities || []) as DailyActivity[]
}

export const getActivity = async (id: number) => {
  const { data } = await api.get(`/daily-activities/${id}`)
  return unwrapData(data)
}

export const createActivity = async (payload: any) => {
  const { data } = await api.post('/daily-activities', payload)
  return unwrapData(data)
}

export const createActivityTask = async (activityId: number, payload: any) => {
  const { data } = await api.post(`/daily-activities/${activityId}/tasks`, payload)
  return unwrapData(data)
}

export const toggleActivityTask = async (id: number, payload = {}) => {
  const { data } = await api.patch(`/tasks/${id}/toggle`, payload)
  return unwrapData(data)
}

export const createActivityComment = async (activityId: number, payload: { message: string }) => {
  const { data } = await api.post(`/daily-activities/${activityId}/comments`, payload)
  return unwrapData(data)
}

export const getActivityCalendar = async (month?: string) => {
  const { data } = await api.get('/daily-activities/calendar', { params: month ? { month } : {} })
  return unwrapData(data)
}

export const getActivityCalendarDate = async (date: string) => {
  const { data } = await api.get(`/daily-activities/calendar/${date}`)
  return unwrapData(data)
}

export const updateMyProfile = async (payload: { name: string }) => {
  const { data } = await api.put('/me', payload)
  return data
}

export const changeMyPassword = async (payload: { current_password: string; new_password: string }) => {
  const { data } = await api.put('/me/password', payload)
  return data
}

export const getDevices = async () => {
  const { data } = await api.get('/device')
  return data.devices || []
}

export const registerDevice = async (payload: any) => {
  const { data } = await api.post('/device/register', payload)
  return data
}

export const getMyFaceProfiles = async () => {
  const { data } = await api.get('/face/me')
  return data.profiles || []
}

export const enrollMyFace = async (faceImage: string) => {
  const { data } = await api.post('/face/enroll', { face_image: faceImage })
  return data
}

export const verifyMyFace = async (faceImage: string) => {
  const { data } = await api.post('/face/verify', { face_image: faceImage })
  return data
}

export const getTeams = async () => {
  const { data } = await api.get('/teams')
  return data.data?.teams || data.teams || []
}

export const getTeam = async (id: number) => {
  const { data } = await api.get(`/teams/${id}`)
  return unwrapData(data)
}

export const createTeam = async (payload: any) => {
  const { data } = await api.post('/teams', payload)
  return unwrapData(data)
}

export const inviteTeamMember = async (teamId: number, payload: any) => {
  const { data } = await api.post(`/teams/${teamId}/members`, payload)
  return unwrapData(data)
}

export const getTeamWorkspaces = async (teamId: number) => {
  const { data } = await api.get(`/teams/${teamId}/workspaces`)
  return data.data?.workspaces || data.workspaces || []
}

export const createTeamWorkspace = async (teamId: number, payload: any) => {
  const { data } = await api.post(`/teams/${teamId}/workspaces`, payload)
  return unwrapData(data)
}

export const getWorkspaceBoards = async (workspaceId: number) => {
  const { data } = await api.get(`/workspaces/${workspaceId}/boards`)
  return data.data?.boards || data.boards || []
}

export const createBoard = async (workspaceId: number, payload: any) => {
  const { data } = await api.post(`/workspaces/${workspaceId}/boards`, payload)
  return unwrapData(data)
}

export const getBoard = async (id: number) => {
  const { data } = await api.get(`/boards/${id}`)
  return unwrapData(data)
}

export const createBoardList = async (boardId: number, payload: any) => {
  const { data } = await api.post(`/boards/${boardId}/lists`, payload)
  return unwrapData(data)
}

export const createBoardCard = async (listId: number, payload: any) => {
  const { data } = await api.post(`/lists/${listId}/cards`, payload)
  return unwrapData(data)
}

export const moveBoardCard = async (cardId: number, payload: any) => {
  const { data } = await api.patch(`/cards/${cardId}/move`, payload)
  return unwrapData(data)
}

export const createBoardComment = async (cardId: number, payload: { message: string }) => {
  const { data } = await api.post(`/cards/${cardId}/comments`, payload)
  return unwrapData(data)
}

export const createCardChecklist = async (cardId: number, payload: any) => {
  const { data } = await api.post(`/cards/${cardId}/checklists`, payload)
  return unwrapData(data)
}

export const createChecklistItem = async (checklistId: number, payload: any) => {
  const { data } = await api.post(`/checklists/${checklistId}/items`, payload)
  return unwrapData(data)
}

export const toggleChecklistItem = async (id: number, payload = {}) => {
  const { data } = await api.patch(`/checklist-items/${id}/toggle`, payload)
  return unwrapData(data)
}

export const getActiveGeofences = async () => {
  const { data } = await api.get('/geofence/active')
  return data.zones || []
}

export const checkGeofencePoint = async (payload: { lat: number; long: number }) => {
  const { data } = await api.post('/geofence/check', payload)
  return data.result
}

export const getAllAttendance = async () => {
  const { data } = await api.get('/admin/attendance')
  return data.attendance || []
}

export const getFraudAttendance = async () => {
  const { data } = await api.get('/admin/attendance/fraud')
  return data.attendance || []
}

export const getUsers = async () => {
  const { data } = await api.get('/users')
  return data.users || []
}

export const getRoles = async () => {
  const { data } = await api.get('/roles')
  return data.roles || []
}

export const getPermissions = async () => {
  const { data } = await api.get('/permissions')
  return data.permissions || []
}
