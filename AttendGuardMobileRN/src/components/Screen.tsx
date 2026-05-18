import React from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme/colors'

type ScreenProps = {
  title?: string
  subtitle?: string
  children: React.ReactNode
  refreshing?: boolean
  onRefresh?: () => void
}

const Screen = ({ title, subtitle, children, refreshing = false, onRefresh }: ScreenProps) => (
  <ScrollView
    style={styles.container}
    contentContainerStyle={styles.content}
    refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
  >
    {title ? (
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    ) : null}
    {children}
  </ScrollView>
)

export const Card = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.card}>{children}</View>
)

export const EmptyState = ({ title, message }: { title: string; message: string }) => (
  <Card>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyText}>{message}</Text>
  </Card>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  header: {
    marginBottom: 2,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
})

export default Screen
