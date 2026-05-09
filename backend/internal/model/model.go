package model

import (
	"time"

	"gorm.io/gorm"
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

type DailyActivity struct {
	ID                 uint                   `gorm:"primaryKey" json:"id"`
	TenantID           uint                   `gorm:"not null;default:1;index" json:"tenant_id"`
	Title              string                 `gorm:"size:120;not null" json:"title"`
	Description        string                 `gorm:"type:text" json:"description"`
	TemplateColor      string                 `gorm:"size:24;not null;default:'cyan'" json:"template_color"`
	AssignedTo         uint                   `gorm:"not null;index" json:"assigned_to"`
	AssignedUser       User                   `gorm:"foreignKey:AssignedTo" json:"assigned_user,omitempty"`
	CreatedBy          uint                   `gorm:"not null;index" json:"created_by"`
	Creator            User                   `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	ActivityDate       time.Time              `gorm:"type:date;not null;index" json:"activity_date"`
	Status             string                 `gorm:"size:20;not null;default:'pending'" json:"status"`
	ProgressPercentage int                    `gorm:"not null;default:0" json:"progress_percentage"`
	TotalTasks         int                    `gorm:"not null;default:0" json:"total_tasks"`
	CompletedTasks     int                    `gorm:"not null;default:0" json:"completed_tasks"`
	CompletedAt        *time.Time             `json:"completed_at"`
	CreatedAt          time.Time              `json:"created_at"`
	UpdatedAt          time.Time              `json:"updated_at"`
	DeletedAt          gorm.DeletedAt         `gorm:"index" json:"deleted_at,omitempty"`
	Tasks              []DailyActivityTask    `gorm:"foreignKey:DailyActivityID" json:"tasks,omitempty"`
	Comments           []DailyActivityComment `gorm:"foreignKey:DailyActivityID" json:"comments,omitempty"`
	Logs               []DailyActivityLog     `gorm:"foreignKey:DailyActivityID" json:"logs,omitempty"`
}

type DailyActivityTask struct {
	ID              uint               `gorm:"primaryKey" json:"id"`
	DailyActivityID uint               `gorm:"not null;index" json:"daily_activity_id"`
	DailyActivity   DailyActivity      `gorm:"foreignKey:DailyActivityID" json:"daily_activity,omitempty"`
	Title           string             `gorm:"size:160;not null" json:"title"`
	Description     string             `gorm:"type:text" json:"description"`
	IsCompleted     bool               `gorm:"not null;default:false" json:"is_completed"`
	CompletedAt     *time.Time         `json:"completed_at"`
	CreatedBy       uint               `gorm:"not null;index" json:"created_by"`
	Creator         User               `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	UpdatedBy       *uint              `json:"updated_by"`
	Updater         *User              `gorm:"foreignKey:UpdatedBy" json:"updater,omitempty"`
	CreatedAt       time.Time          `json:"created_at"`
	UpdatedAt       time.Time          `json:"updated_at"`
	Logs            []DailyActivityLog `gorm:"foreignKey:TaskID" json:"logs,omitempty"`
}

type DailyActivityComment struct {
	ID              uint               `gorm:"primaryKey" json:"id"`
	DailyActivityID uint               `gorm:"not null;index" json:"daily_activity_id"`
	DailyActivity   DailyActivity      `gorm:"foreignKey:DailyActivityID" json:"daily_activity,omitempty"`
	UserID          uint               `gorm:"not null;index" json:"user_id"`
	User            User               `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Message         string             `gorm:"type:text;not null" json:"message"`
	CreatedAt       time.Time          `json:"created_at"`
	UpdatedAt       time.Time          `json:"updated_at"`
	Logs            []DailyActivityLog `gorm:"foreignKey:CommentID" json:"logs,omitempty"`
}

type DailyActivityLog struct {
	ID              uint                  `gorm:"primaryKey" json:"id"`
	DailyActivityID *uint                 `gorm:"index" json:"daily_activity_id"`
	DailyActivity   *DailyActivity        `gorm:"foreignKey:DailyActivityID" json:"daily_activity,omitempty"`
	TaskID          *uint                 `gorm:"index" json:"task_id"`
	Task            *DailyActivityTask    `gorm:"foreignKey:TaskID" json:"task,omitempty"`
	CommentID       *uint                 `gorm:"index" json:"comment_id"`
	Comment         *DailyActivityComment `gorm:"foreignKey:CommentID" json:"comment,omitempty"`
	UserID          uint                  `gorm:"not null;index" json:"user_id"`
	User            User                  `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Action          string                `gorm:"size:60;not null;index" json:"action"`
	OldValue        string                `gorm:"type:jsonb" json:"old_value,omitempty"`
	NewValue        string                `gorm:"type:jsonb" json:"new_value,omitempty"`
	Description     string                `gorm:"type:text;not null" json:"description"`
	CreatedAt       time.Time             `json:"created_at"`
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

type Workspace struct {
	ID          uint              `gorm:"primaryKey" json:"id"`
	TenantID    uint              `gorm:"not null;default:1;index" json:"tenant_id"`
	Name        string            `gorm:"size:120;not null" json:"name"`
	Slug        string            `gorm:"size:140;not null;uniqueIndex" json:"slug"`
	Description string            `gorm:"type:text" json:"description"`
	OwnerID     uint              `gorm:"not null;index" json:"owner_id"`
	Owner       User              `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
	IsArchived  bool              `gorm:"default:false" json:"is_archived"`
	Members     []WorkspaceMember `gorm:"foreignKey:WorkspaceID" json:"members,omitempty"`
	Boards      []Board           `gorm:"foreignKey:WorkspaceID" json:"boards,omitempty"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

type WorkspaceMember struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	WorkspaceID uint      `gorm:"not null;index" json:"workspace_id"`
	Workspace   Workspace `gorm:"foreignKey:WorkspaceID" json:"workspace,omitempty"`
	UserID      uint      `gorm:"not null;index" json:"user_id"`
	User        User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Role        string    `gorm:"size:30;not null;default:'member'" json:"role"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Board struct {
	ID          uint          `gorm:"primaryKey" json:"id"`
	WorkspaceID uint          `gorm:"not null;index" json:"workspace_id"`
	Workspace   Workspace     `gorm:"foreignKey:WorkspaceID" json:"workspace,omitempty"`
	Name        string        `gorm:"size:120;not null" json:"name"`
	Description string        `gorm:"type:text" json:"description"`
	Visibility  string        `gorm:"size:20;not null;default:'private'" json:"visibility"`
	Theme       string        `gorm:"size:40;not null;default:'ocean'" json:"theme"`
	IsFavorite  bool          `gorm:"default:false" json:"is_favorite"`
	IsArchived  bool          `gorm:"default:false" json:"is_archived"`
	CreatedBy   uint          `gorm:"not null;index" json:"created_by"`
	Creator     User          `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Members     []BoardMember `gorm:"foreignKey:BoardID" json:"members,omitempty"`
	Lists       []BoardList   `gorm:"foreignKey:BoardID" json:"lists,omitempty"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

type BoardMember struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	BoardID   uint      `gorm:"not null;index" json:"board_id"`
	Board     Board     `gorm:"foreignKey:BoardID" json:"board,omitempty"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Role      string    `gorm:"size:30;not null;default:'member'" json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type BoardList struct {
	ID         uint        `gorm:"primaryKey" json:"id"`
	BoardID    uint        `gorm:"not null;index" json:"board_id"`
	Board      Board       `gorm:"foreignKey:BoardID" json:"board,omitempty"`
	Name       string      `gorm:"size:120;not null" json:"name"`
	Position   int         `gorm:"not null;default:0" json:"position"`
	IsArchived bool        `gorm:"default:false" json:"is_archived"`
	Cards      []BoardCard `gorm:"foreignKey:ListID" json:"cards,omitempty"`
	CreatedAt  time.Time   `json:"created_at"`
	UpdatedAt  time.Time   `json:"updated_at"`
}

type BoardCard struct {
	ID                  uint                 `gorm:"primaryKey" json:"id"`
	BoardID             uint                 `gorm:"not null;index" json:"board_id"`
	Board               Board                `gorm:"foreignKey:BoardID" json:"board,omitempty"`
	ListID              uint                 `gorm:"not null;index" json:"list_id"`
	List                BoardList            `gorm:"foreignKey:ListID" json:"list,omitempty"`
	Title               string               `gorm:"size:160;not null" json:"title"`
	Description         string               `gorm:"type:text" json:"description"`
	MarkdownDescription string               `gorm:"type:text" json:"markdown_description"`
	CoverImage          string               `json:"cover_image"`
	DueDate             *time.Time           `json:"due_date"`
	Priority            string               `gorm:"size:20;not null;default:'medium'" json:"priority"`
	Position            int                  `gorm:"not null;default:0" json:"position"`
	IsArchived          bool                 `gorm:"default:false" json:"is_archived"`
	CreatedBy           uint                 `gorm:"not null;index" json:"created_by"`
	Creator             User                 `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Members             []BoardCardMember    `gorm:"foreignKey:CardID" json:"members,omitempty"`
	Labels              []BoardCardLabel     `gorm:"foreignKey:CardID" json:"labels,omitempty"`
	Checklists          []BoardCardChecklist `gorm:"foreignKey:CardID" json:"checklists,omitempty"`
	Comments            []BoardCardComment   `gorm:"foreignKey:CardID" json:"comments,omitempty"`
	CreatedAt           time.Time            `json:"created_at"`
	UpdatedAt           time.Time            `json:"updated_at"`
}

type BoardCardMember struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CardID    uint      `gorm:"not null;index" json:"card_id"`
	Card      BoardCard `gorm:"foreignKey:CardID" json:"card,omitempty"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type BoardCardLabel struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CardID    uint      `gorm:"not null;index" json:"card_id"`
	Card      BoardCard `gorm:"foreignKey:CardID" json:"card,omitempty"`
	Name      string    `gorm:"size:80;not null" json:"name"`
	Color     string    `gorm:"size:20;not null;default:'#06b6d4'" json:"color"`
	CreatedAt time.Time `json:"created_at"`
}

type BoardCardChecklist struct {
	ID        uint                     `gorm:"primaryKey" json:"id"`
	CardID    uint                     `gorm:"not null;index" json:"card_id"`
	Card      BoardCard                `gorm:"foreignKey:CardID" json:"card,omitempty"`
	Title     string                   `gorm:"size:120;not null" json:"title"`
	Position  int                      `gorm:"not null;default:0" json:"position"`
	Items     []BoardCardChecklistItem `gorm:"foreignKey:ChecklistID" json:"items,omitempty"`
	CreatedAt time.Time                `json:"created_at"`
	UpdatedAt time.Time                `json:"updated_at"`
}

type BoardCardChecklistItem struct {
	ID          uint               `gorm:"primaryKey" json:"id"`
	ChecklistID uint               `gorm:"not null;index" json:"checklist_id"`
	Checklist   BoardCardChecklist `gorm:"foreignKey:ChecklistID" json:"checklist,omitempty"`
	Title       string             `gorm:"size:160;not null" json:"title"`
	IsCompleted bool               `gorm:"not null;default:false" json:"is_completed"`
	Position    int                `gorm:"not null;default:0" json:"position"`
	CompletedAt *time.Time         `json:"completed_at"`
	CreatedAt   time.Time          `json:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"`
}

type BoardCardComment struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CardID    uint      `gorm:"not null;index" json:"card_id"`
	Card      BoardCard `gorm:"foreignKey:CardID" json:"card,omitempty"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Message   string    `gorm:"type:text;not null" json:"message"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type BoardActivity struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	WorkspaceID *uint     `gorm:"index" json:"workspace_id,omitempty"`
	BoardID     *uint     `gorm:"index" json:"board_id,omitempty"`
	ListID      *uint     `gorm:"index" json:"list_id,omitempty"`
	CardID      *uint     `gorm:"index" json:"card_id,omitempty"`
	UserID      uint      `gorm:"not null;index" json:"user_id"`
	User        User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Action      string    `gorm:"size:80;not null" json:"action"`
	Description string    `gorm:"type:text;not null" json:"description"`
	OldValue    string    `gorm:"type:jsonb" json:"old_value,omitempty"`
	NewValue    string    `gorm:"type:jsonb" json:"new_value,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}
