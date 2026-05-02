import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, StatusBar,
} from 'react-native'
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../theme'
import { adminAPI } from '../../api/services'
import { Card, FraudBadge, EmptyState } from '../../components/UI'
import { format } from 'date-fns'

type TabType = 'all' | 'fraud'

export const AdminAttendanceScreen = () => {
  const [tab, setTab] = useState<TabType>('all')
  const [allData, setAllData] = useState<any[]>([])
  const [fraudData, setFraudData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [allRes, fraudRes] = await Promise.all([
        adminAPI.allAttendance(),
        adminAPI.fraudAttendance(),
      ])
      setAllData(allRes.data.attendance || [])
      setFraudData(fraudRes.data.attendance || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const data = tab === 'all' ? allData : fraudData

  const filtered = data.filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      a.user?.name?.toLowerCase().includes(q) ||
      a.user?.email?.toLowerCase().includes(q)
    )
  })

  const stats = {
    total: allData.length,
    safe: allData.filter((a) => a.fraud_status === 'SAFE').length,
    suspicious: allData.filter((a) => a.fraud_status === 'SUSPICIOUS').length,
    fraud: allData.filter((a) => a.fraud_status === 'FRAUD').length,
  }

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      {/* User */}
      <View style={styles.userRow}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {item.user?.name?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.user?.name || 'Unknown'}</Text>
          <Text style={styles.userEmail}>{item.user?.email}</Text>
        </View>
        <FraudBadge status={item.fraud_status} size="sm" />
      </View>

      {/* Times */}
      <View style={styles.timeGrid}>
        <View style={styles.timeItem}>
          <Text style={styles.timeLabel}>CHECK IN</Text>
          <Text style={styles.timeValue}>
            {item.check_in_at ? format(new Date(item.check_in_at), 'HH:mm') : '—'}
          </Text>
          <Text style={styles.timeDate}>
            {item.check_in_at ? format(new Date(item.check_in_at), 'dd MMM') : ''}
          </Text>
        </View>
        <Text style={styles.arrow}>→</Text>
        <View style={styles.timeItem}>
          <Text style={styles.timeLabel}>CHECK OUT</Text>
          <Text style={styles.timeValue}>
            {item.check_out_at ? format(new Date(item.check_out_at), 'HH:mm') : '—'}
          </Text>
          <Text style={styles.timeDate}>
            {item.check_out_at ? format(new Date(item.check_out_at), 'dd MMM') : ''}
          </Text>
        </View>
        <View style={styles.timeItem}>
          <Text style={styles.timeLabel}>SCORE</Text>
          <Text style={[styles.scoreValue, {
            color: item.fraud_score >= 80 ? Colors.fraud
              : item.fraud_score >= 40 ? Colors.suspicious
              : Colors.textMuted,
          }]}>{item.fraud_score}</Text>
        </View>
      </View>

      {/* Flags */}
      {item.fraud_flags?.length > 0 && (
        <View style={styles.flagsRow}>
          {item.fraud_flags.slice(0, 4).map((f: any, i: number) => (
            <View key={i} style={styles.flagChip}>
              <Text style={styles.flagChipText}>{f.type.replace(/_/g, ' ')}</Text>
            </View>
          ))}
          {item.fraud_flags.length > 4 && (
            <Text style={styles.moreFlags}>+{item.fraud_flags.length - 4} more</Text>
          )}
        </View>
      )}

      {/* Mock GPS warning */}
      {item.is_mock && (
        <View style={styles.mockWarning}>
          <Text style={styles.mockText}>⚠️ MOCK GPS — Check-in was blocked</Text>
        </View>
      )}
    </Card>
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Attendance Monitor</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total', val: stats.total, color: Colors.primary },
            { label: 'Safe', val: stats.safe, color: Colors.safe },
            { label: 'Warn', val: stats.suspicious, color: Colors.suspicious },
            { label: 'Fraud', val: stats.fraud, color: Colors.fraud },
          ].map(({ label, val, color }) => (
            <View key={label} style={styles.stat}>
              <Text style={[styles.statVal, { color }]}>{val}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['all', 'fraud'] as TabType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'all' ? `All (${allData.length})` : `Fraud Alerts (${fraudData.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon={tab === 'fraud' ? '🛡️' : '📋'}
              title={tab === 'fraud' ? 'All Clear' : 'No Records'}
              subtitle={
                tab === 'fraud'
                  ? 'No suspicious or fraudulent attendance detected'
                  : 'No attendance records found'
              }
            />
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.md },
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.xl, marginBottom: Spacing.md, gap: 8 },
  stat: { flex: 1, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, padding: 10, alignItems: 'center' },
  statVal: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.xl, gap: 8, marginBottom: Spacing.md },
  tab: { flex: 1, paddingVertical: 8, borderRadius: Radius.md, backgroundColor: Colors.bgElevated, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  tabText: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.medium },
  tabTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.xl, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, height: 42 },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm },
  clearSearch: { color: Colors.textMuted, fontSize: FontSize.md, padding: 4 },
  list: { padding: Spacing.xl, gap: 10, paddingBottom: 32 },
  card: { gap: 10 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userAvatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.fraud + '30', alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.fraud },
  userInfo: { flex: 1 },
  userName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  userEmail: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace' },
  timeGrid: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4, borderTopWidth: 1, borderTopColor: Colors.border },
  timeItem: { flex: 1, alignItems: 'center' },
  timeLabel: { fontSize: 9, color: Colors.textMuted, fontFamily: 'monospace', textTransform: 'uppercase' },
  timeValue: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginTop: 2 },
  timeDate: { fontSize: 10, color: Colors.textMuted },
  scoreValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, fontFamily: 'monospace', marginTop: 2 },
  arrow: { color: Colors.textMuted, fontSize: FontSize.lg },
  flagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  flagChip: { backgroundColor: Colors.bgElevated, borderRadius: 4, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 6, paddingVertical: 2 },
  flagChipText: { fontSize: 9, color: Colors.textMuted, fontFamily: 'monospace' },
  moreFlags: { fontSize: 10, color: Colors.textMuted, alignSelf: 'center' },
  mockWarning: { backgroundColor: Colors.fraudBg, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.fraudBorder, padding: 6 },
  mockText: { fontSize: 10, color: Colors.fraud, fontFamily: 'monospace' },
})
