package config

import (
	"fmt"
	"log"
	"os"

	"attendance-system/internal/model"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

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

func InitDB(cfg *Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable TimeZone=Asia/Jakarta",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPass, cfg.DBName,
	)
	return gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
}

// SeedRolesAndPermissions creates default permissions, roles, and admin user
func SeedRolesAndPermissions(db *gorm.DB) {
	// 1. Seed permissions
	permissions := []model.Permission{
		// Attendance module
		{Name: "attendance:check_in", DisplayName: "Check In", Module: "attendance", Description: "Submit check-in attendance"},
		{Name: "attendance:check_out", DisplayName: "Check Out", Module: "attendance", Description: "Submit check-out attendance"},
		{Name: "attendance:view_own", DisplayName: "View Own History", Module: "attendance", Description: "View personal attendance history"},
		{Name: "attendance:view_all", DisplayName: "View All Attendance", Module: "attendance", Description: "View all employees' attendance"},
		{Name: "attendance:view_fraud", DisplayName: "View Fraud Reports", Module: "attendance", Description: "View fraud detection reports"},
		// User module
		{Name: "user:view", DisplayName: "View Users", Module: "user", Description: "View user list"},
		{Name: "user:create", DisplayName: "Create Users", Module: "user", Description: "Create new user accounts"},
		{Name: "user:update", DisplayName: "Update Users", Module: "user", Description: "Update user information"},
		{Name: "user:delete", DisplayName: "Delete Users", Module: "user", Description: "Delete user accounts"},
		{Name: "user:assign_role", DisplayName: "Assign Roles", Module: "user", Description: "Assign roles to users"},
		// Role module
		{Name: "role:view", DisplayName: "View Roles", Module: "role", Description: "View role list"},
		{Name: "role:create", DisplayName: "Create Roles", Module: "role", Description: "Create new roles"},
		{Name: "role:update", DisplayName: "Update Roles", Module: "role", Description: "Update role settings and permissions"},
		{Name: "role:delete", DisplayName: "Delete Roles", Module: "role", Description: "Delete roles"},
		// Permission module
		{Name: "permission:view", DisplayName: "View Permissions", Module: "permission", Description: "View permission list"},
		{Name: "permission:create", DisplayName: "Create Permissions", Module: "permission", Description: "Create new permissions"},
		{Name: "permission:update", DisplayName: "Update Permissions", Module: "permission", Description: "Update permissions"},
		{Name: "permission:delete", DisplayName: "Delete Permissions", Module: "permission", Description: "Delete permissions"},
		// Device module
		{Name: "device:register", DisplayName: "Register Device", Module: "device", Description: "Register own device"},
		{Name: "device:view", DisplayName: "View Devices", Module: "device", Description: "View own devices"},
		// Admin
		{Name: "admin:access", DisplayName: "Admin Access", Module: "admin", Description: "General admin panel access"},
		{Name: "geofence:manage", DisplayName: "Manage Geofence", Module: "geofence", Description: "Create, update and delete geofence zones"},
	}

	for i := range permissions {
		var existing model.Permission
		if db.Where("name = ?", permissions[i].Name).First(&existing).Error != nil {
			db.Create(&permissions[i])
		} else {
			permissions[i].ID = existing.ID
		}
	}

	// Helper to get permission IDs by name
	getPermIDs := func(names ...string) []model.Permission {
		var perms []model.Permission
		db.Where("name IN ?", names).Find(&perms)
		return perms
	}

	// 2. Seed roles
	type roleSeed struct {
		Name        string
		DisplayName string
		Description string
		IsSystem    bool
		Perms       []string
	}

	roles := []roleSeed{
		{
			Name: "admin", DisplayName: "System Administrator", IsSystem: true,
			Description: "Full system access — cannot be deleted",
			Perms:       []string{"attendance:check_in", "attendance:check_out", "attendance:view_own", "attendance:view_all", "attendance:view_fraud", "user:view", "user:create", "user:update", "user:delete", "user:assign_role", "role:view", "role:create", "role:update", "role:delete", "permission:view", "permission:create", "permission:update", "permission:delete", "device:register", "device:view", "admin:access", "geofence:manage"},
		},
		{
			Name: "manager", DisplayName: "Manager", IsSystem: false,
			Description: "Can view all attendance and fraud reports, manage users",
			Perms:       []string{"attendance:check_in", "attendance:check_out", "attendance:view_own", "attendance:view_all", "attendance:view_fraud", "user:view", "device:register", "device:view", "admin:access", "geofence:manage"},
		},
		{
			Name: "hr", DisplayName: "HR Staff", IsSystem: false,
			Description: "Can manage users and view attendance records",
			Perms:       []string{"attendance:view_all", "attendance:view_fraud", "user:view", "user:create", "user:update", "user:assign_role", "admin:access"},
		},
		{
			Name: "employee", DisplayName: "Employee", IsSystem: false,
			Description: "Standard employee — check in/out and view own history",
			Perms:       []string{"attendance:check_in", "attendance:check_out", "attendance:view_own", "device:register", "device:view"},
		},
	}

	for _, rs := range roles {
		var existing model.Role
		if db.Where("name = ?", rs.Name).First(&existing).Error != nil {
			role := model.Role{Name: rs.Name, DisplayName: rs.DisplayName, Description: rs.Description, IsSystem: rs.IsSystem}
			if db.Create(&role).Error == nil {
				perms := getPermIDs(rs.Perms...)
				db.Model(&role).Association("Permissions").Replace(perms)
			}
		}
	}

	// 3. Seed admin user
	var adminRole model.Role
	db.Where("name = ?", "admin").First(&adminRole)

	var adminUser model.User
	if db.Where("email = ?", "admin@company.com").First(&adminUser).Error != nil {
		hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err == nil {
			admin := model.User{Name: "Administrator", Email: "admin@company.com", Password: string(hash), RoleID: &adminRole.ID, IsActive: true}
			db.Create(&admin)
			log.Println("✓ Admin seeded: admin@company.com / admin123")
		}
	}

	log.Println("✓ Roles & permissions seeded")
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

// SeedSampleGeofence seeds a sample geofence zone around the configured office location.
// Only runs if no zones exist yet.
func SeedSampleGeofence(db *gorm.DB, cfg *Config) {
	var count int64
	db.Model(&model.GeofenceZone{}).Count(&count)
	if count > 0 {
		return
	}

	// Build a ~200m square polygon around office center
	// offset in degrees: ~0.0018° ≈ 200m latitude, ~0.0022° ≈ 200m longitude at equatorial
	latOff := 0.0018
	lngOff := 0.0022

	zone := model.GeofenceZone{
		Name:        "Main Office",
		Description: "Default attendance zone — edit in Geofence manager",
		Color:       "#06b6d4",
		IsActive:    true,
	}
	if err := db.Create(&zone).Error; err != nil {
		log.Printf("Geofence seed error: %v", err)
		return
	}

	points := []model.GeofencePoint{
		{ZoneID: zone.ID, Lat: cfg.OfficeLat + latOff, Long: cfg.OfficeLong - lngOff, Sequence: 0},
		{ZoneID: zone.ID, Lat: cfg.OfficeLat + latOff, Long: cfg.OfficeLong + lngOff, Sequence: 1},
		{ZoneID: zone.ID, Lat: cfg.OfficeLat - latOff, Long: cfg.OfficeLong + lngOff, Sequence: 2},
		{ZoneID: zone.ID, Lat: cfg.OfficeLat - latOff, Long: cfg.OfficeLong - lngOff, Sequence: 3},
	}
	if err := db.Create(&points).Error; err != nil {
		log.Printf("Geofence points seed error: %v", err)
		return
	}
	log.Printf("✓ Sample geofence zone seeded around (%.4f, %.4f)", cfg.OfficeLat, cfg.OfficeLong)
}
