ALTER TABLE daily_activities
    RENAME COLUMN user_id TO assigned_to;

ALTER TABLE daily_activities
    DROP CONSTRAINT IF EXISTS chk_daily_activity_status,
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ALTER COLUMN status SET DEFAULT 'pending';

UPDATE daily_activities
SET created_by = assigned_to
WHERE created_by IS NULL;

ALTER TABLE daily_activities
    ALTER COLUMN created_by SET NOT NULL;

ALTER TABLE daily_activities
    ADD CONSTRAINT chk_daily_activity_status
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_daily_activities_assigned_to_date
    ON daily_activities(assigned_to, activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_activities_created_by
    ON daily_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_daily_activities_deleted_at
    ON daily_activities(deleted_at);

CREATE TABLE IF NOT EXISTS daily_activity_tasks (
    id BIGSERIAL PRIMARY KEY,
    daily_activity_id BIGINT NOT NULL REFERENCES daily_activities(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    due_time TIMESTAMPTZ,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_daily_activity_task_status CHECK (status IN ('pending', 'progress', 'done', 'cancelled')),
    CONSTRAINT chk_daily_activity_task_priority CHECK (priority IN ('low', 'medium', 'high'))
);

CREATE INDEX IF NOT EXISTS idx_daily_activity_tasks_activity_id
    ON daily_activity_tasks(daily_activity_id);
CREATE INDEX IF NOT EXISTS idx_daily_activity_tasks_status
    ON daily_activity_tasks(status);

CREATE TABLE IF NOT EXISTS daily_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    daily_activity_id BIGINT REFERENCES daily_activities(id) ON DELETE CASCADE,
    daily_activity_task_id BIGINT REFERENCES daily_activity_tasks(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(60) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_activity_logs_activity_id
    ON daily_activity_logs(daily_activity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_activity_logs_task_id
    ON daily_activity_logs(daily_activity_task_id, created_at DESC);

INSERT INTO permissions (name, display_name, module, description) VALUES
    ('activity:update', 'Update Daily Activities', 'activity', 'Update daily activities and task definitions'),
    ('activity:delete', 'Delete Daily Activities', 'activity', 'Delete daily activities'),
    ('activity:task_update', 'Update Activity Tasks', 'activity', 'Update task status for assigned daily activities'),
    ('activity:log_view', 'View Activity Logs', 'activity', 'View activity audit logs')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('activity:update', 'activity:delete', 'activity:task_update', 'activity:log_view')
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('activity:view', 'activity:create', 'activity:update', 'activity:delete', 'activity:task_update', 'activity:log_view')
WHERE r.name IN ('manager', 'hr', 'employee')
ON CONFLICT DO NOTHING;
