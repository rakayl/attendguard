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
  const platformIcon = (platform) => ({ android: 'A', ios: 'I', web: 'W' }[platform] || 'D')
  const formatDate = (value) =>
    new Date(value).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="card px-5 py-6 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.28em] text-slate-500">Device Security</div>
            <h1 className="mt-2 font-display text-2xl font-bold text-slate-100 sm:text-3xl">Registered Devices</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Manage devices allowed to submit attendance. Unknown devices trigger fraud alerts.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:w-auto">
            <div className="rounded-2xl border border-slate-800 bg-slate-800/60 px-4 py-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Total Devices</div>
              <div className="mt-1 text-lg font-semibold text-slate-100">{devices.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-800/60 px-4 py-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Current Status</div>
              <div className="mt-1 text-lg font-semibold text-slate-100">{isCurrentRegistered ? 'Trusted' : 'Pending'}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
        <section className="card border-cyan-500/20 bg-cyan-500/5 p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Current Device</div>
              <div className="mt-2 text-lg font-semibold text-slate-100">{currentDevice.device_name}</div>
              <div className="mt-1 text-xs font-mono uppercase tracking-wider text-slate-500">{currentDevice.platform}</div>
            </div>
            {isCurrentRegistered ? (
              <span className="badge-safe self-start">Registered</span>
            ) : (
              <span className="badge-suspicious self-start">Unregistered</span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Device ID', currentDevice.device_id],
              ['Platform', currentDevice.platform],
              ['Name', currentDevice.device_name],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</div>
                <div className="mt-2 break-all text-sm font-medium text-slate-200">{value}</div>
              </div>
            ))}
          </div>

          {!isCurrentRegistered && (
            <button
              onClick={handleRegister}
              disabled={registering}
              className="btn-primary mt-5 w-full text-sm sm:w-auto"
            >
              {registering ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  Registering...
                </span>
              ) : (
                'Register This Device'
              )}
            </button>
          )}

          {message && (
            <div
              className={`mt-4 rounded-xl px-3 py-2 text-xs font-mono ${
                message.includes('success') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}
            >
              {message}
            </div>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Registry</div>
              <div className="mt-1 text-lg font-semibold text-slate-100">All Registered Devices</div>
            </div>
            <button onClick={fetchDevices} disabled={loading} className="btn-secondary w-full text-sm sm:w-auto">
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            </div>
          ) : devices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-800/60 text-lg font-bold text-slate-300">
                D
              </div>
              <p className="mt-4 text-sm font-medium text-slate-200">No devices registered yet</p>
              <p className="mt-1 text-sm text-slate-500">Register your main work device to reduce fraud-score false positives.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/35 p-4 transition-colors hover:bg-slate-900/55"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-800/70 text-sm font-bold text-slate-200">
                        {platformIcon(device.platform)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-100">{device.device_name || 'Unknown Device'}</div>
                        <div className="mt-1 break-all text-[11px] font-mono text-slate-500">{device.device_id}</div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[340px]">
                      <div className="rounded-xl border border-slate-800 bg-slate-800/50 px-3 py-2">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Added</div>
                        <div className="mt-1 text-xs font-medium text-slate-200">{formatDate(device.created_at)}</div>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-800/50 px-3 py-2">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Platform</div>
                        <div className="mt-1 text-xs font-medium capitalize text-slate-200">{device.platform}</div>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-800/50 px-3 py-2">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Status</div>
                        <div className="mt-1">
                          <span className={device.trusted ? 'badge-safe' : 'badge-suspicious'}>
                            {device.trusted ? 'Trusted' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card border-slate-800 p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-slate-500">
          <span className="font-semibold text-slate-300">How it works:</span> When you submit attendance from an unregistered
          device, the system adds +15 to your fraud score. Register your primary work devices to avoid false positives.
        </p>
      </section>
    </div>
  )
}

export default DevicesPage
