import React from 'react'
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native'
import { colors } from '../theme/colors'

export const Field = ({ label, ...props }: TextInputProps & { label: string }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput placeholderTextColor={colors.textMuted} style={styles.input} {...props} />
  </View>
)

export const PrimaryButton = ({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) => (
  <Pressable style={[styles.button, disabled && styles.buttonDisabled]} onPress={onPress} disabled={disabled}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>
)

export const SecondaryButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable style={styles.secondaryButton} onPress={onPress}>
    <Text style={styles.secondaryButtonText}>{label}</Text>
  </Pressable>
)

const styles = StyleSheet.create({
  field: {
    gap: 8,
    marginTop: 10,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    marginTop: 14,
    paddingVertical: 13,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#082f49',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
})
