import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Screen from '../components/Screen'
import { colors } from '../theme/colors'

const items = [
  ['History', 'Personal attendance history'],
  ['Devices', 'Trusted mobile device management'],
  ['Face', 'Face enrollment and verification'],
  ['Geofence', 'Active attendance zones'],
  ['Admin', 'Attendance and fraud monitoring'],
  ['AccessControl', 'Users, roles, and permissions'],
  ['Profile', 'Account settings'],
] as const

const MoreScreen = ({ navigation }: any) => (
  <Screen title="More" subtitle="Additional AttendGuard modules from the web app.">
    {items.map(([route, description]) => (
      <Pressable key={route} style={styles.item} onPress={() => navigation.navigate(route)}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>{route[0]}</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{route === 'AccessControl' ? 'Access Control' : route}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <Text style={styles.chevron}>{'>'}</Text>
      </Pressable>
    ))}
  </Screen>
)

const styles = StyleSheet.create({
  item: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconText: { color: colors.primary, fontWeight: '800' },
  copy: { flex: 1 },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  description: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  chevron: { color: colors.textMuted, fontSize: 26 },
})

export default MoreScreen
