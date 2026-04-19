import api from './axios'

export const getActiveZones = () => api.get('/geofence/active')
export const getAllZones = () => api.get('/geofence')
export const getZone = (id) => api.get(`/geofence/${id}`)
export const createZone = (payload) => api.post('/geofence', payload)
export const updateZone = (id, payload) => api.put(`/geofence/${id}`, payload)
export const deleteZone = (id) => api.delete(`/geofence/${id}`)
export const toggleZone = (id) => api.patch(`/geofence/${id}/toggle`)
export const checkPoint = (lat, long) => api.post('/geofence/check', { lat, long })
