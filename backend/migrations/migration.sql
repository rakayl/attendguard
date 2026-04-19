-- =============================================================
-- AttendGuard — Full Database Migration with RBAC
-- =============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Permissions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) UNIQUE NOT NULL,       -- e.g. "attendance:check_in"
    display_name VARCHAR(100)        NOT NULL,
    module       VARCHAR(50)         NOT NULL,        -- e.g. "attendance"
    description  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);

-- ── Roles ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100)        NOT NULL,
    description  TEXT,
    is_system    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Role ↔ Permission (many-to-many) ─────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       INTEGER NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100)         NOT NULL,
    email      VARCHAR(100) UNIQUE  NOT NULL,
    password   VARCHAR(255)         NOT NULL,
    role_id    INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email   ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- ── Attendance Logs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_logs (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lat          DOUBLE PRECISION NOT NULL,
    long         DOUBLE PRECISION NOT NULL,
    accuracy     DOUBLE PRECISION NOT NULL DEFAULT 0,
    check_in_at  TIMESTAMPTZ,
    check_out_at TIMESTAMPTZ,
    device_time  TIMESTAMPTZ,
    server_time  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fraud_score  INTEGER     NOT NULL DEFAULT 0,
    fraud_status VARCHAR(20) NOT NULL DEFAULT 'SAFE',
    is_mock      BOOLEAN     NOT NULL DEFAULT FALSE,
    device_id    VARCHAR(255),
    ip_address   VARCHAR(50),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id      ON attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_fraud_status ON attendance_logs(fraud_status);

-- ── Fraud Flags ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fraud_flags (
    id            SERIAL PRIMARY KEY,
    attendance_id INTEGER     NOT NULL REFERENCES attendance_logs(id) ON DELETE CASCADE,
    type          VARCHAR(50) NOT NULL,
    score         INTEGER     NOT NULL DEFAULT 0,
    description   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_attendance_id ON fraud_flags(attendance_id);

-- ── Devices ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id   VARCHAR(255) NOT NULL,
    device_name VARCHAR(100),
    platform    VARCHAR(50),
    trusted     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_user_device ON devices(user_id, device_id);

-- =============================================================
-- SEED DATA
-- =============================================================

-- ── Permissions ──────────────────────────────────────────────
INSERT INTO permissions (name, display_name, module, description) VALUES
  ('attendance:check_in',   'Check In',             'attendance', 'Submit check-in attendance'),
  ('attendance:check_out',  'Check Out',            'attendance', 'Submit check-out attendance'),
  ('attendance:view_own',   'View Own History',     'attendance', 'View personal attendance history'),
  ('attendance:view_all',   'View All Attendance',  'attendance', 'View all employees attendance'),
  ('attendance:view_fraud', 'View Fraud Reports',   'attendance', 'View fraud detection reports'),
  ('user:view',             'View Users',           'user',       'View user list'),
  ('user:create',           'Create Users',         'user',       'Create new user accounts'),
  ('user:update',           'Update Users',         'user',       'Update user information'),
  ('user:delete',           'Delete Users',         'user',       'Delete user accounts'),
  ('user:assign_role',      'Assign Roles',         'user',       'Assign roles to users'),
  ('role:view',             'View Roles',           'role',       'View role list'),
  ('role:create',           'Create Roles',         'role',       'Create new roles'),
  ('role:update',           'Update Roles',         'role',       'Update role settings'),
  ('role:delete',           'Delete Roles',         'role',       'Delete roles'),
  ('permission:view',       'View Permissions',     'permission', 'View permission list'),
  ('permission:create',     'Create Permissions',   'permission', 'Create new permissions'),
  ('permission:update',     'Update Permissions',   'permission', 'Update permissions'),
  ('permission:delete',     'Delete Permissions',   'permission', 'Delete permissions'),
  ('device:register',       'Register Device',      'device',     'Register own device'),
  ('device:view',           'View Devices',         'device',     'View own devices'),
  ('admin:access',          'Admin Access',         'admin',      'General admin panel access')
ON CONFLICT (name) DO NOTHING;

-- ── Roles ────────────────────────────────────────────────────
INSERT INTO roles (name, display_name, description, is_system) VALUES
  ('admin',    'System Administrator', 'Full system access — cannot be deleted', TRUE),
  ('manager',  'Manager',             'Can view all attendance and fraud reports', FALSE),
  ('hr',       'HR Staff',            'Can manage users and view attendance records', FALSE),
  ('employee', 'Employee',            'Standard employee — check in/out only', FALSE)
ON CONFLICT (name) DO NOTHING;

-- ── Role-Permission assignments ──────────────────────────────
-- admin: all permissions
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- manager
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.name = 'manager'
    AND p.name IN ('attendance:check_in','attendance:check_out','attendance:view_own',
                   'attendance:view_all','attendance:view_fraud','user:view',
                   'device:register','device:view','admin:access')
ON CONFLICT DO NOTHING;

-- hr
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.name = 'hr'
    AND p.name IN ('attendance:view_all','attendance:view_fraud','user:view',
                   'user:create','user:update','user:assign_role','admin:access')
ON CONFLICT DO NOTHING;

-- employee
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.name = 'employee'
    AND p.name IN ('attendance:check_in','attendance:check_out','attendance:view_own',
                   'device:register','device:view')
ON CONFLICT DO NOTHING;

-- ── Admin user (password: admin123) ─────────────────────────
INSERT INTO users (name, email, password, role_id, is_active)
SELECT 'Administrator', 'admin@company.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  r.id, TRUE
FROM roles r WHERE r.name = 'admin'
ON CONFLICT (email) DO NOTHING;

-- ── Demo employee (password: employee123) ────────────────────
INSERT INTO users (name, email, password, role_id, is_active)
SELECT 'John Employee', 'employee@company.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  r.id, TRUE
FROM roles r WHERE r.name = 'employee'
ON CONFLICT (email) DO NOTHING;

-- ── Demo manager (password: manager123) ──────────────────────
INSERT INTO users (name, email, password, role_id, is_active)
SELECT 'Jane Manager', 'manager@company.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  r.id, TRUE
FROM roles r WHERE r.name = 'manager'
ON CONFLICT (email) DO NOTHING;

-- =============================================================
-- Useful admin queries
-- =============================================================

-- View all users with their roles and permission count:
-- SELECT u.id, u.name, u.email, r.display_name as role,
--   COUNT(rp.permission_id) as permission_count
-- FROM users u
-- LEFT JOIN roles r ON r.id = u.role_id
-- LEFT JOIN role_permissions rp ON rp.role_id = r.id
-- GROUP BY u.id, u.name, u.email, r.display_name;

-- View permissions grouped by role:
-- SELECT r.name as role, string_agg(p.name, ', ' ORDER BY p.module, p.name) as permissions
-- FROM roles r
-- JOIN role_permissions rp ON rp.role_id = r.id
-- JOIN permissions p ON p.id = rp.permission_id
-- GROUP BY r.name ORDER BY r.name;

-- =============================================================
-- GEOFENCE TABLES (added in v2)
-- =============================================================

CREATE TABLE IF NOT EXISTS geofence_zones (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    color       VARCHAR(20)  NOT NULL DEFAULT '#06b6d4',
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geofence_points (
    id       SERIAL PRIMARY KEY,
    zone_id  INTEGER          NOT NULL REFERENCES geofence_zones(id) ON DELETE CASCADE,
    lat      DOUBLE PRECISION NOT NULL,
    long     DOUBLE PRECISION NOT NULL,
    sequence INTEGER          NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_geofence_points_zone_id ON geofence_points(zone_id);

-- Add geofence:manage permission
INSERT INTO permissions (name, display_name, module, description)
VALUES ('geofence:manage', 'Manage Geofence', 'geofence', 'Create, update and delete geofence polygon zones')
ON CONFLICT (name) DO NOTHING;

-- Grant geofence:manage to admin role
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.name = 'admin' AND p.name = 'geofence:manage'
ON CONFLICT DO NOTHING;

-- Sample geofence zone: ~200m box around Jakarta Pusat office
INSERT INTO geofence_zones (name, description, color, is_active)
VALUES ('Main Office', 'Default attendance zone — edit in Geofence manager', '#06b6d4', TRUE);

INSERT INTO geofence_points (zone_id, lat, long, sequence)
SELECT id, -6.1982, 106.8144, 0 FROM geofence_zones WHERE name = 'Main Office' LIMIT 1;
INSERT INTO geofence_points (zone_id, lat, long, sequence)
SELECT id, -6.1982, 106.8188, 1 FROM geofence_zones WHERE name = 'Main Office' LIMIT 1;
INSERT INTO geofence_points (zone_id, lat, long, sequence)
SELECT id, -6.2018, 106.8188, 2 FROM geofence_zones WHERE name = 'Main Office' LIMIT 1;
INSERT INTO geofence_points (zone_id, lat, long, sequence)
SELECT id, -6.2018, 106.8144, 3 FROM geofence_zones WHERE name = 'Main Office' LIMIT 1;
