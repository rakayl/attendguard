import * as Location from 'expo-location'

export const getCurrentAttendanceLocation = async () => {
  const permission = await Location.requestForegroundPermissionsAsync()
  if (!permission.granted) {
    throw new Error('Location permission is required.')
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  })

  return {
    lat: position.coords.latitude,
    long: position.coords.longitude,
    accuracy: position.coords.accuracy || 0,
    is_mock: Boolean(position.mocked),
    device_time: new Date().toISOString(),
  }
}
