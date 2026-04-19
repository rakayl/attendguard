import React from 'react'

export const FraudBadge = ({ status, size = 'sm' }) => {
  const classes = {
    SAFE: 'badge-safe',
    SUSPICIOUS: 'badge-suspicious',
    FRAUD: 'badge-fraud',
  }[status] || 'badge-safe'

  const icons = {
    SAFE: '●',
    SUSPICIOUS: '▲',
    FRAUD: '✕',
  }

  return (
    <span className={classes}>
      <span className="text-[8px]">{icons[status]}</span>
      {status}
    </span>
  )
}

export const FraudScore = ({ score, status }) => {
  const color = {
    SAFE: 'bg-emerald-500',
    SUSPICIOUS: 'bg-amber-500',
    FRAUD: 'bg-red-500',
  }[status] || 'bg-emerald-500'

  const textColor = {
    SAFE: 'text-emerald-400',
    SUSPICIOUS: 'text-amber-400',
    FRAUD: 'text-red-400',
  }[status] || 'text-emerald-400'

  const pct = Math.min(score, 100)

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500 font-mono">FRAUD SCORE</span>
        <span className={`text-sm font-bold font-mono ${textColor}`}>{score}/100</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} score-bar rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export const FraudFlagList = ({ flags }) => {
  if (!flags || flags.length === 0) return null

  const flagColors = {
    MOCK_GPS: 'text-red-400 bg-red-500/10 border-red-500/20',
    LOW_ACCURACY: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    HIGH_SPEED: 'text-red-400 bg-red-500/10 border-red-500/20',
    OUTSIDE_GEOFENCE: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    TIME_MANIPULATION: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    NEW_DEVICE: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    IP_MISMATCH: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  }

  const flagIcons = {
    MOCK_GPS: '📍',
    LOW_ACCURACY: '📡',
    HIGH_SPEED: '⚡',
    OUTSIDE_GEOFENCE: '🗺️',
    TIME_MANIPULATION: '🕐',
    NEW_DEVICE: '📱',
    IP_MISMATCH: '🌐',
  }

  return (
    <div className="space-y-2">
      {flags.map((flag, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${flagColors[flag.type] || 'text-slate-400 bg-slate-800 border-slate-700'}`}
        >
          <span className="text-base leading-none mt-0.5">{flagIcons[flag.type] || '⚠️'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold font-mono">{flag.type.replace(/_/g, ' ')}</span>
              <span className="font-mono font-bold">+{flag.score}</span>
            </div>
            <p className="mt-0.5 opacity-80">{flag.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
