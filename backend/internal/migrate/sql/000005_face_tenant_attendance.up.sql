CREATE TABLE IF NOT EXISTS tenants (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tenants (id, name, slug, is_active)
VALUES (1, 'Default Company', 'default', TRUE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id BIGINT NOT NULL DEFAULT 1;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS tenant_id BIGINT NOT NULL DEFAULT 1;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS tenant_id BIGINT NOT NULL DEFAULT 1;
ALTER TABLE geofence_zones ADD COLUMN IF NOT EXISTS tenant_id BIGINT NOT NULL DEFAULT 1;

ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS geo_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS geo_zone_id BIGINT;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS geo_zone_name VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS face_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS face_score DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS face_profile_id BIGINT;

CREATE TABLE IF NOT EXISTS face_profiles (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL DEFAULT 1 REFERENCES tenants(id),
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_hash TEXT NOT NULL,
    template_preview VARCHAR(32) NOT NULL DEFAULT '',
    quality_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_devices_tenant_id ON devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_tenant_id_created_at ON attendance_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_geofence_zones_tenant_id ON geofence_zones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_face_profiles_tenant_user_active ON face_profiles(tenant_id, user_id, is_active);

INSERT INTO permissions (name, display_name, module, description) VALUES
    ('face:enroll', 'Enroll Own Face', 'face', 'Create or replace own face recognition profile'),
    ('face:verify', 'Verify Face', 'face', 'Verify face during attendance'),
    ('face:manage', 'Manage Face Profiles', 'face', 'Manage employee face recognition profiles'),
    ('tenant:manage', 'Manage Tenants', 'tenant', 'Manage companies or tenant workspaces')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name = 'employee'
      AND p.name IN ('face:enroll', 'face:verify')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name IN ('manager', 'hr')
      AND p.name IN ('face:enroll', 'face:verify', 'face:manage')
ON CONFLICT DO NOTHING;
