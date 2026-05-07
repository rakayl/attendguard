import React, { useEffect, useMemo, useState } from 'react'
import { useActivityStore } from '../store/activityStore'
import { useAuthStore } from '../store/authStore'
import { useRbacStore } from '../store/rbacStore'

const ACTIVITY_STATUS_STYLES = {
  pending: 'text-slate-300 bg-slate-800 border-slate-700',
  in_progress: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  completed: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  cancelled: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
}

const TASK_STATUS_STYLES = {
  pending: 'text-slate-300 bg-slate-800 border-slate-700',
  progress: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
  done: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  cancelled: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
}

const PRIORITY_STYLES = {
  low: 'text-slate-300 bg-slate-800 border-slate-700',
  medium: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  high: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
}

const activityFormDefaults = {
  title: '',
  description: '',
  assigned_to: '',
  activity_date: new Date().toLocaleDateString('en-CA'),
}

const taskFormDefaults = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'pending',
  due_time: '',
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
    assigned_to: String(item.assigned_to),
    activity_date: item.activity_date,
  } : activityFormDefaults)
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
    <ModalShell
      title={item ? 'Update Daily Activity' : 'Create Daily Activity'}
      subtitle="One activity can contain many tasks and a full audit trail."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4 px-6 py-5">
        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
        <div>
          <label className="mb-1.5 block text-xs font-mono uppercase text-slate-500">Title</label>
          <input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-mono uppercase text-slate-500">Description</label>
          <textarea className="input-field min-h-28 resize-y" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-mono uppercase text-slate-500">Assigned User</label>
            <select className="input-field" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} required>
              <option value="">Select user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name} - {user.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-mono uppercase text-slate-500">Activity Date</label>
            <input type="date" className="input-field" value={form.activity_date} onChange={(e) => setForm({ ...form, activity_date: e.target.value })} required />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : item ? 'Save Changes' : 'Create Activity'}</button>
        </div>
      </form>
    </ModalShell>
  )
}

const TaskModal = ({ item, onClose, onSave, saving }) => {
  const [form, setForm] = useState(item ? {
    title: item.title,
    description: item.description || '',
    priority: item.priority,
    status: item.status,
    due_time: item.due_time ? item.due_time.slice(0, 16) : '',
  } : taskFormDefaults)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await onSave({ ...form, due_time: form.due_time || '' })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save task')
    }
  }

  return (
    <ModalShell
      title={item ? 'Update Task' : 'Create Task'}
      subtitle="Creator can edit all fields. Assigned user can update task status."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4 px-6 py-5">
        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
        <div>
          <label className="mb-1.5 block text-xs font-mono uppercase text-slate-500">Task Title</label>
          <input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-mono uppercase text-slate-500">Description</label>
          <textarea className="input-field min-h-24 resize-y" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-mono uppercase text-slate-500">Priority</label>
            <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-mono uppercase text-slate-500">Status</label>
            <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="pending">Pending</option>
              <option value="progress">Progress</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-mono uppercase text-slate-500">Due Time</label>
            <input type="datetime-local" className="input-field" value={form.due_time} onChange={(e) => setForm({ ...form, due_time: e.target.value })} />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : item ? 'Save Task' : 'Create Task'}</button>
        </div>
      </form>
    </ModalShell>
  )
}

