import * as ImagePicker from 'expo-image-picker'

export const pickFaceImage = async () => {
  const permission = await ImagePicker.requestCameraPermissionsAsync()
  if (!permission.granted) {
    throw new Error('Camera permission is required.')
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    base64: true,
    quality: 0.75,
  })

  if (result.canceled || !result.assets[0]?.base64) {
    return ''
  }

  return `data:image/jpeg;base64,${result.assets[0].base64}`
}
