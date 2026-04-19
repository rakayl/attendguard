import React, { useEffect, useState } from 'react'
import { useRbacStore } from '../store/rbacStore'

const MODULE_COLORS = {
  attendance: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  user: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  role: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  permission: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  device: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  admin: 'text-red-400 bg-red-500/10 border-red-500/20',
}

const moduleColor = (m) => MODULE_COLORS[m] || 'text-slate-400 bg-slate-800 border-slate-700'

const emptyForm = { name: '', display_name: '', module: '', description: '' }

const PermissionModal = ({ perm, onClose, onSave }) => {
  const [form, setForm] = useState(perm ? { ...perm } : emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-white">{perm ? 'Edit Permission' : 'New Permission'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl">×</button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Permission Name *</label>
            <input
              className="input-field font-mono text-sm"
              placeholder="module:action (e.g. report:export)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              disabled={!!perm} // name is immutable after creation
            />
            {!perm && <p className="text-[10px] text-slate-600 mt-1 font-mono">Format: module:action — cannot be changed after creation</p>}
          </div>
          <div>
            <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Display Name *</label>
            <input className="input-field" placeholder="Export Reports" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Module *</label>
            <input className="input-field font-mono text-sm" placeholder="e.g. report" value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value.toLowerCase() })} required />
          </div>
          <div>
            <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Description</label>
            <textarea className="input-field resize-none" rows={2} placeholder="What this permission allows..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Saving...' : perm ? 'Save Changes' : 'Create Permission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const PermissionsPage = () => {
  const { permissions, permModules, fetchPermissions, createPermission, updatePermission, deletePermission } = useRbacStore()
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null) // null | 'create' | permission object
  const [activeModule, setActiveModule] = useState('ALL')
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetchPermissions().finally(() => setLoading(false))
  }, [])

  const filtered = activeModule === 'ALL' ? permissions : permissions.filter((p) => p.module === activeModule)

  const grouped = filtered.reduce((acc, p) => {
    acc[p.module] = acc[p.module] || []
    acc[p.module].push(p)
    return acc
  }, {})

  const handleSave = async (form) => {
    if (modal === 'create') {
      await createPermission(form)
    } else {
      await updatePermission(modal.id, { display_name: form.display_name, module: form.module, description: form.description })
    }
  }

  const handleDelete = async (id) => {
    await deletePermission(id)
    setConfirmDelete(null)
  }

  const allModules = ['ALL', ...permModules]

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-slide-up">
      {modal && (
        <PermissionModal
          perm={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6 animate-slide-up">
            <h3 className="font-display font-bold text-white mb-2">Delete Permission?</h3>
            <p className="text-slate-400 text-sm mb-1">This will remove <span className="font-mono text-red-400">{confirmDelete.name}</span> from all roles.</p>
            <p className="text-slate-500 text-xs mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Permissions</h1>
          <p className="text-slate-500 text-sm mt-1">{permissions.length} permissions across {permModules.length} modules</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary text-sm">+ New Permission</button>
      </div>

      {/* Module filter tabs */}
      <div className="flex flex-wrap gap-2">
        {allModules.map((m) => (
          <button
            key={m}
            onClick={() => setActiveModule(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
              activeModule === m
                ? m === 'ALL' ? 'bg-slate-700 text-slate-100 border-slate-600' : moduleColor(m)
                : 'text-slate-500 border-slate-800 hover:border-slate-600 hover:text-slate-300'
            }`}
          >
            {m.toUpperCase()}
            {m !== 'ALL' && (
              <span className="ml-1.5 opacity-60">{permissions.filter((p) => p.module === m).length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-16 flex justify-center">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([module, perms]) => (
            <div key={module} className="card overflow-hidden">
              <div className={`px-5 py-3 border-b border-slate-800 flex items-center gap-2`}>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border ${moduleColor(module)}`}>
                  {module}
                </span>
                <span className="text-slate-600 text-xs font-mono">{perms.length} permissions</span>
              </div>
              <div className="divide-y divide-slate-800/50">
                {perms.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/30 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-sm text-cyan-400 font-mono">{p.name}</code>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{p.display_name}</div>
                      {p.description && <div className="text-[10px] text-slate-600 mt-0.5">{p.description}</div>}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setModal(p)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-100 bg-slate-800 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(p)}
                        className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-slate-500 text-sm">No permissions found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PermissionsPage
