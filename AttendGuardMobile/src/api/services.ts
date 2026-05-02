import api from './client'

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),
  me: () => api.get('/me'),
}

// ── Attendance ───────────────────────────────────────────────────────────────
export interface CheckInPayload {
  lat: number
  long: number
  accuracy: number
  is_mock: boolean
  face_image: string
  device_time: string
  device_id: string
}

export const attendanceAPI = {
  checkIn: (payload: CheckInPayload) =>
    api.post('/attendance/check-in', payload),
  checkOut: (payload: Omit<CheckInPayload, 'device_time'> & { device_time?: string }) =>
    api.post('/attendance/check-out', payload),
  history: () => api.get('/attendance/history'),
  fraudDetail: (id: number) => api.get(`/attendance/${id}/fraud`),
}

// ── Geofence ─────────────────────────────────────────────────────────────────
export const geofenceAPI = {
  active: () => api.get('/geofence/active'),
  all: () => api.get('/geofence'),
  get: (id: number) => api.get(`/geofence/${id}`),
  create: (payload: any) => api.post('/geofence', payload),
  update: (id: number, payload: any) => api.put(`/geofence/${id}`, payload),
  delete: (id: number) => api.delete(`/geofence/${id}`),
  toggle: (id: number) => api.patch(`/geofence/${id}/toggle`),
  checkPoint: (lat: number, long: number) =>
    api.post('/geofence/check', { lat, long }),
}

// ── Device ───────────────────────────────────────────────────────────────────
export const deviceAPI = {
  register: (payload: { device_id: string; device_name: string; platform: string }) =>
    api.post('/device/register', payload),
  list: () => api.get('/device'),
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  allAttendance: () => api.get('/admin/attendance'),
  fraudAttendance: () => api.get('/admin/attendance/fraud'),
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersAPI = {
  list: () => api.get('/users'),
  get: (id: number) => api.get(`/users/${id}`),
  create: (payload: any) => api.post('/users', payload),
  update: (id: number, payload: any) => api.put(`/users/${id}`, payload),
  delete: (id: number) => api.delete(`/users/${id}`),
  assignRole: (id: number, roleId: number | null) =>
    api.patch(`/users/${id}/role`, { role_id: roleId }),
}

// ── Roles ─────────────────────────────────────────────────────────────────────
export const rolesAPI = {
  list: () => api.get('/roles'),
  get: (id: number) => api.get(`/roles/${id}`),
  create: (payload: any) => api.post('/roles', payload),
  update: (id: number, payload: any) => api.put(`/roles/${id}`, payload),
  delete: (id: number) => api.delete(`/roles/${id}`),
  setPermissions: (id: number, permissionIds: number[]) =>
    api.put(`/roles/${id}/permissions`, { permission_ids: permissionIds }),
}

// ── Permissions ──────────────────────────────────────────────────────────────
export const permissionsAPI = {
  list: () => api.get('/permissions'),
  create: (payload: any) => api.post('/permissions', payload),
  update: (id: number, payload: any) => api.put(`/permissions/${id}`, payload),
  delete: (id: number) => api.delete(`/permissions/${id}`),
}

// Face recognition
export const faceAPI = {
  myProfiles: () => api.get('/face/me'),
  enrollMe: (faceImage: string) => api.post('/face/enroll', { face_image: faceImage }),
  verifyMe: (faceImage: string) => api.post('/face/verify', { face_image: faceImage }),
  all: () => api.get('/admin/face'),
  enrollForUser: (userId: number, faceImage: string) =>
    api.post(`/admin/face/users/${userId}/enroll`, { face_image: faceImage }),
  setActive: (id: number, isActive: boolean) =>
    api.patch(`/admin/face/${id}/active`, { is_active: isActive }),
}
