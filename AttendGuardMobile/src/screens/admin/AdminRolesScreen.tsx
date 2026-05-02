import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, Alert, RefreshControl, StatusBar, TextInput,
} from 'react-native'
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../theme'
import { rolesAPI, permissionsAPI } from '../../api/services'
import { Card, Button, EmptyState } from '../../components/UI'

const MODULE_COLORS: Record<string, string> = {
  attendance: Colors.primary,
  user: '#8b5cf6',
  role: '#6366f1',
  permission: Colors.suspicious,
  device: Colors.safe,
  admin: Colors.fraud,
  geofence: '#14b8a6',
}

// ── Role Form Modal ───────────────────────────────────────────────────────────
const RoleModal = ({
  role, allPermissions, visible, onClose, onSaved,
}: {
  role: any | null; allPermissions: any[]; visible: boolean; onClose: () => void; onSaved: () => void
}) => {
  const isEdit = !!role
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPerms, setSelectedPerms] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (role) {
      setName(role.name)
      setDisplayName(role.display_name)
      setDescription(role.description || '')
      setSelectedPerms(new Set((role.permissions || []).map((p: any) => p.id)))
    } else {
      setName(''); setDisplayName(''); setDescription(''); setSelectedPerms(new Set())
    }
  }, [role])

  const togglePerm = (id: number) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleModule = (perms: any[]) => {
    const ids = perms.map((p) => p.id)
    const allChecked = ids.every((id) => selectedPerms.has(id))
    setSelectedPerms((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => allChecked ? next.delete(id) : next.add(id))
      return next
    })
  }

  const grouped = allPermissions.reduce((acc: Record<string, any[]>, p) => {
    acc[p.module] = acc[p.module] || []
    acc[p.module].push(p)
    return acc
  }, {})

  const handleSubmit = async () => {
    if (!displayName.trim()) { Alert.alert('Error', 'Display name is required'); return }
    if (!isEdit && !name.trim()) { Alert.alert('Error', 'Role key is required'); return }
    setLoading(true)
    try {
      const payload = {
        name: name.toLowerCase().replace(/\s+/g, '_'),
        display_name: displayName,
        description,
        permission_ids: [...selectedPerms],
      }
      if (isEdit) await rolesAPI.update(role.id, payload)
      else await rolesAPI.create(payload)
      onSaved(); onClose()
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed')
    } finally { setLoading(false) }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{isEdit ? 'Edit Role' : 'New Role'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Fields */}
          {!isEdit && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>ROLE KEY (e.g. supervisor)</Text>
              <TextInput style={styles.input} placeholder="supervisor" placeholderTextColor={Colors.textMuted}
                value={name} onChangeText={(v) => setName(v.toLowerCase().replace(/\s+/g, '_'))} autoCapitalize="none" />
            </View>
          )}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
            <TextInput style={styles.input} placeholder="Supervisor" placeholderTextColor={Colors.textMuted}
              value={displayName} onChangeText={setDisplayName} />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>DESCRIPTION</Text>
            <TextInput style={[styles.input, { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
              placeholder="What this role can do..." placeholderTextColor={Colors.textMuted}
              value={description} onChangeText={setDescription} multiline />
          </View>

          {/* Permission matrix */}
          <Text style={styles.permHeader}>
            PERMISSIONS — {selectedPerms.size} selected
          </Text>
          {Object.entries(grouped).map(([module, perms]) => {
            const color = MODULE_COLORS[module] || Colors.textMuted
            const allChecked = (perms as any[]).every((p) => selectedPerms.has(p.id))
            const someChecked = (perms as any[]).some((p) => selectedPerms.has(p.id))
            return (
              <View key={module} style={[styles.moduleCard, { borderColor: color + '40' }]}>
                <TouchableOpacity style={styles.moduleHeader} onPress={() => toggleModule(perms as any[])}>
                  <View style={[styles.checkbox, allChecked && { backgroundColor: color, borderColor: color },
                    someChecked && !allChecked && { borderColor: color }]}>
                    {allChecked && <Text style={styles.checkmark}>✓</Text>}
                    {someChecked && !allChecked && <View style={[styles.indeterminate, { backgroundColor: color }]} />}
                  </View>
                  <Text style={[styles.moduleTitle, { color }]}>{module.toUpperCase()}</Text>
                  <Text style={[styles.moduleCount, { color }]}>
                    {(perms as any[]).filter((p) => selectedPerms.has(p.id)).length}/{(perms as any[]).length}
                  </Text>
                </TouchableOpacity>
                {(perms as any[]).map((p: any) => (
                  <TouchableOpacity key={p.id} style={styles.permRow} onPress={() => togglePerm(p.id)}>
                    <View style={[styles.checkbox, styles.checkboxSm,
                      selectedPerms.has(p.id) && { backgroundColor: color, borderColor: color }]}>
                      {selectedPerms.has(p.id) && <Text style={styles.checkmarkSm}>✓</Text>}
                    </View>
                    <Text style={styles.permName}>{p.display_name}</Text>
                    <Text style={styles.permCode}>{p.name.split(':')[1]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )
          })}

          <Button title={isEdit ? 'Save Changes' : 'Create Role'} onPress={handleSubmit}
            loading={loading} style={{ marginTop: 8 }} />
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export const AdminRolesScreen = () => {
  const [roles, setRoles] = useState<any[]>([])
  const [permissions, setPermissions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editRole, setEditRole] = useState<any | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [rr, pr] = await Promise.all([rolesAPI.list(), permissionsAPI.list()])
      setRoles(rr.data.roles || [])
      setPermissions(pr.data.permissions || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])
  const onRefresh = async () => { setRefreshing(true); await fetchAll(); setRefreshing(false) }

  const openNew = () => { setEditRole(null); setShowModal(true) }
  const openEdit = (r: any) => { setEditRole(r); setShowModal(true) }

  const handleDelete = (r: any) => {
    if (r.is_system) { Alert.alert('Cannot Delete', 'System roles cannot be deleted'); return }
    Alert.alert('Delete Role', `Delete "${r.display_name}"?\nUsers with this role will lose all permissions.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await rolesAPI.delete(r.id); fetchAll() }
        catch (err: any) { Alert.alert('Error', err.response?.data?.error || 'Failed') }
      }},
    ])
  }

  const renderRole = ({ item }: { item: any }) => {
    const isExpanded = expandedId === item.id
    const perms = item.permissions || []
    const grouped = perms.reduce((acc: Record<string, any[]>, p: any) => {
      acc[p.module] = acc[p.module] || []; acc[p.module].push(p); return acc
    }, {})

    return (
      <Card style={styles.roleCard}>
        <View style={styles.roleHeader}>
          <View style={[styles.roleAvatar, {
            backgroundColor: item.is_system ? Colors.suspicious + '20' : Colors.primaryBg,
            borderColor: item.is_system ? Colors.suspicious + '50' : Colors.primary + '50',
          }]}>
            <Text style={[styles.roleAvatarText, { color: item.is_system ? Colors.suspicious : Colors.primary }]}>
              {item.display_name?.[0]}
            </Text>
          </View>
          <View style={styles.roleInfo}>
            <View style={styles.roleTitleRow}>
              <Text style={styles.roleDisplayName}>{item.display_name}</Text>
              {item.is_system && (
                <View style={styles.systemBadge}><Text style={styles.systemBadgeText}>SYSTEM</Text></View>
              )}
            </View>
            <Text style={styles.roleKey}>{item.name}</Text>
            {item.description ? <Text style={styles.roleDesc}>{item.description}</Text> : null}
          </View>
        </View>

        {/* Module pills */}
        <View style={styles.modulePills}>
          {Object.entries(grouped).map(([mod, modPerms]) => (
            <View key={mod} style={[styles.modulePill, { borderColor: (MODULE_COLORS[mod] || '#888') + '50', backgroundColor: (MODULE_COLORS[mod] || '#888') + '15' }]}>
              <Text style={[styles.modulePillText, { color: MODULE_COLORS[mod] || '#888' }]}>
                {mod} ×{(modPerms as any[]).length}
              </Text>
            </View>
          ))}
          {perms.length === 0 && <Text style={styles.noPerms}>No permissions</Text>}
        </View>

        {/* Expanded permissions */}
        {isExpanded && (
          <View style={styles.expandedPerms}>
            {Object.entries(grouped).map(([mod, modPerms]) => (
              <View key={mod} style={styles.expandedModule}>
                <Text style={[styles.expandedModuleTitle, { color: MODULE_COLORS[mod] || Colors.textMuted }]}>
                  {mod}
                </Text>
                <View style={styles.expandedPermsList}>
                  {(modPerms as any[]).map((p: any) => (
                    <View key={p.id} style={[styles.expandedPermChip, {
                      backgroundColor: (MODULE_COLORS[mod] || '#888') + '15',
                      borderColor: (MODULE_COLORS[mod] || '#888') + '40',
                    }]}>
                      <Text style={[styles.expandedPermText, { color: MODULE_COLORS[mod] || Colors.textMuted }]}>
                        {p.display_name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.roleActions}>
          <TouchableOpacity
            style={styles.expandBtn}
            onPress={() => setExpandedId(isExpanded ? null : item.id)}
          >
            <Text style={styles.expandBtnText}>
              {isExpanded ? '▲ Hide' : `▾ ${perms.length} perms`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
            <Text style={styles.editBtnText}>{item.is_system ? 'Edit Perms' : 'Edit'}</Text>
          </TouchableOpacity>
          {!item.is_system && (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Roles</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addBtnText}>+ New Role</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={roles}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRole}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading ? <EmptyState icon="🔑" title="No Roles" subtitle="Create your first role" /> : null}
      />
      <RoleModal
        role={editRole}
        allPermissions={permissions}
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSaved={fetchAll}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  screenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: 20, paddingBottom: Spacing.lg, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  screenTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  addBtn: { backgroundColor: Colors.primaryBg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primary + '50', paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  list: { padding: Spacing.xl, gap: 12, paddingBottom: 40 },
  roleCard: { gap: 10 },
  roleHeader: { flexDirection: 'row', gap: 12 },
  roleAvatar: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  roleAvatarText: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  roleInfo: { flex: 1 },
  roleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleDisplayName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  systemBadge: { backgroundColor: Colors.suspicious + '20', borderRadius: 4, borderWidth: 1, borderColor: Colors.suspicious + '40', paddingHorizontal: 6, paddingVertical: 1 },
  systemBadgeText: { fontSize: 9, color: Colors.suspicious, fontFamily: 'monospace', fontWeight: FontWeight.bold },
  roleKey: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  roleDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4, lineHeight: 16 },
  modulePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modulePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm, borderWidth: 1 },
  modulePillText: { fontSize: 10, fontFamily: 'monospace', fontWeight: FontWeight.semibold },
  noPerms: { fontSize: FontSize.xs, color: Colors.textMuted },
  expandedPerms: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, gap: 8 },
  expandedModule: {},
  expandedModuleTitle: { fontSize: 10, fontFamily: 'monospace', fontWeight: FontWeight.bold, textTransform: 'uppercase', marginBottom: 6 },
  expandedPermsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  expandedPermChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm, borderWidth: 1 },
  expandedPermText: { fontSize: 10, fontFamily: 'monospace' },
  roleActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  expandBtn: { flex: 1, height: 32, backgroundColor: Colors.bgElevated, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  expandBtnText: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace' },
  editBtn: { paddingHorizontal: 14, height: 32, backgroundColor: Colors.primaryBg, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.primary + '40' },
  editBtnText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },
  deleteBtn: { paddingHorizontal: 14, height: 32, backgroundColor: Colors.fraudBg, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.fraudBorder },
  deleteBtnText: { fontSize: FontSize.xs, color: Colors.fraud, fontWeight: FontWeight.semibold },
  // Modal
  modal: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: 20, paddingBottom: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  closeBtn: { width: 32, height: 32, backgroundColor: Colors.bgElevated, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: Colors.textSecondary, fontSize: FontSize.md },
  modalContent: { padding: Spacing.xl, paddingBottom: 40, gap: 4 },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, height: 48, color: Colors.textPrimary, fontSize: FontSize.md },
  permHeader: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  moduleCard: { borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden', marginBottom: 8 },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: Colors.bgElevated },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkmark: { fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold },
  checkboxSm: { width: 16, height: 16, borderRadius: 3 },
  checkmarkSm: { fontSize: 9, color: Colors.white, fontWeight: FontWeight.bold },
  indeterminate: { width: 8, height: 2, borderRadius: 1 },
  moduleTitle: { flex: 1, fontSize: FontSize.xs, fontFamily: 'monospace', fontWeight: FontWeight.bold, textTransform: 'uppercase' },
  moduleCount: { fontSize: 10, fontFamily: 'monospace' },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border + '60' },
  permName: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  permCode: { fontSize: 10, color: Colors.textMuted, fontFamily: 'monospace' },
})
