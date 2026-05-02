# AttendGuard Mobile — Android Setup Guide

## Prerequisites

Install the following before starting:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18 LTS+ | https://nodejs.org |
| JDK | 17 (Temurin) | https://adoptium.net |
| Android Studio | Latest | https://developer.android.com/studio |
| React Native CLI | Latest | `npm install -g react-native-cli` |

---

## Step 1 — Install Android Studio

1. Download and install **Android Studio**
2. Open Android Studio → **More Actions** → **SDK Manager**
3. Under **SDK Platforms**, check:
   - Android 14 (API 34) — recommended
   - Android 13 (API 33)
4. Under **SDK Tools**, check:
   - Android SDK Build-Tools 34
   - Android SDK Command-line Tools (latest)
   - Android Emulator
   - Android SDK Platform-Tools
5. Click **Apply** to install

---

## Step 2 — Configure Environment Variables

### macOS / Linux (add to `~/.bashrc` or `~/.zshrc`):
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk      # macOS
# export ANDROID_HOME=$HOME/Android/Sdk            # Linux

export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

Then reload:
```bash
source ~/.bashrc   # or source ~/.zshrc
```

### Windows:
1. Search **Environment Variables** in Start Menu
2. Add `ANDROID_HOME` = `C:\Users\YourName\AppData\Local\Android\Sdk`
3. Add to **Path**: `%ANDROID_HOME%\platform-tools`
4. Restart Command Prompt

### Verify:
```bash
adb --version
# Should print: Android Debug Bridge version 1.0.xx
```

---

## Step 3 — Create Android Emulator

1. Open Android Studio → **Device Manager**
2. Click **Create Device**
3. Select: **Pixel 7** (recommended)
4. Select system image: **API 34** (download if needed)
5. Click **Finish**
6. Start the emulator by clicking the ▶ button

Or create via command line:
```bash
# List available device definitions
avdmanager list device

# Create emulator
avdmanager create avd -n AttendGuard -k "system-images;android-34;google_apis;x86_64" -d pixel_7

# Start emulator
emulator -avd AttendGuard
```

---

## Step 4 — Extract and Setup Project

```bash
# Extract the project
tar -xzf AttendGuardMobile.tar.gz
cd AttendGuardMobile

# Install npm dependencies
npm install

# Install iOS pods (skip if Android only)
# cd ios && pod install && cd ..
```

---

## Step 5 — Configure Backend URL

Edit `src/api/client.ts` and change the API URL:

```typescript
// For Android Emulator (10.0.2.2 maps to your Mac/PC localhost)
export const API_BASE_URL = 'http://10.0.2.2:8080/api'

// For Physical Device (use your computer's local IP)
// Find your IP: ifconfig | grep "inet " (Mac/Linux) or ipconfig (Windows)
export const API_BASE_URL = 'http://192.168.1.xxx:8080/api'

// For Production
export const API_BASE_URL = 'https://your-api-domain.com/api'
```

---

## Step 6 — Start Backend Server

Make sure your AttendGuard backend is running:

```bash
cd attendance-system
docker compose up -d

# Verify it's running
curl http://localhost:8080/health
```

---

## Step 7 — Run on Android

### Start Metro bundler (in one terminal):
```bash
cd AttendGuardMobile
npm start
```

### Build and run on emulator (in another terminal):
```bash
npm run android
# or
npx react-native run-android
```

### First run takes 3-5 minutes to build.

### If you see the app launch on the emulator → ✅ Success!

---

## Step 8 — Run on Physical Device

1. Enable **Developer Options** on your Android phone:
   - Go to **Settings → About Phone**
   - Tap **Build Number** 7 times
   
2. Enable **USB Debugging**:
   - Go to **Settings → Developer Options**
   - Toggle **USB Debugging** ON

3. Connect phone via USB, then:
   ```bash
   # Verify device is detected
   adb devices
   # Should show: List of devices attached
   #              XXXXXXXX  device
   
   # Run on device
   npx react-native run-android
   ```

---

## Step 9 — Generate APK (Release Build)

### Debug APK (for testing):
```bash
cd android
./gradlew assembleDebug

# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK:

1. Generate keystore (one time only):
```bash
keytool -genkey -v -keystore attendguard.keystore \
  -alias attendguard -keyalg RSA -keysize 2048 -validity 10000
```

2. Place `attendguard.keystore` in `android/app/`

3. Edit `android/gradle.properties`:
```properties
MYAPP_UPLOAD_STORE_FILE=attendguard.keystore
MYAPP_UPLOAD_KEY_ALIAS=attendguard
MYAPP_UPLOAD_STORE_PASSWORD=your_password
MYAPP_UPLOAD_KEY_PASSWORD=your_password
```

4. Edit `android/app/build.gradle`, add in `signingConfigs`:
```groovy
release {
    storeFile file(MYAPP_UPLOAD_STORE_FILE)
    storePassword MYAPP_UPLOAD_STORE_PASSWORD
    keyAlias MYAPP_UPLOAD_KEY_ALIAS
    keyPassword MYAPP_UPLOAD_KEY_PASSWORD
}
```

5. Build release APK:
```bash
cd android
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
```

---

## Troubleshooting

### Metro bundler error
```bash
npx react-native start --reset-cache
```

### Android build fails
```bash
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

### App can't connect to API
- Check that backend is running: `curl http://localhost:8080/health`
- For emulator: use `10.0.2.2` not `localhost`
- For physical device: use your computer's local IP (e.g. `192.168.1.100`)
- Make sure firewall allows port 8080

### GPS not working in emulator
1. Open emulator → **... (three dots)** → **Location**
2. Set a custom latitude/longitude
3. Click **Set Location**

### "isMockLocation" detection
On Android, if a developer mock location app is active, `position.coords.isMockLocation` will be `true`. The app will block check-in with code `FAKE_GPS`.

---

## App Features Summary

| Screen | Features |
|--------|---------|
| **Login** | JWT auth, demo credentials, register |
| **Dashboard** | Stats, active session, recent history, pull-to-refresh |
| **Check In/Out** | Live GPS, polygon geofence on map, fake GPS detection, fraud result |
| **History** | Filter by status, detail modal with fraud flags |
| **Admin Attendance** | All/fraud tabs, search, stats |
| **Admin Users** | CRUD users, role assignment, toggle active |
| **Profile** | Permissions view, device registration, logout |

## Fraud Detection on Mobile

| Situation | Result |
|-----------|--------|
| `isMockLocation = true` | ❌ Hard blocked (403) — no record saved |
| Outside all geofence zones | ❌ Hard blocked (403) + distance shown |
| GPS accuracy > 50m | ⚠️ +20 fraud score |
| Clock drift > 2 min | ⚠️ +30 fraud score |
| Unregistered device | ⚠️ +20 fraud score |
