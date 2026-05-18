import React, { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getAllAttendance, getFraudAttendance } from '../api/services'
import Screen, { Card, EmptyState } from '../components/Screen'
import { colors } from '../theme/colors'

const AdminScreen = () => {
  const [mode, setMode] = useState<'all' | 'fraud'>('all')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setItems(mode === 'all' ? await getAllAttendance() : await getFraudAttendance())
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, [mode]))

  return (
    <Screen title="Admin Monitor" subtitle="Attendance and fraud monitoring from the web admin flow." refreshing={loading} onRefresh={load}>
      <View style={styles.segment}>
        <Pressable style={[styles.segmentButton, mode === 'all' && styles.segmentActive]} onPress={() => setMode('all')}>
          <Text style={styles.segmentText}>All</Text>
        </Pressable>
        <Pressable style={[styles.segmentButton, mode === 'fraud' && styles.segmentActive]} onPress={() => setMode('fraud')}>
          <Text style={styles.segmentText}>Fraud</Text>
        </Pressable>
      </View>
      {items.length === 0 ? (
        <EmptyState title="No records" message="Records matching this view will appear here." />
      ) : (
        items.map((item) => (
          <Card key={item.id}>
            <Text style={styles.title}>{item.user?.name || `User #${item.user_id}`}</Text>
            <Text style={styles.text}>Check in: {item.check_in_at || item.check_in_time || '-'}</Text>
            <Text style={styles.text}>Check out: {item.check_out_at || item.check_out_time || '-'}</Text>
            <Text style={styles.meta}>Fraud score: {item.fraud_score || 0} - {item.fraud_status || 'SAFE'}</Text>
          </Card>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  segment: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', padding: 4 },
  segmentButton: { alignItems: 'center', borderRadius: 12, flex: 1, paddingVertical: 10 },
  segmentActive: { backgroundColor: colors.surfaceElevated },
  segmentText: { color: colors.text, fontWeight: '800' },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  text: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  meta: { color: colors.primary, fontSize: 12, marginTop: 8 },
})

export default AdminScreen
