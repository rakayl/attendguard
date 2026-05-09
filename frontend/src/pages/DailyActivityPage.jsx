import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useActivityStore } from '../store/activityStore'
import { useAuthStore } from '../store/authStore'
import { useRbacStore } from '../store/rbacStore'

const STATUS_STYLES = {
  pending: 'text-slate-300 bg-slate-800 border-slate-700',
  in_progress: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  completed: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  cancelled: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
}

const activityDefaults = {
  title: '',
  description: '',
  template_color: 'cyan',
  assigned_to: '',
  activity_date: new Date().toLocaleDateString('en-CA'),
}

const TEMPLATE_OPTIONS = [
  ['cyan', 'Cyan'],
  ['emerald', 'Emerald'],
  ['amber', 'Amber'],
  ['rose', 'Rose'],
  ['violet', 'Violet'],
  ['slate', 'Slate'],
]

const TEMPLATE_CARD_STYLES = {
  cyan: 'from-cyan-500/10 to-cyan-700/5 border-cyan-500/20',
  emerald: 'from-emerald-500/10 to-emerald-700/5 border-emerald-500/20',
  amber: 'from-amber-500/10 to-amber-700/5 border-amber-500/20',
  rose: 'from-rose-500/10 to-rose-700/5 border-rose-500/20',
  violet: 'from-violet-500/10 to-violet-700/5 border-violet-500/20',
  slate: 'from-slate-500/10 to-slate-700/5 border-slate-500/20',
}

const taskDefaults = {
  title: '',
  description: '',
}

const ModalShell = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
    <div className="card w-full max-w-2xl animate-slide-up">
      <div className="flex items-start justify-between border-b border-slate-800 px-6 py-5">
        <div>
          <h2 className="font-display text-xl font-bold text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="text-2xl leading-none text-slate-500 hover:text-slate-300">x</button>
      </div>
      {children}
    </div>
  </div>
)

const ActivityModal = ({ users, item, onClose, onSave, saving }) => {
  const [form, setForm] = useState(item ? {
    title: item.title,
    description: item.description || '',
    template_color: item.template_color || 'cyan',
    assigned_to: String(item.assigned_to),
    activity_date: item.activity_date,
  } : activityDefaults)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await onSave({ ...form, assigned_to: Number(form.assigned_to) })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save daily activity')
    }
  }

  return (
    <ModalShell title={item ? 'Edit Daily Activity' : 'Create Daily Activity'} subtitle="Daily activity card with checklist progress tracking." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 px-6 py-5">
        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
        <input className="input-field" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <textarea className="input-field min-h-28 resize-y" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="grid gap-4 md:grid-cols-3">
          <select className="input-field" value={form.template_color} onChange={(e) => setForm({ ...form, template_color: e.target.value })}>
            {TEMPLATE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className="input-field" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} required>
            <option value="">Select assigned user...</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name} - {user.email}</option>)}
          </select>
          <input type="date" className="input-field" value={form.activity_date} onChange={(e) => setForm({ ...form, activity_date: e.target.value })} required />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </ModalShell>
  )
}

const TaskModal = ({ item, onClose, onSave, saving }) => {
  const [form, setForm] = useState(item ? {
    title: item.title,
    description: item.description || '',
  } : taskDefaults)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save task')
    }
  }

  return (
    <ModalShell title={item ? 'Edit Task' : 'Add Task'} subtitle="Checklist item inside the daily activity card." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 px-6 py-5">
        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
        <input className="input-field" placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <textarea className="input-field min-h-24 resize-y" placeholder="Task description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save Task'}</button>
        </div>
      </form>
    </ModalShell>
  )
}

