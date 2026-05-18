# AttendGuard Mobile RN

React Native mobile app baru untuk AttendGuard, dibuat terpisah dari web app dan folder mobile lama yang sudah ada.

## Fitur

- Login dengan endpoint existing `POST /api/auth/login`
- Persist token + session user
- Dashboard ringkas
- Check in / check out dengan lokasi, device, dan face capture
- Attendance history
- Daily activity:
  - list
  - create activity
  - detail
  - checklist toggle
  - comment
  - calendar
- Device management
- Face recognition enrollment dan verification
- Team -> Workspace -> Board flow
- Board list/card management mobile
- Geofence active zones dan coordinate check
- Admin attendance/fraud monitor
- Access control viewer untuk users, roles, permissions
- Profile settings:
  - ganti nama
  - ganti password

## Struktur

```txt
AttendGuardMobileRN
  App.tsx
  src/
    api/
    components/
    config/
    navigation/
    screens/
    store/
    theme/
    types/
```

## Setup

1. Masuk ke folder:

```powershell
cd D:\attendguard-v4-final\AttendGuardMobileRN
```

2. Install dependency:

```powershell
npm install
```

3. Set API URL.

Anda bisa memakai environment variable Expo:

```powershell
$env:EXPO_PUBLIC_API_URL="http://10.0.2.2:8080/api"
```

Catatan:
- Android emulator: `http://10.0.2.2:8080/api`
- iOS simulator: `http://localhost:8080/api`
- Device fisik: ganti `localhost` dengan IP LAN komputer Anda, misalnya `http://192.168.1.10:8080/api`

4. Jalankan:

```powershell
npm run start
```

Atau langsung:

```powershell
npm run android
npm run ios
```

## Catatan integrasi

- App ini reuse auth dan API backend existing.
- Flow mobile mengikuti alur web: login -> fitur sesuai permission -> API existing.
- Board tetap dibuka lewat Team -> Workspace -> Board.
- Check-in/out memakai Expo Location, Expo Device, dan Expo Image Picker untuk mengikuti validasi backend yang membutuhkan lokasi, device, dan face image.
