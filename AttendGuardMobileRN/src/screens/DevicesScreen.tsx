import React, { useCallback, useState } from 'react'
import { Alert, StyleSheet, Text } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getDevices, registerDevice } from '../api/services'
import Screen, { Card, EmptyState } from '../components/Screen'
import { PrimaryButton } from '../components/Form'
import { colors } from '../theme/colors'
import { getMobileDevicePayload } from '../utils/device'

const DevicesScreen = () => {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setItems(await getDevices())
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  const handleRegister = async () => {
    try {
      await registerDevice(getMobileDevicePayload())
      Alert.alert('Success', 'This mobile device is registered.')
      load()
    } catch (error: any) {
      Alert.alert('Failed', error.response?.data?.error || 'Unable to register this device.')
    }
  }

  return (
    <Screen title="Devices" subtitle="Register and review trusted devices." refreshing={loading} onRefresh={load}>
      <Card>
        <Text style={styles.title}>Current device</Text>
        <Text style={styles.text}>{getMobileDevicePayload().device_name}</Text>
        <PrimaryButton label="Register This Device" onPress={handleRegister} />
      </Card>
      {items.length === 0 ? (
        <EmptyState title="No devices registered" message="Register this phone to make attendance checks easier to audit." />
      ) : (
        items.map((item) => (
          <Card key={item.id || item.device_id}>
            <Text style={styles.title}>{item.device_name || item.device_id}</Text>
            <Text style={styles.text}>{item.platform || 'mobile'}</Text>
            <Text style={styles.meta}>{item.trusted ? 'Trusted' : 'Not trusted'}</Text>
          </Card>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  text: { color: colors.textMuted, fontSize: 14, marginTop: 6 },
  meta: { color: colors.primary, fontSize: 12, marginTop: 8, textTransform: 'uppercase' },
})

export default DevicesScreen
