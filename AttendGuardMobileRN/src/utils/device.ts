import * as Device from 'expo-device'

export const getMobileDevicePayload = () => ({
  device_id: `${Device.osName || 'unknown'}-${Device.modelId || Device.modelName || 'device'}`.replace(/\s+/g, '-').toLowerCase(),
  device_name: Device.modelName || 'Mobile Device',
  platform: Device.osName || 'mobile',
})
