DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions WHERE name IN (
        'activity:view', 'activity:create', 'activity:update_own', 'activity:delete_own'
    )
);

DELETE FROM permissions
WHERE name IN ('activity:view', 'activity:create', 'activity:update_own', 'activity:delete_own');

DROP INDEX IF EXISTS idx_daily_activities_user_date;
DROP INDEX IF EXISTS idx_daily_activities_tenant_date_start;
DROP TABLE IF EXISTS daily_activities;
