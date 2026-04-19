package main

import (
	"log"

	"attendance-system/config"
	"attendance-system/internal/handler"
	"attendance-system/internal/middleware"
	"attendance-system/internal/model"
	"attendance-system/internal/repository"
	"attendance-system/internal/service"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	db, err := config.InitDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto migrate — includes new RBAC + Geofence tables
	if err := db.AutoMigrate(
		&model.Permission{},
		&model.Role{},
		&model.RolePermission{},
		&model.User{},
		&model.GeofenceZone{},
		&model.GeofencePoint{},
		&model.AttendanceLog{},
		&model.FraudFlag{},
		&model.Device{},
	); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	// Seed roles, permissions and admin user
	config.SeedRolesAndPermissions(db)
	config.SeedSampleGeofence(db, cfg)

	// Repos
	userRepo := repository.NewUserRepository(db)
	attendanceRepo := repository.NewAttendanceRepository(db)
	deviceRepo := repository.NewDeviceRepository(db)
	permRepo := repository.NewPermissionRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	geofenceRepo := repository.NewGeofenceRepository(db)

	// Services
	fraudSvc := service.NewFraudDetectionService(cfg)
	geofenceSvc := service.NewGeofenceService(geofenceRepo)
	authSvc := service.NewAuthService(userRepo, cfg)
	attendanceSvc := service.NewAttendanceService(attendanceRepo, deviceRepo, fraudSvc, geofenceSvc, cfg)
	deviceSvc := service.NewDeviceService(deviceRepo)
	adminSvc := service.NewAdminService(attendanceRepo)
	permSvc := service.NewPermissionService(permRepo)
	roleSvc := service.NewRoleService(roleRepo)
	userMgmtSvc := service.NewUserManagementService(userRepo)

	// Handlers
	authHandler := handler.NewAuthHandler(authSvc)
	attendanceHandler := handler.NewAttendanceHandler(attendanceSvc)
	deviceHandler := handler.NewDeviceHandler(deviceSvc)
	adminHandler := handler.NewAdminHandler(adminSvc)
	permHandler := handler.NewPermissionHandler(permSvc)
	roleHandler := handler.NewRoleHandler(roleSvc)
	userMgmtHandler := handler.NewUserManagementHandler(userMgmtSvc)
	geofenceHandler := handler.NewGeofenceHandler(geofenceSvc)

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))
	r.Use(middleware.Logger())

	api := r.Group("/api")

	// ── Public ────────────────────────────────────────────────────────────────
	api.POST("/auth/login", authHandler.Login)
	api.POST("/auth/register", authHandler.Register)

	// ── Protected (JWT required) ──────────────────────────────────────────────
	auth := api.Group("/")
	auth.Use(middleware.JWTAuth(cfg.JWTSecret))
	{
		// Me
		auth.GET("/me", func(c *gin.Context) {
			userID := c.GetUint("user_id")
			user, err := userRepo.FindByIDWithRole(userID)
			if err != nil {
				c.JSON(404, gin.H{"error": "user not found"})
				return
			}
			c.JSON(200, gin.H{"user": user, "permissions": user.PermissionNames()})
		})

		// Attendance
		auth.POST("/attendance/check-in", middleware.RequirePermission("attendance:check_in"), attendanceHandler.CheckIn)
		auth.POST("/attendance/check-out", middleware.RequirePermission("attendance:check_out"), attendanceHandler.CheckOut)
		auth.GET("/attendance/history", middleware.RequirePermission("attendance:view_own"), attendanceHandler.History)
		auth.GET("/attendance/:id/fraud", middleware.RequirePermission("attendance:view_own"), attendanceHandler.GetFraudDetail)

		// Device
		auth.POST("/device/register", middleware.RequirePermission("device:register"), deviceHandler.Register)
		auth.GET("/device", middleware.RequirePermission("device:view"), deviceHandler.List)

		// Geofence — active zones visible to all authenticated users (needed for map on check-in page)
		auth.GET("/geofence/active", geofenceHandler.ListActive)
		auth.POST("/geofence/check", geofenceHandler.CheckPoint)

		// Admin attendance
		admin := auth.Group("/admin")
		admin.Use(middleware.AdminOnly())
		{
			admin.GET("/attendance", middleware.RequirePermission("attendance:view_all"), adminHandler.GetAllAttendance)
			admin.GET("/attendance/fraud", middleware.RequirePermission("attendance:view_fraud"), adminHandler.GetFraudAttendance)
		}

		// User management
		users := auth.Group("/users")
		{
			users.GET("", middleware.RequirePermission("user:view"), userMgmtHandler.List)
			users.GET("/:id", middleware.RequirePermission("user:view"), userMgmtHandler.Get)
			users.POST("", middleware.RequirePermission("user:create"), userMgmtHandler.Create)
			users.PUT("/:id", middleware.RequirePermission("user:update"), userMgmtHandler.Update)
			users.DELETE("/:id", middleware.RequirePermission("user:delete"), userMgmtHandler.Delete)
			users.PATCH("/:id/role", middleware.RequirePermission("user:assign_role"), userMgmtHandler.AssignRole)
		}

		// Role management
		roles := auth.Group("/roles")
		{
			roles.GET("", middleware.RequirePermission("role:view"), roleHandler.List)
			roles.GET("/:id", middleware.RequirePermission("role:view"), roleHandler.Get)
			roles.POST("", middleware.RequirePermission("role:create"), roleHandler.Create)
			roles.PUT("/:id", middleware.RequirePermission("role:update"), roleHandler.Update)
			roles.DELETE("/:id", middleware.RequirePermission("role:delete"), roleHandler.Delete)
			roles.PUT("/:id/permissions", middleware.RequirePermission("role:update"), roleHandler.SetPermissions)
		}

		// Permission management
		perms := auth.Group("/permissions")
		{
			perms.GET("", middleware.RequirePermission("permission:view"), permHandler.List)
			perms.POST("", middleware.RequirePermission("permission:create"), permHandler.Create)
			perms.PUT("/:id", middleware.RequirePermission("permission:update"), permHandler.Update)
			perms.DELETE("/:id", middleware.RequirePermission("permission:delete"), permHandler.Delete)
		}

		// Geofence management (admin only)
		gf := auth.Group("/geofence")
		gf.Use(middleware.RequirePermission("geofence:manage"))
		{
			gf.GET("", geofenceHandler.List)
			gf.GET("/:id", geofenceHandler.Get)
			gf.POST("", geofenceHandler.Create)
			gf.PUT("/:id", geofenceHandler.Update)
			gf.DELETE("/:id", geofenceHandler.Delete)
			gf.PATCH("/:id/toggle", geofenceHandler.Toggle)
		}
	}

	log.Printf("🚀 AttendGuard API running on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
