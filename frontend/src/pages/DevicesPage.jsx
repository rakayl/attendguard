import React, { useEffect, useState } from 'react'
import { getDevices, registerDevice } from '../api/services'
import { getDeviceInfo } from '../utils/gps'

const DevicesPage = () => {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [message, setMessage] = useState('')

  const fetchDevices = async () => {
    setLoading(true)
    try {
      const res = await getDevices()
      setDevices(res.data.devices || [])
    } catch {
      setDevices([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
  }, [])

  const handleRegister = async () => {
    setRegistering(true)
    setMessage('')
    try {
      const info = getDeviceInfo()
      await registerDevice(info)
      setMessage('Device registered successfully!')
      fetchDevices()
    } catch (err) {
      setMessage(err.response?.data?.error || 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  const currentDevice = getDeviceInfo()
  const isCurrentRegistered = devices.some((d) => d.device_id === currentDevice.device_id)

  const platformIcon = (p) => ({ android: '🤖', ios: '🍎', web: '🌐' }[p] || '💻')

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-slide-up max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Registered Devices</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage devices allowed to submit attendance. Unknown devices trigger fraud alerts.
        </p>
      </div>

      {/* Current device card */}
      <div className="card p-5 border-cyan-500/20 bg-cyan-500/5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">Current Device</span>
          {isCurrentRegistered ? (
            <span className="badge-safe">✓ Registered</span>
          ) : (
            <span className="badge-suspicious">⚠ Unregistered</span>
          )}
        </div>
        <div className="space-y-2 text-xs font-mono">
          {[
            ['Device ID', currentDevice.device_id],
            ['Platform', currentDevice.platform],
            ['Name', currentDevice.device_name],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-slate-500">{k}</span>
              <span className="text-slate-300 truncate max-w-[200px]">{v}</span>
            </div>
          ))}
        </div>

        {!isCurrentRegistered && (
          <button
            onClick={handleRegister}
            disabled={registering}
            className="btn-primary w-full mt-4 text-sm"
          >
            {registering ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Registering...
              </span>
            ) : (
              '+ Register This Device'
            )}
          </button>
        )}

        {message && (
          <div className={`mt-3 text-xs px-3 py-2 rounded-lg font-mono ${
            message.includes('success') ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Device list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-300">All Registered Devices</span>
          <button
            onClick={fetchDevices}
            disabled={loading}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="card p-8 flex justify-center">
            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : devices.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-2xl mb-2">📱</div>
            <p className="text-slate-500 text-sm">No devices registered yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {devices.map((device) => (
              <div key={device.id} className="card p-4 flex items-center gap-4">
                <div className="text-2xl">{platformIcon(device.platform)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 font-medium">{device.device_name || 'Unknown Device'}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">{device.device_id}</div>
                  <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                    {new Date(device.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={device.trusted ? 'badge-safe' : 'badge-suspicious'}>
                    {device.trusted ? 'Trusted' : 'Pending'}
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono capitalize">{device.platform}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="card p-4 border-slate-800">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="text-slate-400 font-semibold">How it works:</span> When you submit attendance from an unregistered device,
          the system adds +15 to your fraud score. Register your primary work devices to avoid false positives.
        </p>
      </div>
    </div>
  )
}

export default DevicesPage
