import React, { useEffect } from 'react'
import {
  View, Text, StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { RootNavigator } from './src/navigation/RootNavigator'
import { useAuthStore } from './src/store/authStore'
import { Colors, FontSize, FontWeight } from './src/theme'

const SplashScreen = () => (
  <View style={styles.splash}>
    <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
    <View style={styles.splashLogo}>
      <Text style={styles.splashLetter}>A</Text>
    </View>
    <Text style={styles.splashName}>AttendGuard</Text>
    <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
  </View>
)

// Toast config for custom styling
const toastConfig = {
  success: ({ text1, text2 }: any) => (
    <View style={toast.container}>
      <View style={[toast.icon, { backgroundColor: Colors.safeBg }]}>
        <Text>✓</Text>
      </View>
      <View>
        <Text style={toast.title}>{text1}</Text>
        {text2 && <Text style={toast.subtitle}>{text2}</Text>}
      </View>
    </View>
  ),
  error: ({ text1, text2 }: any) => (
    <View style={[toast.container, { borderLeftColor: Colors.fraud }]}>
      <View style={[toast.icon, { backgroundColor: Colors.fraudBg }]}>
        <Text>✕</Text>
      </View>
      <View>
        <Text style={[toast.title, { color: Colors.fraud }]}>{text1}</Text>
        {text2 && <Text style={toast.subtitle}>{text2}</Text>}
      </View>
    </View>
  ),
}

const App = () => {
  const { loadFromStorage, isLoading } = useAuthStore()

  useEffect(() => {
    loadFromStorage()
  }, [])

  if (isLoading) return <SplashScreen />

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
        <RootNavigator />
        <Toast config={toastConfig} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  splash: {
    flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center',
  },
  splashLogo: {
    width: 80, height: 80, borderRadius: 22, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  splashLetter: { fontSize: 40, fontWeight: FontWeight.bold, color: Colors.bg },
  splashName: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
})

const toast = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1,
    borderColor: Colors.border, borderLeftWidth: 4, borderLeftColor: Colors.safe,
    marginHorizontal: 16, padding: 14, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
})

export default App
