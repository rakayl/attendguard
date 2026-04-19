# 🛡️ AttendGuard — Production-Ready Attendance System

A full-stack attendance system with **anti fake-GPS**, **polygon geofence**, and **dynamic RBAC**.

## Quick Start (Docker — 3 commands)

```bash
cp .env.example .env          # edit DB_PASS and JWT_SECRET
docker compose up -d          # builds + starts everything
# Wait ~20 seconds, then open:
# Frontend  →  http://localhost:3000
# API       →  http://localhost:8080
```

Default login: `admin@company.com` / `admin123`

---

## Architecture

```
┌──────────────────┐   JWT + Axios    ┌──────────────────────────┐
│  React 18 (Vite) │ ─────────────── ▶│  Golang (Gin) REST API   │
│  Tailwind CSS    │                  │  Clean Architecture       │
│  Zustand stores  │                  │  ├── handler/             │
│  Leaflet maps    │                  │  ├── service/             │
└──────────────────┘                  │  ├── repository/          │
                                      │  └── middleware/           │
                                      └────────────┬─────────────┘
                                                   │ GORM
                                      ┌────────────▼─────────────┐
                                      │       PostgreSQL 16        │
                                      │  users, roles, perms       │
                                      │  attendance_logs           │
                                      │  geofence_zones/points     │
                                      │  fraud_flags, devices      │
                                      └──────────────────────────┘
```

---

## Feature Matrix

| Feature | Status | Details |
|---------|--------|---------|
| JWT Authentication | ✅ | Login, Register, 24h token |
| Dynamic RBAC | ✅ | Roles + Permissions fully dynamic |
| Check-in / Check-out | ✅ | GPS verified |
| **Fake GPS Hard Block** | ✅ | 403 if `is_mock=true`, no record saved |
| **Polygon Geofence** | ✅ | Ray-casting, multiple zones, 403 if outside |
| Geofence Admin UI | ✅ | Interactive Leaflet polygon editor |
| Fraud Scoring | ✅ | Accuracy, speed, clock, device flags |
| Admin Dashboard | ✅ | All attendance + fraud monitor |
| User Management | ✅ | CRUD + role assignment |
| Role Management | ✅ | CRUD + permission matrix |
| Permission Management | ✅ | CRUD + module grouping |
| Device Tracking | ✅ | Register + validate device |
| Leaflet Maps | ✅ | User pin + polygon zones |

---

## Geofence System

### How It Works

```
Check-in Request
      │
      ▼
┌─────────────────────────────────┐
│  1. is_mock = true?             │──▶ 403 FAKE_GPS  (no DB record)
├─────────────────────────────────┤
│  2. Outside all active zones?   │──▶ 403 OUTSIDE_ZONE + distance
├─────────────────────────────────┤
│  3. Inside at least one zone ✓  │──▶ Proceed to fraud scoring
└─────────────────────────────────┘
      │
      ▼
  Fraud Scoring (never blocks, only flags + scores):
  ├── GPS Accuracy > 50m    → +20 pts
  ├── GPS Accuracy > 150m   → +40 pts
  ├── Speed > 200 km/h      → +50 pts
  ├── Speed > 500 km/h      → +80 pts
  ├── Clock drift 2–10 min  → +30 pts
  ├── Clock drift > 10 min  → +60 pts
  └── Unregistered device   → +20 pts

  Score 0–39   → SAFE
  Score 40–79  → SUSPICIOUS
  Score ≥ 80   → FRAUD
```

### Polygon Algorithm

Uses **Ray Casting** (Jordan curve theorem):
- Works for any convex or concave polygon
- Handles self-intersections gracefully
- O(n) per check where n = number of vertices

### Open Mode

If **no active geofence zones** exist → all locations accepted (prevents lockout on first setup).

---

## API Reference

### Auth
| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/api/auth/login` | `{email, password}` |
| POST | `/api/auth/register` | `{name, email, password}` |

### Attendance
| Method | Endpoint | Permission |
|--------|----------|------------|
| POST | `/api/attendance/check-in` | `attendance:check_in` |
| POST | `/api/attendance/check-out` | `attendance:check_out` |
| GET | `/api/attendance/history` | `attendance:view_own` |
| GET | `/api/attendance/:id/fraud` | `attendance:view_own` |

### Geofence
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/geofence/active` | Any authenticated |
| POST | `/api/geofence/check` | Any authenticated |
| GET | `/api/geofence` | `geofence:manage` |
| POST | `/api/geofence` | `geofence:manage` |
| PUT | `/api/geofence/:id` | `geofence:manage` |
| DELETE | `/api/geofence/:id` | `geofence:manage` |
| PATCH | `/api/geofence/:id/toggle` | `geofence:manage` |

### Users / Roles / Permissions
| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/api/users` | `user:view` |
| POST | `/api/users` | `user:create` |
| PUT | `/api/users/:id` | `user:update` |
| DELETE | `/api/users/:id` | `user:delete` |
| PATCH | `/api/users/:id/role` | `user:assign_role` |
| GET/POST | `/api/roles` | `role:view` / `role:create` |
| PUT | `/api/roles/:id/permissions` | `role:update` |
| GET/POST | `/api/permissions` | `permission:view` / `permission:create` |

### Admin
| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/api/admin/attendance` | `attendance:view_all` |
| GET | `/api/admin/attendance/fraud` | `attendance:view_fraud` |

