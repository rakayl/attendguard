import React, { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { changeMyPassword, getMe, updateMyProfile } from '../api/services'
import { useAuthStore } from '../store/authStore'
import { colors } from '../theme/colors'

const ProfileScreen = () => {
  const { user, updateUser, logout } = useAuthStore()
  const [name, setName] = useState(user?.name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Invalid name', 'Name is required.')
      return
    }

    try {
      setSavingProfile(true)
      await updateMyProfile({ name: name.trim() })
      const freshUser = await getMe()
      updateUser(freshUser)
      Alert.alert('Success', 'Profile updated successfully.')
    } catch (error: any) {
      Alert.alert('Update failed', error.response?.data?.error || 'Unable to update your profile right now.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Incomplete form', 'Please fill in all password fields.')
      return
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Password mismatch', 'New password confirmation does not match.')
      return
    }

    try {
      setSavingPassword(true)
      await changeMyPassword({ current_password: currentPassword, new_password: newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      Alert.alert('Success', 'Password updated successfully.')
    } catch (error: any) {
      Alert.alert('Password update failed', error.response?.data?.error || 'Unable to update password.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <Text style={styles.label}>Full name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={user?.email || ''}
          editable={false}
          style={[styles.input, styles.inputDisabled]}
        />
        <Pressable style={[styles.button, savingProfile && styles.buttonDisabled]} onPress={handleSaveProfile} disabled={savingProfile}>
          <Text style={styles.buttonText}>{savingProfile ? 'Saving...' : 'Save Profile'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Password</Text>
        <Text style={styles.label}>Current password</Text>
        <TextInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          placeholder="Current password"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Text style={styles.label}>New password</Text>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="New password"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Text style={styles.label}>Confirm new password</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="Confirm new password"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Pressable style={[styles.button, savingPassword && styles.buttonDisabled]} onPress={handleChangePassword} disabled={savingPassword}>
          <Text style={styles.buttonText}>{savingPassword ? 'Updating...' : 'Change Password'}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
  },
  inputDisabled: {
    opacity: 0.7,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    marginTop: 18,
    paddingVertical: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#082f49',
    fontWeight: '800',
    fontSize: 15,
  },
  logoutButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#7f1d1d',
    backgroundColor: 'rgba(127, 29, 29, 0.18)',
    paddingVertical: 14,
  },
  logoutText: {
    color: '#fca5a5',
    fontWeight: '700',
  },
})

export default ProfileScreen
