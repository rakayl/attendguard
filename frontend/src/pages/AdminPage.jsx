import React, { useEffect, useState } from 'react'
import { useAttendanceStore } from '../store/attendanceStore'
import { FraudBadge, FraudScore } from '../components/FraudComponents'

const AdminPage = () => {
  const { adminAttendance, fetchAdminAttendance, loading } = useAttendanceStore()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')

  useEffect(() => {
    fetchAdminAttendance()
  }, [])

  const filtered = adminAttendance.filter((a) => {
    const matchesStatus = filterStatus === 'ALL' || a.fraud_status === filterStatus
    const matchesSearch =
      !search ||
      a.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.user?.email?.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const stats = {
    total: adminAttendance.length,
    safe: adminAttendance.filter((a) => a.fraud_status === 'SAFE').length,
    suspicious: adminAttendance.filter((a) => a.fraud_status === 'SUSPICIOUS').length,
    fraud: adminAttendance.filter((a) => a.fraud_status === 'FRAUD').length,
  }

  const formatDateTime = (t) => {
    if (!t) return '—'
    return new Date(t).toLocaleString('id-ID', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-slide-up">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">All Attendance</h1>
        <p className="text-slate-500 text-sm mt-1">Monitor all employee attendance records</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', val: stats.total, color: 'text-cyan-400' },
          { label: 'Safe', val: stats.safe, color: 'text-emerald-400' },
          { label: 'Suspicious', val: stats.suspicious, color: 'text-amber-400' },
          { label: 'Fraud', val: stats.fraud, color: 'text-red-400' },
        ].map(({ label, val, color }) => (
          <div key={label} className="card p-4 text-center">
            <div className={`text-2xl font-display font-bold ${color}`}>{val}</div>
            <div className="text-xs text-slate-500 font-mono mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field flex-1"
        />
        <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {['ALL', 'SAFE', 'SUSPICIOUS', 'FRAUD'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                filterStatus === f
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-16 flex justify-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Employee', 'Check In', 'Check Out', 'GPS', 'Score', 'Status'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-xs">
                      No records found
                    </td>
                  </tr>
                ) : (
                  filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">{log.user?.name || 'Unknown'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{log.user?.email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{formatDateTime(log.check_in_at)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{formatDateTime(log.check_out_at)}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                        {log.lat?.toFixed(4)}, {log.long?.toFixed(4)}
                        {log.is_mock && <div className="text-red-400 text-[9px]">⚠ MOCK</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono font-bold text-sm ${
                          log.fraud_score >= 80 ? 'text-red-400' :
                          log.fraud_score >= 40 ? 'text-amber-400' : 'text-slate-500'
                        }`}>
                          {log.fraud_score}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <FraudBadge status={log.fraud_status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPage
