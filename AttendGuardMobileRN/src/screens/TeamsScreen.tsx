import React, { useCallback, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { createTeam, createTeamWorkspace, getTeam, getTeams, getTeamWorkspaces, getWorkspaceBoards, inviteTeamMember } from '../api/services'
import { Field, PrimaryButton, SecondaryButton } from '../components/Form'
import Screen, { Card, EmptyState } from '../components/Screen'
import { colors } from '../theme/colors'

const TeamsScreen = ({ navigation }: any) => {
  const [teams, setTeams] = useState<any[]>([])
  const [selectedTeam, setSelectedTeam] = useState<any>(null)
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [boardsByWorkspace, setBoardsByWorkspace] = useState<Record<number, any[]>>({})
  const [name, setName] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const list = await getTeams()
      setTeams(list)
      if (list.length > 0) {
        await selectTeam(selectedTeam?.id || list[0].id)
      }
    } finally {
      setLoading(false)
    }
  }

  const selectTeam = async (teamId: number) => {
    const [team, workspaceList] = await Promise.all([getTeam(teamId), getTeamWorkspaces(teamId)])
    setSelectedTeam(team)
    setWorkspaces(workspaceList)
    const boardPairs = await Promise.all(workspaceList.map(async (workspace: any) => [workspace.id, await getWorkspaceBoards(workspace.id)] as const))
    setBoardsByWorkspace(Object.fromEntries(boardPairs))
  }

  useFocusEffect(useCallback(() => { load() }, []))

  const handleCreateTeam = async () => {
    if (!name.trim()) return
    try {
      await createTeam({ name: name.trim() })
      setName('')
      load()
    } catch (error: any) {
      Alert.alert('Failed', error.response?.data?.error || 'Unable to create team.')
    }
  }

  const handleInvite = async () => {
    if (!selectedTeam?.id || !inviteEmail.trim()) return
    try {
      await inviteTeamMember(selectedTeam.id, { email: inviteEmail.trim(), role: 'member' })
      setInviteEmail('')
      selectTeam(selectedTeam.id)
    } catch (error: any) {
      Alert.alert('Failed', error.response?.data?.error || 'Unable to invite member.')
    }
  }

  const handleCreateWorkspace = async () => {
    if (!selectedTeam?.id || !workspaceName.trim()) return
    try {
      await createTeamWorkspace(selectedTeam.id, { name: workspaceName.trim() })
      setWorkspaceName('')
      selectTeam(selectedTeam.id)
    } catch (error: any) {
      Alert.alert('Failed', error.response?.data?.error || 'Unable to create workspace.')
    }
  }

  return (
    <Screen title="Teams" subtitle="Follow the web flow: Team, Workspace, Board." refreshing={loading} onRefresh={load}>
      <Card>
        <Text style={styles.sectionTitle}>Create team</Text>
        <Field label="Team name" value={name} onChangeText={setName} />
        <PrimaryButton label="Create Team" onPress={handleCreateTeam} />
      </Card>

      {teams.length === 0 ? (
        <EmptyState title="No teams yet" message="Create or join a team to open workspace and board flows." />
      ) : (
        <View style={styles.selector}>
          {teams.map((team) => (
            <Pressable
              key={team.id}
              style={[styles.teamChip, selectedTeam?.id === team.id && styles.teamChipActive]}
              onPress={() => selectTeam(team.id)}
            >
              <Text style={styles.teamChipText}>{team.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {selectedTeam ? (
        <>
          <Card>
            <Text style={styles.sectionTitle}>{selectedTeam.name}</Text>
            <Text style={styles.text}>{selectedTeam.description || 'Team workspace container'}</Text>
            <Text style={styles.meta}>{selectedTeam.members?.length || selectedTeam.total_members || 0} members</Text>
            <Field label="Invite member email" value={inviteEmail} onChangeText={setInviteEmail} autoCapitalize="none" keyboardType="email-address" />
            <SecondaryButton label="Invite Member" onPress={handleInvite} />
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Create workspace</Text>
            <Field label="Workspace name" value={workspaceName} onChangeText={setWorkspaceName} />
            <PrimaryButton label="Create Workspace" onPress={handleCreateWorkspace} />
          </Card>

          {workspaces.map((workspace) => (
            <Card key={workspace.id}>
              <Text style={styles.sectionTitle}>{workspace.name}</Text>
              <Text style={styles.text}>{workspace.description || 'Workspace'}</Text>
              <SecondaryButton label="Create / Open Boards" onPress={() => navigation.navigate('WorkspaceBoards', { workspaceId: workspace.id, workspaceName: workspace.name })} />
              {(boardsByWorkspace[workspace.id] || []).map((board) => (
                <Pressable key={board.id} style={styles.boardRow} onPress={() => navigation.navigate('BoardDetail', { boardId: board.id, boardName: board.name })}>
                  <Text style={styles.boardTitle}>{board.name}</Text>
                  <Text style={styles.chevron}>{'>'}</Text>
                </Pressable>
              ))}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  text: { color: colors.textMuted, fontSize: 14, marginTop: 6 },
  meta: { color: colors.primary, fontSize: 12, marginTop: 8, textTransform: 'uppercase' },
  selector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  teamChip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  teamChipActive: { borderColor: colors.primary },
  teamChipText: { color: colors.text, fontWeight: '700' },
  boardRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', marginTop: 14, paddingTop: 14 },
  boardTitle: { color: colors.text, flex: 1, fontWeight: '700' },
  chevron: { color: colors.textMuted, fontSize: 24 },
})

export default TeamsScreen