const StatusBadge = ({ value }) => (
  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-mono ${STATUS_STYLES[value] || STATUS_STYLES.pending}`}>{value}</span>
)

const DailyActivityPage = () => {
  const { user, can } = useAuthStore()
  const { users, fetchUsers } = useRbacStore()
  const {
    activities,
    selectedActivity,
    logs,
    filters,
    loading,
    saving,
    error,
    setFilters,
    fetchActivities,
    fetchActivityDetail,
    createActivity,
    updateActivity,
    deleteActivity,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
    createComment,
    updateComment,
    deleteComment,
  } = useActivityStore()

  const [activityModal, setActivityModal] = useState(null)
  const [taskModal, setTaskModal] = useState(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [editingComment, setEditingComment] = useState(null)

  const canCreateActivity = can('activity:create')
  const canUpdateActivity = can('activity:update')
  const canDeleteActivity = can('activity:delete')
  const canUpdateTaskStatus = can('activity:task_update')
  const canComment = can('activity:comment')

  useEffect(() => {
    fetchUsers()
    fetchActivities({ date_preset: 'today' })
  }, [])

  const summary = useMemo(() => ({
    total: activities.length,
    completed: activities.filter((item) => item.status === 'completed').length,
    inProgress: activities.filter((item) => item.status === 'in_progress').length,
    tasks: activities.reduce((sum, item) => sum + (item.total_tasks || 0), 0),
  }), [activities])

  const isAdmin = user?.role?.name === 'admin'
  const canManageSelectedActivity = selectedActivity && (isAdmin || user?.id === selectedActivity.created_by)
  const canToggleSelectedTask = selectedActivity && (isAdmin || user?.id === selectedActivity.created_by || user?.id === selectedActivity.assigned_to)

  const submitActivity = async (payload) => {
    if (activityModal?.id) {
      await updateActivity(activityModal.id, payload)
      return
    }
    await createActivity(payload)
  }

  const submitTask = async (payload) => {
    if (!selectedActivity) return
    if (taskModal?.id) {
      await updateTask(taskModal.id, payload)
      return
    }
    await createTask(selectedActivity.id, payload)
  }

  const handleDeleteActivity = async () => {
    if (!selectedActivity) return
    if (!window.confirm(`Delete "${selectedActivity.title}"?`)) return
    await deleteActivity(selectedActivity.id)
  }

  const handleActivityStatus = async (status) => {
    if (!selectedActivity) return
    await updateActivity(selectedActivity.id, {
      title: selectedActivity.title,
      description: selectedActivity.description || '',
      assigned_to: selectedActivity.assigned_to,
      activity_date: selectedActivity.activity_date,
      status,
    })
  }

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return
    await deleteTask(task.id)
  }

  const handleSubmitComment = async () => {
    if (!selectedActivity || !commentDraft.trim()) return
    if (editingComment) {
      await updateComment(editingComment.id, commentDraft)
      setEditingComment(null)
    } else {
      await createComment(selectedActivity.id, commentDraft)
    }
    setCommentDraft('')
  }

  const handleDeleteComment = async (comment) => {
    if (!window.confirm('Delete this comment?')) return
    await deleteComment(comment.id)
    if (editingComment?.id === comment.id) {
      setEditingComment(null)
      setCommentDraft('')
    }
  }

  const applyPreset = (preset) => {
    const next = {
      date_preset: preset,
      date_from: preset === 'range' ? filters.date_from || new Date().toLocaleDateString('en-CA') : '',
      date_to: preset === 'range' ? filters.date_to || new Date().toLocaleDateString('en-CA') : '',
    }
    setFilters(next)
    fetchActivities({ ...filters, ...next })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8 animate-slide-up">
      {activityModal && <ActivityModal users={users} item={activityModal === 'create' ? null : activityModal} onClose={() => setActivityModal(null)} onSave={submitActivity} saving={saving} />}
      {taskModal && <TaskModal item={taskModal === 'create' ? null : taskModal} onClose={() => setTaskModal(null)} onSave={submitTask} saving={saving} />}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Daily Activity Management</h1>
          <p className="mt-1 text-sm text-slate-500">Card-based daily activity board with checklist progress, comments, and audit timeline.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/activities/calendar" className="btn-secondary text-sm">Calendar View</Link>
          {canCreateActivity && <button onClick={() => setActivityModal('create')} className="btn-primary text-sm">+ New Daily Card</button>}
        </div>
      </div>

      {error && <div className="card border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Cards', summary.total, 'text-cyan-300'],
          ['In Progress', summary.inProgress, 'text-amber-300'],
          ['Completed', summary.completed, 'text-emerald-300'],
          ['Checklist', summary.tasks, 'text-rose-300'],
        ].map(([label, value, color]) => (
          <div key={label} className="card p-4">
            <div className={`font-display text-3xl font-bold ${color}`}>{value}</div>
            <div className="mt-1 text-xs font-mono uppercase text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="card space-y-4 p-5">
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
              className={`rounded-xl border px-4 py-2 text-xs font-mono transition-all ${filters.date_preset === value ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 xl:grid-cols-[1fr_220px_220px_auto]">
          <select className="input-field" value={filters.assigned_user} onChange={(e) => { const next = { assigned_user: e.target.value }; setFilters(next); fetchActivities({ ...filters, ...next }) }}>
            <option value="">All assigned users</option>
            {users.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </select>
          <select className="input-field" value={filters.status} onChange={(e) => { const next = { status: e.target.value }; setFilters(next); fetchActivities({ ...filters, ...next }) }}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {filters.date_preset === 'range' ? (
            <>
              <input type="date" className="input-field" value={filters.date_from} onChange={(e) => setFilters({ date_from: e.target.value, date_preset: 'range' })} />
              <input type="date" className="input-field" value={filters.date_to} onChange={(e) => setFilters({ date_to: e.target.value, date_preset: 'range' })} />
              <button onClick={() => fetchActivities({ ...filters, date_preset: 'range' })} className="btn-secondary text-sm">Apply</button>
            </>
          ) : (
            <button onClick={() => fetchActivities()} className="btn-secondary text-sm xl:justify-self-end">Refresh</button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,1fr)]">
        <div className="grid gap-4">
          {activities.map((activity) => (
            <button key={activity.id} onClick={() => fetchActivityDetail(activity.id)} className={`card bg-gradient-to-br p-5 text-left transition-colors hover:bg-slate-900/70 ${TEMPLATE_CARD_STYLES[activity.template_color] || TEMPLATE_CARD_STYLES.cyan} ${selectedActivity?.id === activity.id ? 'ring-1 ring-cyan-500/30' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-slate-100">{activity.title}</div>
                    <StatusBadge value={activity.status} />
                  </div>
                  <div className="mt-2 text-sm text-slate-400 line-clamp-2">{activity.description || 'No description provided.'}</div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>Assigned: {activity.assigned_user?.name}</span>
                    <span>Date: {activity.activity_date}</span>
                    <span>Checklist: {activity.completed_tasks}/{activity.total_tasks}</span>
                  </div>
                </div>
                <div className="w-36 flex-shrink-0">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>{activity.progress_percentage}%</span>
                    <span>{activity.completed_tasks}/{activity.total_tasks}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full bg-cyan-400" style={{ width: `${activity.progress_percentage}%` }} />
                  </div>
                </div>
              </div>
            </button>
          ))}
          {activities.length === 0 && !loading && <div className="card p-8 text-center text-sm text-slate-500">No daily activity cards found.</div>}
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-slate-500">Detail</div>
                <div className="mt-1 font-display text-lg font-semibold text-white">{selectedActivity?.title || 'Select a card'}</div>
              </div>
              {selectedActivity && canManageSelectedActivity && canUpdateActivity && (
                <div className="flex gap-2">
                  {selectedActivity.status !== 'cancelled' ? (
                    <button className="btn-danger text-xs px-3 py-1.5" onClick={() => handleActivityStatus('cancelled')}>Cancel</button>
                  ) : (
                    <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => handleActivityStatus('pending')}>Reopen</button>
                  )}
                  <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => setActivityModal(selectedActivity)}>Edit</button>
                  {canDeleteActivity && <button className="btn-danger text-xs px-3 py-1.5" onClick={handleDeleteActivity}>Delete</button>}
                </div>
              )}
            </div>

            {!selectedActivity ? (
              <div className="text-sm text-slate-500">Choose one daily activity card from the list.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={selectedActivity.status} />
                  <span className="text-xs font-mono text-slate-500">{selectedActivity.activity_date}</span>
                </div>
                <p className="text-sm text-slate-300">{selectedActivity.description || 'No description provided.'}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="text-[11px] font-mono uppercase text-slate-500">Assigned User</div>
                    <div className="mt-1 text-sm font-medium text-slate-200">{selectedActivity.assigned_user?.name}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="text-[11px] font-mono uppercase text-slate-500">Creator</div>
                    <div className="mt-1 text-sm font-medium text-slate-200">{selectedActivity.creator?.name}</div>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-[11px] font-mono uppercase text-slate-500">
                    <span>Progress</span>
                    <span>{selectedActivity.progress_percentage}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full bg-emerald-400" style={{ width: `${selectedActivity.progress_percentage}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-slate-500">Checklist</div>
                <div className="mt-1 text-sm text-slate-400">Creator can edit all tasks. Assigned user can check or uncheck tasks.</div>
              </div>
              {selectedActivity && canManageSelectedActivity && canUpdateActivity && <button className="btn-primary text-xs px-3 py-1.5" onClick={() => setTaskModal('create')}>+ Task</button>}
            </div>

            {!selectedActivity ? (
              <div className="text-sm text-slate-500">Select a card first.</div>
            ) : selectedActivity.tasks?.length ? (
              <div className="space-y-3">
                {selectedActivity.tasks.map((task) => (
                  <div key={task.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" className="mt-1 h-4 w-4 accent-cyan-400" checked={task.is_completed} disabled={!canToggleSelectedTask || !canUpdateTaskStatus} onChange={() => toggleTask(task.id, !task.is_completed)} />
                      <div className="min-w-0 flex-1">
                        <div className={`font-medium ${task.is_completed ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{task.title}</div>
                        <div className={`mt-1 text-sm ${task.is_completed ? 'text-slate-500 line-through' : 'text-slate-400'}`}>{task.description || 'No task description.'}</div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>Created by: {task.creator?.name}</span>
                          {task.completed_at && <span>Completed: {new Date(task.completed_at).toLocaleString()}</span>}
                        </div>
                      </div>
                      {canManageSelectedActivity && canUpdateActivity && (
                        <div className="flex gap-2">
                          <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setTaskModal(task)}>Edit</button>
                          <button className="btn-danger px-3 py-1.5 text-xs" onClick={() => handleDeleteTask(task)}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">No checklist items yet.</div>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-4">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-500">Comments</div>
              <div className="mt-1 text-sm text-slate-400">Discussion on the daily activity card.</div>
            </div>

            {selectedActivity ? (
              <div className="space-y-4">
                {selectedActivity.comments?.map((comment) => {
                  const canManageComment = isAdmin || comment.user?.id === user?.id
                  return (
                    <div key={comment.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-100">{comment.user?.name}</div>
                          <div className="mt-1 text-sm text-slate-400 whitespace-pre-wrap">{comment.message}</div>
                          <div className="mt-2 text-xs text-slate-500">{new Date(comment.updated_at || comment.created_at).toLocaleString()}</div>
                        </div>
                        {canManageComment && (
                          <div className="flex gap-2">
                            <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => { setEditingComment(comment); setCommentDraft(comment.message) }}>Edit</button>
                            <button className="btn-danger px-3 py-1.5 text-xs" onClick={() => handleDeleteComment(comment)}>Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {canComment && (
                  <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <textarea className="input-field min-h-24 resize-y" placeholder="Write a comment..." value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} />
                    <div className="flex gap-3">
                      {editingComment && <button className="btn-secondary flex-1" onClick={() => { setEditingComment(null); setCommentDraft('') }}>Cancel Edit</button>}
                      <button className="btn-primary flex-1" onClick={handleSubmitComment} disabled={saving || !commentDraft.trim()}>
                        {editingComment ? 'Update Comment' : 'Add Comment'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-500">Select a card to open its comments.</div>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-4">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-500">Activity Log</div>
              <div className="mt-1 text-sm text-slate-400">All create, edit, delete, and checklist changes are recorded here.</div>
            </div>

            {!selectedActivity ? (
              <div className="text-sm text-slate-500">Select a card to inspect its audit trail.</div>
            ) : logs.length ? (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="relative pl-6">
                    <div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-cyan-400" />
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-100">{log.description}</div>
                        <div className="text-[11px] font-mono uppercase text-slate-500">{log.action}</div>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{log.user?.name} | {new Date(log.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">No activity log recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DailyActivityPage
