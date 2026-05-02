import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
  StatusBar, ActivityIndicator,
} from 'react-native'
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '../../theme'
import { useAuthStore } from '../../store/authStore'

export const LoginScreen = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { login } = useAuthStore()

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }
    if (mode === 'register' && !name.trim()) {
      Alert.alert('Error', 'Please enter your name')
      return
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email.trim().toLowerCase(), password)
      } else {
        const { authAPI } = require('../../api/services')
        await authAPI.register(name.trim(), email.trim().toLowerCase(), password)
        Alert.alert('Success', 'Account created! Please login.', [
          { text: 'OK', onPress: () => { setMode('login'); setName(''); setPassword('') } }
        ])
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Something went wrong. Check your connection.'
      Alert.alert('Failed', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Background decoration */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Text style={styles.logoLetter}>A</Text>
            </View>
            <Text style={styles.appName}>AttendGuard</Text>
            <Text style={styles.tagline}>Fraud-Proof Attendance System</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Mode toggle */}
            <View style={styles.toggle}>
              {(['login', 'register'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
                  onPress={() => { setMode(m); setPassword('') }}
                >
                  <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                    {m === 'login' ? 'Sign In' : 'Register'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Fields */}
            {mode === 'register' && (
              <View style={styles.field}>
                <Text style={styles.label}>FULL NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="you@company.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁' : '🙈'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.bg} />
              ) : (
                <Text style={styles.submitText}>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Demo credentials */}
            {mode === 'login' && (
              <View style={styles.demo}>
                <Text style={styles.demoLabel}>Demo credentials:</Text>
                <TouchableOpacity onPress={() => { setEmail('admin@company.com'); setPassword('admin123') }}>
                  <Text style={styles.demoCredential}>admin@company.com / admin123</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setEmail('employee@company.com'); setPassword('admin123') }}>
                  <Text style={styles.demoCredential}>employee@company.com / admin123</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
  bgCircle1: {
    position: 'absolute', top: -100, right: -100,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(6,182,212,0.05)',
  },
  bgCircle2: {
    position: 'absolute', bottom: -100, left: -100,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(99,102,241,0.05)',
  },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, ...Shadow.cyan,
  },
  logoLetter: { fontSize: 30, fontWeight: FontWeight.bold, color: Colors.bg },
  appName: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, letterSpacing: -0.5 },
  tagline: { fontSize: FontSize.sm, color: Colors.textMuted, fontFamily: 'monospace', marginTop: 4 },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: 20, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.xl,
  },
  toggle: { flexDirection: 'row', backgroundColor: Colors.bgElevated, borderRadius: Radius.md, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.sm, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: Colors.bgCard },
  toggleText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textMuted },
  toggleTextActive: { color: Colors.textPrimary, fontWeight: FontWeight.semibold },
  field: { marginBottom: 16 },
  label: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.lg, height: 50,
    color: Colors.textPrimary, fontSize: FontSize.md,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1 },
  eyeBtn: { position: 'absolute', right: 14, padding: 4 },
  eyeIcon: { fontSize: 18 },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    height: 52, alignItems: 'center', justifyContent: 'center',
    marginTop: 8, ...Shadow.cyan,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.bg },
  demo: {
    marginTop: 20, padding: Spacing.md, backgroundColor: Colors.bgElevated,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  demoLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace', marginBottom: 6 },
  demoCredential: { fontSize: FontSize.xs, color: Colors.primary, fontFamily: 'monospace', paddingVertical: 2 },
})
