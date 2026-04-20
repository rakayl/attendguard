package config

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"attendance-system/internal/model"

	"github.com/joho/godotenv"
	"github.com/lib/pq"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	Port           string
	DBHost         string
	DBPort         string
	DBUser         string
	DBPass         string
	DBName         string
	JWTSecret      string
	OfficeLat      float64
	OfficeLong     float64
	GeofenceRadius float64
}

// Load reads configuration from .env file and environment variables.
func Load() *Config {
	_ = godotenv.Load()
	return &Config{
		Port:           getEnv("PORT", "8080"),
		DBHost:         getEnv("DB_HOST", "localhost"),
		DBPort:         getEnv("DB_PORT", "5432"),
		DBUser:         getEnv("DB_USER", "postgres"),
		DBPass:         getEnv("DB_PASS", "postgres"),
		DBName:         getEnv("DB_NAME", "attendance_db"),
		JWTSecret:      getEnv("JWT_SECRET", "super-secret-key-change-in-production"),
		OfficeLat:      parseFloat(getEnv("OFFICE_LAT", "-6.200000")),
		OfficeLong:     parseFloat(getEnv("OFFICE_LONG", "106.816666")),
		GeofenceRadius: parseFloat(getEnv("GEOFENCE_RADIUS", "200")),
	}
}

func dsn(cfg *Config) string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable TimeZone=Asia/Jakarta",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPass, cfg.DBName,
	)
}

// OpenRawDB opens a standard *sql.DB for the migration engine.
func OpenRawDB(cfg *Config) (*sql.DB, error) {
	db, err := sql.Open("postgres", dsn(cfg))
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(2)
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping failed: %w", err)
	}
	return db, nil
}

// InitDB opens a GORM connection for use by repositories and services.
func InitDB(cfg *Config) (*gorm.DB, error) {
	return gorm.Open(postgres.Open(dsn(cfg)), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
}

// SeedSampleGeofence seeds a default geofence zone around the configured
// office coordinates. Only runs if the geofence_zones table is empty.
func SeedSampleGeofence(db *gorm.DB, cfg *Config) {
	var count int64
	db.Model(&model.GeofenceZone{}).Count(&count)
	if count > 0 {
		return
	}

	// ~200m box: 0.0018° ≈ 200m lat, 0.0022° ≈ 200m lon (near equator)
	latOff, lngOff := 0.0018, 0.0022

	zone := model.GeofenceZone{
		Name:        "Main Office",
		Description: "Default zone — edit coordinates in the Geofence manager",
		Color:       "#06b6d4",
		IsActive:    true,
	}
	if err := db.Create(&zone).Error; err != nil {
		log.Printf("⚠ geofence seed: %v", err)
		return
	}

	points := []model.GeofencePoint{
		{ZoneID: zone.ID, Lat: cfg.OfficeLat + latOff, Long: cfg.OfficeLong - lngOff, Sequence: 0},
		{ZoneID: zone.ID, Lat: cfg.OfficeLat + latOff, Long: cfg.OfficeLong + lngOff, Sequence: 1},
		{ZoneID: zone.ID, Lat: cfg.OfficeLat - latOff, Long: cfg.OfficeLong + lngOff, Sequence: 2},
		{ZoneID: zone.ID, Lat: cfg.OfficeLat - latOff, Long: cfg.OfficeLong - lngOff, Sequence: 3},
	}
	if err := db.Create(&points).Error; err != nil {
		log.Printf("⚠ geofence points seed: %v", err)
		return
	}
	log.Printf("✓ Sample geofence zone seeded around (%.4f, %.4f)", cfg.OfficeLat, cfg.OfficeLong)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func parseFloat(s string) float64 {
	var f float64
	fmt.Sscanf(s, "%f", &f)
	return f
}
