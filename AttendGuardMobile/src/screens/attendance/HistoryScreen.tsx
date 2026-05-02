import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Modal, ScrollView, StatusBar,
} from 'react-native'
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../theme'
import { useAttendanceStore } from '../../store/attendanceStore'
import { attendanceAPI } from '../../api/services'
import { Card, FraudBadge, FraudScoreBar, FraudFlagItem, EmptyState } from '../../components/UI'
import { format } from 'date-fns'

const FILTERS = ['ALL', 'SAFE', 'SUSPICIOUS', 'FRAUD'] as const
type Filter = typeof FILTERS[number]

const FilterColors: Record<Filter, { bg: string; text: string; border: string }> = {
  ALL:        { bg: Colors.bgElevated, text: Colors.textSecondary, border: Colors.border },
  SAFE:       { bg: Colors.safeBg, text: Colors.safe, border: Colors.safeBorder },
  SUSPICIOUS: { bg: Colors.suspiciousBg, text: Colors.suspicious, border: Colors.suspiciousBorder },
  FRAUD:      { bg: Colors.fraudBg, text: Colors.fraud, border: Colors.fraudBorder },
}

export const HistoryScreen = () => {
  const { history, fetchHistory, loading } = useAttendanceStore()
  const [filter, setFilter] = useState<Filter>('ALL')
  const [selected, setSelected] = useState<any | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { fetchHistory() }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchHistory()
    setRefreshing(false)
  }

  const openDetail = async (log: any) => {
    setSelected(log)
    setDetailLoading(true)
    try {
      const res = await attendanceAPI.fraudDetail(log.id)
      setSelected(res.data.attendance)
    } catch {
      // use existing data
    } finally {
      setDetailLoading(false)
    }
  }

  const filtered = filter === 'ALL'
    ? history
    : history.filter((h) => h.fraud_status === filter)

  const calcDuration = (inAt: string, outAt: string) => {
    const diff = new Date(outAt).getTime() - new Date(inAt).getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return `${h}h ${m}m`
  }

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => openDetail(item)} activeOpacity={0.8}>
      <Card style={styles.logCard}>
        <View style={styles.logRow}>
          {/* Date */}
          <View style={styles.dateBox}>
            <Text style={styles.dateMonth}>
              {format(new Date(item.check_in_at || item.created_at), 'MMM')}
            </Text>
            <Text style={styles.dateDay}>
              {format(new Date(item.check_in_at || item.created_at), 'd')}
            </Text>
          </View>

          {/* Info */}
          <View style={styles.logInfo}>
            <View style={styles.timeRow}>
              <Text style={styles.timeIn}>
                ↑ {format(new Date(item.check_in_at), 'HH:mm')}
              </Text>
              {item.check_out_at ? (
                <>
                  <Text style={styles.timeSep}>–</Text>
                  <Text style={styles.timeOut}>
                    ↓ {format(new Date(item.check_out_at), 'HH:mm')}
                  </Text>
                  <Text style={styles.duration}>
                    ({calcDuration(item.check_in_at, item.check_out_at)})
                  </Text>
                </>
              ) : (
                <Text style={styles.timeActive}>● Active</Text>
              )}
            </View>
            <Text style={styles.coords}>
              {item.lat.toFixed(4)}, {item.long.toFixed(4)}
            </Text>
            {item.fraud_flags?.length > 0 && (
              <Text style={styles.flagCount}>
                {item.fraud_flags.length} flag{item.fraud_flags.length > 1 ? 's' : ''} detected
              </Text>
            )}
          </View>

          {/* Score + badge */}
          <View style={styles.logRight}>
            <Text style={[styles.score, {
              color: item.fraud_score >= 80 ? Colors.fraud
                : item.fraud_score >= 40 ? Colors.suspicious
                : Colors.textMuted,
            }]}>{item.fraud_score}</Text>
            <FraudBadge status={item.fraud_status} size="sm" />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Attendance History</Text>
        <Text style={styles.subtitle}>{history.length} total records</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const c = FilterColors[f]
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, { backgroundColor: c.bg, borderColor: c.border, opacity: filter === f ? 1 : 0.5 }]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, { color: c.text }]}>{f}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="📋"
              title="No Records"
              subtitle={filter !== 'ALL' ? `No ${filter.toLowerCase()} attendance found` : 'No attendance records yet'}
            />
          ) : null
        }
      />

      {/* Detail Modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Attendance Detail</Text>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {selected && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Fraud score */}
              <Card style={styles.scoreCard}>
                <View style={styles.scoreHeader}>
                  <Text style={styles.scoreTitle}>Fraud Analysis</Text>
                  <FraudBadge status={selected.fraud_status} />
                </View>
                <View style={{ marginTop: 12 }}>
                  <FraudScoreBar score={selected.fraud_score} status={selected.fraud_status} />
                </View>
              </Card>

              {/* Details */}
              <Card style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>Attendance Info</Text>
                {[
                  ['Check In', selected.check_in_at ? format(new Date(selected.check_in_at), 'dd MMM yyyy HH:mm:ss') : '—'],
                  ['Check Out', selected.check_out_at ? format(new Date(selected.check_out_at), 'dd MMM yyyy HH:mm:ss') : 'Not yet'],
                  ['Duration', selected.check_out_at ? calcDuration(selected.check_in_at, selected.check_out_at) : 'In progress'],
                  ['Coordinates', `${selected.lat?.toFixed(5)}, ${selected.long?.toFixed(5)}`],
                  ['GPS Accuracy', `±${selected.accuracy?.toFixed(0)}m`],
                  ['Mock GPS', selected.is_mock ? '⚠️ YES (blocked)' : 'No'],
                  ['Device ID', selected.device_id || '—'],
                  ['IP Address', selected.ip_address || '—'],
                ].map(([label, value]) => (
                  <View key={label} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{label}</Text>
                    <Text style={[styles.detailValue, label === 'Mock GPS' && selected.is_mock && { color: Colors.fraud }]}>
                      {value}
                    </Text>
                  </View>
                ))}
              </Card>

              {/* Fraud flags */}
              {selected.fraud_flags?.length > 0 && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailSectionTitle}>Fraud Flags Detected</Text>
                  {selected.fraud_flags.map((flag: any, i: number) => (
                    <FraudFlagItem key={i} flag={flag} />
                  ))}
                </Card>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.lg, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.bgCard },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1 },
  filterText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, fontFamily: 'monospace' },
  listContent: { padding: Spacing.xl, paddingBottom: 32, gap: 8 },
  logCard: { padding: Spacing.md },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateBox: { width: 44, height: 44, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  dateMonth: { fontSize: 9, color: Colors.textMuted, textTransform: 'uppercase' },
  dateDay: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, lineHeight: 22 },
  logInfo: { flex: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  timeIn: { fontSize: FontSize.sm, color: Colors.safe, fontFamily: 'monospace' },
  timeSep: { fontSize: FontSize.xs, color: Colors.textMuted },
  timeOut: { fontSize: FontSize.sm, color: Colors.textMuted, fontFamily: 'monospace' },
  timeActive: { fontSize: FontSize.xs, color: Colors.suspicious },
  duration: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace' },
  coords: { fontSize: 10, color: Colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  flagCount: { fontSize: 10, color: Colors.suspicious, marginTop: 2 },
  logRight: { alignItems: 'flex-end', gap: 4 },
  score: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, fontFamily: 'monospace' },
  modal: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: 20, paddingBottom: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  closeBtn: { width: 32, height: 32, backgroundColor: Colors.bgElevated, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: Colors.textSecondary, fontSize: FontSize.md },
  modalContent: { flex: 1, padding: Spacing.xl },
  scoreCard: { marginBottom: 12 },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  detailCard: { marginBottom: 12 },
  detailSectionTitle: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailLabel: { fontSize: FontSize.sm, color: Colors.textMuted, flex: 1 },
  detailValue: { fontSize: FontSize.sm, color: Colors.textPrimary, fontFamily: 'monospace', flex: 1.5, textAlign: 'right' },
})
