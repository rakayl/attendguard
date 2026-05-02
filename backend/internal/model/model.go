package model

import (
	"time"
)

// ============================================================
// RBAC Models
// ============================================================

// Permission is a single action capability (e.g. "attendance:check_in")
type Permission struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"uniqueIndex;not null" json:"name"` // e.g. "attendance:check_in"
	DisplayName string    `gorm:"not null" json:"display_name"`     // e.g. "Check In Attendance"
	Module      string    `gorm:"not null;index" json:"module"`     // e.g. "attendance"
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Role is a named collection of permissions
type Role struct {
	ID          uint         `gorm:"primaryKey" json:"id"`
	Name        string       `gorm:"uniqueIndex;not null" json:"name"` // e.g. "manager"
	DisplayName string       `gorm:"not null" json:"display_name"`     // e.g. "Manager"
	Description string       `json:"description"`
	IsSystem    bool         `gorm:"default:false" json:"is_system"` // system roles cannot be deleted
	Permissions []Permission `gorm:"many2many:role_permissions;" json:"permissions,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

// RolePermission join table (explicit for querying)
type RolePermission struct {
	RoleID       uint `gorm:"primaryKey"`
	PermissionID uint `gorm:"primaryKey"`
}

// User now has a foreign-key RoleID instead of a plain string
type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TenantID  uint      `gorm:"not null;default:1;index" json:"tenant_id"`
	Tenant    *Tenant   `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	Name      string    `gorm:"not null" json:"name"`
	Email     string    `gorm:"uniqueIndex;not null" json:"email"`
	Password  string    `gorm:"not null" json:"-"`
	RoleID    *uint     `gorm:"index" json:"role_id"`
	Role      *Role     `gorm:"foreignKey:RoleID" json:"role,omitempty"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Helper: collect permission names for a user
func (u *User) PermissionNames() []string {
	if u.Role == nil {
		return nil
	}
	names := make([]string, 0, len(u.Role.Permissions))
	for _, p := range u.Role.Permissions {
		names = append(names, p.Name)
	}
	return names
}

func (u *User) HasPermission(perm string) bool {
	for _, p := range u.PermissionNames() {
		if p == perm {
			return true
		}
	}
	return false
}

type AttendanceLog struct {
	ID            uint        `gorm:"primaryKey" json:"id"`
	TenantID      uint        `gorm:"not null;default:1;index" json:"tenant_id"`
	UserID        uint        `gorm:"not null;index" json:"user_id"`
	User          User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Lat           float64     `gorm:"not null" json:"lat"`
	Long          float64     `gorm:"not null" json:"long"`
	Accuracy      float64     `json:"accuracy"`
	CheckInAt     *time.Time  `json:"check_in_at"`
	CheckOutAt    *time.Time  `json:"check_out_at"`
	DeviceTime    *time.Time  `json:"device_time"`
	ServerTime    time.Time   `json:"server_time"`
	FraudScore    int         `gorm:"default:0" json:"fraud_score"`
	FraudStatus   string      `gorm:"default:'SAFE'" json:"fraud_status"` // SAFE | SUSPICIOUS | FRAUD
	GeoVerified   bool        `gorm:"default:false" json:"geo_verified"`
	GeoZoneID     *uint       `json:"geo_zone_id"`
	GeoZoneName   string      `json:"geo_zone_name"`
	FaceVerified  bool        `gorm:"default:false" json:"face_verified"`
	FaceScore     float64     `json:"face_score"`
	FaceProfileID *uint       `json:"face_profile_id"`
	IsMock        bool        `json:"is_mock"`
	DeviceID      string      `json:"device_id"`
	IPAddress     string      `json:"ip_address"`
	CreatedAt     time.Time   `json:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at"`
	FraudFlags    []FraudFlag `gorm:"foreignKey:AttendanceID" json:"fraud_flags,omitempty"`
}

type FraudFlag struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	AttendanceID uint      `gorm:"not null;index" json:"attendance_id"`
	Type         string    `json:"type"` // MOCK_GPS | LOW_ACCURACY | HIGH_SPEED | OUTSIDE_GEOFENCE | TIME_MANIPULATION | IP_MISMATCH | NEW_DEVICE
	Score        int       `json:"score"`
	Description  string    `json:"description"`
	CreatedAt    time.Time `json:"created_at"`
}

type Device struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	TenantID   uint      `gorm:"not null;default:1;index" json:"tenant_id"`
	UserID     uint      `gorm:"not null;index" json:"user_id"`
	User       User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	DeviceID   string    `gorm:"not null" json:"device_id"`
	DeviceName string    `json:"device_name"`
	Platform   string    `json:"platform"`
	Trusted    bool      `gorm:"default:false" json:"trusted"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// ============================================================
// Geofence Models
// ============================================================

// GeofenceZone is a named polygon zone. Multiple zones can be active simultaneously.
type GeofenceZone struct {
	ID          uint            `gorm:"primaryKey" json:"id"`
	TenantID    uint            `gorm:"not null;default:1;index" json:"tenant_id"`
	Name        string          `gorm:"not null" json:"name"`
	Description string          `json:"description"`
	Color       string          `gorm:"default:'#06b6d4'" json:"color"` // hex color for map display
	IsActive    bool            `gorm:"default:true" json:"is_active"`
	Points      []GeofencePoint `gorm:"foreignKey:ZoneID;constraint:OnDelete:CASCADE" json:"points"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

// GeofencePoint is one vertex of a polygon zone, ordered by Sequence.
type GeofencePoint struct {
	ID       uint    `gorm:"primaryKey" json:"id"`
	ZoneID   uint    `gorm:"not null;index" json:"zone_id"`
	Lat      float64 `gorm:"not null" json:"lat"`
	Long     float64 `gorm:"not null" json:"long"`
	Sequence int     `gorm:"not null" json:"sequence"`
}

// Tenant isolates company data for multi-tenant deployments.
type Tenant struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	Slug      string    `gorm:"uniqueIndex;not null" json:"slug"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// FaceProfile stores a compact face template used to prevent proxy attendance.
// The template can be produced by the built-in hash verifier or replaced later
// by an external face-recognition engine without changing attendance APIs.
type FaceProfile struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	TenantID        uint       `gorm:"not null;default:1;index" json:"tenant_id"`
	UserID          uint       `gorm:"not null;index" json:"user_id"`
	User            User       `gorm:"foreignKey:UserID" json:"user,omitempty"`
	TemplateHash    string     `gorm:"not null" json:"-"`
	TemplatePreview string     `json:"template_preview"`
	QualityScore    float64    `json:"quality_score"`
	IsActive        bool       `gorm:"default:true" json:"is_active"`
	LastVerifiedAt  *time.Time `json:"last_verified_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}
