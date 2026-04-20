-- ============================================================
-- Migration: 000003_create_geofence_tables.up.sql
-- Description: geofence_zones and geofence_points
-- ============================================================

-- ── Geofence Zones ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS geofence_zones (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    color       VARCHAR(20)  NOT NULL DEFAULT '#06b6d4',
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofence_zones_active ON geofence_zones(is_active);

-- ── Geofence Points (polygon vertices) ───────────────────────
CREATE TABLE IF NOT EXISTS geofence_points (
    id       SERIAL PRIMARY KEY,
    zone_id  INTEGER          NOT NULL REFERENCES geofence_zones(id) ON DELETE CASCADE,
    lat      DOUBLE PRECISION NOT NULL,
    long     DOUBLE PRECISION NOT NULL,
    sequence INTEGER          NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_geofence_points_zone_id ON geofence_points(zone_id);
