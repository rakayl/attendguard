import React from 'react'
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native'
import { Colors, Radius, Spacing, FontSize, FontWeight, Shadow } from '../theme'

// ── Card ─────────────────────────────────────────────────────────────────────
export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => (
  <View style={[styles.card, style]}>{children}</View>
)

// ── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
  icon?: React.ReactNode
}

export const Button = ({
  title, onPress, variant = 'primary', loading, disabled, style, textStyle, icon
}: ButtonProps) => {
  const btnStyle = {
    primary: styles.btnPrimary,
    secondary: styles.btnSecondary,
    danger: styles.btnDanger,
    ghost: styles.btnGhost,
  }[variant]

  const txtStyle = {
    primary: styles.btnTextPrimary,
    secondary: styles.btnTextSecondary,
    danger: styles.btnTextDanger,
    ghost: styles.btnTextGhost,
  }[variant]

  return (
    <TouchableOpacity
      style={[styles.btn, btnStyle, (disabled || loading) && styles.btnDisabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.bg : Colors.primary} size="small" />
      ) : (
        <View style={styles.btnInner}>
          {icon}
          <Text style={[styles.btnText, txtStyle, textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
interface InputProps {
  label?: string
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  secureTextEntry?: boolean
  keyboardType?: 'default' | 'email-address' | 'numeric'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  style?: ViewStyle
  multiline?: boolean
  editable?: boolean
}

export const Input = ({ label, style, ...props }: InputProps) => {
  const { TextInput } = require('react-native')
  return (
    <View style={[styles.inputWrapper, style]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        style={[styles.input, !props.editable && styles.inputDisabled]}
        placeholderTextColor={Colors.textMuted}
        {...props}
      />
    </View>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
interface BadgeProps {
  status: 'SAFE' | 'SUSPICIOUS' | 'FRAUD' | string
  size?: 'sm' | 'md'
}

export const FraudBadge = ({ status, size = 'md' }: BadgeProps) => {
  const config = {
    SAFE:       { bg: Colors.safeBg,       border: Colors.safeBorder,       text: Colors.safe,       icon: '●' },
    SUSPICIOUS: { bg: Colors.suspiciousBg, border: Colors.suspiciousBorder, text: Colors.suspicious, icon: '▲' },
    FRAUD:      { bg: Colors.fraudBg,      border: Colors.fraudBorder,      text: Colors.fraud,      icon: '✕' },
  }[status] || { bg: Colors.safeBg, border: Colors.safeBorder, text: Colors.safe, icon: '●' }

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }, size === 'sm' && styles.badgeSm]}>
      <Text style={[styles.badgeIcon, { color: config.text }]}>{config.icon}</Text>
      <Text style={[styles.badgeText, { color: config.text }, size === 'sm' && styles.badgeTextSm]}>
        {status}
      </Text>
    </View>
  )
}

// ── FraudScore Bar ────────────────────────────────────────────────────────────
export const FraudScoreBar = ({ score, status }: { score: number; status: string }) => {
  const color = { SAFE: Colors.safe, SUSPICIOUS: Colors.suspicious, FRAUD: Colors.fraud }[status] || Colors.safe
  const pct = Math.min(score, 100)
  const { Animated, useEffect, useRef } = require('react')
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 800, useNativeDriver: false }).start()
  }, [pct])
  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] })
  return (
    <View>
      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>FRAUD SCORE</Text>
        <Text style={[styles.scoreValue, { color }]}>{score}/100</Text>
      </View>
      <View style={styles.scoreTrack}>
        <Animated.View style={[styles.scoreFill, { width, backgroundColor: color }]} />
      </View>
    </View>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────
export const SectionHeader = ({ title, action, onAction }: {
  title: string; action?: string; onAction?: () => void
}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action && (
      <TouchableOpacity onPress={onAction}>
        <Text style={styles.sectionAction}>{action} →</Text>
      </TouchableOpacity>
    )}
  </View>
)

// ── Status Dot ────────────────────────────────────────────────────────────────
export const StatusDot = ({ active, pulse = false }: { active: boolean; pulse?: boolean }) => (
  <View style={[styles.dot, { backgroundColor: active ? Colors.safe : Colors.red }]} />
)

// ── Empty State ───────────────────────────────────────────────────────────────
export const EmptyState = ({ icon, title, subtitle, action, onAction }: {
  icon: string; title: string; subtitle?: string; action?: string; onAction?: () => void
}) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyIcon}>{icon}</Text>
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    {action && onAction && (
      <Button title={action} onPress={onAction} style={styles.emptyAction} />
    )}
  </View>
)

