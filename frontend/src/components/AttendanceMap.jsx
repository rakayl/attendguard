import React, { useEffect, useRef } from 'react'

const AttendanceMap = ({ userLat, userLng, status, zones = [] }) => {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    import('leaflet').then((L) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)

      const allBoundsPoints = []

      // ── Draw polygon geofence zones ──────────────────────────────────────
      zones.forEach((zone) => {
        if (!zone.points || zone.points.length < 3) return
        const pts = zone.points.map((p) => [p.lat, p.long])
        allBoundsPoints.push(...pts)

        const color = zone.color || '#06b6d4'
        L.polygon(pts, {
          color,
          fillColor: color,
          fillOpacity: zone.is_active ? 0.12 : 0.04,
          weight: zone.is_active ? 2 : 1,
          dashArray: zone.is_active ? null : '6,4',
        }).addTo(map).bindPopup(
          `<div style="font-family:monospace;font-size:12px">
            <strong style="color:${color}">${zone.name}</strong><br/>
            ${zone.is_active ? '✓ Active Zone' : '○ Inactive'}
          </div>`
        )

        // Zone label at centroid
        const centroidLat = pts.reduce((s, p) => s + p[0], 0) / pts.length
        const centroidLng = pts.reduce((s, p) => s + p[1], 0) / pts.length
        L.marker([centroidLat, centroidLng], {
          icon: L.divIcon({
            html: `<div style="font-size:10px;font-family:monospace;font-weight:bold;color:${color};
              background:rgba(0,0,0,.6);padding:2px 6px;border-radius:4px;white-space:nowrap;
              border:1px solid ${color}40;">${zone.name}</div>`,
            className: '',
            iconAnchor: [0, 0],
          }),
          interactive: false,
        }).addTo(map)
      })

      // ── Fallback: show classic circle if no polygon zones configured ─────
      if (zones.length === 0) {
        const OFFICE_LAT = parseFloat(import.meta.env.VITE_OFFICE_LAT || '-6.200000')
        const OFFICE_LNG = parseFloat(import.meta.env.VITE_OFFICE_LNG || '106.816666')
        const RADIUS = parseFloat(import.meta.env.VITE_GEOFENCE_RADIUS || '200')

        L.circle([OFFICE_LAT, OFFICE_LNG], {
          radius: RADIUS,
          color: '#06b6d4',
          fillColor: '#06b6d4',
          fillOpacity: 0.08,
          weight: 1.5,
          dashArray: '6, 4',
        }).addTo(map)

        L.marker([OFFICE_LAT, OFFICE_LNG], {
          icon: L.divIcon({
            html: `<div style="width:36px;height:36px;background:rgba(6,182,212,.2);
              border:2px solid #06b6d4;border-radius:50%;display:flex;align-items:center;
              justify-content:center;font-size:16px;">🏢</div>`,
            className: '', iconSize: [36, 36], iconAnchor: [18, 18],
          }),
        }).addTo(map).bindPopup('<b>Office Location</b>')

        allBoundsPoints.push([OFFICE_LAT, OFFICE_LNG])
      }

      // ── User location marker ─────────────────────────────────────────────
      if (userLat && userLng) {
        const markerColor = {
          SAFE: '#10b981', SUSPICIOUS: '#f59e0b', FRAUD: '#ef4444',
        }[status] || '#10b981'

        L.marker([userLat, userLng], {
          icon: L.divIcon({
            html: `<div style="width:44px;height:44px;background:${markerColor}22;
              border:2.5px solid ${markerColor};border-radius:50%;display:flex;align-items:center;
              justify-content:center;font-size:20px;box-shadow:0 0 20px ${markerColor}55;">📍</div>`,
            className: '', iconSize: [44, 44], iconAnchor: [22, 22],
          }),
        }).addTo(map).bindPopup(
          `<b>Your Location</b><br/>Status: <strong style="color:${markerColor}">${status || 'SAFE'}</strong>`
        )
        allBoundsPoints.push([userLat, userLng])
      }

      // ── Fit bounds ───────────────────────────────────────────────────────
      if (allBoundsPoints.length > 0) {
        try {
          map.fitBounds(L.latLngBounds(allBoundsPoints).pad(0.25))
        } catch {
          map.setView(allBoundsPoints[0], 15)
        }
      } else {
        map.setView([-6.2, 106.816], 14)
      }

      mapInstanceRef.current = map
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [userLat, userLng, status, JSON.stringify(zones)])

  return (
    <div
      ref={mapRef}
      className="w-full rounded-xl overflow-hidden border border-slate-800"
      style={{ height: '280px' }}
    />
  )
}

export default AttendanceMap
