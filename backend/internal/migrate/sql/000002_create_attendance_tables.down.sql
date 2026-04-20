-- ============================================================
-- Migration: 000002_create_attendance_tables.down.sql
-- ============================================================

DROP TABLE IF EXISTS fraud_flags CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS attendance_logs CASCADE;
