import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useGeofenceStore } from '../store/geofenceStore'

// ── Colour palette for zones ────────────────────────────────────────────────
const PALETTE = ['#06b6d4', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6']

// ── Polygon map editor (Leaflet) ────────────────────────────────────────────
const PolygonEditor = ({ initialPoints = [], onChange, otherZones = [], editColor = '#06b6d4' }) => {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const polygonRef = useRef(null)
  const pointsRef = useRef(initialPoints.map((p) => [p.lat, p.long]))

  const redraw = useCallback((L, map) => {
    // Remove old polygon
    if (polygonRef.current) { polygonRef.current.remove(); polygonRef.current = null }
    const pts = pointsRef.current
    if (pts.length >= 3) {
      polygonRef.current = L.polygon(pts, {
        color: editColor, fillColor: editColor, fillOpacity: 0.15, weight: 2.5,
      }).addTo(map)
    }
    // Remove old markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    pts.forEach((pt, idx) => {
      const icon = L.divIcon({
        html: `<div style="width:20px;height:20px;background:${editColor};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;color:white;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,.4)">${idx + 1}</div>`,
        className: '', iconSize: [20, 20], iconAnchor: [10, 10],
      })
      const m = L.marker(pt, { icon, draggable: true }).addTo(map)
      m.on('drag', (e) => {
        const { lat, lng } = e.target.getLatLng()
        pointsRef.current[idx] = [lat, lng]
        redraw(L, map)
        onChange(pointsRef.current.map(([la, ln]) => ({ lat: la, long: ln })))
      })
      m.on('contextmenu', () => {
        pointsRef.current.splice(idx, 1)
        redraw(L, map)
        onChange(pointsRef.current.map(([la, ln]) => ({ lat: la, long: ln })))
      })
      markersRef.current.push(m)
    })
    onChange(pts.map(([la, ln]) => ({ lat: la, long: ln })))
  }, [editColor, onChange])

  useEffect(() => {
    import('leaflet').then((L) => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }

      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false })
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map)

      // Draw other zones (read-only, greyed out)
      otherZones.forEach((zone) => {
        if (zone.points?.length >= 3) {
          const pts = zone.points.map((p) => [p.lat, p.long])
          L.polygon(pts, { color: zone.color || '#888', fillColor: zone.color || '#888', fillOpacity: 0.08, weight: 1, dashArray: '4,4' })
            .addTo(map)
            .bindTooltip(zone.name, { permanent: false })
        }
      })

      // Click to add points
      map.on('click', (e) => {
        pointsRef.current.push([e.latlng.lat, e.latlng.lng])
        redraw(L, map)
      })

      const initPts = initialPoints.map((p) => [p.lat, p.long])
      pointsRef.current = initPts
      redraw(L, map)

      // Set view
      if (initPts.length > 0) {
        map.fitBounds(L.latLngBounds(initPts).pad(0.3))
      } else if (otherZones.length > 0 && otherZones[0].points?.length > 0) {
        const allPts = otherZones.flatMap((z) => z.points.map((p) => [p.lat, p.long]))
        map.fitBounds(L.latLngBounds(allPts).pad(0.3))
      } else {
        map.setView([-6.2, 106.816], 15)
      }

      mapInstanceRef.current = map
    })
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null } }
  }, []) // eslint-disable-line

  return (
    <div className="space-y-2">
      <div ref={mapRef} className="w-full rounded-xl overflow-hidden border border-slate-700" style={{ height: 360 }} />
      <p className="text-[10px] text-slate-500 font-mono">
        Click on map to add vertex • Drag markers to adjust • Right-click marker to delete
      </p>
    </div>
  )
}

