import React, { useEffect, useState } from 'react'
import FaceCapture from '../components/FaceCapture'
import { enrollFaceForUser, getFaceProfiles, setFaceProfileActive } from '../api/services'
import { useRbacStore } from '../store/rbacStore'

const FaceManagementPage = () => {
  const { users, fetchUsers } = useRbacStore()
  const [profiles, setProfiles] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [faceImage, setFaceImage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [faceRes] = await Promise.all([getFaceProfiles(), fetchUsers()])
      setProfiles(faceRes.data.profiles || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load face profiles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const enroll = async () => {
    if (!selectedUser || !faceImage) {
      setError('Select a user and capture a face sample first.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await enrollFaceForUser(selectedUser, faceImage)
      setFaceImage('')
      await load()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to enroll face profile')
    } finally {
      setLoading(false)
    }
  }

  const toggle = async (profile) => {
    await setFaceProfileActive(profile.id, !profile.is_active)
    await load()
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-slide-up">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Face Recognition</h1>
        <p className="text-slate-500 text-sm mt-1">Manage employee face profiles for anti proxy attendance.</p>
      </div>

      {error && <div className="card p-4 border-red-500/20 bg-red-500/10 text-sm text-red-400">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5 space-y-4">
          <div>
            <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">Enroll Face Profile</div>
            <select className="input-field" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
              <option value="">Select employee...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} - {u.email}</option>
              ))}
            </select>
          </div>
          <FaceCapture value={faceImage} onCapture={setFaceImage} disabled={!selectedUser || loading} />
          <button onClick={enroll} disabled={!selectedUser || !faceImage || loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Face Profile'}
          </button>
        </div>

        <div className="card p-5">
          <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-4">Architecture Notes</div>
          <div className="space-y-3 text-sm text-slate-400">
            <div><span className="text-cyan-400 font-semibold">Geozone first:</span> attendance is blocked outside active polygon zones.</div>
            <div><span className="text-cyan-400 font-semibold">Face second:</span> face verification runs only after location is valid.</div>
            <div><span className="text-cyan-400 font-semibold">Scale:</span> face templates are compact records; verification can be moved to a worker or ML service behind the same API.</div>
            <div><span className="text-cyan-400 font-semibold">Multi-tenant:</span> tenant id is stored on users, attendance, devices, geofences, and face profiles.</div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="font-display font-semibold text-white">Registered Face Profiles</div>
            <div className="text-xs text-slate-500">{profiles.length} profile records</div>
          </div>
          <button onClick={load} className="btn-secondary text-sm">Refresh</button>
        </div>
        <div className="divide-y divide-slate-800">
          {profiles.length === 0 && !loading ? (
            <div className="p-8 text-center text-sm text-slate-500">No face profiles registered yet.</div>
          ) : profiles.map((profile) => (
            <div key={profile.id} className="px-5 py-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${profile.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {profile.user?.name?.[0] || 'F'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-200">{profile.user?.name || `User #${profile.user_id}`}</div>
                <div className="text-xs text-slate-500 font-mono">template {profile.template_preview} - quality {(profile.quality_score * 100).toFixed(0)}%</div>
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-mono border ${profile.is_active ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-slate-500 bg-slate-800 border-slate-700'}`}>
                {profile.is_active ? 'ACTIVE' : 'INACTIVE'}
              </span>
              <button onClick={() => toggle(profile)} className="btn-secondary text-sm">
                {profile.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default FaceManagementPage
