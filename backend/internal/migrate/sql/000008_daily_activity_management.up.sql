ALTER TABLE daily_activities
    DROP CONSTRAINT IF EXISTS chk_daily_activity_status,
    DROP CONSTRAINT IF EXISTS chk_daily_activity_time,
    DROP CONSTRAINT IF EXISTS chk_daily_activity_progress;

ALTER TABLE daily_activities
    ADD COLUMN IF NOT EXISTS assigned_to BIGINT REFERENCES users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS progress_percentage INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tasks INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS completed_tasks INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE daily_activities
SET created_by = assigned_to
WHERE created_by IS NULL;

UPDATE daily_activities
SET status = CASE status
    WHEN 'planned' THEN 'pending'
    WHEN 'ongoing' THEN 'in_progress'
    WHEN 'done' THEN 'completed'
    ELSE status
END;

ALTER TABLE daily_activities
    ALTER COLUMN assigned_to SET NOT NULL,
    ALTER COLUMN created_by SET NOT NULL,
    ALTER COLUMN status TYPE VARCHAR(20),
    ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE daily_activities
    DROP COLUMN IF EXISTS start_minute,
    DROP COLUMN IF EXISTS end_minute,
    DROP COLUMN IF EXISTS progress,
    DROP COLUMN IF EXISTS version,
    DROP COLUMN IF EXISTS started_at;

ALTER TABLE daily_activities
    ADD CONSTRAINT chk_daily_activity_status
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));

DROP INDEX IF EXISTS idx_daily_activities_tenant_date_start;
DROP INDEX IF EXISTS idx_daily_activities_user_date;

CREATE INDEX IF NOT EXISTS idx_daily_activities_assigned_to_date
    ON daily_activities(assigned_to, activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_activities_created_by
    ON daily_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_daily_activities_deleted_at
    ON daily_activities(deleted_at);

CREATE TABLE IF NOT EXISTS daily_activity_tasks_new (
    id BIGSERIAL PRIMARY KEY,
    daily_activity_id BIGINT NOT NULL REFERENCES daily_activities(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    description TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO daily_activity_tasks_new (
    id, daily_activity_id, title, description, is_completed, completed_at,
    created_by, updated_by, created_at, updated_at
)
SELECT
    dat.id,
    dat.daily_activity_id,
    dat.title,
    dat.description,
    COALESCE(dat.status = 'done', FALSE),
    CASE WHEN dat.status = 'done' THEN dat.updated_at ELSE NULL END,
    COALESCE(dat.updated_by, da.created_by),
    dat.updated_by,
    dat.created_at,
    dat.updated_at
FROM daily_activity_tasks dat
JOIN daily_activities da ON da.id = dat.daily_activity_id
ON CONFLICT (id) DO NOTHING;

DROP TABLE IF EXISTS daily_activity_tasks CASCADE;
ALTER TABLE daily_activity_tasks_new RENAME TO daily_activity_tasks;

CREATE INDEX IF NOT EXISTS idx_daily_activity_tasks_activity_id
    ON daily_activity_tasks(daily_activity_id);
CREATE INDEX IF NOT EXISTS idx_daily_activity_tasks_completed
    ON daily_activity_tasks(daily_activity_id, is_completed);

CREATE TABLE IF NOT EXISTS daily_activity_comments (
    id BIGSERIAL PRIMARY KEY,
    daily_activity_id BIGINT NOT NULL REFERENCES daily_activities(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_activity_comments_activity_id
    ON daily_activity_comments(daily_activity_id, created_at DESC);

ALTER TABLE daily_activity_logs
    RENAME COLUMN daily_activity_task_id TO task_id;

ALTER TABLE daily_activity_logs
    ADD COLUMN IF NOT EXISTS comment_id BIGINT REFERENCES daily_activity_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_daily_activity_logs_comment_id
    ON daily_activity_logs(comment_id, created_at DESC);

WITH task_summary AS (
    SELECT
        daily_activity_id,
        COUNT(*) AS total_tasks,
        COUNT(*) FILTER (WHERE is_completed) AS completed_tasks,
        MAX(completed_at) FILTER (WHERE is_completed) AS latest_completed_at
    FROM daily_activity_tasks
    GROUP BY daily_activity_id
)
UPDATE daily_activities da
SET total_tasks = COALESCE(ts.total_tasks, 0),
    completed_tasks = COALESCE(ts.completed_tasks, 0),
    progress_percentage = CASE
        WHEN COALESCE(ts.total_tasks, 0) = 0 THEN 0
        ELSE FLOOR((COALESCE(ts.completed_tasks, 0)::numeric / ts.total_tasks::numeric) * 100)
    END,
    completed_at = CASE
        WHEN COALESCE(ts.total_tasks, 0) > 0 AND COALESCE(ts.total_tasks, 0) = COALESCE(ts.completed_tasks, 0)
            THEN ts.latest_completed_at
        ELSE NULL
    END,
    status = CASE
        WHEN da.status = 'cancelled' THEN 'cancelled'
        WHEN COALESCE(ts.total_tasks, 0) > 0 AND COALESCE(ts.total_tasks, 0) = COALESCE(ts.completed_tasks, 0) THEN 'completed'
        WHEN COALESCE(ts.completed_tasks, 0) = 0 THEN 'pending'
        ELSE 'in_progress'
    END
FROM task_summary ts
WHERE da.id = ts.daily_activity_id;

UPDATE daily_activities
SET total_tasks = 0,
    completed_tasks = 0,
    progress_percentage = 0,
    completed_at = NULL,
    status = CASE WHEN status = 'cancelled' THEN 'cancelled' ELSE 'pending' END
WHERE id NOT IN (SELECT DISTINCT daily_activity_id FROM daily_activity_tasks);

INSERT INTO permissions (name, display_name, module, description) VALUES
    ('activity:comment', 'Comment on Daily Activities', 'activity', 'Add, update, and delete activity comments')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'activity:comment'
WHERE r.name IN ('admin', 'manager', 'hr', 'employee')
ON CONFLICT DO NOTHING;
