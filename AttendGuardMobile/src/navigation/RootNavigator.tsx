import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer'
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../theme'
import { useAuthStore } from '../store/authStore'

import { LoginScreen } from '../screens/auth/LoginScreen'
import { DashboardScreen } from '../screens/attendance/DashboardScreen'
import { CheckInScreen } from '../screens/attendance/CheckInScreen'
import { HistoryScreen } from '../screens/attendance/HistoryScreen'
import { ProfileScreen } from '../screens/profile/ProfileScreen'
import { AdminAttendanceScreen } from '../screens/admin/AdminAttendanceScreen'
import { AdminUsersScreen } from '../screens/admin/AdminUsersScreen'
import { AdminRolesScreen } from '../screens/admin/AdminRolesScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()
const Drawer = createDrawerNavigator()

const DrawerContent = ({ navigation, state }: any) => {
  const { user, logout, isAdmin, can } = useAuthStore()
  const currentRoute = state.routes[state.index]?.name

  const navItem = (name: string, label: string, icon: string) => {
    const isActive = currentRoute === name
    return (
      <TouchableOpacity key={name} style={[styles.drawerItem, isActive && styles.drawerItemActive]}
        onPress={() => navigation.navigate(name)} activeOpacity={0.7}>
        <Text style={styles.drawerIcon}>{icon}</Text>
        <Text style={[styles.drawerLabel, isActive && styles.drawerLabelActive]}>{label}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.drawerRoot}>
      <View style={styles.drawerHeader}>
        <View style={[styles.drawerAvatar, { backgroundColor: isAdmin() ? Colors.suspicious : Colors.primary }]}>
          <Text style={styles.drawerAvatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
        </View>
        <Text style={styles.drawerName}>{user?.name}</Text>
        <Text style={styles.drawerRole}>{user?.role?.display_name || 'No Role'}</Text>
      </View>
      <DrawerContentScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.drawerSection}>MONITORING</Text>
        {navItem('Attendance', 'All Attendance', '◈')}
        {(isAdmin() || can('attendance:view_fraud')) && navItem('Fraud', 'Fraud Alerts', '⊗')}
        {(isAdmin() || can('user:view') || can('role:view')) && (
          <>
            <Text style={styles.drawerSection}>ACCESS CONTROL</Text>
            {(isAdmin() || can('user:view')) && navItem('Users', 'Users', '◉')}
            {(isAdmin() || can('role:view')) && navItem('Roles', 'Roles & Permissions', '◈')}
          </>
        )}
      </DrawerContentScrollView>
      <TouchableOpacity style={styles.drawerLogout} onPress={() => { navigation.closeDrawer(); logout() }}>
        <Text style={styles.drawerLogoutText}>⏏  Exit Admin</Text>
      </TouchableOpacity>
    </View>
  )
}

const AdminDrawer = () => (
  <Drawer.Navigator
    drawerContent={(props) => <DrawerContent {...props} />}
    screenOptions={{ headerShown: false, drawerStyle: { backgroundColor: Colors.bgCard, width: 280 } }}>
    <Drawer.Screen name="Attendance" component={AdminAttendanceScreen} />
    <Drawer.Screen name="Fraud" component={AdminAttendanceScreen} />
    <Drawer.Screen name="Users" component={AdminUsersScreen} />
    <Drawer.Screen name="Roles" component={AdminRolesScreen} />
  </Drawer.Navigator>
)

const TAB_CONFIG = [
  { name: 'Home', label: 'Home', icon: '⬡', perm: null },
  { name: 'CheckIn', label: 'Check In', icon: '◎', perm: 'attendance:check_in' },
  { name: 'History', label: 'History', icon: '≡', perm: 'attendance:view_own' },
  { name: 'AdminPanel', label: 'Admin', icon: '◈', perm: 'attendance:view_all' },
  { name: 'Profile', label: 'Profile', icon: '◉', perm: null },
]

const CustomTabBar = ({ state, navigation }: any) => {
  const { isAdmin, can } = useAuthStore()
  const visibleRoutes = state.routes.filter((r: any) => {
    const cfg = TAB_CONFIG.find((t) => t.name === r.name)
    if (!cfg) return true
    if (cfg.name === 'AdminPanel') return isAdmin() || can('attendance:view_all') || can('user:view')
    if (cfg.perm) return isAdmin() || can(cfg.perm)
    return true
  })
  return (
    <View style={tabStyles.bar}>
      {visibleRoutes.map((route: any) => {
        const cfg = TAB_CONFIG.find((t) => t.name === route.name)
        const isFocused = state.routes[state.index]?.name === route.name
        return (
          <TouchableOpacity key={route.key} style={tabStyles.tab}
            onPress={() => navigation.navigate(route.name)} activeOpacity={0.7}>
            <View style={[tabStyles.iconWrap, isFocused && tabStyles.iconWrapActive]}>
              <Text style={[tabStyles.icon, isFocused && tabStyles.iconActive]}>{cfg?.icon || '●'}</Text>
            </View>
            <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>{cfg?.label || route.name}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const MainTabs = () => (
  <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
    <Tab.Screen name="Home" component={DashboardScreen} />
    <Tab.Screen name="CheckIn" component={CheckInScreen} />
    <Tab.Screen name="History" component={HistoryScreen} />
    <Tab.Screen name="AdminPanel" component={AdminDrawer} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
)

export const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) return null
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {isAuthenticated
          ? <Stack.Screen name="Main" component={MainTabs} />
          : <Stack.Screen name="Login" component={LoginScreen} />}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  drawerRoot: { flex: 1, backgroundColor: Colors.bgCard },
  drawerHeader: { padding: Spacing.xl, paddingTop: 56, backgroundColor: Colors.bgElevated, borderBottomWidth: 1, borderBottomColor: Colors.border },
  drawerAvatar: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  drawerAvatarText: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.bg },
  drawerName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  drawerRole: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2, fontFamily: 'monospace' },
  drawerSection: { fontSize: 10, color: Colors.textMuted, fontFamily: 'monospace', letterSpacing: 1, paddingHorizontal: Spacing.lg, paddingTop: 20, paddingBottom: 8 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.lg, paddingVertical: 12, marginHorizontal: 8, borderRadius: Radius.md },
  drawerItemActive: { backgroundColor: Colors.primaryBg },
  drawerIcon: { fontSize: 18, width: 24, textAlign: 'center', color: Colors.textMuted },
  drawerLabel: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.medium },
  drawerLabelActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  drawerLogout: { margin: Spacing.lg, padding: Spacing.md, backgroundColor: Colors.fraudBg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.fraudBorder, alignItems: 'center' },
  drawerLogoutText: { color: Colors.fraud, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
})

const tabStyles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.border, paddingBottom: Platform.OS === 'ios' ? 20 : 8, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  iconWrap: { width: 38, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md },
  iconWrapActive: { backgroundColor: Colors.primaryBg },
  icon: { fontSize: 17, color: Colors.textMuted },
  iconActive: { color: Colors.primary },
  label: { fontSize: 10, color: Colors.textMuted },
  labelActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
})
