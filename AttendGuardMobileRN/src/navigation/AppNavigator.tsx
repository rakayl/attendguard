import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuthStore } from '../store/authStore'
import { colors } from '../theme/colors'
import AccessControlScreen from '../screens/AccessControlScreen'
import ActivityCalendarScreen from '../screens/ActivityCalendarScreen'
import ActivityDetailScreen from '../screens/ActivityDetailScreen'
import ActivitiesScreen from '../screens/ActivitiesScreen'
import AdminScreen from '../screens/AdminScreen'
import AttendanceScreen from '../screens/AttendanceScreen'
import BoardDetailScreen from '../screens/BoardDetailScreen'
import DevicesScreen from '../screens/DevicesScreen'
import FaceScreen from '../screens/FaceScreen'
import GeofenceScreen from '../screens/GeofenceScreen'
import HistoryScreen from '../screens/HistoryScreen'
import HomeScreen from '../screens/HomeScreen'
import LoginScreen from '../screens/LoginScreen'
import MoreScreen from '../screens/MoreScreen'
import ProfileScreen from '../screens/ProfileScreen'
import TeamsScreen from '../screens/TeamsScreen'
import WorkspaceBoardsScreen from '../screens/WorkspaceBoardsScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      tabBarStyle: {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      sceneStyle: { backgroundColor: colors.background },
      tabBarIcon: ({ color, size }) => {
        const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
          Home: 'grid-outline',
          Attendance: 'scan-outline',
          Activities: 'checkbox-outline',
          Teams: 'people-outline',
          More: 'menu-outline',
        }
        return <Ionicons name={icons[route.name]} size={size} color={color} />
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Attendance" component={AttendanceScreen} />
    <Tab.Screen name="Activities" component={ActivitiesScreen} />
    <Tab.Screen name="Teams" component={TeamsScreen} />
    <Tab.Screen name="More" component={MoreScreen} />
  </Tab.Navigator>
)

const AppNavigator = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="History" component={HistoryScreen} options={{ headerShown: true, title: 'History' }} />
          <Stack.Screen name="Devices" component={DevicesScreen} options={{ headerShown: true, title: 'Devices' }} />
          <Stack.Screen name="Face" component={FaceScreen} options={{ headerShown: true, title: 'Face Recognition' }} />
          <Stack.Screen name="Geofence" component={GeofenceScreen} options={{ headerShown: true, title: 'Geofence' }} />
          <Stack.Screen name="Admin" component={AdminScreen} options={{ headerShown: true, title: 'Admin Monitor' }} />
          <Stack.Screen name="AccessControl" component={AccessControlScreen} options={{ headerShown: true, title: 'Access Control' }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'Profile' }} />
          <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} options={{ headerShown: true, title: 'Activity Detail' }} />
          <Stack.Screen name="ActivityCalendar" component={ActivityCalendarScreen} options={{ headerShown: true, title: 'Activity Calendar' }} />
          <Stack.Screen name="WorkspaceBoards" component={WorkspaceBoardsScreen} options={{ headerShown: true, title: 'Workspace Boards' }} />
          <Stack.Screen name="BoardDetail" component={BoardDetailScreen} options={{ headerShown: true, title: 'Board' }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  )
}

export default AppNavigator
