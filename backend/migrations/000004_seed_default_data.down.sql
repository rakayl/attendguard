-- ============================================================
-- Migration: 000004_seed_default_data.down.sql
-- Description: Remove seeded data (for rollback / test reset)
-- ============================================================

DELETE FROM users         WHERE email IN ('admin@company.com','employee@company.com','manager@company.com');
DELETE FROM role_permissions;
DELETE FROM roles         WHERE name IN ('admin','manager','hr','employee');
DELETE FROM permissions;