// ── Loading Overlay ───────────────────────────────────────────────────────────
export const LoadingOverlay = ({ visible }: { visible: boolean }) => {
  if (!visible) return null
  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  )
}

// ── Block Alert ───────────────────────────────────────────────────────────────
export const BlockAlert = ({ code, message }: { code: string; message: string }) => (
  <View style={styles.blockAlert}>
    <Text style={styles.blockIcon}>🚫</Text>
    <View style={styles.blockContent}>
      <Text style={styles.blockTitle}>
        {code === 'FAKE_GPS' ? 'Fake GPS Detected — Blocked' : 'Outside Zone — Blocked'}
      </Text>
      <Text style={styles.blockMessage}>{message}</Text>
    </View>
  </View>
)

// ── Fraud Flag Item ───────────────────────────────────────────────────────────
const FLAG_ICONS: Record<string, string> = {
  MOCK_GPS: '📍', LOW_ACCURACY: '📡', HIGH_SPEED: '⚡',
  OUTSIDE_GEOFENCE: '🗺️', TIME_MANIPULATION: '🕐',
  NEW_DEVICE: '📱', IP_MISMATCH: '🌐',
}
const FLAG_COLORS: Record<string, string> = {
  MOCK_GPS: Colors.fraud, LOW_ACCURACY: Colors.suspicious,
  HIGH_SPEED: Colors.fraud, OUTSIDE_GEOFENCE: '#f97316',
  TIME_MANIPULATION: '#a855f7', NEW_DEVICE: Colors.primary, IP_MISMATCH: '#ec4899',
}

export const FraudFlagItem = ({ flag }: { flag: any }) => {
  const color = FLAG_COLORS[flag.type] || Colors.textSecondary
  return (
    <View style={[styles.flagItem, { borderColor: color + '40', backgroundColor: color + '15' }]}>
      <Text style={styles.flagIcon}>{FLAG_ICONS[flag.type] || '⚠️'}</Text>
      <View style={styles.flagContent}>
        <View style={styles.flagRow}>
          <Text style={[styles.flagType, { color }]}>{flag.type.replace(/_/g, ' ')}</Text>
          <Text style={[styles.flagScore, { color }]}>+{flag.score}</Text>
        </View>
        <Text style={styles.flagDesc}>{flag.description}</Text>
      </View>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  btn: {
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary:   { backgroundColor: Colors.primary, ...Shadow.cyan },
  btnSecondary: { backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
  btnDanger:    { backgroundColor: Colors.fraudBg, borderWidth: 1, borderColor: Colors.fraudBorder },
  btnGhost:     { backgroundColor: Colors.transparent },
  btnDisabled:  { opacity: 0.5 },
  btnInner:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText:      { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  btnTextPrimary:   { color: Colors.bg },
  btnTextSecondary: { color: Colors.textPrimary },
  btnTextDanger:    { color: Colors.fraud },
  btnTextGhost:     { color: Colors.primary },
  inputWrapper: { marginBottom: Spacing.md },
  inputLabel:   { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: 12,
    color: Colors.textPrimary, fontSize: FontSize.md,
  },
  inputDisabled: { opacity: 0.6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1 },
  badgeSm: { paddingHorizontal: 8, paddingVertical: 2 },
  badgeIcon: { fontSize: 8 },
  badgeText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, fontFamily: 'monospace' },
  badgeTextSm: { fontSize: FontSize.xs },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  scoreLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace', textTransform: 'uppercase' },
  scoreValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, fontFamily: 'monospace' },
  scoreTrack: { height: 6, backgroundColor: Colors.bgElevated, borderRadius: Radius.full, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: Radius.full },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  sectionAction: { fontSize: FontSize.sm, color: Colors.primary },
  dot: { width: 10, height: 10, borderRadius: 5 },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textSecondary, marginBottom: 6 },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  emptyAction: { marginTop: 16 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  blockAlert: { flexDirection: 'row', gap: 12, backgroundColor: Colors.fraudBg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.fraudBorder, padding: Spacing.lg },
  blockIcon: { fontSize: 28 },
  blockContent: { flex: 1 },
  blockTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.fraud, marginBottom: 4 },
  blockMessage: { fontSize: FontSize.sm, color: Colors.fraud, opacity: 0.8, lineHeight: 20 },
  flagItem: { flexDirection: 'row', gap: 10, borderRadius: Radius.md, borderWidth: 1, padding: 10, marginBottom: 6 },
  flagIcon: { fontSize: 16 },
  flagContent: { flex: 1 },
  flagRow: { flexDirection: 'row', justifyContent: 'space-between' },
  flagType: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, fontFamily: 'monospace' },
  flagScore: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, fontFamily: 'monospace' },
  flagDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, lineHeight: 16 },
})
