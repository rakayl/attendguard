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
