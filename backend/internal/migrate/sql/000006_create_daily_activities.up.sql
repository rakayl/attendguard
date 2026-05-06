CREATE TABLE IF NOT EXISTS daily_activities (
    id            BIGSERIAL PRIMARY KEY,
    tenant_id     BIGINT NOT NULL DEFAULT 1 REFERENCES tenants(id),
    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(120) NOT NULL,
    description   TEXT,
    activity_date DATE NOT NULL,
    start_minute  INTEGER NOT NULL,
    end_minute    INTEGER NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'planned',
    progress      INTEGER NOT NULL DEFAULT 0,
    version       INTEGER NOT NULL DEFAULT 1,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_daily_activity_status CHECK (status IN ('planned', 'ongoing', 'done')),
    CONSTRAINT chk_daily_activity_time CHECK (start_minute >= 0 AND end_minute <= 1440 AND end_minute > start_minute),
    CONSTRAINT chk_daily_activity_progress CHECK (progress >= 0 AND progress <= 100)
);

CREATE INDEX IF NOT EXISTS idx_daily_activities_tenant_date_start
    ON daily_activities(tenant_id, activity_date, start_minute);
CREATE INDEX IF NOT EXISTS idx_daily_activities_user_date
    ON daily_activities(user_id, activity_date);

INSERT INTO permissions (name, display_name, module, description) VALUES
    ('activity:view', 'View Team Activities', 'activity', 'View the shared team activity timeline'),
    ('activity:create', 'Create Activities', 'activity', 'Create daily activity plans and updates'),
    ('activity:update_own', 'Update Own Activities', 'activity', 'Update only activities created by the current user'),
    ('activity:delete_own', 'Delete Own Activities', 'activity', 'Delete only activities created by the current user')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name IN ('employee', 'manager', 'hr')
      AND p.name IN ('activity:view', 'activity:create', 'activity:update_own', 'activity:delete_own')
ON CONFLICT DO NOTHING;
