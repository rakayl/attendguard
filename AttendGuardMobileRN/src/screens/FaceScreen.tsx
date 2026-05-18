import React, { useCallback, useState } from 'react'
import { Alert, StyleSheet, Text } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { enrollMyFace, getMyFaceProfiles, verifyMyFace } from '../api/services'
import Screen, { Card, EmptyState } from '../components/Screen'
import { PrimaryButton, SecondaryButton } from '../components/Form'
import { colors } from '../theme/colors'
import { pickFaceImage } from '../utils/media'

const FaceScreen = () => {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setProfiles(await getMyFaceProfiles())
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  const handleFaceAction = async (action: 'enroll' | 'verify') => {
    try {
      const image = await pickFaceImage()
      if (!image) return
      const result = action === 'enroll' ? await enrollMyFace(image) : await verifyMyFace(image)
      Alert.alert('Face recognition', result.message || 'Face action completed.')
      load()
    } catch (error: any) {
      Alert.alert('Face recognition failed', error.response?.data?.error || error.message || 'Unable to process face image.')
    }
  }

  return (
    <Screen title="Face Recognition" subtitle="Enroll and verify your face profile using the same AI validation as the web app." refreshing={loading} onRefresh={load}>
      <Card>
        <Text style={styles.title}>Face actions</Text>
        <PrimaryButton label="Enroll Face" onPress={() => handleFaceAction('enroll')} />
        <SecondaryButton label="Verify Face" onPress={() => handleFaceAction('verify')} />
      </Card>
      {profiles.length === 0 ? (
        <EmptyState title="No face profile" message="Enroll your first profile to enable face verification during attendance." />
      ) : (
        profiles.map((profile) => (
          <Card key={profile.id}>
            <Text style={styles.title}>Profile #{profile.id}</Text>
            <Text style={styles.text}>Quality: {Math.round((profile.quality_score || 0) * 100)}%</Text>
            <Text style={styles.meta}>{profile.is_active ? 'Active' : 'Inactive'}</Text>
          </Card>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  text: { color: colors.textMuted, fontSize: 14, marginTop: 6 },
  meta: { color: colors.primary, fontSize: 12, marginTop: 8, textTransform: 'uppercase' },
})

export default FaceScreen
