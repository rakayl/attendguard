// GPS utility functions

export const getLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          long: position.coords.longitude,
          accuracy: position.coords.accuracy,
          // Browser API doesn't expose isMockLocation directly
          // In production, additional checks can be done
          is_mock: false,
        })
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location permission denied. Please enable GPS.'))
            break
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information unavailable.'))
            break
          case error.TIMEOUT:
            reject(new Error('Location request timed out.'))
            break
          default:
            reject(new Error('An unknown error occurred.'))
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  })
}

export const generateDeviceId = () => {
  const stored = localStorage.getItem('device_id')
  if (stored) return stored

  const id = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
  localStorage.setItem('device_id', id)
  return id
}

export const getDeviceInfo = () => {
  const ua = navigator.userAgent
  let platform = 'web'
  if (/Android/i.test(ua)) platform = 'android'
  else if (/iPhone|iPad/i.test(ua)) platform = 'ios'

  return {
    device_id: generateDeviceId(),
    device_name: navigator.platform || 'Browser',
    platform,
  }
}

export const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000 // meters
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const toRad = (deg) => (deg * Math.PI) / 180
