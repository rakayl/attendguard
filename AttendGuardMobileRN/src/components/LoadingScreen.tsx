import React from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme/colors'

const LoadingScreen = ({ label = 'Loading...' }: { label?: string }) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={styles.label}>{label}</Text>
  </View>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  label: {
    color: colors.textMuted,
    fontSize: 14,
  },
})

export default LoadingScreen
