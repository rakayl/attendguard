import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, RefreshControl, StatusBar } from 'react-native'
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../theme'
import { faceAPI } from '../../api/services'
import { Card, EmptyState } from '../../components/UI'

export const AdminFaceScreen = () => {
  const [profiles, setProfiles] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const fetchProfiles = async () => {
    const res = await faceAPI.all()
    setProfiles(res.data.profiles || [])
  }

  useEffect(() => { fetchProfiles().catch(() => {}) }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchProfiles().catch(() => {})
    setRefreshing(false)
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <View style={styles.header}>
        <Text style={styles.title}>Face Recognition</Text>
        <Text style={styles.subtitle}>{profiles.length} enrolled profiles</Text>
      </View>
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={<EmptyState icon="●" title="No Face Profiles" subtitle="Enroll profiles from web admin or user profile." />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.avatar, item.is_active ? styles.avatarActive : styles.avatarInactive]}>
                <Text style={styles.avatarText}>{item.user?.name?.[0]?.toUpperCase() || 'F'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.user?.name || `User #${item.user_id}`}</Text>
                <Text style={styles.meta}>quality {(item.quality_score * 100).toFixed(0)}% · {item.template_preview}</Text>
              </View>
              <Text style={[styles.status, { color: item.is_active ? Colors.safe : Colors.textMuted }]}>
                {item.is_active ? 'ACTIVE' : 'OFF'}
              </Text>
            </View>
          </Card>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.lg, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  list: { padding: Spacing.xl, gap: 10, paddingBottom: 32 },
  card: { padding: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  avatarActive: { backgroundColor: Colors.safeBg, borderWidth: 1, borderColor: Colors.safeBorder },
  avatarInactive: { backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
  avatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  name: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  meta: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  status: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, fontFamily: 'monospace' },
})
