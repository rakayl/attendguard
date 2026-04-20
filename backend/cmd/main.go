package main

import (
	"log"

	"attendance-system/config"
	"attendance-system/internal/handler"
	"attendance-system/internal/migrate"
	"attendance-system/internal/middleware"
	"attendance-system/internal/repository"
	"attendance-system/internal/service"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

func main() {
	cfg := config.Load()

	// ── 1. Raw *sql.DB — used by the migration engine ─────────────────────────
	rawDB, err := config.OpenRawDB(cfg)
	if err != nil {
		log.Fatalf("❌ DB connection failed: %v", err)
	}
	defer rawDB.Close()

	// ── 2. Run versioned migrations ───────────────────────────────────────────
	log.Println("▶ Running database migrations...")
	migrator := migrate.New(rawDB)
	if err := migrator.Up(); err != nil {
		log.Fatalf("❌ Migration failed: %v", err)
	}

	// ── 3. GORM connection (for repositories / services) ─────────────────────
	db, err := config.InitDB(cfg)
	if err != nil {
		log.Fatalf("❌ GORM init failed: %v", err)
	}

	// ── 4. Seed geofence sample zone (only on first run) ─────────────────────
	config.SeedSampleGeofence(db, cfg)

	// ── 5. Repositories ───────────────────────────────────────────────────────
	userRepo       := repository.NewUserRepository(db)
	attendanceRepo := repository.NewAttendanceRepository(db)
	deviceRepo     := repository.NewDeviceRepository(db)
	permRepo       := repository.NewPermissionRepository(db)
	roleRepo       := repository.NewRoleRepository(db)
	geofenceRepo   := repository.NewGeofenceRepository(db)

	// ── 6. Services ───────────────────────────────────────────────────────────
	fraudSvc      := service.NewFraudDetectionService(cfg)
	geofenceSvc   := service.NewGeofenceService(geofenceRepo)
	authSvc       := service.NewAuthService(userRepo, cfg)
	attendanceSvc := service.NewAttendanceService(attendanceRepo, deviceRepo, fraudSvc, geofenceSvc, cfg)
	deviceSvc     := service.NewDeviceService(deviceRepo)
	adminSvc      := service.NewAdminService(attendanceRepo)
	permSvc       := service.NewPermissionService(permRepo)
	roleSvc       := service.NewRoleService(roleRepo)
	userMgmtSvc   := service.NewUserManagementService(userRepo)

	// ── 7. Handlers ───────────────────────────────────────────────────────────
	authHandler       := handler.NewAuthHandler(authSvc)
	attendanceHandler := handler.NewAttendanceHandler(attendanceSvc)
	deviceHandler     := handler.NewDeviceHandler(deviceSvc)
	adminHandler      := handler.NewAdminHandler(adminSvc)
	permHandler       := handler.NewPermissionHandler(permSvc)
	roleHandler       := handler.NewRoleHandler(roleSvc)
	userMgmtHandler   := handler.NewUserManagementHandler(userMgmtSvc)
	geofenceHandler   := handler.NewGeofenceHandler(geofenceSvc)

	// ── 8. Router ─────────────────────────────────────────────────────────────
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))
	r.Use(middleware.Logger())

	// Health check (public)
	r.GET("/health", func(c *gin.Context) {
		if err := rawDB.Ping(); err != nil {
			c.JSON(503, gin.H{"status": "unhealthy", "error": err.Error()})
			return
		}
		migrations, _ := migrator.Status()
		applied, total := 0, len(migrations)
		for _, mg := range migrations {
			if mg.IsApplied {
				applied++
			}
		}
		c.JSON(200, gin.H{
			"status":              "ok",
			"db":                  "connected",
			"migrations_total":    total,
			"migrations_applied":  applied,
			"migrations_pending":  total - applied,
		})
	})

	api := r.Group("/api")

	// Public
	api.POST("/auth/login",    authHandler.Login)
	api.POST("/auth/register", authHandler.Register)

	// Protected
	protected := api.Group("/")
	protected.Use(middleware.JWTAuth(cfg.JWTSecret))
	{
		protected.GET("/me", func(c *gin.Context) {
			user, err := userRepo.FindByIDWithRole(c.GetUint("user_id"))
			if err != nil {
				c.JSON(404, gin.H{"error": "user not found"})
				return
			}
			c.JSON(200, gin.H{"user": user, "permissions": user.PermissionNames()})
		})

		// Attendance
		protected.POST("/attendance/check-in",  middleware.RequirePermission("attendance:check_in"),  attendanceHandler.CheckIn)
		protected.POST("/attendance/check-out", middleware.RequirePermission("attendance:check_out"), attendanceHandler.CheckOut)
		protected.GET("/attendance/history",    middleware.RequirePermission("attendance:view_own"),  attendanceHandler.History)
		protected.GET("/attendance/:id/fraud",  middleware.RequirePermission("attendance:view_own"),  attendanceHandler.GetFraudDetail)

		// Device
		protected.POST("/device/register", middleware.RequirePermission("device:register"), deviceHandler.Register)
		protected.GET("/device",           middleware.RequirePermission("device:view"),     deviceHandler.List)

		// Geofence — read (all authenticated)
		protected.GET("/geofence/active", geofenceHandler.ListActive)
		protected.POST("/geofence/check", geofenceHandler.CheckPoint)

		// Admin — attendance monitoring
		adminGrp := protected.Group("/admin")
		adminGrp.Use(middleware.AdminOnly())
		{
			adminGrp.GET("/attendance",       middleware.RequirePermission("attendance:view_all"),   adminHandler.GetAllAttendance)
			adminGrp.GET("/attendance/fraud", middleware.RequirePermission("attendance:view_fraud"), adminHandler.GetFraudAttendance)
		}

		// Users
		usersGrp := protected.Group("/users")
		{
			usersGrp.GET("",            middleware.RequirePermission("user:view"),        userMgmtHandler.List)
			usersGrp.GET("/:id",        middleware.RequirePermission("user:view"),        userMgmtHandler.Get)
			usersGrp.POST("",           middleware.RequirePermission("user:create"),      userMgmtHandler.Create)
			usersGrp.PUT("/:id",        middleware.RequirePermission("user:update"),      userMgmtHandler.Update)
			usersGrp.DELETE("/:id",     middleware.RequirePermission("user:delete"),      userMgmtHandler.Delete)
			usersGrp.PATCH("/:id/role", middleware.RequirePermission("user:assign_role"), userMgmtHandler.AssignRole)
		}

		// Roles
		rolesGrp := protected.Group("/roles")
		{
			rolesGrp.GET("",                middleware.RequirePermission("role:view"),   roleHandler.List)
			rolesGrp.GET("/:id",            middleware.RequirePermission("role:view"),   roleHandler.Get)
			rolesGrp.POST("",               middleware.RequirePermission("role:create"), roleHandler.Create)
			rolesGrp.PUT("/:id",            middleware.RequirePermission("role:update"), roleHandler.Update)
			rolesGrp.DELETE("/:id",         middleware.RequirePermission("role:delete"), roleHandler.Delete)
			rolesGrp.PUT("/:id/permissions",middleware.RequirePermission("role:update"), roleHandler.SetPermissions)
		}

		// Permissions
		permsGrp := protected.Group("/permissions")
		{
			permsGrp.GET("",       middleware.RequirePermission("permission:view"),   permHandler.List)
			permsGrp.POST("",      middleware.RequirePermission("permission:create"), permHandler.Create)
			permsGrp.PUT("/:id",   middleware.RequirePermission("permission:update"), permHandler.Update)
			permsGrp.DELETE("/:id",middleware.RequirePermission("permission:delete"), permHandler.Delete)
		}

		// Geofence management
		gfGrp := protected.Group("/geofence")
		gfGrp.Use(middleware.RequirePermission("geofence:manage"))
		{
			gfGrp.GET("",            geofenceHandler.List)
			gfGrp.GET("/:id",        geofenceHandler.Get)
			gfGrp.POST("",           geofenceHandler.Create)
			gfGrp.PUT("/:id",        geofenceHandler.Update)
			gfGrp.DELETE("/:id",     geofenceHandler.Delete)
			gfGrp.PATCH("/:id/toggle", geofenceHandler.Toggle)
		}
	}

	log.Printf("🚀 AttendGuard API running on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
