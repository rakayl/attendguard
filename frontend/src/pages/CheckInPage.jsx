import React, { useState, useEffect, lazy, Suspense } from 'react'
import { useAttendanceStore } from '../store/attendanceStore'
import { useGeofenceStore } from '../store/geofenceStore'
import { useAuthStore } from '../store/authStore'
import { getLocation, getDeviceInfo } from '../utils/gps'
import { enrollMyFace } from '../api/services'
import { FraudBadge, FraudScore, FraudFlagList } from '../components/FraudComponents'
import FaceCapture from '../components/FaceCapture'

const AttendanceMap = lazy(() => import('../components/AttendanceMap'))

const CheckInPage = () => {
  const { checkIn, checkOut, currentAttendance, fetchHistory, loading } = useAttendanceStore()
  const { activeZones, fetchActiveZones, checkPoint } = useGeofenceStore()
  const { user } = useAuthStore()
  const isAdmin = user?.role?.name === 'admin'

  const [gpsLoading, setGpsLoading] = useState(false)
  const [location, setLocation] = useState(null)
  const [gpsError, setGpsError] = useState('')
  const [result, setResult] = useState(null)
  const [isMockGps, setIsMockGps] = useState(false)
  const [faceImage, setFaceImage] = useState('')
  const [blockInfo, setBlockInfo] = useState(null) // { code, reason } when hard-blocked
  const [zoneStatus, setZoneStatus] = useState(null) // ZoneCheckResult
  const [zoneChecking, setZoneChecking] = useState(false)
  const [faceEnrollLoading, setFaceEnrollLoading] = useState(false)

  useEffect(() => {
    fetchHistory()
    fetchActiveZones()
  }, [])

  // When location changes, run geofence pre-check
  useEffect(() => {
    if (!location) return
    setZoneChecking(true)
    checkPoint(location.lat, location.long)
      .then((res) => setZoneStatus(res))
      .catch(() => setZoneStatus(null))
      .finally(() => setZoneChecking(false))
  }, [location])

  const getGPS = async () => {
    setGpsLoading(true)
    setGpsError('')
    setZoneStatus(null)
    setBlockInfo(null)
    try {
      const loc = await getLocation()
      setLocation(loc)
    } catch (err) {
      setGpsError(err.message)
    } finally {
      setGpsLoading(false)
    }
  }

  useEffect(() => { getGPS() }, [])

  const handleCheckIn = async () => {
    if (!location) { setGpsError('Please enable GPS first'); return }

    // Client-side mock GPS block
    if (isAdmin && isMockGps) {
      setBlockInfo({ code: 'FAKE_GPS', reason: 'Fake/mock GPS detected. Disable GPS spoofing apps and try again.' })
      return
    }
    if (!faceImage) {
      setBlockInfo({ code: 'FACE_REQUIRED', reason: 'Capture your face after GPS is inside the attendance zone.' })
      return
    }

    const deviceInfo = getDeviceInfo()
    const payload = {
      lat: location.lat, long: location.long, accuracy: location.accuracy,
      is_mock: isAdmin && isMockGps, face_image: faceImage, device_time: new Date().toISOString(),
      device_id: deviceInfo.device_id,
    }

    const res = await checkIn(payload)
    if (res.success) {
      setResult(res.data)
      setFaceImage('')
      setBlockInfo(null)
    } else if (res.blocked) {
      setBlockInfo({ code: res.code, reason: res.error })
    }
  }

  const handleCheckOut = async () => {
    if (!location) { setGpsError('Please enable GPS first'); return }
    if (isAdmin && isMockGps) {
      setBlockInfo({ code: 'FAKE_GPS', reason: 'Fake/mock GPS detected. Disable GPS spoofing apps and try again.' })
      return
    }
    if (!faceImage) {
      setBlockInfo({ code: 'FACE_REQUIRED', reason: 'Capture your face after GPS is inside the attendance zone.' })
      return
    }

    const deviceInfo = getDeviceInfo()
    const payload = {
      lat: location.lat, long: location.long, accuracy: location.accuracy,
      is_mock: isAdmin && isMockGps, face_image: faceImage, device_time: new Date().toISOString(),
      device_id: deviceInfo.device_id,
    }

    const res = await checkOut(payload)
    if (res.success) {
      setResult(res.data)
      setFaceImage('')
      setBlockInfo(null)
    } else if (res.blocked) {
      setBlockInfo({ code: res.code, reason: res.error })
    }
  }

  const isCheckedIn = !!currentAttendance
  const isBlocked = (isAdmin && isMockGps) || (zoneStatus && !zoneStatus.inside_any_zone)
  const canCaptureFace = !!location && !gpsLoading && !!zoneStatus?.inside_any_zone && !(isAdmin && isMockGps)

  const handleEnrollMyFace = async () => {
    if (!faceImage) {
      setBlockInfo({ code: 'FACE_REQUIRED', reason: 'Capture a face sample before enrolling.' })
      return
    }
    setFaceEnrollLoading(true)
    setBlockInfo(null)
    try {
      await enrollMyFace(faceImage)
    } catch (err) {
      setBlockInfo({ code: 'FACE_REQUIRED', reason: err.response?.data?.error || 'Face enrollment failed.' })
    } finally {
      setFaceEnrollLoading(false)
    }
  }

  const formatTime = (t) => {
    if (!t) return '—'
    return new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="p-6 lg:p-8 space-y-5 animate-slide-up max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-white">{isCheckedIn ? 'Check Out' : 'Check In'}</h1>
        <p className="text-slate-500 text-sm mt-1">GPS & geofence verification required</p>
      </div>

      {/* ── Hard Block Alert ─────────────────────────────────────────────── */}
      {((isAdmin && isMockGps) || blockInfo) && (
        <div className="card p-5 border-red-500/40 bg-red-500/10 glow-red animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-2xl flex-shrink-0">🚫</div>
            <div>
              <div className="font-display font-bold text-red-400 mb-1">
                {isAdmin && isMockGps ? 'Fake GPS Detected - Check-in Blocked' : blockInfo?.code === 'OUTSIDE_ZONE' ? 'Outside Attendance Zone - Blocked' : blockInfo?.code === 'FACE_REQUIRED' ? 'Face Recognition Required' : 'Check-in Blocked'}
              </div>
              <p className="text-sm text-red-300/80">
                {isAdmin && isMockGps
                  ? 'Your device is reporting a mock/fake GPS location. Disable any GPS spoofing or fake location apps, then try again. This action is logged.'
                  : blockInfo?.reason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Geofence Zone Status ─────────────────────────────────────────── */}
      {location && !gpsLoading && (
        <div className={`card p-4 border transition-colors ${
          zoneChecking ? 'border-slate-700' :
          zoneStatus?.inside_any_zone ? 'border-emerald-500/30 bg-emerald-500/5' :
          zoneStatus ? 'border-red-500/30 bg-red-500/10' : 'border-slate-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
              zoneChecking ? 'bg-slate-800' :
              zoneStatus?.inside_any_zone ? 'bg-emerald-500/20' :
              zoneStatus ? 'bg-red-500/20' : 'bg-slate-800'
            }`}>
              {zoneChecking ? '⌛' : zoneStatus?.inside_any_zone ? '✅' : zoneStatus ? '❌' : '📍'}
            </div>
            <div className="flex-1">
              <div className={`text-sm font-semibold ${
                zoneChecking ? 'text-slate-400' :
                zoneStatus?.inside_any_zone ? 'text-emerald-400' :
                zoneStatus ? 'text-red-400' : 'text-slate-400'
              }`}>
                {zoneChecking ? 'Checking geofence...' :
                 zoneStatus?.inside_any_zone ? `Inside zone: ${zoneStatus.zone_name || 'Attendance Area'}` :
                 zoneStatus ? 'Outside all attendance zones' : 'Zone status unknown'}
              </div>
              {zoneStatus && !zoneStatus.inside_any_zone && zoneStatus.distance_out_meters > 0 && (
                <div className="text-xs text-red-300/70 mt-0.5">
                  You are <strong>{Math.round(zoneStatus.distance_out_meters)}m</strong> away from the nearest boundary
                </div>
              )}
              {activeZones.length === 0 && (
                <div className="text-xs text-slate-500 mt-0.5">No geofence zones configured — open mode active</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── GPS Card ─────────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">GPS Location</span>
          <button onClick={getGPS} disabled={gpsLoading} className="text-xs text-cyan-400 hover:text-cyan-300 font-mono transition-colors disabled:opacity-50">
            {gpsLoading ? '◌ Locating...' : '↻ Refresh'}
          </button>
        </div>

        {gpsError && (
          <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <span>⚠</span><span>{gpsError}</span>
          </div>
        )}

        {gpsLoading && (
          <div className="flex items-center gap-3 text-slate-400 text-sm py-4">
            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span>Acquiring GPS signal...</span>
          </div>
        )}

        {location && !gpsLoading && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Latitude', value: location.lat.toFixed(6) },
                { label: 'Longitude', value: location.long.toFixed(6) },
                { label: 'Accuracy', value: `±${location.accuracy.toFixed(0)}m`, warning: location.accuracy > 50 },
              ].map(({ label, value, warning }) => (
                <div key={label} className="bg-slate-800 rounded-xl p-3">
                  <div className="text-[10px] text-slate-500 font-mono uppercase">{label}</div>
                  <div className={`text-sm font-mono mt-1 ${warning ? 'text-amber-400' : 'text-slate-200'}`}>{value}</div>
                </div>
              ))}
            </div>

            <Suspense fallback={<div className="h-64 bg-slate-800 rounded-xl animate-pulse" />}>
              <AttendanceMap
                userLat={location.lat}
                userLng={location.long}
                status={result?.fraud_status || currentAttendance?.fraud_status}
                zones={activeZones}
              />
            </Suspense>
          </>
        )}

        {/* Mock GPS toggle (admin testing only) */}
        {isAdmin && <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div>
            <div className="text-xs text-slate-400 font-medium">Simulate Fake GPS</div>
            <div className="text-[10px] text-slate-600 font-mono">For testing — triggers immediate block</div>
          </div>
          <button onClick={() => { setIsMockGps(!isMockGps); setBlockInfo(null) }}
            className={`relative w-11 h-6 rounded-full transition-all ${isMockGps ? 'bg-red-500' : 'bg-slate-700'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isMockGps ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>}
      </div>

      <FaceCapture value={faceImage} onCapture={setFaceImage} disabled={!canCaptureFace} />
      {faceImage && (
        <button onClick={handleEnrollMyFace} disabled={faceEnrollLoading} className="btn-secondary w-full text-sm disabled:opacity-50">
          {faceEnrollLoading ? 'Saving face profile...' : 'Enroll / Replace My Face Profile'}
        </button>
      )}

      {/* Active check-in info */}
      {currentAttendance && (
        <div className="card p-4 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="relative w-2.5 h-2.5">
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
              <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75" />
            </div>
            <span className="text-sm font-semibold text-emerald-400">Active Session</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[10px] text-slate-500 font-mono">Check In</div>
              <div className="text-slate-200 font-mono">{formatTime(currentAttendance.check_in_at)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-mono">Status</div>
              <FraudBadge status={currentAttendance.fraud_status} />
            </div>
          </div>
        </div>
      )}

      {/* Main action button */}
      <button
        onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
        disabled={loading || gpsLoading || !location || isBlocked || !faceImage}
        className={`w-full py-4 rounded-2xl font-display font-bold text-lg transition-all duration-200 active:scale-[0.98] ${
          isBlocked
            ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
            : isCheckedIn
            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40'
            : 'bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40'
        } disabled:opacity-60`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />Processing...
          </span>
        ) : isBlocked
          ? '🚫 Check-in Blocked'
          : isCheckedIn ? '⏹  Check Out' : '▶  Check In'}
      </button>

      {/* Fraud result */}
      {result && !blockInfo && (
        <div className={`card p-5 space-y-4 animate-slide-up ${
          result.fraud_status === 'FRAUD' ? 'border-red-500/30 bg-red-500/5 glow-red' :
          result.fraud_status === 'SUSPICIOUS' ? 'border-amber-500/30 bg-amber-500/5' :
          'border-emerald-500/30 bg-emerald-500/5'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-display font-semibold text-white">Attendance Recorded</span>
            <FraudBadge status={result.fraud_status} />
          </div>
          <FraudScore score={result.fraud_score} status={result.fraud_status} />
          {result.fraud_flags?.length > 0 && (
            <>
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider">Fraud Flags</div>
              <FraudFlagList flags={result.fraud_flags} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default CheckInPage
