import api from './axios'

// Auth
export const login = (email, password) =>
  api.post('/auth/login', { email, password })

export const register = (name, email, password) =>
  api.post('/auth/register', { name, email, password })

// Attendance
export const checkIn = (payload) =>
  api.post('/attendance/check-in', payload)

export const checkOut = (payload) =>
  api.post('/attendance/check-out', payload)

export const getHistory = () =>
  api.get('/attendance/history')

export const getFraudDetail = (id) =>
  api.get(`/attendance/${id}/fraud`)

// Device
export const registerDevice = (payload) =>
  api.post('/device/register', payload)

export const getDevices = () =>
  api.get('/device')

// Admin
export const getAllAttendance = () =>
  api.get('/admin/attendance')

export const getFraudAttendance = () =>
  api.get('/admin/attendance/fraud')

// Face recognition
export const getMyFaceProfiles = () =>
  api.get('/face/me')

export const enrollMyFace = (faceImage) =>
  api.post('/face/enroll', { face_image: faceImage })

export const verifyMyFace = (faceImage) =>
  api.post('/face/verify', { face_image: faceImage })

export const getFaceProfiles = () =>
  api.get('/admin/face')

export const enrollFaceForUser = (userId, faceImage) =>
  api.post(`/admin/face/users/${userId}/enroll`, { face_image: faceImage })

export const setFaceProfileActive = (id, isActive) =>
  api.patch(`/admin/face/${id}/active`, { is_active: isActive })

// Daily activities
export const getActivities = (params) =>
  api.get('/daily-activities', { params })

export const getActivity = (id) =>
  api.get(`/daily-activities/${id}`)

export const createActivity = (payload) =>
  api.post('/daily-activities', payload)

export const updateActivity = (id, payload) =>
  api.put(`/daily-activities/${id}`, payload)

export const deleteActivity = (id) =>
  api.delete(`/daily-activities/${id}`)

export const getActivityLogs = (id) =>
  api.get(`/daily-activities/${id}/logs`)

export const getActivityCalendar = (month) =>
  api.get('/daily-activities/calendar', { params: month ? { month } : {} })

export const getActivityCalendarDate = (date) =>
  api.get(`/daily-activities/calendar/${date}`)

export const createActivityTask = (activityId, payload) =>
  api.post(`/daily-activities/${activityId}/tasks`, payload)

export const updateTask = (id, payload) =>
  api.put(`/tasks/${id}`, payload)

export const toggleTask = (id, payload = {}) =>
  api.patch(`/tasks/${id}/toggle`, payload)

export const deleteTask = (id) =>
  api.delete(`/tasks/${id}`)

export const createActivityComment = (activityId, payload) =>
  api.post(`/daily-activities/${activityId}/comments`, payload)

export const updateComment = (id, payload) =>
  api.put(`/comments/${id}`, payload)

export const deleteComment = (id) =>
  api.delete(`/comments/${id}`)

// Board management
export const getWorkspaces = () =>
  api.get('/workspaces')

export const createWorkspace = (payload) =>
  api.post('/workspaces', payload)

export const createBoard = (workspaceId, payload) =>
  api.post(`/workspaces/${workspaceId}/boards`, payload)

export const getBoard = (id) =>
  api.get(`/boards/${id}`)

export const updateBoard = (id, payload) =>
  api.put(`/boards/${id}`, payload)

export const createBoardList = (boardId, payload) =>
  api.post(`/boards/${boardId}/lists`, payload)

export const updateBoardList = (id, payload) =>
  api.put(`/lists/${id}`, payload)

export const createBoardCard = (listId, payload) =>
  api.post(`/lists/${listId}/cards`, payload)

export const updateBoardCard = (id, payload) =>
  api.put(`/cards/${id}`, payload)

export const moveBoardCard = (id, payload) =>
  api.patch(`/cards/${id}/move`, payload)

export const createCardChecklist = (cardId, payload) =>
  api.post(`/cards/${cardId}/checklists`, payload)

export const createChecklistItem = (checklistId, payload) =>
  api.post(`/checklists/${checklistId}/items`, payload)

export const toggleChecklistItem = (id, payload = {}) =>
  api.patch(`/checklist-items/${id}/toggle`, payload)

export const createBoardComment = (cardId, payload) =>
  api.post(`/cards/${cardId}/comments`, payload)
