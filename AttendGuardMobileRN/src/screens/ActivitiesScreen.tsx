import React, { useCallback, useState } from 'react'
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { createActivity, getActivities } from '../api/services'
import { Field, PrimaryButton, SecondaryButton } from '../components/Form'
import LoadingScreen from '../components/LoadingScreen'
import { colors } from '../theme/colors'
import type { DailyActivity } from '../types'

const ActivitiesScreen = ({ navigation }: any) => {
  const [items, setItems] = useState<DailyActivity[]>([])
  const [title, setTitle] = useState('')
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      const data = await getActivities()
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

  const handleCreate = async () => {
    if (!title.trim()) return
    try {
      await createActivity({ title: title.trim(), activity_date: activityDate })
      setTitle('')
      load(true)
    } catch (error: any) {
      Alert.alert('Failed', error.response?.data?.error || 'Unable to create activity.')
    }
  }

  if (loading) return <LoadingScreen label="Loading daily activities..." />

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
    >
      <Text style={styles.title}>Daily Activities</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create daily activity</Text>
        <Field label="Title" value={title} onChangeText={setTitle} />
        <Field label="Activity date (YYYY-MM-DD)" value={activityDate} onChangeText={setActivityDate} />
        <PrimaryButton label="Create Activity" onPress={handleCreate} />
        <SecondaryButton label="Open Calendar" onPress={() => navigation.navigate('ActivityCalendar')} />
      </View>
      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No daily activity yet</Text>
          <Text style={styles.emptyText}>Activities assigned to your account will appear here automatically.</Text>
        </View>
      ) : (
        items.map((item) => (
          <Pressable key={item.id} style={styles.card} onPress={() => navigation.navigate('ActivityDetail', { activityId: item.id, title: item.title })}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDate}>{item.activity_date}</Text>
              </View>
              <Text style={styles.status}>{item.status.replace('_', ' ')}</Text>
            </View>
            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, item.progress_percentage || 0))}%` }]} />
            </View>
            <View style={styles.footer}>
              <Text style={styles.footerText}>{item.progress_percentage || 0}% complete</Text>
              <Text style={styles.footerText}>
                {item.completed_tasks}/{item.total_tasks} tasks
              </Text>
            </View>
          </Pressable>
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
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  cardDate: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  status: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#0b1220',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 12,
  },
})

export default ActivitiesScreen
