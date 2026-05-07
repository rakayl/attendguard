DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions
    WHERE name IN ('activity:update', 'activity:delete', 'activity:task_update', 'activity:log_view')
);

DELETE FROM permissions
WHERE name IN ('activity:update', 'activity:delete', 'activity:task_update', 'activity:log_view');

DROP TABLE IF EXISTS daily_activity_logs;
DROP TABLE IF EXISTS daily_activity_tasks;

DROP INDEX IF EXISTS idx_daily_activities_deleted_at;
DROP INDEX IF EXISTS idx_daily_activities_created_by;
DROP INDEX IF EXISTS idx_daily_activities_assigned_to_date;

ALTER TABLE daily_activities DROP CONSTRAINT IF EXISTS chk_daily_activity_status;
ALTER TABLE daily_activities
    RENAME COLUMN assigned_to TO user_id;

ALTER TABLE daily_activities
    DROP COLUMN IF EXISTS created_by,
    DROP COLUMN IF EXISTS started_at,
    DROP COLUMN IF EXISTS completed_at,
    DROP COLUMN IF EXISTS deleted_at,
    ALTER COLUMN status SET DEFAULT 'planned';

ALTER TABLE daily_activities
    ADD CONSTRAINT chk_daily_activity_status
    CHECK (status IN ('planned', 'ongoing', 'done'));
