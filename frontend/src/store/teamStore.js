import { create } from 'zustand'
import {
  createTeam,
  createTeamWorkspace,
  deleteTeam,
  getTeam,
  getTeams,
  inviteTeamMember,
  removeTeamMember,
  updateTeam,
  updateTeamMemberRole,
} from '../api/services'

const normalizeError = (err, fallback) =>
  err?.response?.data?.error || err?.response?.data?.message || err?.message || fallback

export const useTeamStore = create((set, get) => ({
  teams: [],
  selectedTeam: null,
  loading: false,
  saving: false,
  error: '',

  fetchTeams: async () => {
    set({ loading: true, error: '' })
    try {
      const res = await getTeams()
      const teams = res.data?.data?.teams || []
      set({ teams, loading: false })
      if (!get().selectedTeam && teams[0]?.id) {
        await get().fetchTeam(teams[0].id)
      }
    } catch (err) {
      set({ loading: false, error: normalizeError(err, 'Failed to load teams') })
      throw err
    }
  },

  fetchTeam: async (id) => {
    if (!id) return
    set({ loading: true, error: '' })
    try {
      const res = await getTeam(id)
      set({ selectedTeam: res.data?.data, loading: false })
    } catch (err) {
      set({ loading: false, error: normalizeError(err, 'Failed to load team') })
      throw err
    }
  },

  createTeam: async (payload) => {
    set({ saving: true, error: '' })
    try {
      const res = await createTeam(payload)
      set({ saving: false })
      await get().fetchTeams()
      if (res.data?.data?.id) {
        await get().fetchTeam(res.data.data.id)
      }
    } catch (err) {
      set({ saving: false, error: normalizeError(err, 'Failed to create team') })
      throw err
    }
  },

  updateTeam: async (id, payload) => {
    set({ saving: true, error: '' })
    try {
      await updateTeam(id, payload)
      set({ saving: false })
      await get().fetchTeams()
      await get().fetchTeam(id)
    } catch (err) {
      set({ saving: false, error: normalizeError(err, 'Failed to update team') })
      throw err
    }
  },

  deleteTeam: async (id) => {
    set({ saving: true, error: '' })
    try {
      await deleteTeam(id)
      set({ selectedTeam: null, saving: false })
      await get().fetchTeams()
    } catch (err) {
      set({ saving: false, error: normalizeError(err, 'Failed to delete team') })
      throw err
    }
  },

  inviteMember: async (teamId, payload) => {
    set({ saving: true, error: '' })
    try {
      await inviteTeamMember(teamId, payload)
      set({ saving: false })
      await get().fetchTeam(teamId)
      await get().fetchTeams()
    } catch (err) {
      set({ saving: false, error: normalizeError(err, 'Failed to invite team member') })
      throw err
    }
  },

  removeMember: async (teamId, memberId) => {
    set({ saving: true, error: '' })
    try {
      await removeTeamMember(teamId, memberId)
      set({ saving: false })
      await get().fetchTeam(teamId)
      await get().fetchTeams()
    } catch (err) {
      set({ saving: false, error: normalizeError(err, 'Failed to remove team member') })
      throw err
    }
  },

  updateMemberRole: async (teamId, memberId, payload) => {
    set({ saving: true, error: '' })
    try {
      await updateTeamMemberRole(teamId, memberId, payload)
      set({ saving: false })
      await get().fetchTeam(teamId)
    } catch (err) {
      set({ saving: false, error: normalizeError(err, 'Failed to update member role') })
      throw err
    }
  },

  createWorkspace: async (teamId, payload) => {
    set({ saving: true, error: '' })
    try {
      await createTeamWorkspace(teamId, payload)
      set({ saving: false })
      await get().fetchTeam(teamId)
      await get().fetchTeams()
    } catch (err) {
      set({ saving: false, error: normalizeError(err, 'Failed to create team workspace') })
      throw err
    }
  },
}))
