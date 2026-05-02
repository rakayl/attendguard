import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, Alert, RefreshControl, StatusBar,
} from 'react-native'
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../theme'
import { usersAPI, rolesAPI } from '../../api/services'
import { Card, Button, EmptyState } from '../../components/UI'

const AVATAR_COLORS = ['#06b6d4','#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899']
const avatarColor = (name: string) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length]

const UserModal = ({
  user, roles, visible, onClose, onSaved,
}: {
  user: any | null; roles: any[]; visible: boolean; onClose: () => void; onSaved: () => void
}) => {
  const isEdit = !!user
  const [form, setForm] = useState({ name: '', email: '', password: '', role_id: '' as any, is_active: true })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({ name: user.name, email: user.email, password: '', role_id: user.role_id || '', is_active: user.is_active })
    } else {
      setForm({ name: '', email: '', password: '', role_id: '', is_active: true })
    }
  }, [user])

  const handleSubmit = async () => {
    if (!form.name || !form.email) { Alert.alert('Error', 'Name and email are required'); return }
    if (!isEdit && !form.password) { Alert.alert('Error', 'Password is required for new users'); return }
    setLoading(true)
    try {
      const payload: any = {
        name: form.name, email: form.email,
        role_id: form.role_id ? Number(form.role_id) : null,
        is_active: form.is_active,
      }
      if (form.password) payload.password = form.password
      if (isEdit) await usersAPI.update(user.id, payload)
      else await usersAPI.create({ ...payload, password: form.password })
      onSaved()
      onClose()
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{isEdit ? 'Edit User' : 'New User'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
          {[
            { label: 'FULL NAME', key: 'name', placeholder: 'John Doe', capitalize: 'words' as any },
            { label: 'EMAIL', key: 'email', placeholder: 'john@company.com', capitalize: 'none' as any, keyboard: 'email-address' as any },
            { label: isEdit ? 'PASSWORD (leave blank to keep)' : 'PASSWORD', key: 'password', placeholder: '••••••', secure: true },
          ].map(({ label, key, placeholder, capitalize, keyboard, secure }) => (
            <View key={key} style={styles.field}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor={Colors.textMuted}
                value={(form as any)[key]}
                onChangeText={(v) => setForm({ ...form, [key]: v })}
                autoCapitalize={capitalize || 'sentences'}
                keyboardType={keyboard || 'default'}
                secureTextEntry={secure}
              />
            </View>
          ))}

          {/* Role picker */}
          <Text style={styles.fieldLabel}>ROLE</Text>
          <View style={styles.rolePicker}>
            <TouchableOpacity
              style={[styles.roleOption, !form.role_id && styles.roleOptionActive]}
              onPress={() => setForm({ ...form, role_id: '' })}
            >
              <Text style={[styles.roleOptionText, !form.role_id && styles.roleOptionTextActive]}>
                No Role
              </Text>
            </TouchableOpacity>
            {roles.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.roleOption, form.role_id == r.id && styles.roleOptionActive]}
                onPress={() => setForm({ ...form, role_id: r.id })}
              >
                <Text style={[styles.roleOptionText, form.role_id == r.id && styles.roleOptionTextActive]}>
                  {r.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Active toggle */}
          {isEdit && (
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Account Active</Text>
              <TouchableOpacity
                style={[styles.toggle, form.is_active && styles.toggleOn]}
                onPress={() => setForm({ ...form, is_active: !form.is_active })}
              >
                <View style={[styles.toggleThumb, form.is_active && styles.toggleThumbOn]} />
              </TouchableOpacity>
            </View>
          )}

          <Button
            title={isEdit ? 'Save Changes' : 'Create User'}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />
        </ScrollView>
      </View>
    </Modal>
  )
}

