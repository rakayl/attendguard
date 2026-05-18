DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions WHERE name IN ('team:view', 'team:create', 'team:update', 'team:invite', 'team:delete')
);

DELETE FROM permissions
WHERE name IN ('team:view', 'team:create', 'team:update', 'team:invite', 'team:delete');

DROP INDEX IF EXISTS idx_workspaces_team_id;
ALTER TABLE workspaces
    DROP COLUMN IF EXISTS team_id;

DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS teams;