// ── Preview map (read-only) ─────────────────────────────────────────────────
const PreviewMap = ({ zones }) => {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)

  useEffect(() => {
    if (!zones.length) return
    import('leaflet').then((L) => {
      if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null }
      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false })
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map)

      const allPts = []
      zones.forEach((zone) => {
        if (zone.points?.length >= 3) {
          const pts = zone.points.map((p) => [p.lat, p.long])
          allPts.push(...pts)
          L.polygon(pts, {
            color: zone.color || '#06b6d4',
            fillColor: zone.color || '#06b6d4',
            fillOpacity: zone.is_active ? 0.15 : 0.05,
            weight: zone.is_active ? 2.5 : 1,
            dashArray: zone.is_active ? null : '6,4',
          }).addTo(map).bindTooltip(`${zone.name}${zone.is_active ? '' : ' (inactive)'}`, { permanent: false })
        }
      })

      if (allPts.length > 0) {
        map.fitBounds(L.latLngBounds(allPts).pad(0.2))
      } else {
        map.setView([-6.2, 106.816], 14)
      }
      instanceRef.current = map
    })
    return () => { if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null } }
  }, [zones])

  return <div ref={mapRef} className="w-full rounded-xl overflow-hidden border border-slate-800" style={{ height: 300 }} />
}

