import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useAttendanceStore } from '../store/attendanceStore'
import { useActivityStore } from '../store/activityStore'
import { FraudBadge } from '../components/FraudComponents'

const StatCard = ({ label, value, sub, color = 'cyan' }) => {
  const colors = {
    cyan: 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/20',
    emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
    red: 'from-red-500/10 to-red-600/5 border-red-500/20',
  }
  const textColors = {
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  }

  return (
    <div className={`card bg-gradient-to-br p-5 ${colors[color]}`}>
      <div className="mb-2 text-xs font-mono uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`font-display text-3xl font-bold ${textColors[color]}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

const DashboardPage = () => {
  const { user } = useAuthStore()
  const { history, currentAttendance, fetchHistory, loading } = useAttendanceStore()
  const { calendarDays, calendarSelectedDay, fetchCalendarMonth, fetchCalendarDate } = useActivityStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchHistory()
    fetchCalendarMonth(new Date().toLocaleDateString('en-CA').slice(0, 7))
  }, [])

  const totalDays = history.filter((h) => h.check_in_at).length
  const fraudCount = history.filter((h) => h.fraud_status === 'FRAUD').length
  const suspiciousCount = history.filter((h) => h.fraud_status === 'SUSPICIOUS').length
  const safeCount = history.filter((h) => h.fraud_status === 'SAFE').length
  const recentLogs = history.slice(0, 5)

  const formatTime = (value) => {
    if (!value) return '-'
    return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const calendarCells = useMemo(() => {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const offset = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const dayMap = new Map((calendarDays || []).map((day) => [day.date, day]))
    const cells = []

    for (let i = 0; i < offset; i += 1) cells.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${currentMonth}-${String(day).padStart(2, '0')}`
      cells.push(dayMap.get(date) || { date, total: 0, pending: 0, in_progress: 0, completed: 0, cancelled: 0 })
    }
    while (cells.length % 7 !== 0) cells.push(null)

    return cells
  }, [calendarDays])

  return (
    <div className="animate-slide-up space-y-8 p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
            <span className="text-cyan-400">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={() => navigate('/checkin')} className="btn-primary text-sm">
          {currentAttendance ? 'Check Out' : 'Check In'}
        </button>
      </div>

      {currentAttendance && (
        <div className="gradient-border glow-cyan p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-3 w-3">
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Currently Checked In</div>
                <div className="font-mono text-xs text-slate-400">Since {formatTime(currentAttendance.check_in_at)}</div>
              </div>
            </div>
            <FraudBadge status={currentAttendance.fraud_status} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Records" value={totalDays} sub="All time" color="cyan" />
        <StatCard label="Safe" value={safeCount} sub="Clean attendance" color="emerald" />
        <StatCard label="Suspicious" value={suspiciousCount} sub="Under review" color="amber" />
        <StatCard label="Fraud" value={fraudCount} sub="Flagged" color="red" />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display font-semibold text-slate-200">Daily Activity Calendar</h2>
          <button
            onClick={() => navigate('/activities/calendar')}
            className="font-mono text-xs text-cyan-400 transition-colors hover:text-cyan-300"
          >
            Open calendar -
          </button>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-white">
                {today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </div>
              <div className="mt-1 text-xs text-slate-500">Klik tanggal untuk membuka aktivitas hari tersebut.</div>
            </div>
            <button onClick={() => navigate('/activities')} className="btn-secondary px-3 py-2 text-xs">
              Manage Cards
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
              <div key={label} className="text-center text-[11px] font-mono uppercase tracking-widest text-slate-500">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((cell, index) =>
              cell ? (
                <button
                  key={cell.date}
                  onClick={() => fetchCalendarDate(cell.date)}
                  className="min-h-[88px] rounded-2xl border border-slate-800 bg-slate-950/60 p-2 text-left transition-colors hover:bg-slate-900/80"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-semibold text-slate-200">{Number(cell.date.slice(-2))}</span>
                    <span className="text-[10px] font-mono text-slate-500">{cell.total || 0}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cell.pending > 0 && <span className="h-2 w-2 rounded-full bg-slate-400" />}
                    {cell.in_progress > 0 && <span className="h-2 w-2 rounded-full bg-amber-400" />}
                    {cell.completed > 0 && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
                    {cell.cancelled > 0 && <span className="h-2 w-2 rounded-full bg-rose-400" />}
                  </div>
                </button>
              ) : (
                <div key={`empty-${index}`} className="min-h-[88px] rounded-2xl border border-transparent" />
              )
            )}
          </div>

          {calendarSelectedDay && (
            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">Activities on {calendarSelectedDay.date}</div>
                  <div className="mt-1 text-xs text-slate-500">{calendarSelectedDay.total} card(s)</div>
                </div>
                <button
                  onClick={() => navigate('/activities/calendar')}
                  className="font-mono text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Open full view -
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {(calendarSelectedDay.activities || []).slice(0, 3).map((activity) => (
                  <div key={activity.id} className="rounded-xl border border-slate-800 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-slate-200">{activity.title}</div>
                      <span className="text-[10px] font-mono text-slate-500">{activity.progress_percentage}%</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {activity.assigned_user?.name} | {activity.completed_tasks}/{activity.total_tasks} task
                    </div>
                  </div>
                ))}
                {!calendarSelectedDay.activities?.length && (
                  <div className="text-sm text-slate-500">No activity on the selected date.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display font-semibold text-slate-200">Recent Attendance</h2>
          <button
            onClick={() => navigate('/history')}
            className="font-mono text-xs text-cyan-400 transition-colors hover:text-cyan-300"
          >
            View all -
          </button>
        </div>

        {loading ? (
          <div className="card flex items-center justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          </div>
        ) : recentLogs.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-slate-500">No attendance records yet.</p>
            <button onClick={() => navigate('/checkin')} className="btn-primary mt-4 text-sm">
              Check In Now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="card flex cursor-pointer items-center gap-4 p-4 transition-colors hover:border-slate-700"
                onClick={() => navigate('/history')}
              >
                <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-slate-800">
                  <div className="text-xs font-mono leading-none text-slate-500">
                    {new Date(log.check_in_at).toLocaleDateString('id-ID', { month: 'short' })}
                  </div>
                  <div className="font-display text-lg font-bold leading-none text-slate-200">
                    {new Date(log.check_in_at).getDate()}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-mono text-emerald-400">IN {formatTime(log.check_in_at)}</span>
                    {log.check_out_at ? (
                      <span className="font-mono text-slate-500">OUT {formatTime(log.check_out_at)}</span>
                    ) : (
                      <span className="font-mono text-xs text-amber-400">Active</span>
                    )}
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-slate-500">
                    {log.lat?.toFixed(4)}, {log.long?.toFixed(4)}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <FraudBadge status={log.fraud_status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
