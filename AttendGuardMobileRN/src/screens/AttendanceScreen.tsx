import React, { useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { checkIn, checkOut, registerDevice, verifyMyFace } from '../api/services'
import { Card } from '../components/Screen'
import Screen from '../components/Screen'
import { PrimaryButton, SecondaryButton } from '../components/Form'
import { colors } from '../theme/colors'
import { getMobileDevicePayload } from '../utils/device'
import { getCurrentAttendanceLocation } from '../utils/location'
import { pickFaceImage } from '../utils/media'

const AttendanceScreen = () => {
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)

  const submitAttendance = async (mode: 'check-in' | 'check-out') => {
    try {
      setLoading(true)
      const location = await getCurrentAttendanceLocation()
      const device = getMobileDevicePayload()
      await registerDevice(device)
      const faceImage = await pickFaceImage()
      if (!faceImage) return
      await verifyMyFace(faceImage)

      const payload = {
        ...location,
        face_image: faceImage,
        device_id: device.device_id,
      }
      const result = mode === 'check-in' ? await checkIn(payload) : await checkOut(payload)
      setLastResult(result)
      Alert.alert('Success', result.message || `${mode} successful`)
    } catch (error: any) {
      Alert.alert('Attendance failed', error.response?.data?.error || error.message || 'Unable to submit attendance.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen title="Check In / Out" subtitle="Use location verification, registered device, and face verification like the web flow.">
      <Card>
        <Text style={styles.title}>Attendance action</Text>
        <Text style={styles.text}>The app will request GPS and camera permission before sending attendance data.</Text>
        <PrimaryButton label={loading ? 'Processing...' : 'Check In'} onPress={() => submitAttendance('check-in')} disabled={loading} />
        <SecondaryButton label="Check Out" onPress={() => submitAttendance('check-out')} />
      </Card>

      {lastResult ? (
        <Card>
          <Text style={styles.title}>Last result</Text>
          <Text style={styles.text}>{lastResult.message || 'Attendance submitted.'}</Text>
          {lastResult.attendance?.fraud_status ? <Text style={styles.meta}>Fraud status: {lastResult.attendance.fraud_status}</Text> : null}
        </Card>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  text: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  meta: {
    color: colors.primary,
    fontSize: 13,
    marginTop: 8,
  },
})

export default AttendanceScreen