// ── Zone Modal ──────────────────────────────────────────────────────────────
const ZoneModal = ({ zone, allZones, onClose, onSave }) => {
  const isEdit = !!zone
  const otherZones = allZones.filter((z) => z.id !== zone?.id)
  const [form, setForm] = useState({
    name: zone?.name || '',
    description: zone?.description || '',
    color: zone?.color || PALETTE[0],
    is_active: zone?.is_active ?? true,
  })
  const [points, setPoints] = useState(zone?.points || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (points.length < 3) { setError('Draw at least 3 points on the map to form a polygon'); return }
    setLoading(true); setError('')
    try {
      await onSave({ ...form, points })
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save zone')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="card w-full max-w-3xl my-6 animate-slide-up">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div>
            <h2 className="font-display font-bold text-white">{isEdit ? 'Edit Zone' : 'Create Geofence Zone'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Draw a polygon on the map to define the allowed attendance area</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-2xl">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 border-b border-slate-800">
            {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Zone Name *</label>
                <input className="input-field" placeholder="e.g. Main Office" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Zone Color</label>
                <div className="flex gap-2 flex-wrap">
                  {PALETTE.map((c) => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                      className="w-8 h-8 rounded-lg border-2 transition-all"
                      style={{ background: c, borderColor: form.color === c ? 'white' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-mono mb-1.5 uppercase">Description</label>
              <input className="input-field" placeholder="Optional description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-300 font-medium">Zone Active</div>
                <div className="text-xs text-slate-600">Inactive zones are ignored during check-in</div>
              </div>
              <button type="button" onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className={`relative w-11 h-6 rounded-full transition-all ${form.is_active ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.is_active ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Map editor */}
          <div className="px-6 py-5 border-b border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-slate-300 font-medium">Draw Polygon Zone</div>
                <div className="text-xs text-slate-600">
                  {points.length < 3
                    ? `Add ${3 - points.length} more point${3 - points.length !== 1 ? 's' : ''} to complete the polygon`
                    : `${points.length} vertices — polygon valid ✓`}
                </div>
              </div>
              {points.length > 0 && (
                <button type="button" onClick={() => setPoints([])} className="text-xs text-red-400 hover:text-red-300 font-mono transition-colors">
                  Clear All
                </button>
              )}
            </div>
            <PolygonEditor
              key={form.color}
              initialPoints={points}
              onChange={setPoints}
              otherZones={otherZones}
              editColor={form.color}
            />
          </div>

          <div className="flex gap-3 px-6 py-5">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading || points.length < 3}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />Saving...
                </span>
              ) : isEdit ? 'Save Changes' : 'Create Zone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────
const GeofencePage = () => {
  const { zones, loading, fetchZones, createZone, updateZone, deleteZone, toggleZone } = useGeofenceStore()
  const [modal, setModal] = useState(null) // null | 'create' | zone object
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => { fetchZones() }, [])

  const handleSave = async (payload) => {
    if (modal === 'create') await createZone(payload)
    else await updateZone(modal.id, payload)
  }

  const activeCount = zones.filter((z) => z.is_active).length

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-slide-up">
      {modal && (
        <ZoneModal
          zone={modal === 'create' ? null : modal}
          allZones={zones}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6 animate-slide-up">
            <h3 className="font-display font-bold text-white mb-2">Delete Zone?</h3>
            <p className="text-slate-400 text-sm mb-1">Zone <span className="text-red-400 font-semibold">{confirmDelete.name}</span> will be permanently removed.</p>
            <p className="text-slate-500 text-xs mb-5">Employees will no longer be geofence-checked against this zone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={async () => { await deleteZone(confirmDelete.id); setConfirmDelete(null) }} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Geofence Zones</h1>
          <p className="text-slate-500 text-sm mt-1">
            {activeCount} active zone{activeCount !== 1 ? 's' : ''} — employees must be inside at least one active zone to check in
          </p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary text-sm">+ New Zone</button>
      </div>

      {/* Info banner */}
      {activeCount === 0 && !loading && (
        <div className="card p-4 border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <div className="text-sm font-semibold text-amber-400">No Active Zones</div>
            <div className="text-xs text-slate-400 mt-0.5">
              When no active zones exist, the system runs in <strong className="text-slate-300">open mode</strong> — all locations are accepted. Create and activate at least one zone to enforce geofencing.
            </div>
          </div>
        </div>
      )}

      {/* Preview map */}
      {zones.length > 0 && (
        <div className="card p-5">
          <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-3">Zone Overview</div>
          <PreviewMap zones={zones} />
          <div className="flex gap-4 mt-3">
            {zones.map((z) => (
              <div key={z.id} className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-3 rounded-sm" style={{ background: z.color, opacity: z.is_active ? 1 : 0.4 }} />
                <span className={z.is_active ? 'text-slate-300' : 'text-slate-600'}>{z.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zone list */}
      {loading ? (
        <div className="card p-16 flex justify-center">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : zones.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-4xl mb-3">🗺️</div>
          <h3 className="font-display font-semibold text-slate-300 mb-1">No Zones Configured</h3>
          <p className="text-slate-500 text-sm mb-4">Create your first geofence zone to restrict where employees can check in.</p>
          <button onClick={() => setModal('create')} className="btn-primary text-sm">Create First Zone</button>
        </div>
      ) : (
        <div className="space-y-3">
          {zones.map((zone) => (
            <div key={zone.id} className={`card p-5 transition-all ${zone.is_active ? 'border-slate-700' : 'opacity-60'}`}>
              <div className="flex items-start gap-4">
                {/* Color dot */}
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center border-2"
                  style={{ background: zone.color + '22', borderColor: zone.color }}>
                  <span className="text-lg">🗺️</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-100">{zone.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${zone.is_active ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                      {zone.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                      {zone.points?.length || 0} vertices
                    </span>
                  </div>
                  {zone.description && <p className="text-xs text-slate-500 mt-0.5">{zone.description}</p>}
                  <div className="text-[10px] text-slate-600 font-mono mt-1">
                    Created {new Date(zone.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleZone(zone.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${zone.is_active ? 'text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'}`}>
                    {zone.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => setModal(zone)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-100 bg-slate-800 border border-slate-700 rounded-lg transition-colors">
                    Edit
                  </button>
                  <button onClick={() => setConfirmDelete(zone)} className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="card p-4 border-slate-800">
        <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-3">How It Works</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: '🚫', title: 'Fake GPS → Hard Block', desc: 'If a device reports mock GPS, check-in is rejected immediately and no record is created.' },
            { icon: '📍', title: 'Outside Zone → Hard Block', desc: 'If the user is outside all active polygon zones, check-in is rejected with the distance to the nearest zone.' },
            { icon: '✅', title: 'Inside Any Zone → Allowed', desc: 'If inside any active zone, check-in proceeds. Remaining fraud rules (accuracy, speed, time) still apply for scoring.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex items-start gap-2.5">
              <span className="text-xl flex-shrink-0">{icon}</span>
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-0.5">{title}</div>
                <div className="text-[10px] text-slate-500 leading-relaxed">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default GeofencePage
