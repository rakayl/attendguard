import React, { useCallback, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getActivities, getHistory } from '../api/services'
import { useAuthStore } from '../store/authStore'
import { colors } from '../theme/colors'

const HomeScreen = () => {
  const user = useAuthStore((state) => state.user)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    historyCount: 0,
    activityCount: 0,
    completedActivities: 0,
  })

  const load = async () => {
    try {
      setLoading(true)
      const [history, activities] = await Promise.all([getHistory(), getActivities()])
      setStats({
        historyCount: history.length,
        activityCount: activities.length,
        completedActivities: activities.filter((item) => item.status === 'completed').length,
      })
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      load()
    }, [])
  )

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
    >
      <View style={styles.hero}>
        <Text style={styles.kicker}>Welcome back</Text>
        <Text style={styles.title}>{user?.name || 'AttendGuard User'}</Text>
        <Text style={styles.subtitle}>
          This mobile app is connected to your existing AttendGuard backend and ready for daily use flows.
        </Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Attendance History</Text>
          <Text style={styles.cardValue}>{stats.historyCount}</Text>
          <Text style={styles.cardHint}>entries available in your account</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Daily Activities</Text>
          <Text style={styles.cardValue}>{stats.activityCount}</Text>
          <Text style={styles.cardHint}>cards assigned to you</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Completed</Text>
          <Text style={styles.cardValue}>{stats.completedActivities}</Text>
          <Text style={styles.cardHint}>activities marked completed</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Role</Text>
          <Text style={styles.cardValueSmall}>{user?.role?.display_name || user?.role?.name || 'Employee'}</Text>
          <Text style={styles.cardHint}>access level from the existing RBAC system</Text>
        </View>
      </View>
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
    gap: 20,
  },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 10,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  grid: {
    gap: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  cardLabel: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 10,
  },
  cardValue: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
  },
  cardValueSmall: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  cardHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
})

export default HomeScreen
