DROP INDEX IF EXISTS idx_daily_activity_logs_comment_id;
ALTER TABLE daily_activity_logs DROP COLUMN IF EXISTS comment_id;

DROP TABLE IF EXISTS daily_activity_comments;

DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions WHERE name = 'activity:comment'
);

DELETE FROM permissions
WHERE name = 'activity:comment';
