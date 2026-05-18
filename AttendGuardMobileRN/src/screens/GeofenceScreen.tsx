import React, { useCallback, useState } from 'react'
import { Alert, StyleSheet, Text } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { checkGeofencePoint, getActiveGeofences } from '../api/services'
import { SecondaryButton } from '../components/Form'
import Screen, { Card, EmptyState } from '../components/Screen'
import { colors } from '../theme/colors'
import { getCurrentAttendanceLocation } from '../utils/location'

const GeofenceScreen = () => {
  const [zones, setZones] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setZones(await getActiveGeofences())
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  const handleCheck = async () => {
    try {
      const location = await getCurrentAttendanceLocation()
      const result = await checkGeofencePoint({ lat: location.lat, long: location.long })
      Alert.alert('Geofence result', result.inside_any_zone ? `Inside ${result.zone_name || 'active zone'}` : 'Outside active zone')
    } catch (error: any) {
      Alert.alert('Failed', error.response?.data?.error || error.message || 'Unable to check location.')
    }
  }

  return (
    <Screen title="Geofence" subtitle="Active attendance zones and current location validation." refreshing={loading} onRefresh={load}>
      <Card>
        <Text style={styles.title}>Current location check</Text>
        <Text style={styles.text}>Validate this phone position against active zones.</Text>
        <SecondaryButton label="Check My Location" onPress={handleCheck} />
      </Card>
      {zones.length === 0 ? (
        <EmptyState title="No active zones" message="Active geofence zones will appear here." />
      ) : (
        zones.map((zone) => (
          <Card key={zone.id}>
            <Text style={styles.title}>{zone.name}</Text>
            <Text style={styles.text}>{zone.description || 'Active attendance zone'}</Text>
            <Text style={styles.meta}>{zone.type || 'zone'} - radius {zone.radius_meters || zone.radius || 0}m</Text>
          </Card>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  text: { color: colors.textMuted, fontSize: 14, marginTop: 6 },
  meta: { color: colors.primary, fontSize: 12, marginTop: 8 },
})

export default GeofenceScreen
