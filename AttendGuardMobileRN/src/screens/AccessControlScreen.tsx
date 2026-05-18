import React, { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getPermissions, getRoles, getUsers } from '../api/services'
import Screen, { Card, EmptyState } from '../components/Screen'
import { colors } from '../theme/colors'

const AccessControlScreen = () => {
  const [mode, setMode] = useState<'users' | 'roles' | 'permissions'>('users')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      if (mode === 'users') setItems(await getUsers())
      if (mode === 'roles') setItems(await getRoles())
      if (mode === 'permissions') setItems(await getPermissions())
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, [mode]))

  return (
    <Screen title="Access Control" subtitle="Users, roles, and permissions from the existing RBAC system." refreshing={loading} onRefresh={load}>
      <View style={styles.segment}>
        {(['users', 'roles', 'permissions'] as const).map((item) => (
          <Pressable key={item} style={[styles.segmentButton, mode === item && styles.segmentActive]} onPress={() => setMode(item)}>
            <Text style={styles.segmentText}>{item}</Text>
          </Pressable>
        ))}
      </View>
      {items.length === 0 ? (
        <EmptyState title="No data" message="You may not have permission to view this module." />
      ) : (
        items.map((item) => (
          <Card key={item.id || item.name}>
            <Text style={styles.title}>{item.name || item.email}</Text>
            <Text style={styles.text}>{item.email || item.display_name || item.description || item.module || 'RBAC record'}</Text>
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
  segmentText: { color: colors.text, fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  text: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
})

export default AccessControlScreen
