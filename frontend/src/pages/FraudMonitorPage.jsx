import React, { useEffect, useState } from 'react'
import { useAttendanceStore } from '../store/attendanceStore'
import { FraudBadge, FraudScore, FraudFlagList } from '../components/FraudComponents'

const FraudMonitorPage = () => {
  const { fraudAttendance, fetchFraudAttendance, loading } = useAttendanceStore()
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetchFraudAttendance()
  }, [])

  const fraudCount = fraudAttendance.filter((a) => a.fraud_status === 'FRAUD').length
  const suspiciousCount = fraudAttendance.filter((a) => a.fraud_status === 'SUSPICIOUS').length

  const formatDateTime = (t) => {
    if (!t) return '—'
    return new Date(t).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="p-6 lg:p-8 animate-slide-up">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-white">Fraud Monitor</h1>
          {fraudAttendance.length > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/30 font-mono">
              {fraudAttendance.length} alerts
            </span>
          )}
        </div>
        <p className="text-slate-500 text-sm mt-1">
          Real-time view of suspicious and fraudulent attendance records
        </p>
      </div>

      {/* Alert summary */}
      {(fraudCount > 0 || suspiciousCount > 0) && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card p-4 border-red-500/20 bg-red-500/5 glow-red">
            <div className="text-xs text-red-400/70 font-mono uppercase tracking-wider mb-1">Confirmed Fraud</div>
            <div className="text-3xl font-display font-bold text-red-400">{fraudCount}</div>
            <div className="text-xs text-slate-500 mt-1">Score ≥ 80</div>
          </div>
          <div className="card p-4 border-amber-500/20 bg-amber-500/5">
            <div className="text-xs text-amber-400/70 font-mono uppercase tracking-wider mb-1">Suspicious</div>
            <div className="text-3xl font-display font-bold text-amber-400">{suspiciousCount}</div>
            <div className="text-xs text-slate-500 mt-1">Score 40–79</div>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* List */}
        <div className="flex-1 min-w-0 space-y-3">
          {loading ? (
            <div className="card p-16 flex justify-center">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : fraudAttendance.length === 0 ? (
            <div className="card p-16 text-center">
              <div className="text-4xl mb-3">🛡️</div>
              <h3 className="font-display font-semibold text-slate-300 mb-1">All Clear</h3>
              <p className="text-slate-500 text-sm">No suspicious or fraudulent attendance detected</p>
            </div>
          ) : (
            fraudAttendance.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelected(selected?.id === log.id ? null : log)}
                className={`card p-5 cursor-pointer transition-all hover:border-slate-600 ${
                  selected?.id === log.id
                    ? 'border-red-500/40 bg-red-500/5'
                    : log.fraud_status === 'FRAUD'
                    ? 'border-red-500/20'
                    : 'border-amber-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {log.user?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200 text-sm">{log.user?.name || 'Unknown User'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{log.user?.email}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div>
                        <div className="text-[9px] text-slate-600 font-mono uppercase">Check In</div>
                        <div className="text-xs text-slate-400 font-mono">{formatDateTime(log.check_in_at)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-600 font-mono uppercase">Location</div>
                        <div className="text-xs text-slate-400 font-mono">{log.lat?.toFixed(4)}, {log.long?.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-600 font-mono uppercase">Flags</div>
                        <div className="text-xs text-slate-400">{log.fraud_flags?.length || 0} detected</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <FraudBadge status={log.fraud_status} />
                    <div className={`text-lg font-bold font-mono ${
                      log.fraud_score >= 80 ? 'text-red-400' : 'text-amber-400'
                    }`}>
                      {log.fraud_score}
                    </div>
                  </div>
                </div>

                {/* Inline flags preview */}
                {log.fraud_flags && log.fraud_flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-800">
                    {log.fraud_flags.map((flag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[9px] font-mono border border-slate-700"
                      >
                        {flag.type.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Side detail */}
        {selected && (
          <div className="w-72 flex-shrink-0 animate-slide-up sticky top-8">
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono uppercase">Investigation</span>
                <button
                  onClick={() => setSelected(null)}
                  className="text-slate-600 hover:text-slate-400 text-lg leading-none"
                >
                  ×
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold">
                  {selected.user?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="font-semibold text-slate-100 text-sm">{selected.user?.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{selected.user?.email}</div>
                </div>
              </div>

              <FraudScore score={selected.fraud_score} status={selected.fraud_status} />

              <div className="space-y-2 text-xs font-mono">
                {[
                  ['ID', `#${selected.id}`],
                  ['Check In', formatDateTime(selected.check_in_at)],
                  ['Check Out', formatDateTime(selected.check_out_at)],
                  ['Mock GPS', selected.is_mock ? '⚠️ YES' : 'No'],
                  ['IP', selected.ip_address || '—'],
                  ['Device', selected.device_id?.slice(0, 16) + '...' || '—'],
                  ['Accuracy', `±${selected.accuracy?.toFixed(0)}m`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-slate-500">{k}</span>
                    <span className={`text-right ${k === 'Mock GPS' && selected.is_mock ? 'text-red-400' : 'text-slate-300'}`}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>

              {selected.fraud_flags?.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-xs text-slate-500 font-mono uppercase tracking-wider">Detected Flags</div>
                  <FraudFlagList flags={selected.fraud_flags} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FraudMonitorPage
