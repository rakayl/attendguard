-- ============================================================
-- Migration: 000002_create_attendance_tables.up.sql
-- Description: attendance_logs, fraud_flags, devices
-- ============================================================

-- ── Attendance Logs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_logs (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lat          DOUBLE PRECISION NOT NULL,
    long         DOUBLE PRECISION NOT NULL,
    accuracy     DOUBLE PRECISION NOT NULL DEFAULT 0,
    check_in_at  TIMESTAMPTZ,
    check_out_at TIMESTAMPTZ,
    device_time  TIMESTAMPTZ,
    server_time  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fraud_score  INTEGER     NOT NULL DEFAULT 0,
    fraud_status VARCHAR(20) NOT NULL DEFAULT 'SAFE',
    is_mock      BOOLEAN     NOT NULL DEFAULT FALSE,
    device_id    VARCHAR(255),
    ip_address   VARCHAR(50),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fraud_status CHECK (fraud_status IN ('SAFE', 'SUSPICIOUS', 'FRAUD'))
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_id       ON attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_fraud_status  ON attendance_logs(fraud_status);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_at   ON attendance_logs(check_in_at);
CREATE INDEX IF NOT EXISTS idx_attendance_user_active   ON attendance_logs(user_id, check_in_at)
    WHERE check_out_at IS NULL;

-- ── Fraud Flags ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fraud_flags (
    id            SERIAL PRIMARY KEY,
    attendance_id INTEGER     NOT NULL REFERENCES attendance_logs(id) ON DELETE CASCADE,
    type          VARCHAR(50) NOT NULL,
    score         INTEGER     NOT NULL DEFAULT 0,
    description   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_flag_type CHECK (
        type IN ('MOCK_GPS', 'LOW_ACCURACY', 'HIGH_SPEED',
                 'OUTSIDE_GEOFENCE', 'TIME_MANIPULATION',
                 'NEW_DEVICE', 'IP_MISMATCH')
    )
);

CREATE INDEX IF NOT EXISTS idx_fraud_flags_attendance_id ON fraud_flags(attendance_id);

-- ── Devices ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id   VARCHAR(255) NOT NULL,
    device_name VARCHAR(100),
    platform    VARCHAR(50),
    trusted     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_user_device ON devices(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