const StatusBadge = ({ value, type = 'activity' }) => {
  const styles = type === 'activity' ? ACTIVITY_STATUS_STYLES : TASK_STATUS_STYLES
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-mono ${styles[value] || styles.pending}`}>{value}</span>
}

const PriorityBadge = ({ value }) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase ${PRIORITY_STYLES[value] || PRIORITY_STYLES.medium}`}>{value}</span>
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
    updateTaskStatus,
    deleteTask,
  } = useActivityStore()

  const [activityModal, setActivityModal] = useState(null)
  const [taskModal, setTaskModal] = useState(null)

  const canCreateActivity = can('activity:create')
  const canUpdateActivity = can('activity:update')
  const canDeleteActivity = can('activity:delete')
  const canUpdateTaskStatus = can('activity:task_update')

  useEffect(() => {
    fetchUsers()
    fetchActivities({ date_preset: 'today' })
  }, [])

  const summary = useMemo(() => ({
    total: activities.length,
    completed: activities.filter((item) => item.status === 'completed').length,
    inProgress: activities.filter((item) => item.status === 'in_progress').length,
    tasks: activities.reduce((sum, item) => sum + (item.task_count || 0), 0),
  }), [activities])

  const selectActivity = async (id) => {
    await fetchActivityDetail(id)
  }

  const submitActivity = async (payload) => {
    if (activityModal?.id) {
      await updateActivity(activityModal.id, payload)
    } else {
      await createActivity(payload)
    }
  }

  const submitTask = async (payload) => {
    if (!selectedActivity) return
    if (taskModal?.id) {
      await updateTask(taskModal.id, payload)
    } else {
      await createTask(selectedActivity.id, payload)
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

  const applyAssignedUser = (value) => {
    const next = { assigned_user: value }
    setFilters(next)
    fetchActivities({ ...filters, ...next })
  }

  const applyStatus = (value) => {
    const next = { status: value }
    setFilters(next)
    fetchActivities({ ...filters, ...next })
  }

  const refreshRange = () => fetchActivities({ ...filters, date_preset: 'range' })

  const handleDeleteActivity = async (activity) => {
    if (!window.confirm(`Delete daily activity "${activity.title}"?`)) return
    await deleteActivity(activity.id)
  }

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return
    await deleteTask(task.id)
  }

  const handleStatusQuickUpdate = async (task, status) => {
    await updateTaskStatus(task.id, status)
  }

  const canManageSelectedActivity = selectedActivity && (user?.id === selectedActivity.created_by || user?.role?.name === 'admin')
  const canUpdateSelectedTaskStatus = selectedActivity && (user?.id === selectedActivity.created_by || user?.id === selectedActivity.assigned_to || user?.role?.name === 'admin')

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8 animate-slide-up">
      {activityModal && (
        <ActivityModal
          users={users}
          item={activityModal === 'create' ? null : activityModal}
          onClose={() => setActivityModal(null)}
          onSave={submitActivity}
          saving={saving}
        />
      )}

      {taskModal && (
        <TaskModal
          item={taskModal === 'create' ? null : taskModal}
          onClose={() => setTaskModal(null)}
          onSave={submitTask}
          saving={saving}
        />
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Daily Activity</h1>
          <p className="mt-1 text-sm text-slate-500">Task-based daily workboard with audit trail, ownership rules, and live status updates.</p>
        </div>
        {canCreateActivity && (
          <button onClick={() => setActivityModal('create')} className="btn-primary text-sm">+ New Activity</button>
        )}
      </div>

      {error && <div className="card border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Activities', summary.total, 'text-cyan-300'],
          ['In Progress', summary.inProgress, 'text-amber-300'],
          ['Completed', summary.completed, 'text-emerald-300'],
          ['Tasks', summary.tasks, 'text-rose-300'],
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
              className={`rounded-xl border px-4 py-2 text-xs font-mono transition-all ${
                filters.date_preset === value
                  ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_220px_220px_auto]">
          <select className="input-field" value={filters.assigned_user} onChange={(e) => applyAssignedUser(e.target.value)}>
            <option value="">All assigned users</option>
            {users.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </select>

          <select className="input-field" value={filters.status} onChange={(e) => applyStatus(e.target.value)}>
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
              <button onClick={refreshRange} className="btn-secondary text-sm">Apply</button>
            </>
          ) : (
            <button onClick={() => fetchActivities()} className="btn-secondary text-sm xl:justify-self-end">Refresh</button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <div className="font-display text-lg font-semibold text-white">Daily Activity List</div>
              <div className="text-xs text-slate-500">Click one row to open task management and audit timeline.</div>
            </div>
            {loading && <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />}
          </div>

          {activities.length === 0 && !loading ? (
            <div className="p-12 text-center text-sm text-slate-500">No daily activities found for the selected filter.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {activities.map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => selectActivity(activity.id)}
                  className={`w-full px-5 py-4 text-left transition-colors hover:bg-slate-900/70 ${selectedActivity?.id === activity.id ? 'bg-slate-900' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-slate-100">{activity.title}</div>
                        <StatusBadge value={activity.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>{activity.activity_date}</span>
                        <span>Assigned: {activity.assigned_user?.name}</span>
                        <span>Creator: {activity.creator?.name}</span>
                      </div>
                      <div className="mt-2 line-clamp-2 text-sm text-slate-400">{activity.description || 'No description provided.'}</div>
                    </div>
                    <div className="w-36 flex-shrink-0">
                      <div className="mb-2 flex items-center justify-between text-[11px] font-mono text-slate-500">
                        <span>{activity.completed_task_count}/{activity.task_count} tasks</span>
                        <span>{activity.progress_percentage}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full bg-cyan-400" style={{ width: `${activity.progress_percentage}%` }} />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-slate-500">Daily Activity Detail</div>
                <div className="mt-1 font-display text-lg font-semibold text-white">{selectedActivity?.title || 'Select an activity'}</div>
              </div>
              {selectedActivity && canManageSelectedActivity && canUpdateActivity && (
                <div className="flex gap-2">
                  <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => setActivityModal(selectedActivity)}>Edit</button>
                  {canDeleteActivity && <button className="btn-danger text-xs px-3 py-1.5" onClick={() => handleDeleteActivity(selectedActivity)}>Delete</button>}
                </div>
              )}
            </div>

            {selectedActivity ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={selectedActivity.status} />
                  <span className="text-xs font-mono text-slate-500">{selectedActivity.activity_date}</span>
                </div>
                <div className="text-sm text-slate-300">{selectedActivity.description || 'No description provided.'}</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="text-[11px] font-mono uppercase text-slate-500">Assigned User</div>
                    <div className="mt-1 text-sm font-medium text-slate-200">{selectedActivity.assigned_user?.name}</div>
                    <div className="text-xs text-slate-500">{selectedActivity.assigned_user?.display_role || selectedActivity.assigned_user?.email}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="text-[11px] font-mono uppercase text-slate-500">Creator</div>
                    <div className="mt-1 text-sm font-medium text-slate-200">{selectedActivity.creator?.name}</div>
                    <div className="text-xs text-slate-500">{selectedActivity.creator?.display_role || selectedActivity.creator?.email}</div>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-[11px] font-mono uppercase text-slate-500">
                    <span>Progress Percentage</span>
                    <span>{selectedActivity.progress_percentage}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full bg-emerald-400" style={{ width: `${selectedActivity.progress_percentage}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Choose one activity from the list to manage tasks and inspect logs.</div>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-slate-500">Task Management</div>
                <div className="mt-1 text-sm text-slate-400">Creator can edit all tasks. Assigned user can update task status.</div>
              </div>
              {selectedActivity && canManageSelectedActivity && canUpdateActivity && (
                <button className="btn-primary text-xs px-3 py-1.5" onClick={() => setTaskModal('create')}>+ Task</button>
              )}
            </div>

            {!selectedActivity ? (
              <div className="text-sm text-slate-500">Select a daily activity first.</div>
            ) : selectedActivity.tasks?.length ? (
              <div className="space-y-3">
                {selectedActivity.tasks.map((task) => (
                  <div key={task.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium text-slate-100">{task.title}</div>
                          <StatusBadge value={task.status} type="task" />
                          <PriorityBadge value={task.priority} />
                        </div>
                        <div className="mt-2 text-sm text-slate-400">{task.description || 'No task description.'}</div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {task.due_time && <span>Due: {new Date(task.due_time).toLocaleString()}</span>}
                          {task.updater?.name && <span>Updated by: {task.updater.name}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canUpdateSelectedTaskStatus && canUpdateTaskStatus && (
                          <>
                            {task.status === 'pending' && <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => handleStatusQuickUpdate(task, 'progress')}>Start</button>}
                            {task.status === 'progress' && <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => handleStatusQuickUpdate(task, 'done')}>Done</button>}
                            {(task.status === 'pending' || task.status === 'progress') && <button className="btn-danger px-3 py-1.5 text-xs" onClick={() => handleStatusQuickUpdate(task, 'cancelled')}>Cancel</button>}
                          </>
                        )}
                        {canManageSelectedActivity && canUpdateActivity && (
                          <>
                            <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setTaskModal(task)}>Edit</button>
                            <button className="btn-danger px-3 py-1.5 text-xs" onClick={() => handleDeleteTask(task)}>Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
                No tasks yet for this activity.
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-4">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-500">Log Timeline</div>
              <div className="mt-1 text-sm text-slate-400">Every create, update, delete, and status change is recorded here.</div>
            </div>

            {!selectedActivity ? (
              <div className="text-sm text-slate-500">Select a daily activity to inspect its audit trail.</div>
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
                      <div className="mt-1 text-xs text-slate-500">{log.user?.name} • {new Date(log.created_at).toLocaleString()}</div>
                      {(log.old_value || log.new_value) && (
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-3 text-[11px] text-slate-400">{log.old_value ? JSON.stringify(log.old_value, null, 2) : 'No previous value'}</pre>
                          <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-3 text-[11px] text-slate-400">{log.new_value ? JSON.stringify(log.new_value, null, 2) : 'No new value'}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">No logs recorded yet for this activity.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DailyActivityPage
