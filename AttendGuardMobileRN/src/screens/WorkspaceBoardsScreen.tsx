import React, { useCallback, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { createBoard, getWorkspaceBoards } from '../api/services'
import { Field, PrimaryButton } from '../components/Form'
import Screen, { Card, EmptyState } from '../components/Screen'
import { colors } from '../theme/colors'

const WorkspaceBoardsScreen = ({ route, navigation }: any) => {
  const { workspaceId, workspaceName } = route.params
  const [boards, setBoards] = useState<any[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setBoards(await getWorkspaceBoards(workspaceId))
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, [workspaceId]))

  const handleCreateBoard = async () => {
    if (!name.trim()) return
    try {
      await createBoard(workspaceId, { name: name.trim(), visibility: 'private' })
      setName('')
      load()
    } catch (error: any) {
      Alert.alert('Failed', error.response?.data?.error || 'Unable to create board.')
    }
  }

  return (
    <Screen title={workspaceName || 'Boards'} subtitle="Boards are only opened through Team -> Workspace." refreshing={loading} onRefresh={load}>
      <Card>
        <Text style={styles.title}>Create board</Text>
        <Field label="Board name" value={name} onChangeText={setName} />
        <PrimaryButton label="Create Board" onPress={handleCreateBoard} />
      </Card>
      {boards.length === 0 ? (
        <EmptyState title="No boards yet" message="Create a board in this workspace to start managing cards." />
      ) : (
        boards.map((board) => (
          <Pressable key={board.id} style={styles.board} onPress={() => navigation.navigate('BoardDetail', { boardId: board.id, boardName: board.name })}>
            <Text style={styles.title}>{board.name}</Text>
            <Text style={styles.text}>{board.visibility || 'private'}</Text>
          </Pressable>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  board: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, padding: 16 },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  text: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
})

export default WorkspaceBoardsScreen