---

## Default Roles

| Role | Key Permissions |
|------|----------------|
| **admin** (system) | All 22 permissions |
| **manager** | view_all + view_fraud + user:view |
| **hr** | user management + view_all |
| **employee** | check_in + check_out + view_own |

---

## Environment Variables

### Root `.env` (for Docker Compose)
```bash
API_PORT=8080
WEB_PORT=3000
DB_USER=postgres
DB_PASS=supersecretpassword
DB_NAME=attendance_db
JWT_SECRET=<64-char-random>
OFFICE_LAT=-6.200000
OFFICE_LONG=106.816666
GEOFENCE_RADIUS=200
```

### Backend `backend/.env` (for manual run)
Same variables as above, plus `DB_HOST=localhost`.

### Frontend `frontend/.env` (for manual dev)
```bash
VITE_API_URL=/api
VITE_OFFICE_LAT=-6.200000
VITE_OFFICE_LNG=106.816666
VITE_GEOFENCE_RADIUS=200
```

---

## Manual Setup (without Docker)

### Backend
```bash
# 1. Create DB
psql -U postgres -c "CREATE DATABASE attendance_db;"

# 2. Set up env
cd backend && cp .env.example .env && nano .env

# 3. Run (auto-migrates + seeds on first start)
go run cmd/main.go
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev     # http://localhost:5173
```

---

## Production Checklist

- [ ] Change `JWT_SECRET` to a random 64+ char string
- [ ] Set strong `DB_PASS`
- [ ] Set `GIN_MODE=release`
- [ ] Configure HTTPS (add Let's Encrypt to nginx.conf)
- [ ] Set real `OFFICE_LAT/LONG` for the seed zone
- [ ] Draw actual geofence polygon via admin UI
- [ ] Add rate limiting (e.g. `github.com/ulule/limiter`)
- [ ] Set up DB backups

---

## Project Structure

```
attendance-system/
├── .env.example                    ← Root env for Docker Compose
├── docker-compose.yml
├── Makefile                        ← Dev shortcuts
├── migration.sql                   ← Full SQL schema + seeds
├── AttendGuard.postman_collection.json
│
├── backend/
│   ├── cmd/main.go                 ← Entry point + DI wiring
│   ├── config/config.go            ← Config, DB, seeds
│   ├── .air.toml                   ← Hot-reload config
│   └── internal/
│       ├── handler/
│       │   ├── handler.go          ← Auth, Attendance, Device, Admin
│       │   ├── rbac_handler.go     ← User, Role, Permission
│       │   └── geofence_handler.go ← Geofence CRUD
│       ├── service/
│       │   ├── attendance_service.go  ← Hard blocks + check-in logic
│       │   ├── fraud_service.go       ← Scoring engine
│       │   ├── geofence_service.go    ← Ray-casting polygon check
│       │   ├── auth_service.go        ← JWT with permissions
│       │   ├── rbac_service.go        ← Permission/Role/User mgmt
│       │   └── other_services.go      ← Device, Admin
│       ├── repository/
│       │   ├── repository.go          ← User, Attendance, Device
│       │   ├── rbac_repository.go     ← Permission, Role
│       │   └── geofence_repository.go ← Zone + Points
│       ├── model/model.go             ← All GORM models
│       └── middleware/middleware.go    ← JWT, RequirePermission, Logger
│
└── frontend/
    └── src/
        ├── api/
        │   ├── axios.js            ← Axios instance + interceptors
        │   ├── services.js         ← Attendance, Device, Admin
        │   └── geofence.js         ← Geofence API calls
        ├── store/
        │   ├── authStore.js        ← JWT + user + can()
        │   ├── attendanceStore.js  ← Check-in/out + history
        │   ├── rbacStore.js        ← Users, Roles, Permissions
        │   └── geofenceStore.js    ← Zones + checkPoint()
        ├── components/
        │   ├── Layout.jsx          ← Protected layout + refreshMe
        │   ├── Sidebar.jsx         ← Permission-aware navigation
        │   ├── AttendanceMap.jsx   ← Leaflet with polygon zones
        │   └── FraudComponents.jsx ← Badge, Score bar, Flag list
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── DashboardPage.jsx
        │   ├── CheckInPage.jsx     ← GPS + zone pre-check + block UI
        │   ├── HistoryPage.jsx
        │   ├── DevicesPage.jsx
        │   ├── AdminPage.jsx
        │   ├── FraudMonitorPage.jsx
        │   ├── UsersManagementPage.jsx
        │   ├── RolesPage.jsx       ← Permission matrix editor
        │   ├── PermissionsPage.jsx
        │   └── GeofencePage.jsx    ← Polygon map editor
        └── utils/
            ├── gps.js              ← Geolocation + device ID
            └── usePermission.js    ← can() hook + <Can> component
```
