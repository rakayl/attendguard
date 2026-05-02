import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Platform, StatusBar, Switch,
} from 'react-native'
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions'
import MapView, { Marker, Polygon, Circle } from 'react-native-maps'
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '../../theme'
import { useAttendanceStore } from '../../store/attendanceStore'
import { useGeofenceStore } from '../../store/geofenceStore'
import { useAuthStore } from '../../store/authStore'
import { buildLocalFaceSample, getCurrentLocation, getDeviceInfo } from '../../utils/location'
import { Card, FraudBadge, FraudScoreBar, FraudFlagItem, BlockAlert, Button } from '../../components/UI'

interface LocationData {
  lat: number
  long: number
  accuracy: number
  is_mock: boolean
}

interface ZoneStatus {
  inside_any_zone: boolean
  zone_name?: string
  distance_out_meters?: number
}

export const CheckInScreen = () => {
  const { checkIn, checkOut, currentAttendance, loading } = useAttendanceStore()
  const { activeZones, fetchActiveZones, checkPoint } = useGeofenceStore()
  const { user, isAdmin } = useAuthStore()

  const [location, setLocation] = useState<LocationData | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [zoneStatus, setZoneStatus] = useState<ZoneStatus | null>(null)
  const [zoneChecking, setZoneChecking] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [blockInfo, setBlockInfo] = useState<{ code: string; reason: string } | null>(null)
  const [simulateFakeGps, setSimulateFakeGps] = useState(false)
  const [faceImage, setFaceImage] = useState('')

  const isCheckedIn = !!currentAttendance
  const adminTestingFakeGps = isAdmin() && simulateFakeGps
  const isBlocked = adminTestingFakeGps || (zoneStatus !== null && !zoneStatus.inside_any_zone)
  const canCaptureFace = !!location && !gpsLoading && !!zoneStatus?.inside_any_zone && !adminTestingFakeGps

  useEffect(() => {
    fetchActiveZones()
    requestLocationAndFetch()
  }, [])

  // Pre-check zone when location changes
  useEffect(() => {
    if (!location) return
    setZoneChecking(true)
    checkPoint(location.lat, location.long)
      .then(setZoneStatus)
      .catch(() => setZoneStatus(null))
      .finally(() => setZoneChecking(false))
  }, [location?.lat, location?.long])

  const requestLocationAndFetch = async () => {
    const permission = Platform.OS === 'ios'
      ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
      : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION

    const result = await request(permission)
    if (result === RESULTS.GRANTED) {
      fetchLocation()
    } else {
      setGpsError('Location permission denied. Enable in Settings → AttendGuard → Location.')
    }
  }

  const fetchLocation = async () => {
    setGpsLoading(true)
    setGpsError('')
    setZoneStatus(null)
    setBlockInfo(null)
    try {
      const loc = await getCurrentLocation()
      setLocation(loc)
    } catch (err: any) {
      setGpsError(err.message)
    } finally {
      setGpsLoading(false)
    }
  }

  const handleCheckIn = async () => {
    if (!location) { Alert.alert('Error', 'Enable GPS first'); return }

    if (adminTestingFakeGps) {
      setBlockInfo({ code: 'FAKE_GPS', reason: 'Disable GPS spoofing apps and try again.' })
      return
    }
    if (!faceImage) {
      setBlockInfo({ code: 'FACE_REQUIRED', reason: 'Capture face recognition after location is inside zone.' })
      return
    }

    const deviceInfo = await getDeviceInfo()
    const payload = {
      lat: location.lat,
      long: location.long,
      accuracy: location.accuracy,
      is_mock: location.is_mock || adminTestingFakeGps,
      face_image: faceImage,
      device_time: new Date().toISOString(),
      device_id: deviceInfo.device_id,
    }

    const res = await checkIn(payload)
    if (res.success) {
      setResult(res.data)
      setFaceImage('')
      setBlockInfo(null)
    } else if (res.blocked) {
      setBlockInfo({ code: res.code!, reason: res.error! })
    } else {
      Alert.alert('Failed', res.error)
    }
  }

  const handleCheckOut = async () => {
    if (!location) { Alert.alert('Error', 'Enable GPS first'); return }

    if (adminTestingFakeGps || location.is_mock) {
      setBlockInfo({ code: 'FAKE_GPS', reason: 'Fake GPS detected. Cannot check out.' })
      return
    }
    if (!faceImage) {
      setBlockInfo({ code: 'FACE_REQUIRED', reason: 'Capture face recognition after location is inside zone.' })
      return
    }

    const deviceInfo = await getDeviceInfo()
    const payload = {
      lat: location.lat,
      long: location.long,
      accuracy: location.accuracy,
      is_mock: false,
      face_image: faceImage,
      device_time: new Date().toISOString(),
      device_id: deviceInfo.device_id,
    }

    const res = await checkOut(payload)
    if (res.success) {
      setResult(res.data)
      setFaceImage('')
      setBlockInfo(null)
    } else if (res.blocked) {
      setBlockInfo({ code: res.code!, reason: res.error! })
    } else {
      Alert.alert('Failed', res.error)
    }
  }

  const captureFace = async () => {
    if (!canCaptureFace) return
    const sample = await buildLocalFaceSample(user?.id)
    setFaceImage(sample)
    setBlockInfo(null)
  }

  const mapRegion = location ? {
    latitude: location.lat,
    longitude: location.long,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : {
    latitude: -6.2,
    longitude: 106.816,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Map */}
      <MapView
        style={styles.map}
        region={mapRegion}
        customMapStyle={darkMapStyle}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {/* Geofence polygons */}
        {activeZones.map((zone) =>
          zone.points?.length >= 3 ? (
            <Polygon
              key={zone.id}
              coordinates={zone.points.map((p) => ({ latitude: p.lat, longitude: p.long }))}
              strokeColor={zone.color || Colors.primary}
              fillColor={(zone.color || Colors.primary) + '25'}
              strokeWidth={2}
            />
          ) : null
        )}

        {/* User location marker */}
        {location && (
          <Marker coordinate={{ latitude: location.lat, longitude: location.long }}>
            <View style={[styles.userMarker, {
              borderColor: isBlocked ? Colors.fraud : result?.fraud_status === 'SUSPICIOUS' ? Colors.suspicious : Colors.safe,
              shadowColor: isBlocked ? Colors.fraud : Colors.safe,
            }]}>
              <Text style={styles.userMarkerIcon}>📍</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Bottom sheet */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Block alert */}
        {(adminTestingFakeGps || blockInfo) && (
          <BlockAlert
            code={adminTestingFakeGps ? 'FAKE_GPS' : blockInfo?.code || ''}
            message={adminTestingFakeGps
              ? 'Fake GPS simulator is ON. Disable it to check in.'
              : blockInfo?.reason || ''}
          />
        )}

        {/* Zone status */}
        {location && !gpsLoading && (
          <View style={[styles.zoneCard, {
            borderColor: zoneChecking ? Colors.border
              : zoneStatus?.inside_any_zone ? Colors.safeBorder
              : zoneStatus ? Colors.fraudBorder : Colors.border,
            backgroundColor: zoneChecking ? Colors.bgCard
              : zoneStatus?.inside_any_zone ? Colors.safeBg
              : zoneStatus ? Colors.fraudBg : Colors.bgCard,
          }]}>
            <Text style={styles.zoneIcon}>
              {zoneChecking ? '⌛' : zoneStatus?.inside_any_zone ? '✅' : zoneStatus ? '❌' : '📍'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.zoneText, {
                color: zoneChecking ? Colors.textMuted
                  : zoneStatus?.inside_any_zone ? Colors.safe
                  : zoneStatus ? Colors.fraud : Colors.textMuted,
              }]}>
                {zoneChecking ? 'Checking geofence...'
                  : zoneStatus?.inside_any_zone
                    ? `Inside: ${zoneStatus.zone_name || 'Attendance Zone'}`
                    : zoneStatus ? 'Outside attendance zone'
                    : 'Zone status unknown'}
              </Text>
              {zoneStatus && !zoneStatus.inside_any_zone && (zoneStatus.distance_out_meters || 0) > 0 && (
                <Text style={styles.zoneDistance}>
                  {Math.round(zoneStatus.distance_out_meters!)}m from nearest boundary
                </Text>
              )}
              {activeZones.length === 0 && (
                <Text style={styles.zoneDistance}>No zones configured — open mode</Text>
              )}
            </View>
          </View>
        )}

        {/* GPS info */}
        <View style={styles.gpsRow}>
          {gpsLoading ? (
            <Text style={styles.gpsLoading}>⌛ Acquiring GPS signal...</Text>
          ) : gpsError ? (
            <Text style={styles.gpsError}>⚠ {gpsError}</Text>
          ) : location ? (
            <>
              <View style={styles.gpsStat}>
                <Text style={styles.gpsStatLabel}>LAT</Text>
                <Text style={styles.gpsStatValue}>{location.lat.toFixed(5)}</Text>
              </View>
              <View style={styles.gpsStat}>
                <Text style={styles.gpsStatLabel}>LONG</Text>
                <Text style={styles.gpsStatValue}>{location.long.toFixed(5)}</Text>
              </View>
              <View style={styles.gpsStat}>
                <Text style={styles.gpsStatLabel}>ACC</Text>
                <Text style={[styles.gpsStatValue, location.accuracy > 50 && { color: Colors.suspicious }]}>
                  ±{location.accuracy.toFixed(0)}m
                </Text>
              </View>
            </>
          ) : null}
          <TouchableOpacity onPress={fetchLocation} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>↻</Text>
          </TouchableOpacity>
        </View>

        {/* Active session info */}
        {currentAttendance && !result && (
          <View style={styles.activeSession}>
            <View style={styles.sessionPulse} />
            <Text style={styles.sessionText}>
              Active since {new Date(currentAttendance.check_in_at!).toLocaleTimeString()}
            </Text>
            <FraudBadge status={currentAttendance.fraud_status} size="sm" />
          </View>
        )}

        <View style={[styles.faceCard, faceImage && styles.faceCardReady]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Face Recognition</Text>
            <Text style={styles.toggleSub}>
              {faceImage ? 'Face sample captured' : 'Available after GPS is inside zone'}
            </Text>
          </View>
          <Button
            title={faceImage ? 'Recapture' : 'Capture'}
            onPress={captureFace}
            disabled={!canCaptureFace}
            variant={faceImage ? 'ghost' : 'secondary'}
          />
        </View>

        {isAdmin() && (
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Simulate Fake GPS</Text>
              <Text style={styles.toggleSub}>Admin testing only</Text>
            </View>
            <Switch
              value={simulateFakeGps}
              onValueChange={(v) => { setSimulateFakeGps(v); setBlockInfo(null) }}
              trackColor={{ false: Colors.bgElevated, true: Colors.fraud }}
              thumbColor={Colors.white}
            />
          </View>
        )}

        {/* Main action button */}
        <TouchableOpacity
          style={[styles.actionBtn,
            isBlocked ? styles.actionBtnBlocked
            : isCheckedIn ? styles.actionBtnOut
            : styles.actionBtnIn,
          ]}
          onPress={isCheckedIn ? handleCheckOut : handleCheckIn}
          disabled={loading || gpsLoading || !location || isBlocked || !faceImage}
          activeOpacity={0.85}
        >
          {loading ? (
            <Text style={styles.actionBtnText}>⏳ Processing...</Text>
          ) : isBlocked ? (
            <Text style={styles.actionBtnText}>🚫 Check-in Blocked</Text>
          ) : isCheckedIn ? (
            <Text style={styles.actionBtnText}>⏹  Check Out</Text>
          ) : (
            <Text style={styles.actionBtnText}>▶  Check In</Text>
          )}
        </TouchableOpacity>

        {/* Result */}
        {result && !blockInfo && (
          <Card style={[styles.resultCard, {
            borderColor: result.fraud_status === 'FRAUD' ? Colors.fraudBorder
              : result.fraud_status === 'SUSPICIOUS' ? Colors.suspiciousBorder
              : Colors.safeBorder,
          }]}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Attendance Recorded</Text>
              <FraudBadge status={result.fraud_status} />
            </View>
            <View style={{ marginTop: 12 }}>
              <FraudScoreBar score={result.fraud_score} status={result.fraud_status} />
            </View>
            {result.fraud_flags?.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.flagsTitle}>Fraud Flags</Text>
                {result.fraud_flags.map((flag: any, i: number) => (
                  <FraudFlagItem key={i} flag={flag} />
                ))}
              </View>
            )}
          </Card>
        )}
      </ScrollView>
    </View>
  )
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0f1e' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
]

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  map: { height: 260 },
  sheet: { flex: 1, backgroundColor: Colors.bg },
  sheetContent: { padding: Spacing.xl, paddingBottom: 40, gap: 12 },
  zoneCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: Radius.md, borderWidth: 1 },
  zoneIcon: { fontSize: 20 },
  zoneText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  zoneDistance: { fontSize: FontSize.xs, color: Colors.fraud, marginTop: 2 },
  gpsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  gpsStat: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: 10, borderWidth: 1, borderColor: Colors.border },
  gpsStatLabel: { fontSize: 9, color: Colors.textMuted, fontFamily: 'monospace', textTransform: 'uppercase' },
  gpsStatValue: { fontSize: FontSize.sm, color: Colors.textPrimary, fontFamily: 'monospace', marginTop: 2 },
  gpsLoading: { flex: 1, fontSize: FontSize.sm, color: Colors.textMuted },
  gpsError: { flex: 1, fontSize: FontSize.xs, color: Colors.fraud },
  refreshBtn: { width: 40, height: 40, backgroundColor: Colors.bgCard, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  refreshText: { fontSize: 20, color: Colors.primary },
  activeSession: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.safeBg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.safeBorder, padding: 12 },
  sessionPulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.safe },
  sessionText: { flex: 1, fontSize: FontSize.sm, color: Colors.safe, fontWeight: FontWeight.medium },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  faceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  faceCardReady: { backgroundColor: Colors.safeBg, borderColor: Colors.safeBorder },
  toggleLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  toggleSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  actionBtn: { borderRadius: Radius.xl, height: 58, alignItems: 'center', justifyContent: 'center' },
  actionBtnIn: { backgroundColor: Colors.primary, ...Shadow.cyan },
  actionBtnOut: { backgroundColor: Colors.fraud },
  actionBtnBlocked: { backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
  actionBtnText: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.bg },
  resultCard: { marginTop: 4 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  flagsTitle: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 8 },
  userMarker: { width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  userMarkerIcon: { fontSize: 22 },
})
