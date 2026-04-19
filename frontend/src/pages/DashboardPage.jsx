import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useAttendanceStore } from '../store/attendanceStore'
import { FraudBadge, FraudScore } from '../components/FraudComponents'

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
    <div className={`card p-5 bg-gradient-to-br ${colors[color]}`}>
      <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-3xl font-display font-bold ${textColors[color]}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

const DashboardPage = () => {
  const { user } = useAuthStore()
  const { history, currentAttendance, fetchHistory, loading } = useAttendanceStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchHistory()
  }, [])

  const totalDays = history.filter((h) => h.check_in_at).length
  const fraudCount = history.filter((h) => h.fraud_status === 'FRAUD').length
  const suspiciousCount = history.filter((h) => h.fraud_status === 'SUSPICIOUS').length
  const safeCount = history.filter((h) => h.fraud_status === 'SAFE').length

  const recentLogs = history.slice(0, 5)

  const formatTime = (t) => {
    if (!t) return '—'
    return new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (t) => {
    if (!t) return '—'
    return new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
            <span className="text-cyan-400">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/checkin')}
          className="btn-primary text-sm"
        >
          {currentAttendance ? '⏹ Check Out' : '▶ Check In'}
        </button>
      </div>

      {/* Active check-in alert */}
      {currentAttendance && (
        <div className="gradient-border p-5 glow-cyan">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-3 h-3">
                <div className="w-3 h-3 bg-emerald-400 rounded-full" />
                <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Currently Checked In</div>
                <div className="text-xs text-slate-400 font-mono">
                  Since {formatTime(currentAttendance.check_in_at)}
                </div>
              </div>
            </div>
            <FraudBadge status={currentAttendance.fraud_status} />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Records" value={totalDays} sub="All time" color="cyan" />
        <StatCard label="Safe" value={safeCount} sub="Clean attendance" color="emerald" />
        <StatCard label="Suspicious" value={suspiciousCount} sub="Under review" color="amber" />
        <StatCard label="Fraud" value={fraudCount} sub="Flagged" color="red" />
      </div>

      {/* Recent attendance */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-slate-200">Recent Attendance</h2>
          <button
            onClick={() => navigate('/history')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
          >
            View all →
          </button>
        </div>

        {loading ? (
          <div className="card p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentLogs.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-slate-500 text-sm">No attendance records yet.</p>
            <button onClick={() => navigate('/checkin')} className="btn-primary mt-4 text-sm">
              Check In Now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="card p-4 flex items-center gap-4 hover:border-slate-700 transition-colors cursor-pointer"
                onClick={() => navigate('/history')}
              >
                {/* Date */}
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex flex-col items-center justify-center flex-shrink-0">
                  <div className="text-xs text-slate-500 font-mono leading-none">
                    {new Date(log.check_in_at).toLocaleDateString('id-ID', { month: 'short' })}
                  </div>
                  <div className="text-lg font-display font-bold text-slate-200 leading-none">
                    {new Date(log.check_in_at).getDate()}
                  </div>
                </div>

                {/* Times */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-emerald-400 font-mono">
                      ↑ {formatTime(log.check_in_at)}
                    </span>
                    {log.check_out_at && (
                      <span className="text-slate-500 font-mono">
                        ↓ {formatTime(log.check_out_at)}
                      </span>
                    )}
                    {!log.check_out_at && (
                      <span className="text-amber-400 text-xs font-mono">• Active</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 font-mono">
                    {log.lat?.toFixed(4)}, {log.long?.toFixed(4)}
                  </div>
                </div>

                {/* Fraud status */}
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
