import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../theme'
import { useAuthStore } from '../../store/authStore'
import { useAttendanceStore } from '../../store/attendanceStore'
import { Card, FraudBadge, SectionHeader, StatusDot } from '../../components/UI'
import { format } from 'date-fns'

const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={[styles.statCard, { borderColor: color + '30' }]}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
)

export const DashboardScreen = () => {
  const { user } = useAuthStore()
  const { history, currentAttendance, fetchHistory, loading } = useAttendanceStore()
  const navigation = useNavigation<any>()
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { fetchHistory() }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchHistory()
    setRefreshing(false)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const stats = {
    total:      history.length,
    safe:       history.filter((h) => h.fraud_status === 'SAFE').length,
    suspicious: history.filter((h) => h.fraud_status === 'SUSPICIOUS').length,
    fraud:      history.filter((h) => h.fraud_status === 'FRAUD').length,
  }

  const recent = history.slice(0, 5)

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.userName}>{user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.date}>{format(new Date(), 'EEEE, d MMMM yyyy')}</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.avatar}>{user?.name?.[0]?.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Active check-in card */}
        {currentAttendance && (
          <TouchableOpacity
            style={styles.activeCard}
            onPress={() => navigation.navigate('CheckIn')}
            activeOpacity={0.9}
          >
            <View style={styles.activeLeft}>
              <View style={styles.pulseContainer}>
                <View style={styles.pulseDot} />
              </View>
              <View>
                <Text style={styles.activeTitle}>Currently Checked In</Text>
                <Text style={styles.activeSince}>
                  Since {format(new Date(currentAttendance.check_in_at!), 'HH:mm')}
                </Text>
              </View>
            </View>
            <FraudBadge status={currentAttendance.fraud_status} size="sm" />
          </TouchableOpacity>
        )}

        {/* Quick action button */}
        <TouchableOpacity
          style={[styles.quickBtn, currentAttendance && styles.quickBtnOut]}
          onPress={() => navigation.navigate('CheckIn')}
          activeOpacity={0.85}
        >
          <Text style={styles.quickBtnText}>
            {currentAttendance ? '⏹  Check Out' : '▶  Check In'}
          </Text>
        </TouchableOpacity>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Total" value={stats.total} color={Colors.primary} />
          <StatCard label="Safe" value={stats.safe} color={Colors.safe} />
          <StatCard label="Warning" value={stats.suspicious} color={Colors.suspicious} />
          <StatCard label="Fraud" value={stats.fraud} color={Colors.fraud} />
        </View>

        {/* Recent attendance */}
        <SectionHeader
          title="Recent Attendance"
          action="View All"
          onAction={() => navigation.navigate('History')}
        />

        {recent.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No attendance records yet.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CheckIn')}>
              <Text style={styles.emptyLink}>Check in now →</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          recent.map((log) => (
            <Card key={log.id} style={styles.logCard}>
              <View style={styles.logRow}>
                {/* Date box */}
                <View style={styles.dateBox}>
                  <Text style={styles.dateMonth}>
                    {format(new Date(log.check_in_at || log.created_at), 'MMM')}
                  </Text>
                  <Text style={styles.dateDay}>
                    {format(new Date(log.check_in_at || log.created_at), 'd')}
                  </Text>
                </View>

                {/* Times */}
                <View style={styles.logInfo}>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeIn}>
                      ↑ {format(new Date(log.check_in_at!), 'HH:mm')}
                    </Text>
                    {log.check_out_at ? (
                      <Text style={styles.timeOut}>
                        ↓ {format(new Date(log.check_out_at), 'HH:mm')}
                      </Text>
                    ) : (
                      <Text style={styles.timeActive}>● Active</Text>
                    )}
                  </View>
                  <Text style={styles.logCoords}>
                    {log.lat.toFixed(4)}, {log.long.toFixed(4)}
                  </Text>
                </View>

                <View style={styles.logRight}>
                  <Text style={[styles.logScore, {
                    color: log.fraud_score >= 80 ? Colors.fraud : log.fraud_score >= 40 ? Colors.suspicious : Colors.textMuted
                  }]}>{log.fraud_score}</Text>
                  <FraudBadge status={log.fraud_status} size="sm" />
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.xl,
    backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  greeting: { fontSize: FontSize.md, color: Colors.textMuted },
  userName: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginTop: 2 },
  date: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  profileBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.bg },
  scroll: { padding: Spacing.xl, paddingBottom: 40 },
  activeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.safeBorder, padding: Spacing.lg, marginBottom: Spacing.md,
  },
  activeLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pulseContainer: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.safe },
  activeTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.safe },
  activeSince: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  quickBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.xl, height: 56,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl,
  },
  quickBtnOut: { backgroundColor: Colors.fraud },
  quickBtnText: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.bg },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.xl },
  statCard: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, padding: Spacing.md, alignItems: 'center',
  },
  statValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  logCard: { padding: Spacing.md, marginBottom: 8 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateBox: { width: 44, height: 44, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  dateMonth: { fontSize: 9, color: Colors.textMuted, textTransform: 'uppercase' },
  dateDay: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, lineHeight: 22 },
  logInfo: { flex: 1 },
  timeRow: { flexDirection: 'row', gap: 8 },
  timeIn: { fontSize: FontSize.sm, color: Colors.safe, fontFamily: 'monospace' },
  timeOut: { fontSize: FontSize.sm, color: Colors.textMuted, fontFamily: 'monospace' },
  timeActive: { fontSize: FontSize.xs, color: Colors.suspicious },
  logCoords: { fontSize: 10, color: Colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  logRight: { alignItems: 'flex-end', gap: 4 },
  logScore: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, fontFamily: 'monospace' },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: 8 },
  emptyLink: { color: Colors.primary, fontSize: FontSize.sm },
})
