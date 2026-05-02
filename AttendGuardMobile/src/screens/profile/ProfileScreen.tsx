import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, StatusBar, Switch,
} from 'react-native'
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../theme'
import { useAuthStore } from '../../store/authStore'
import { deviceAPI } from '../../api/services'
import { getDeviceInfo } from '../../utils/location'
import { Card, Button } from '../../components/UI'

const MODULE_COLORS: Record<string, string> = {
  attendance: Colors.primary,
  user: '#8b5cf6',
  role: '#6366f1',
  permission: Colors.suspicious,
  device: Colors.safe,
  admin: Colors.fraud,
  geofence: '#14b8a6',
}

export const ProfileScreen = () => {
  const { user, logout, isAdmin, can } = useAuthStore()
  const [registering, setRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)

  const permissions = user?.role?.permissions || []
  const grouped = permissions.reduce((acc: Record<string, any[]>, p) => {
    acc[p.module] = acc[p.module] || []
    acc[p.module].push(p)
    return acc
  }, {})

  const handleRegisterDevice = async () => {
    setRegistering(true)
    try {
      const info = await getDeviceInfo()
      await deviceAPI.register(info)
      setRegistered(true)
      Alert.alert('✓ Success', 'Device registered successfully!')
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => logout() },
      ]
    )
  }

  const avatarColor = isAdmin() ? Colors.suspicious : Colors.primary

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Avatar + info */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={[styles.roleBadge, { borderColor: avatarColor + '50', backgroundColor: avatarColor + '15' }]}>
            <Text style={[styles.roleText, { color: avatarColor }]}>
              {user?.role?.display_name || 'No Role'}
            </Text>
          </View>
        </View>

        {/* Account info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT INFO</Text>
          {[
            ['User ID', `#${user?.id}`],
            ['Email', user?.email || '—'],
            ['Role', user?.role?.name || 'none'],
            ['Status', user?.is_active ? 'Active' : 'Inactive'],
            ['Permissions', `${permissions.length} total`],
          ].map(([label, value]) => (
            <View key={label as string} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label as string}</Text>
              <Text style={[styles.infoValue, label === 'Status' && {
                color: user?.is_active ? Colors.safe : Colors.fraud,
              }]}>{value as string}</Text>
            </View>
          ))}
        </Card>

        {/* Permissions */}
        {Object.keys(grouped).length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>MY PERMISSIONS</Text>
            {Object.entries(grouped).map(([module, perms]) => (
              <View key={module} style={styles.moduleGroup}>
                <Text style={[styles.moduleLabel, { color: MODULE_COLORS[module] || Colors.textMuted }]}>
                  {module.toUpperCase()}
                </Text>
                <View style={styles.permChips}>
                  {(perms as any[]).map((p) => (
                    <View
                      key={p.id}
                      style={[styles.permChip, {
                        backgroundColor: (MODULE_COLORS[module] || Colors.textMuted) + '15',
                        borderColor: (MODULE_COLORS[module] || Colors.textMuted) + '40',
                      }]}
                    >
                      <Text style={[styles.permChipText, { color: MODULE_COLORS[module] || Colors.textMuted }]}>
                        {p.display_name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Device */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>DEVICE</Text>
          <Text style={styles.deviceHint}>
            Register this device to avoid unrecognized device fraud flags.
          </Text>
          <Button
            title={registered ? '✓ Device Registered' : 'Register This Device'}
            onPress={handleRegisterDevice}
            loading={registering}
            disabled={registered}
            variant={registered ? 'ghost' : 'secondary'}
            style={styles.deviceBtn}
          />
        </Card>

        {/* App info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>APP INFO</Text>
          {[
            ['App Version', '1.0.0'],
            ['Platform', 'Android'],
            ['Build', 'Production'],
          ].map(([label, value]) => (
            <View key={label as string} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label as string}</Text>
              <Text style={styles.infoValue}>{value as string}</Text>
            </View>
          ))}
        </Card>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>⏏  Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.lg,
    backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  scroll: { padding: Spacing.xl, gap: 16 },
  avatarSection: { alignItems: 'center', paddingVertical: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 36, fontWeight: FontWeight.bold, color: Colors.bg },
  userName: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  userEmail: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4, fontFamily: 'monospace' },
  roleBadge: {
    marginTop: 10, paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: Radius.full, borderWidth: 1,
  },
  roleText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  section: { gap: 0 },
  sectionTitle: {
    fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border + '80',
  },
  infoLabel: { fontSize: FontSize.sm, color: Colors.textMuted },
  infoValue: { fontSize: FontSize.sm, color: Colors.textPrimary, fontFamily: 'monospace' },
  moduleGroup: { marginBottom: 12 },
  moduleLabel: { fontSize: 10, fontFamily: 'monospace', fontWeight: FontWeight.bold, marginBottom: 6 },
  permChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  permChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm, borderWidth: 1 },
  permChipText: { fontSize: 10, fontFamily: 'monospace' },
  deviceHint: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: 12, lineHeight: 20 },
  deviceBtn: { marginTop: 0 },
  logoutBtn: {
    backgroundColor: Colors.fraudBg, borderRadius: Radius.lg, borderWidth: 1,
    borderColor: Colors.fraudBorder, height: 52, alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.fraud },
})
