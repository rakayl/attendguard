import React, { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getActivityCalendar, getActivityCalendarDate } from '../api/services'
import Screen, { Card, EmptyState } from '../components/Screen'
import { colors } from '../theme/colors'

const ActivityCalendarScreen = ({ navigation }: any) => {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [days, setDays] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const calendar = await getActivityCalendar(month)
      setDays(calendar.days || calendar || [])
      const dateResult = await getActivityCalendarDate(selectedDate)
      setSelectedItems(dateResult.activities || dateResult || [])
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, [month, selectedDate]))

  return (
    <Screen title="Activity Calendar" subtitle={month} refreshing={loading} onRefresh={load}>
      <Card>
        <View style={styles.grid}>
          {days.map((day: any) => {
            const date = day.date || day.activity_date
            const count = day.total || day.count || (day.activities || []).length || 0
            return (
              <Pressable key={date} style={[styles.day, selectedDate === date && styles.dayActive]} onPress={() => setSelectedDate(date)}>
                <Text style={styles.dayNumber}>{String(date || '').slice(-2)}</Text>
                {count > 0 ? <Text style={styles.dot}>{count}</Text> : null}
              </Pressable>
            )
          })}
        </View>
      </Card>
      {selectedItems.length === 0 ? (
        <EmptyState title="No activity on this date" message="Pick another date or create a new activity." />
      ) : (
        selectedItems.map((item) => (
          <Pressable key={item.id} style={styles.item} onPress={() => navigation.navigate('ActivityDetail', { activityId: item.id, title: item.title })}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.text}>{item.status} - {item.progress_percentage || 0}%</Text>
          </Pressable>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  day: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: 14, borderWidth: 1, minHeight: 54, padding: 8, width: '13.2%' },
  dayActive: { borderColor: colors.primary },
  dayNumber: { color: colors.text, fontSize: 13, fontWeight: '800' },
  dot: { color: colors.primary, fontSize: 11, marginTop: 4 },
  item: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, padding: 16 },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  text: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
})

export default ActivityCalendarScreen
