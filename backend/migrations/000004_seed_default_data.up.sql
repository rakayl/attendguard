-- ============================================================
-- Migration: 000004_seed_default_data.up.sql
-- Description: Default permissions, roles, admin user
-- ============================================================

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
    ('role:update',           'Update Roles',         'role',       'Update role settings and permissions'),
    ('role:delete',           'Delete Roles',         'role',       'Delete roles'),
    ('permission:view',       'View Permissions',     'permission', 'View permission list'),
    ('permission:create',     'Create Permissions',   'permission', 'Create new permissions'),
    ('permission:update',     'Update Permissions',   'permission', 'Update permissions'),
    ('permission:delete',     'Delete Permissions',   'permission', 'Delete permissions'),
    ('device:register',       'Register Device',      'device',     'Register own device'),
    ('device:view',           'View Devices',         'device',     'View own devices'),
    ('admin:access',          'Admin Access',         'admin',      'General admin panel access'),
    ('geofence:manage',       'Manage Geofence',      'geofence',   'Create, update and delete geofence zones')
ON CONFLICT (name) DO NOTHING;

-- ── Roles ────────────────────────────────────────────────────
INSERT INTO roles (name, display_name, description, is_system) VALUES
    ('admin',    'System Administrator', 'Full system access — cannot be deleted', TRUE),
    ('manager',  'Manager',             'Can view all attendance and fraud reports, manage users', FALSE),
    ('hr',       'HR Staff',            'Can manage users and view attendance records', FALSE),
    ('employee', 'Employee',            'Standard employee — check in/out and view own history', FALSE)
ON CONFLICT (name) DO NOTHING;

-- ── Role Permissions ─────────────────────────────────────────
-- admin: all permissions
INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- manager
INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name = 'manager'
      AND p.name IN (
          'attendance:check_in','attendance:check_out','attendance:view_own',
          'attendance:view_all','attendance:view_fraud',
          'user:view','device:register','device:view','admin:access','geofence:manage'
      )
ON CONFLICT DO NOTHING;

-- hr
INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name = 'hr'
      AND p.name IN (
          'attendance:view_all','attendance:view_fraud',
          'user:view','user:create','user:update','user:assign_role','admin:access'
      )
ON CONFLICT DO NOTHING;

-- employee
INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name = 'employee'
      AND p.name IN (
          'attendance:check_in','attendance:check_out','attendance:view_own',
          'device:register','device:view'
      )
ON CONFLICT DO NOTHING;

-- ── Admin user (password: admin123 — bcrypt) ─────────────────
INSERT INTO users (name, email, password, role_id, is_active)
SELECT
    'Administrator',
    'admin@company.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    r.id,
    TRUE
FROM roles r WHERE r.name = 'admin'
ON CONFLICT (email) DO NOTHING;

-- ── Demo Employee (password: employee123 — bcrypt) ───────────
INSERT INTO users (name, email, password, role_id, is_active)
SELECT
    'John Employee',
    'employee@company.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    r.id,
    TRUE
FROM roles r WHERE r.name = 'employee'
ON CONFLICT (email) DO NOTHING;

-- ── Demo Manager ─────────────────────────────────────────────
INSERT INTO users (name, email, password, role_id, is_active)
SELECT
    'Jane Manager',
    'manager@company.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    r.id,
    TRUE
FROM roles r WHERE r.name = 'manager'
ON CONFLICT (email) DO NOTHING;
