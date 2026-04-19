import React, { useEffect, useState } from 'react'
import { useRbacStore } from '../store/rbacStore'
import { useAuthStore } from '../store/authStore'

const MODULE_COLORS = {
  attendance: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  user: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  role: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  permission: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  device: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  admin: 'text-red-400 bg-red-500/10 border-red-500/20',
}
const mc = (m) => MODULE_COLORS[m] || 'text-slate-400 bg-slate-800 border-slate-700'

const avatarColor = (name) => {
  const colors = [
    'from-cyan-400 to-cyan-600', 'from-indigo-400 to-indigo-600',
    'from-purple-400 to-purple-600', 'from-emerald-400 to-emerald-600',
    'from-amber-400 to-amber-600', 'from-rose-400 to-rose-600',
  ]
  const idx = (name?.charCodeAt(0) || 0) % colors.length
  return colors[idx]
}

// ── User Form Modal ─────────────────────────────────────────────────────────
const UserModal = ({ user, roles, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role_id: user?.role_id || user?.role?.id || '',
    is_active: user?.is_active ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!user

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role_id: form.role_id ? Number(form.role_id) : null,
        is_active: form.is_active,
      }
      if (!isEdit || form.password) payload.password = form.password
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div>
            <h2 className="font-display font-bold text-white">{isEdit ? 'Edit User' : 'New User'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{isEdit ? 'Update account info and role' : 'Create a new user account'}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Full Name *</label>
            <input className="input-field" placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Email *</label>
            <input type="email" className="input-field" placeholder="john@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">
              Password {isEdit && <span className="normal-case text-slate-600">(leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              className="input-field"
              placeholder={isEdit ? '••••••••' : 'Min. 6 characters'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!isEdit}
              minLength={!isEdit ? 6 : undefined}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Role</label>
            <select
              className="input-field"
              value={form.role_id}
              onChange={(e) => setForm({ ...form, role_id: e.target.value })}
            >
              <option value="">— No Role —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.display_name} ({r.name})</option>
              ))}
            </select>
          </div>
          {isEdit && (
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="text-sm text-slate-300 font-medium">Account Active</div>
                <div className="text-xs text-slate-600">Inactive users cannot log in</div>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 ${form.is_active ? 'bg-cyan-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${form.is_active ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── User Detail Panel ───────────────────────────────────────────────────────
const UserDetailPanel = ({ user, roles, onClose, onEdit, onDelete, onToggleStatus }) => {
  const perms = user?.role?.permissions || []
  const grouped = perms.reduce((acc, p) => {
    acc[p.module] = acc[p.module] || []
    acc[p.module].push(p)
    return acc
  }, {})

  return (
    <div className="w-80 flex-shrink-0 sticky top-8 space-y-4 animate-slide-up">
      <div className="card p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">User Detail</span>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400 text-lg leading-none">×</button>
        </div>

        {/* Avatar + name */}
        <div className="flex flex-col items-center py-3">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarColor(user.name)} flex items-center justify-center text-white text-2xl font-display font-bold mb-3`}>
            {user.name?.[0]?.toUpperCase()}
          </div>
          <div className="text-center">
            <div className="font-semibold text-slate-100">{user.name}</div>
            <div className="text-xs text-slate-500 font-mono">{user.email}</div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {user.role ? (
              <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                {user.role.display_name}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-mono text-slate-500 bg-slate-800 border border-slate-700">No Role</span>
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border ${user.is_active ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}`}>
              {user.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-2 text-xs font-mono border-t border-slate-800 pt-3">
          {[
            ['User ID', `#${user.id}`],
            ['Role', user.role?.name || '—'],
            ['Permissions', `${perms.length} total`],
            ['Joined', new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-slate-500">{k}</span>
              <span className="text-slate-300">{v}</span>
            </div>
          ))}
        </div>

        {/* Permissions breakdown */}
        {perms.length > 0 && (
          <div className="border-t border-slate-800 pt-3 space-y-2">
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Effective Permissions</div>
            {Object.entries(grouped).map(([mod, modPerms]) => (
              <div key={mod}>
                <div className={`text-[10px] font-mono font-bold uppercase mb-1 ${mc(mod).split(' ')[0]}`}>{mod}</div>
                <div className="flex flex-wrap gap-1">
                  {modPerms.map((p) => (
                    <span key={p.id} className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${mc(mod)}`}>
                      {p.display_name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1 border-t border-slate-800">
          <button onClick={() => onEdit(user)} className="btn-secondary text-sm py-2">Edit User</button>
          <button
            onClick={() => onToggleStatus(user)}
            className={`text-sm py-2 px-4 rounded-xl font-medium transition-all border ${
              user.is_active
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {user.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={() => onDelete(user)} className="btn-danger text-sm py-2">Delete User</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────
const UsersManagementPage = () => {
  const { users, roles, fetchUsers, fetchRoles, createUser, updateUser, deleteUser } = useRbacStore()
  const { user: me } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchUsers(), fetchRoles()]).finally(() => setLoading(false))
  }, [])

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'ALL' || (roleFilter === 'NONE' ? !u.role : u.role?.name === roleFilter)
    return matchSearch && matchRole
  })

  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    inactive: users.filter((u) => !u.is_active).length,
    noRole: users.filter((u) => !u.role).length,
  }

  const handleSave = async (payload) => {
    if (modal === 'create') {
      await createUser(payload)
    } else {
      await updateUser(modal.id, payload)
      if (selected?.id === modal.id) {
        const updated = users.find((u) => u.id === modal.id)
        setSelected(updated || null)
      }
    }
  }

  const handleDelete = async (user) => {
    await deleteUser(user.id)
    if (selected?.id === user.id) setSelected(null)
    setConfirmDelete(null)
  }

  const handleToggleStatus = async (user) => {
    await updateUser(user.id, { is_active: !user.is_active })
    const refreshed = users.find((u) => u.id === user.id)
    setSelected(refreshed || null)
  }

  return (
    <div className="p-6 lg:p-8 animate-slide-up">
      {modal && (
        <UserModal
          user={modal === 'create' ? null : modal}
          roles={roles}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6 animate-slide-up">
            <h3 className="font-display font-bold text-white mb-2">Delete User?</h3>
            <p className="text-slate-400 text-sm mb-1">
              <span className="text-red-400 font-semibold">{confirmDelete.name}</span> will be permanently removed.
            </p>
            <p className="text-slate-500 text-xs mb-5">All their attendance records will remain in the system.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">{users.length} total accounts</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary text-sm">+ New User</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', val: stats.total, color: 'text-cyan-400' },
          { label: 'Active', val: stats.active, color: 'text-emerald-400' },
          { label: 'Inactive', val: stats.inactive, color: 'text-red-400' },
          { label: 'No Role', val: stats.noRole, color: 'text-amber-400' },
        ].map(({ label, val, color }) => (
          <div key={label} className="card p-4 text-center">
            <div className={`text-2xl font-display font-bold ${color}`}>{val}</div>
            <div className="text-xs text-slate-500 font-mono mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Left: list */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="input-field flex-1"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="input-field w-48 flex-shrink-0"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">All Roles</option>
              <option value="NONE">No Role</option>
              {roles.map((r) => <option key={r.id} value={r.name}>{r.display_name}</option>)}
            </select>
          </div>

          {/* User cards */}
          {loading ? (
            <div className="card p-16 flex justify-center">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-3xl mb-3">👤</div>
              <p className="text-slate-500 text-sm">No users found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((u) => (
                <div
                  key={u.id}
                  onClick={() => setSelected(selected?.id === u.id ? null : u)}
                  className={`card p-4 cursor-pointer transition-all hover:border-slate-700 ${selected?.id === u.id ? 'border-cyan-500/40 bg-cyan-500/5' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarColor(u.name)} flex items-center justify-center text-white font-display font-bold flex-shrink-0`}>
                      {u.name?.[0]?.toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200 text-sm">{u.name}</span>
                        {u.id === me?.id && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">YOU</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-mono truncate">{u.email}</div>
                    </div>

                    {/* Role + status */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {u.role ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {u.role.display_name}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800 text-slate-500 border border-slate-700">
                          No Role
                        </span>
                      )}
                      <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} title={u.is_active ? 'Active' : 'Inactive'} />
                    </div>
                  </div>

                  {/* Permission count */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {(u.role?.permissions || []).slice(0, 6).map((p) => (
                      <span key={p.id} className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${mc(p.module)}`}>
                        {p.name.split(':')[1]}
                      </span>
                    ))}
                    {(u.role?.permissions?.length || 0) > 6 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono border border-slate-700 text-slate-500">
                        +{u.role.permissions.length - 6} more
                      </span>
                    )}
                    {!u.role && (
                      <span className="text-[10px] text-slate-600 font-mono">No permissions</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        {selected && (
          <UserDetailPanel
            user={selected}
            roles={roles}
            onClose={() => setSelected(null)}
            onEdit={(u) => { setModal(u); }}
            onDelete={(u) => setConfirmDelete(u)}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </div>
    </div>
  )
}

export default UsersManagementPage
