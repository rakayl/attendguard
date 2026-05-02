import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ── Config ──────────────────────────────────────────────────────────────────
// Change this to your backend server IP/URL
// For Android emulator: http://10.0.2.2:8080/api
// For physical device: http://YOUR_LOCAL_IP:8080/api
// For production: https://your-domain.com/api
export const API_BASE_URL = 'http://10.0.2.2:8080/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: handle 401 ────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['auth_token', 'auth_user'])
      // Navigation reset happens via auth store listener
    }
    return Promise.reject(error)
  }
)

export default api
