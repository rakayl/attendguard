import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useActivityStore } from '../store/activityStore'

const STATUS_DOT = {
  pending: 'bg-slate-400',
  in_progress: 'bg-amber-400',
  completed: 'bg-emerald-400',
  cancelled: 'bg-rose-400',
}

const STATUS_BADGE = {
  pending: 'border-slate-700 bg-slate-800 text-slate-300',
  in_progress: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  completed: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  cancelled: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
}

const DayModal = ({ day, onClose }) => {
  if (!day) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="card max-h-[88vh] w-full max-w-3xl overflow-y-auto animate-slide-up">
        <div className="flex items-start justify-between border-b border-slate-800 px-6 py-5">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Activities on {day.date}</h2>
            <p className="mt-1 text-xs text-slate-500">{day.total} cards scheduled on this day.</p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-slate-500 hover:text-slate-300">x</button>
        </div>
        <div className="space-y-4 px-6 py-5">
          {day.activities?.length ? day.activities.map((activity) => (
            <div key={activity.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-slate-100">{activity.title}</div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-mono ${STATUS_BADGE[activity.status] || STATUS_BADGE.pending}`}>{activity.status}</span>
              </div>
              <div className="mt-2 text-sm text-slate-400">{activity.description || 'No description provided.'}</div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>Assigned: {activity.assigned_user?.name}</span>
                <span>Checklist: {activity.completed_tasks}/{activity.total_tasks}</span>
                <span>Progress: {activity.progress_percentage}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full bg-cyan-400" style={{ width: `${activity.progress_percentage}%` }} />
              </div>
              {activity.tasks?.length ? (
                <div className="mt-4 space-y-2">
                  {activity.tasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-3 rounded-xl border border-slate-800 px-3 py-2 text-sm">
                      <div className={`mt-1 h-2.5 w-2.5 rounded-full ${task.is_completed ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      <div className="min-w-0 flex-1">
                        <div className={task.is_completed ? 'text-slate-500 line-through' : 'text-slate-200'}>{task.title}</div>
                        {task.description && <div className="mt-1 text-xs text-slate-500">{task.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 text-xs text-slate-500">No checklist items yet.</div>
              )}
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-500">No activity scheduled for this date.</div>
          )}
        </div>
      </div>
    </div>
  )
}

const DailyActivityCalendarPage = () => {
  const {
    calendarMonth,
    calendarDays,
    calendarSelectedDay,
    loading,
    error,
    fetchCalendarMonth,
    fetchCalendarDate,
  } = useActivityStore()
  const [monthCursor, setMonthCursor] = useState(new Date().toLocaleDateString('en-CA').slice(0, 7))

  useEffect(() => {
    fetchCalendarMonth(monthCursor)
  }, [monthCursor])

  const calendarCells = useMemo(() => {
    const [year, month] = monthCursor.split('-').map(Number)
    const firstDay = new Date(year, month - 1, 1)
    const startWeekday = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(year, month, 0).getDate()
    const map = new Map((calendarDays || []).map((day) => [day.date, day]))
    const cells = []

    for (let i = 0; i < startWeekday; i++) {
      cells.push(null)
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${monthCursor}-${String(day).padStart(2, '0')}`
      cells.push(map.get(date) || { date, total: 0, pending: 0, in_progress: 0, completed: 0, cancelled: 0, activities: [] })
    }
    while (cells.length % 7 !== 0) {
      cells.push(null)
    }
    return cells
  }, [calendarDays, monthCursor])

  const totals = useMemo(() => (calendarDays || []).reduce((acc, day) => {
    acc.total += day.total || 0
    acc.completed += day.completed || 0
    acc.inProgress += day.in_progress || 0
    return acc
  }, { total: 0, completed: 0, inProgress: 0 }), [calendarDays])

  const navigateMonth = (offset) => {
    const [year, month] = monthCursor.split('-').map(Number)
    const next = new Date(year, month - 1 + offset, 1)
    setMonthCursor(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8 animate-slide-up">
      <DayModal day={calendarSelectedDay} onClose={() => useActivityStore.setState({ calendarSelectedDay: null })} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Daily Activity Calendar</h1>
          <p className="mt-1 text-sm text-slate-500">Monthly calendar view for daily activity cards, checklist progress, and status overview.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/activities" className="btn-secondary text-sm">Board View</Link>
        </div>
      </div>

      {error && <div className="card border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Scheduled Cards', totals.total, 'text-cyan-300'],
          ['In Progress', totals.inProgress, 'text-amber-300'],
          ['Completed', totals.completed, 'text-emerald-300'],
          ['Month', calendarMonth || monthCursor, 'text-slate-200'],
        ].map(([label, value, color]) => (
          <div key={label} className="card p-4">
            <div className={`font-display text-3xl font-bold ${color}`}>{value}</div>
            <div className="mt-1 text-xs font-mono uppercase text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <button className="btn-secondary px-4 py-2 text-sm" onClick={() => navigateMonth(-1)}>Previous</button>
            <button className="btn-secondary px-4 py-2 text-sm" onClick={() => setMonthCursor(new Date().toLocaleDateString('en-CA').slice(0, 7))}>Today</button>
            <button className="btn-secondary px-4 py-2 text-sm" onClick={() => navigateMonth(1)}>Next</button>
          </div>
          <div className="flex items-center gap-3">
            <input type="month" className="input-field max-w-[200px]" value={monthCursor} onChange={(e) => setMonthCursor(e.target.value)} />
            <div className="text-sm font-medium text-slate-200">{formatMonthLabel(monthCursor)}</div>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-7 gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
            <div key={label} className="px-2 py-1 text-center text-[11px] font-mono uppercase tracking-widest text-slate-500">{label}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarCells.map((cell, index) => (
            cell ? (
              <button
                key={cell.date}
                onClick={() => fetchCalendarDate(cell.date)}
                className="min-h-[122px] rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-left transition-colors hover:bg-slate-900/80"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-slate-100">{Number(cell.date.slice(-2))}</div>
                  <div className="text-[11px] font-mono text-slate-500">{cell.total || 0}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {cell.pending > 0 && <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT.pending}`} title={`${cell.pending} pending`} />}
                  {cell.in_progress > 0 && <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT.in_progress}`} title={`${cell.in_progress} in progress`} />}
                  {cell.completed > 0 && <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT.completed}`} title={`${cell.completed} completed`} />}
                  {cell.cancelled > 0 && <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT.cancelled}`} title={`${cell.cancelled} cancelled`} />}
                </div>
                <div className="mt-3 space-y-1">
                  {(cell.activities || []).slice(0, 2).map((activity) => (
                    <div key={activity.id} className="truncate rounded-lg bg-slate-900 px-2 py-1 text-[11px] text-slate-300">
                      {activity.title}
                    </div>
                  ))}
                  {(cell.activities || []).length > 2 && (
                    <div className="text-[11px] text-slate-500">+{cell.activities.length - 2} more</div>
                  )}
                </div>
              </button>
            ) : (
              <div key={`empty-${index}`} className="min-h-[122px] rounded-2xl border border-transparent bg-transparent" />
            )
          ))}
        </div>
      </div>

      {loading && <div className="card p-4 text-sm text-slate-400">Loading calendar...</div>}
    </div>
  )
}

const formatMonthLabel = (value) => {
  const [year, month] = value.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export default DailyActivityCalendarPage
