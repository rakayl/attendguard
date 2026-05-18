import React, { useCallback, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getHistory } from '../api/services'
import LoadingScreen from '../components/LoadingScreen'
import { colors } from '../theme/colors'
import type { AttendanceHistoryItem } from '../types'

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

const HistoryScreen = () => {
  const [items, setItems] = useState<AttendanceHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      const data = await getHistory()
      setItems(data)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      load()
    }, [])
  )

  if (loading) return <LoadingScreen label="Loading attendance history..." />

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
    >
      <Text style={styles.title}>My Attendance History</Text>
      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No attendance history yet</Text>
          <Text style={styles.emptyText}>Your check-in and check-out records will appear here once available.</Text>
        </View>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.workDate}>{item.work_date || 'Attendance Record'}</Text>
              <Text style={styles.badge}>{item.status || 'recorded'}</Text>
            </View>
            <Text style={styles.meta}>Check in: {formatDateTime(item.check_in_time)}</Text>
            <Text style={styles.meta}>Check out: {formatDateTime(item.check_out_time)}</Text>
            <Text style={styles.meta}>Fraud status: {item.fraud_status || 'clean'}</Text>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 20,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  workDate: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
})

export default HistoryScreen
