import axios from 'axios'
import { Alert } from 'react-native'
import { API_URL } from '../config/env'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      Alert.alert('Session expired', 'Please login again to continue.')
    }
    return Promise.reject(error)
  }
)

export default api
