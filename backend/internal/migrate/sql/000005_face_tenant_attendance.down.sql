DELETE FROM role_permissions
WHERE permission_id IN (SELECT id FROM permissions WHERE name IN ('face:enroll', 'face:verify', 'face:manage', 'tenant:manage'));

DELETE FROM permissions WHERE name IN ('face:enroll', 'face:verify', 'face:manage', 'tenant:manage');

DROP INDEX IF EXISTS idx_face_profiles_tenant_user_active;
DROP INDEX IF EXISTS idx_geofence_zones_tenant_id;
DROP INDEX IF EXISTS idx_attendance_logs_tenant_id_created_at;
DROP INDEX IF EXISTS idx_devices_tenant_id;
DROP INDEX IF EXISTS idx_users_tenant_id;

DROP TABLE IF EXISTS face_profiles;

ALTER TABLE attendance_logs DROP COLUMN IF EXISTS face_profile_id;
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS face_score;
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS face_verified;
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS geo_zone_name;
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS geo_zone_id;
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS geo_verified;

ALTER TABLE geofence_zones DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE devices DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE users DROP COLUMN IF EXISTS tenant_id;

DROP TABLE IF EXISTS tenants;
