import { Platform } from 'react-native'

const fallbackApiUrl =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8080/api'
    : 'http://localhost:8080/api'

export const API_URL = process.env.EXPO_PUBLIC_API_URL || fallbackApiUrl
