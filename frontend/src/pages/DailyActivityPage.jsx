import React, { useEffect, useState } from 'react'
import { useActivityStore } from '../store/activityStore'
import { useAuthStore } from '../store/authStore'
import { useRbacStore } from '../store/rbacStore'

const STATUS_STYLES = {
  planned: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
  ongoing: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  done: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
}

const initialForm = {
  title: '',
  description: '',
  activity_date: '',
  start_time: '09:00',
  end_time: '10:00',
  status: 'planned',
  progress: 0,
  allow_overlap: false,
  version: null,
}

const toTodayInput = () => new Date().toLocaleDateString('en-CA')

const ActivityModal = ({ item, onClose, onSave, saving }) => {
  const isEdit = !!item
  const [form, setForm] = useState(item ? {
    title: item.title,
    description: item.description || '',
    activity_date: item.activity_date,
    start_time: item.start_time,
    end_time: item.end_time,
    status: item.status,
    progress: item.progress,
    allow_overlap: false,
    version: item.version,
  } : { ...initialForm, activity_date: toTodayInput() })
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save activity')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-2xl animate-slide-up">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-white">{isEdit ? 'Update Activity' : 'New Daily Activity'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Shared team agenda for today and upcoming plans.</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-2xl leading-none">x</button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

          <div>
            <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Title *</label>
            <input className="input-field" value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>

          <div>
            <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Description</label>
            <textarea className="input-field min-h-28 resize-y" value={form.description} maxLength={2000} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Date *</label>
              <input type="date" className="input-field" value={form.activity_date} onChange={(e) => setForm({ ...form, activity_date: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Start *</label>
              <input type="time" className="input-field" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">End *</label>
              <input type="time" className="input-field" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Status *</label>
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="planned">Planned</option>
                <option value="ongoing">Ongoing</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
            <div>
              <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Progress</label>
              <input type="range" min="0" max="100" value={form.progress} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} className="w-full accent-cyan-500" />
              <div className="text-xs text-slate-500 mt-1">{form.progress}% complete</div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 pt-5">
              <input type="checkbox" checked={form.allow_overlap} onChange={(e) => setForm({ ...form, allow_overlap: e.target.checked })} className="accent-cyan-500" />
              Allow overlap
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Activity'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const DailyActivityPage = () => {
  const { user, can } = useAuthStore()
  const { users, fetchUsers } = useRbacStore()
  const {
    activities,
    filters,
    loading,
    saving,
    error,
    setFilters,
    fetchActivities,
    createActivity,
    updateActivity,
    deleteActivity,
  } = useActivityStore()

  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetchUsers()
    fetchActivities({ date_preset: 'today' })
  }, [])

  const applyPreset = (preset) => {
    const next = {
      date_preset: preset,
      date_from: preset === 'range' ? filters.date_from || toTodayInput() : '',
      date_to: preset === 'range' ? filters.date_to || toTodayInput() : '',
    }
    setFilters(next)
    fetchActivities({ ...filters, ...next })
  }

  const applyUserFilter = (userId) => {
    setFilters({ user_id: userId })
    fetchActivities({ ...filters, user_id: userId })
  }

  const applyRange = (patch) => {
    const next = { ...filters, ...patch, date_preset: 'range' }
    setFilters(next)
  }

  const refreshRange = () => {
    fetchActivities({ ...filters, date_preset: 'range' })
  }

  const submit = async (payload) => {
    if (modal?.id) {
      await updateActivity(modal.id, payload)
    } else {
      await createActivity(payload)
    }
  }

  const remove = async (item) => {
    if (!window.confirm(`Delete activity "${item.title}"?`)) return
    await deleteActivity(item.id)
    if (selected?.id === item.id) setSelected(null)
  }

  const totalToday = activities.filter((item) => item.is_today).length
  const ownItems = activities.filter((item) => item.user_id === user?.id).length

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-slide-up">
      {modal && (
        <ActivityModal
          item={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={submit}
          saving={saving}
        />
      )}

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Daily Activity</h1>
          <p className="text-slate-500 text-sm mt-1">Shared team agenda for past, current, and future work plans.</p>
        </div>
        {can('activity:create') && <button onClick={() => setModal('create')} className="btn-primary text-sm">+ New Activity</button>}
      </div>

      {error && <div className="card p-4 border-red-500/20 bg-red-500/10 text-sm text-red-400">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Visible Items', activities.length, 'text-cyan-300'],
          ['Today', totalToday, 'text-amber-300'],
          ['Mine', ownItems, 'text-emerald-300'],
          ['People', new Set(activities.map((item) => item.user_id)).size, 'text-rose-300'],
        ].map(([label, value, color]) => (
          <div key={label} className="card p-4">
            <div className={`text-2xl font-display font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 font-mono uppercase mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-end gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              ['today', 'Today'],
              ['tomorrow', 'Tomorrow'],
              ['week', 'Next 7 Days'],
              ['range', 'Custom Range'],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => applyPreset(value)}
                className={`px-4 py-2 rounded-xl text-xs font-mono border transition-all ${
                  filters.date_preset === value
                    ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 xl:ml-auto">
            <select className="input-field w-full sm:w-60" value={filters.user_id} onChange={(e) => applyUserFilter(e.target.value)}>
              <option value="">All users</option>
              {users.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            {filters.date_preset === 'range' && (
              <>
                <input type="date" className="input-field" value={filters.date_from} onChange={(e) => applyRange({ date_from: e.target.value })} />
                <input type="date" className="input-field" value={filters.date_to} onChange={(e) => applyRange({ date_to: e.target.value })} />
                <button onClick={refreshRange} className="btn-secondary text-sm">Apply</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-display font-semibold text-white">Team Timeline</div>
              <div className="text-xs text-slate-500">Sorted by date and time ascending</div>
            </div>
            <button onClick={() => fetchActivities()} className="btn-secondary text-sm">Refresh</button>
          </div>

          {loading ? (
            <div className="p-16 flex justify-center">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activities.length === 0 ? (
            <div className="p-16 text-center text-sm text-slate-500">No activities found for the selected filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-950/70">
                  <tr className="text-left text-xs font-mono uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">User</th>
                    <th className="px-5 py-3">Activity</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Progress</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((item) => {
                    const isMine = item.user_id === user?.id
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelected(item)}
                        className={`border-t border-slate-800 cursor-pointer transition-colors hover:bg-slate-900/70 ${item.is_today ? 'bg-cyan-500/5' : ''} ${selected?.id === item.id ? 'bg-slate-900' : ''}`}
                      >
                        <td className="px-5 py-4 align-top">
                          <div className="text-slate-200 font-medium">{item.activity_date}</div>
                          {item.is_today && <div className="text-[10px] text-cyan-300 font-mono mt-1">TODAY</div>}
                        </td>
                        <td className="px-5 py-4 align-top font-mono text-slate-300">{item.start_time} - {item.end_time}</td>
                        <td className="px-5 py-4 align-top">
                          <div className="text-slate-200">{item.user.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-1">{item.user.display_role || item.user.email}</div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="text-slate-100 font-medium">{item.title}</div>
                          <div className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description || 'No description'}</div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-mono border ${STATUS_STYLES[item.status] || STATUS_STYLES.planned}`}>{item.status}</span>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full bg-cyan-400" style={{ width: `${item.progress}%` }} />
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-1">{item.progress}%</div>
                        </td>
                        <td className="px-5 py-4 align-top text-right">
                          {isMine ? (
                            <div className="flex justify-end gap-2">
                              <button onClick={(e) => { e.stopPropagation(); setModal(item) }} className="btn-secondary text-xs px-3 py-1.5">Edit</button>
                              <button onClick={(e) => { e.stopPropagation(); remove(item) }} className="btn-danger text-xs px-3 py-1.5">Delete</button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-600 font-mono">Shared</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-3">Selected Activity</div>
            {selected ? (
              <div className="space-y-3">
                <div>
                  <div className="text-lg font-display font-semibold text-white">{selected.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{selected.activity_date} • {selected.start_time} - {selected.end_time}</div>
                </div>
                <div className="text-sm text-slate-300">{selected.description || 'No description provided.'}</div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-mono border ${STATUS_STYLES[selected.status] || STATUS_STYLES.planned}`}>{selected.status}</span>
                  <span className="text-xs text-slate-500 font-mono">v{selected.version}</span>
                </div>
                <div className="text-xs text-slate-500 font-mono">Owner: {selected.user.name} ({selected.user.display_role || selected.user.email})</div>
                <div>
                  <div className="text-xs text-slate-500 font-mono mb-1 uppercase">Progress</div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: `${selected.progress}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Pick an activity row to inspect the details.</div>
            )}
          </div>

          <div className="card p-5">
            <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-3">Rules</div>
            <div className="space-y-2 text-sm text-slate-400">
              <div>Everyone can see the shared team timeline.</div>
              <div>Only the creator can edit or delete an activity.</div>
              <div>Time overlap is blocked by default for the same user on the same date.</div>
              <div>Optimistic locking is enabled using the activity version during updates.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DailyActivityPage
