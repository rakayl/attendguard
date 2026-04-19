import { create } from 'zustand'
import api from '../api/axios'

export const useRbacStore = create((set, get) => ({
  // ── Permissions ──────────────────────────────────────────
  permissions: [],
  permModules: [],

  fetchPermissions: async () => {
    const res = await api.get('/permissions')
    const perms = res.data.permissions || []
    const modules = [...new Set(perms.map((p) => p.module))].sort()
    set({ permissions: perms, permModules: modules })
    return perms
  },

  createPermission: async (payload) => {
    const res = await api.post('/permissions', payload)
    await get().fetchPermissions()
    return res.data.permission
  },

  updatePermission: async (id, payload) => {
    const res = await api.put(`/permissions/${id}`, payload)
    await get().fetchPermissions()
    return res.data.permission
  },

  deletePermission: async (id) => {
    await api.delete(`/permissions/${id}`)
    await get().fetchPermissions()
  },

  // ── Roles ────────────────────────────────────────────────
  roles: [],

  fetchRoles: async () => {
    const res = await api.get('/roles')
    set({ roles: res.data.roles || [] })
    return res.data.roles || []
  },

  createRole: async (payload) => {
    const res = await api.post('/roles', payload)
    await get().fetchRoles()
    return res.data.role
  },

  updateRole: async (id, payload) => {
    const res = await api.put(`/roles/${id}`, payload)
    await get().fetchRoles()
    return res.data.role
  },

  deleteRole: async (id) => {
    await api.delete(`/roles/${id}`)
    await get().fetchRoles()
  },

  setRolePermissions: async (roleId, permissionIds) => {
    const res = await api.put(`/roles/${roleId}/permissions`, { permission_ids: permissionIds })
    await get().fetchRoles()
    return res.data.role
  },

  // ── Users ────────────────────────────────────────────────
  users: [],

  fetchUsers: async () => {
    const res = await api.get('/users')
    set({ users: res.data.users || [] })
    return res.data.users || []
  },

  createUser: async (payload) => {
    const res = await api.post('/users', payload)
    await get().fetchUsers()
    return res.data.user
  },

  updateUser: async (id, payload) => {
    const res = await api.put(`/users/${id}`, payload)
    await get().fetchUsers()
    return res.data.user
  },

  deleteUser: async (id) => {
    await api.delete(`/users/${id}`)
    await get().fetchUsers()
  },

  assignRole: async (userId, roleId) => {
    const res = await api.patch(`/users/${userId}/role`, { role_id: roleId })
    await get().fetchUsers()
    return res.data.user
  },
}))
