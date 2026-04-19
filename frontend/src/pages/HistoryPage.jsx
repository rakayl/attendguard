import React, { useEffect, useState } from 'react'
import { useAttendanceStore } from '../store/attendanceStore'
import { getFraudDetail } from '../api/services'
import { FraudBadge, FraudScore, FraudFlagList } from '../components/FraudComponents'

const HistoryPage = () => {
  const { history, fetchHistory, loading } = useAttendanceStore()
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleSelect = async (log) => {
    setSelected(log)
    setDetailLoading(true)
    try {
      const res = await getFraudDetail(log.id)
      setDetail(res.data.attendance)
    } catch {
      setDetail(log)
    } finally {
      setDetailLoading(false)
    }
  }

  const filteredHistory = history.filter((h) =>
    filter === 'ALL' ? true : h.fraud_status === filter
  )

  const formatDateTime = (t) => {
    if (!t) return '—'
    return new Date(t).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const calcDuration = (inAt, outAt) => {
    if (!inAt || !outAt) return null
    const diff = new Date(outAt) - new Date(inAt)
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return `${h}h ${m}m`
  }

  return (
    <div className="p-6 lg:p-8 animate-slide-up">
      <div className="flex items-start gap-6">
        {/* Left: list */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Header + filter */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Attendance History</h1>
              <p className="text-slate-500 text-sm mt-0.5">{history.length} total records</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
            {['ALL', 'SAFE', 'SUSPICIOUS', 'FRAUD'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                  filter === f
                    ? f === 'SAFE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : f === 'SUSPICIOUS'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : f === 'FRAUD'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-slate-700 text-slate-200'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-3xl mb-3">📋</div>
              <p className="text-slate-500 text-sm">No records found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((log) => (
                <div
                  key={log.id}
                  onClick={() => handleSelect(log)}
                  className={`card p-4 cursor-pointer transition-all hover:border-slate-600 ${
                    selected?.id === log.id ? 'border-cyan-500/50 bg-cyan-500/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Date column */}
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex flex-col items-center justify-center flex-shrink-0">
                      <div className="text-[9px] text-slate-500 font-mono leading-none uppercase">
                        {new Date(log.check_in_at || log.created_at).toLocaleDateString('en', { month: 'short' })}
                      </div>
                      <div className="text-base font-display font-bold text-slate-100 leading-none">
                        {new Date(log.check_in_at || log.created_at).getDate()}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-emerald-400">↑ {new Date(log.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        {log.check_out_at && (
                          <>
                            <span className="text-slate-700">–</span>
                            <span className="text-slate-400">↓ {new Date(log.check_out_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="text-slate-600">({calcDuration(log.check_in_at, log.check_out_at)})</span>
                          </>
                        )}
                        {!log.check_out_at && <span className="text-amber-400">• Active</span>}
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono mt-0.5 truncate">
                        {log.lat?.toFixed(5)}, {log.long?.toFixed(5)}
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className={`text-sm font-bold font-mono ${
                          log.fraud_score >= 80 ? 'text-red-400' : log.fraud_score >= 40 ? 'text-amber-400' : 'text-slate-500'
                        }`}>
                          {log.fraud_score}
                        </div>
                        <div className="text-[10px] text-slate-600 font-mono">score</div>
                      </div>
                      <FraudBadge status={log.fraud_status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        {selected && (
          <div className="w-80 flex-shrink-0 space-y-4 animate-slide-up sticky top-8">
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">Detail</span>
                <button
                  onClick={() => { setSelected(null); setDetail(null) }}
                  className="text-slate-600 hover:text-slate-400 text-lg leading-none transition-colors"
                >
                  ×
                </button>
              </div>

              {detailLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : detail ? (
                <>
                  <FraudScore score={detail.fraud_score} status={detail.fraud_status} />
                  <div className="flex justify-center">
                    <FraudBadge status={detail.fraud_status} />
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {[
                      { label: 'Check In', value: formatDateTime(detail.check_in_at) },
                      { label: 'Check Out', value: formatDateTime(detail.check_out_at) },
                      { label: 'Duration', value: calcDuration(detail.check_in_at, detail.check_out_at) || 'In progress' },
                      { label: 'GPS Coords', value: `${detail.lat?.toFixed(5)}, ${detail.long?.toFixed(5)}` },
                      { label: 'Accuracy', value: `±${detail.accuracy?.toFixed(0)}m` },
                      { label: 'Mock GPS', value: detail.is_mock ? '⚠ YES' : 'No' },
                      { label: 'Device ID', value: detail.device_id || '—' },
                      { label: 'IP Address', value: detail.ip_address || '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between gap-2">
                        <span className="text-slate-500 font-mono shrink-0">{label}</span>
                        <span className={`text-slate-300 font-mono text-right truncate ${
                          label === 'Mock GPS' && detail.is_mock ? 'text-red-400' : ''
                        }`}>
                          {value || '—'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {detail.fraud_flags && detail.fraud_flags.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="text-xs text-slate-500 font-mono uppercase tracking-wider">Fraud Flags</div>
                      <FraudFlagList flags={detail.fraud_flags} />
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HistoryPage