export const AdminUsersScreen = () => {
  const [users, setUsers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [modalUser, setModalUser] = useState<any | null | 'new'>('new')
  const [showModal, setShowModal] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [ur, rr] = await Promise.all([usersAPI.list(), rolesAPI.list()])
      setUsers(ur.data.users || [])
      setRoles(rr.data.roles || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const onRefresh = async () => { setRefreshing(true); await fetchAll(); setRefreshing(false) }

  const openNew = () => { setModalUser(null); setShowModal(true) }
  const openEdit = (user: any) => { setModalUser(user); setShowModal(true) }

  const handleDelete = (user: any) => {
    Alert.alert('Delete User', `Delete ${user.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await usersAPI.delete(user.id); fetchAll() }
          catch (err: any) { Alert.alert('Error', err.response?.data?.error || 'Failed') }
        },
      },
    ])
  }

  const filtered = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  })

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.userCard}>
      <View style={styles.userRow}>
        <View style={[styles.avatar, { backgroundColor: avatarColor(item.name) }]}>
          <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.userMeta}>
            <View style={[styles.rolePill, { borderColor: Colors.primary + '40', backgroundColor: Colors.primaryBg }]}>
              <Text style={[styles.rolePillText, { color: Colors.primary }]}>
                {item.role?.display_name || 'No Role'}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: item.is_active ? Colors.safeBg : Colors.fraudBg }]}>
              <Text style={[styles.statusText, { color: item.is_active ? Colors.safe : Colors.fraud }]}>
                {item.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
            <Text style={styles.editText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Text style={styles.deleteText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Permission count */}
      <View style={styles.permCount}>
        <Text style={styles.permCountText}>
          {item.role?.permissions?.length || 0} permissions
          {item.role?.permissions?.length > 0 && ` • ${[...new Set(item.role.permissions.map((p: any) => p.module))].join(', ')}`}
        </Text>
      </View>
    </Card>
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>User Management</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.search}
          placeholder="Search users..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading ? <EmptyState icon="👤" title="No Users Found" /> : null}
      />

      <UserModal
        user={modalUser === 'new' ? null : modalUser}
        roles={roles}
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSaved={fetchAll}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.lg, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  addBtn: { backgroundColor: Colors.primaryBg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primary + '50', paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  searchContainer: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.bgCard },
  search: { backgroundColor: Colors.bgElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, height: 40, color: Colors.textPrimary, fontSize: FontSize.sm },
  list: { padding: Spacing.xl, gap: 10, paddingBottom: 32 },
  userCard: { padding: Spacing.md, gap: 8 },
  userRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
  userInfo: { flex: 1 },
  userName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  userEmail: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  userMeta: { flexDirection: 'row', gap: 6, marginTop: 6 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  rolePillText: { fontSize: 10, fontWeight: FontWeight.semibold },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  statusText: { fontSize: 10, fontWeight: FontWeight.semibold },
  actions: { flexDirection: 'row', gap: 4 },
  editBtn: { width: 34, height: 34, backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  editText: { fontSize: 16 },
  deleteBtn: { width: 34, height: 34, backgroundColor: Colors.fraudBg, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontSize: 16 },
  permCount: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 },
  permCountText: { fontSize: 10, color: Colors.textMuted, fontFamily: 'monospace' },
  // Modal
  modal: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: 20, paddingBottom: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  closeBtn: { width: 32, height: 32, backgroundColor: Colors.bgElevated, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: Colors.textSecondary, fontSize: FontSize.md },
  modalScroll: { flex: 1 },
  modalContent: { padding: Spacing.xl, gap: 4, paddingBottom: 40 },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, height: 48, color: Colors.textPrimary, fontSize: FontSize.md },
  rolePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  roleOption: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgElevated },
  roleOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  roleOptionText: { fontSize: FontSize.sm, color: Colors.textMuted },
  roleOptionTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: 16 },
  toggleLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: Colors.bgElevated, justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn: { backgroundColor: Colors.primary },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.white },
  toggleThumbOn: { alignSelf: 'flex-end' },
  submitBtn: { marginTop: 8 },
})
