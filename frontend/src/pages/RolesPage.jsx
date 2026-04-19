import React, { useEffect, useState } from 'react'
import { useRbacStore } from '../store/rbacStore'

const MODULE_COLORS = {
  attendance: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', check: 'accent-cyan-500' },
  user: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', check: 'accent-purple-500' },
  role: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', check: 'accent-indigo-500' },
  permission: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', check: 'accent-amber-500' },
  device: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', check: 'accent-emerald-500' },
  admin: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', check: 'accent-red-500' },
}

const mc = (m) => MODULE_COLORS[m] || { bg: 'bg-slate-800', border: 'border-slate-700', text: 'text-slate-400', check: 'accent-slate-500' }

// ── Role Form Modal ─────────────────────────────────────────────────────────
const RoleModal = ({ role, allPermissions, onClose, onSave }) => {
  const grouped = allPermissions.reduce((acc, p) => {
    acc[p.module] = acc[p.module] || []
    acc[p.module].push(p)
    return acc
  }, {})

  const initialSelected = new Set((role?.permissions || []).map((p) => p.id))
  const [form, setForm] = useState({
    name: role?.name || '',
    display_name: role?.display_name || '',
    description: role?.description || '',
  })
  const [selected, setSelected] = useState(initialSelected)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleModule = (perms) => {
    const ids = perms.map((p) => p.id)
    const allChecked = ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => (allChecked ? next.delete(id) : next.add(id)))
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSave({ ...form, permission_ids: [...selected] })
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="card w-full max-w-2xl my-4 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div>
            <h2 className="font-display font-bold text-white">{role ? 'Edit Role' : 'Create Role'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Configure role details and assign permissions</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 border-b border-slate-800">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Role Key *</label>
                <input
                  className="input-field font-mono text-sm"
                  placeholder="e.g. supervisor"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  required
                  disabled={!!role}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Display Name *</label>
                <input
                  className="input-field"
                  placeholder="e.g. Supervisor"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Description</label>
              <textarea
                className="input-field resize-none"
                rows={2}
                placeholder="What this role can do..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>

          {/* Permission matrix */}
          <div className="px-6 py-5 space-y-4 max-h-80 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">Permissions</span>
              <span className="text-xs text-slate-600 font-mono">{selected.size} selected</span>
            </div>

            {Object.entries(grouped).map(([module, perms]) => {
              const color = mc(module)
              const allChecked = perms.every((p) => selected.has(p.id))
              const someChecked = perms.some((p) => selected.has(p.id))
              return (
                <div key={module} className={`rounded-xl border ${color.border} ${color.bg} overflow-hidden`}>
                  {/* Module header */}
                  <div
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => toggleModule(perms)}
                  >
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
                      onChange={() => toggleModule(perms)}
                      className={`w-4 h-4 rounded ${color.check}`}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className={`text-xs font-mono font-bold uppercase ${color.text}`}>{module}</span>
                    <span className="text-[10px] text-slate-600 font-mono ml-auto">
                      {perms.filter((p) => selected.has(p.id)).length}/{perms.length}
                    </span>
                  </div>
                  {/* Permissions */}
                  <div className="divide-y divide-white/5">
                    {perms.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggle(p.id)}
                          className={`w-3.5 h-3.5 rounded ${color.check}`}
                        />
                        <span className="text-xs text-slate-300 flex-1">{p.display_name}</span>
                        <code className="text-[10px] text-slate-600 font-mono">{p.name}</code>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-5 border-t border-slate-800">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : role ? 'Save Changes' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────
const RolesPage = () => {
  const { roles, permissions, fetchRoles, fetchPermissions, createRole, updateRole, deleteRole } = useRbacStore()
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null) // null | 'create' | role object
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [expandedRole, setExpandedRole] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchRoles(), fetchPermissions()]).finally(() => setLoading(false))
  }, [])

  const handleSave = async (form) => {
    if (modal === 'create') {
      await createRole(form)
    } else {
      await updateRole(modal.id, form)
    }
  }

  const handleDelete = async (role) => {
    await deleteRole(role.id)
    setConfirmDelete(null)
  }

  const permCountByModule = (role) => {
    const map = {}
    ;(role.permissions || []).forEach((p) => {
      map[p.module] = (map[p.module] || 0) + 1
    })
    return map
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-slide-up">
      {modal && (
        <RoleModal
          role={modal === 'create' ? null : modal}
          allPermissions={permissions}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6 animate-slide-up">
            <h3 className="font-display font-bold text-white mb-2">Delete Role?</h3>
            <p className="text-slate-400 text-sm mb-1">
              Role <span className="font-mono text-red-400">{confirmDelete.name}</span> will be removed.
            </p>
            <p className="text-slate-500 text-xs mb-5">Users assigned this role will lose all its permissions.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="btn-danger flex-1">Delete Role</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Roles</h1>
          <p className="text-slate-500 text-sm mt-1">{roles.length} roles configured</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary text-sm">+ New Role</button>
      </div>

      {loading ? (
        <div className="card p-16 flex justify-center">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => {
            const isExpanded = expandedRole === role.id
            const modMap = permCountByModule(role)
            const totalPerms = (role.permissions || []).length

            return (
              <div key={role.id} className="card overflow-hidden">
                {/* Role header row */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-display font-bold text-lg
                    ${role.is_system ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                    {role.display_name?.[0]?.toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100">{role.display_name}</span>
                      <code className="text-[10px] text-slate-500 font-mono bg-slate-800 px-1.5 py-0.5 rounded">{role.name}</code>
                      {role.is_system && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          SYSTEM
                        </span>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{role.description}</p>
                    )}
                    {/* Module pills */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Object.entries(modMap).map(([mod, count]) => (
                        <span key={mod} className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${mc(mod).bg} ${mc(mod).border} ${mc(mod).text}`}>
                          {mod} ×{count}
                        </span>
                      ))}
                      {totalPerms === 0 && (
                        <span className="text-[10px] text-slate-600 font-mono">No permissions assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-100 bg-slate-800 rounded-lg transition-colors font-mono"
                    >
                      {isExpanded ? '▲ Hide' : `▾ ${totalPerms} perms`}
                    </button>
                    {!role.is_system && (
                      <>
                        <button
                          onClick={() => setModal(role)}
                          className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-100 bg-slate-800 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDelete(role)}
                          className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {role.is_system && (
                      <button
                        onClick={() => setModal(role)}
                        className="px-3 py-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 rounded-lg transition-colors"
                      >
                        Edit Perms
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded permission detail */}
                {isExpanded && (
                  <div className="border-t border-slate-800 px-5 py-4 bg-slate-950/50">
                    {totalPerms === 0 ? (
                      <p className="text-xs text-slate-600 font-mono">No permissions assigned to this role.</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(
                          (role.permissions || []).reduce((acc, p) => {
                            acc[p.module] = acc[p.module] || []
                            acc[p.module].push(p)
                            return acc
                          }, {})
                        ).map(([mod, perms]) => (
                          <div key={mod}>
                            <div className={`text-[10px] font-mono font-bold uppercase mb-1.5 ${mc(mod).text}`}>{mod}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {perms.map((p) => (
                                <span
                                  key={p.id}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-mono border ${mc(mod).bg} ${mc(mod).border} ${mc(mod).text}`}
                                >
                                  {p.display_name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default RolesPage
