import Geolocation from '@react-native-community/geolocation'
import DeviceInfo from 'react-native-device-info'
import { Platform } from 'react-native'

export interface LocationResult {
  lat: number
  long: number
  accuracy: number
  is_mock: boolean
}

// Configure geolocation
Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: 'whenInUse',
  enableBackgroundLocationUpdates: false,
  locationProvider: 'auto',
})

export const getCurrentLocation = (): Promise<LocationResult> => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          long: position.coords.longitude,
          accuracy: position.coords.accuracy,
          // React Native exposes isMockLocation on Android
          is_mock: (position.coords as any).isMockLocation === true,
        })
      },
      (error) => {
        let msg = 'Failed to get location'
        switch (error.code) {
          case 1:
            msg = 'Location permission denied. Please enable in Settings.'
            break
          case 2:
            msg = 'Location unavailable. Please enable GPS.'
            break
          case 3:
            msg = 'Location request timed out. Try again.'
            break
        }
        reject(new Error(msg))
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  })
}

export const getDeviceInfo = async () => {
  const deviceId = await DeviceInfo.getUniqueId()
  const deviceName = await DeviceInfo.getDeviceName()
  const platform = Platform.OS // 'android' | 'ios'
  return { device_id: deviceId, device_name: deviceName, platform }
}

export const buildLocalFaceSample = async (userId?: number | string) => {
  const info = await getDeviceInfo()
  const seed = `attendguard-face:${userId || 'self'}:${info.device_id}:${info.platform}`
  const repeated = Array(80).fill(seed).join('|')
  return `data:text/plain;base64,${repeated}`
}

// Haversine distance in meters
export const haversineDistance = (
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number => {
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const toRad = (deg: number) => (deg * Math.PI) / 180
