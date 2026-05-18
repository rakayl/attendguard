package main

import (
	"log"

	"attendance-system/config"
	"attendance-system/internal/handler"
	"attendance-system/internal/middleware"
	"attendance-system/internal/migrate"
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
	userRepo := repository.NewUserRepository(db)
	attendanceRepo := repository.NewAttendanceRepository(db)
	deviceRepo := repository.NewDeviceRepository(db)
	permRepo := repository.NewPermissionRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	geofenceRepo := repository.NewGeofenceRepository(db)
	faceRepo := repository.NewFaceProfileRepository(db)
	dailyActivityRepo := repository.NewDailyActivityRepository(db)
	boardRepo := repository.NewBoardRepository(db)

	// ── 6. Services ───────────────────────────────────────────────────────────
	fraudSvc := service.NewFraudDetectionService(cfg)
	geofenceSvc := service.NewGeofenceService(geofenceRepo)
	faceSvc := service.NewFaceRecognitionService(faceRepo, userRepo)
	authSvc := service.NewAuthService(userRepo, cfg)
	profileSvc := service.NewProfileService(userRepo)
	attendanceSvc := service.NewAttendanceService(attendanceRepo, userRepo, deviceRepo, fraudSvc, geofenceSvc, faceSvc, cfg)
	deviceSvc := service.NewDeviceService(deviceRepo)
	adminSvc := service.NewAdminService(attendanceRepo)
	permSvc := service.NewPermissionService(permRepo)
	roleSvc := service.NewRoleService(roleRepo)
	userMgmtSvc := service.NewUserManagementService(userRepo)
	dailyActivitySvc := service.NewDailyActivityService(dailyActivityRepo, userRepo)
	boardSvc := service.NewBoardService(boardRepo, userRepo)
	teamSvc := service.NewTeamService(boardRepo, userRepo)

	// ── 7. Handlers ───────────────────────────────────────────────────────────
	authHandler := handler.NewAuthHandler(authSvc)
	profileHandler := handler.NewProfileHandler(profileSvc)
	attendanceHandler := handler.NewAttendanceHandler(attendanceSvc)
	deviceHandler := handler.NewDeviceHandler(deviceSvc)
	adminHandler := handler.NewAdminHandler(adminSvc)
	permHandler := handler.NewPermissionHandler(permSvc)
	roleHandler := handler.NewRoleHandler(roleSvc)
	userMgmtHandler := handler.NewUserManagementHandler(userMgmtSvc)
	geofenceHandler := handler.NewGeofenceHandler(geofenceSvc)
	faceHandler := handler.NewFaceHandler(faceSvc)
	dailyActivityHandler := handler.NewDailyActivityHandler(dailyActivitySvc, userMgmtSvc)
	boardHandler := handler.NewBoardHandler(boardSvc, userMgmtSvc)
	teamHandler := handler.NewTeamHandler(teamSvc, userMgmtSvc)

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
			"status":             "ok",
			"db":                 "connected",
			"migrations_total":   total,
			"migrations_applied": applied,
			"migrations_pending": total - applied,
		})
	})

	api := r.Group("/api")

	// Public
	api.POST("/auth/login", authHandler.Login)
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
		protected.PUT("/me", profileHandler.UpdateProfile)
		protected.PUT("/me/password", profileHandler.ChangePassword)

		// Attendance
		protected.POST("/attendance/check-in", middleware.RequirePermission("attendance:check_in"), attendanceHandler.CheckIn)
		protected.POST("/attendance/check-out", middleware.RequirePermission("attendance:check_out"), attendanceHandler.CheckOut)
		protected.GET("/attendance/history", middleware.RequirePermission("attendance:view_own"), attendanceHandler.History)
		protected.GET("/attendance/:id/fraud", middleware.RequirePermission("attendance:view_own"), attendanceHandler.GetFraudDetail)

		// Face recognition
		protected.GET("/face/me", middleware.RequirePermission("face:enroll"), faceHandler.MyProfiles)
		protected.POST("/face/enroll", middleware.RequirePermission("face:enroll"), faceHandler.EnrollSelf)
		protected.POST("/face/verify", middleware.RequirePermission("face:verify"), faceHandler.VerifySelf)

		// Daily Activity
		protected.GET("/activities", middleware.RequirePermission("activity:view"), dailyActivityHandler.List)
		protected.GET("/activities/calendar", middleware.RequirePermission("activity:view"), dailyActivityHandler.CalendarMonth)
		protected.GET("/activities/calendar/:date", middleware.RequirePermission("activity:view"), dailyActivityHandler.CalendarDate)
		protected.GET("/activities/:id", middleware.RequirePermission("activity:view"), dailyActivityHandler.Get)
		protected.POST("/activities", middleware.RequirePermission("activity:create"), dailyActivityHandler.Create)
		protected.PUT("/activities/:id", middleware.RequirePermission("activity:update"), dailyActivityHandler.Update)
		protected.DELETE("/activities/:id", middleware.RequirePermission("activity:delete"), dailyActivityHandler.Delete)
		protected.POST("/activities/:id/tasks", middleware.RequirePermission("activity:update"), dailyActivityHandler.CreateTask)
		protected.POST("/activities/:id/comments", middleware.RequirePermission("activity:comment"), dailyActivityHandler.CreateComment)
		protected.GET("/activities/:id/logs", middleware.RequirePermission("activity:log_view"), dailyActivityHandler.Logs)

		protected.GET("/daily-activities", middleware.RequirePermission("activity:view"), dailyActivityHandler.List)
		protected.GET("/daily-activities/calendar", middleware.RequirePermission("activity:view"), dailyActivityHandler.CalendarMonth)
		protected.GET("/daily-activities/calendar/:date", middleware.RequirePermission("activity:view"), dailyActivityHandler.CalendarDate)
		protected.GET("/daily-activities/:id", middleware.RequirePermission("activity:view"), dailyActivityHandler.Get)
		protected.POST("/daily-activities", middleware.RequirePermission("activity:create"), dailyActivityHandler.Create)
		protected.PUT("/daily-activities/:id", middleware.RequirePermission("activity:update"), dailyActivityHandler.Update)
		protected.DELETE("/daily-activities/:id", middleware.RequirePermission("activity:delete"), dailyActivityHandler.Delete)
		protected.POST("/daily-activities/:id/tasks", middleware.RequirePermission("activity:update"), dailyActivityHandler.CreateTask)
		protected.POST("/daily-activities/:id/comments", middleware.RequirePermission("activity:comment"), dailyActivityHandler.CreateComment)
		protected.GET("/daily-activities/:id/logs", middleware.RequirePermission("activity:log_view"), dailyActivityHandler.Logs)

		protected.PUT("/tasks/:id", middleware.RequirePermission("activity:update"), dailyActivityHandler.UpdateTask)
		protected.PATCH("/tasks/:id/status", middleware.RequirePermission("activity:task_update"), dailyActivityHandler.ToggleTask)
		protected.PATCH("/tasks/:id/toggle", middleware.RequirePermission("activity:task_update"), dailyActivityHandler.ToggleTask)
		protected.DELETE("/tasks/:id", middleware.RequirePermission("activity:update"), dailyActivityHandler.DeleteTask)
		protected.PUT("/comments/:id", middleware.RequirePermission("activity:comment"), dailyActivityHandler.UpdateComment)
		protected.DELETE("/comments/:id", middleware.RequirePermission("activity:comment"), dailyActivityHandler.DeleteComment)

		// Board management
		protected.GET("/teams", middleware.RequirePermission("team:view"), teamHandler.List)
		protected.POST("/teams", middleware.RequirePermission("team:create"), teamHandler.Create)
		protected.GET("/teams/:id", middleware.RequirePermission("team:view"), teamHandler.Get)
		protected.PUT("/teams/:id", middleware.RequirePermission("team:update"), teamHandler.Update)
		protected.DELETE("/teams/:id", middleware.RequirePermission("team:delete"), teamHandler.Delete)
		protected.GET("/teams/:id/members", middleware.RequirePermission("team:view"), teamHandler.ListMembers)
		protected.POST("/teams/:id/members", middleware.RequirePermission("team:invite"), teamHandler.InviteMember)
		protected.DELETE("/teams/:id/members/:memberId", middleware.RequirePermission("team:invite"), teamHandler.RemoveMember)
		protected.PATCH("/teams/:id/members/:memberId/role", middleware.RequirePermission("team:invite"), teamHandler.UpdateMemberRole)
		protected.POST("/teams/:id/workspaces", middleware.RequirePermission("team:update"), teamHandler.CreateWorkspace)
		protected.GET("/teams/:id/workspaces", middleware.RequirePermission("team:view"), teamHandler.ListWorkspaces)

		protected.GET("/workspaces", middleware.RequirePermission("board:view"), boardHandler.ListWorkspaces)
		protected.POST("/workspaces", middleware.RequirePermission("board:create"), boardHandler.CreateWorkspace)
		protected.GET("/workspaces/:id/boards", middleware.RequirePermission("board:view"), boardHandler.ListBoardsByWorkspace)
		protected.POST("/workspaces/:id/boards", middleware.RequirePermission("board:create"), boardHandler.CreateBoard)
		protected.GET("/boards/:id", middleware.RequirePermission("board:view"), boardHandler.GetBoard)
		protected.PUT("/boards/:id", middleware.RequirePermission("board:update"), boardHandler.UpdateBoard)
		protected.POST("/boards/:id/lists", middleware.RequirePermission("board:update"), boardHandler.CreateList)
		protected.PUT("/lists/:id", middleware.RequirePermission("board:update"), boardHandler.UpdateList)
		protected.POST("/lists/:id/cards", middleware.RequirePermission("board:update"), boardHandler.CreateCard)
		protected.PUT("/cards/:id", middleware.RequirePermission("board:update"), boardHandler.UpdateCard)
		protected.PATCH("/cards/:id/move", middleware.RequirePermission("board:update"), boardHandler.MoveCard)
		protected.POST("/cards/:id/checklists", middleware.RequirePermission("board:update"), boardHandler.CreateChecklist)
		protected.POST("/checklists/:id/items", middleware.RequirePermission("board:update"), boardHandler.CreateChecklistItem)
		protected.PATCH("/checklist-items/:id/toggle", middleware.RequirePermission("board:update"), boardHandler.ToggleChecklistItem)
		protected.POST("/cards/:id/comments", middleware.RequirePermission("board:comment"), boardHandler.CreateComment)

		// Device
		protected.POST("/device/register", middleware.RequirePermission("device:register"), deviceHandler.Register)
		protected.GET("/device", middleware.RequirePermission("device:view"), deviceHandler.List)

		// Geofence — read (all authenticated)
		protected.GET("/geofence/active", geofenceHandler.ListActive)
		protected.POST("/geofence/check", geofenceHandler.CheckPoint)

		// Admin — attendance monitoring
		adminGrp := protected.Group("/admin")
		adminGrp.Use(middleware.AdminOnly())
		{
			adminGrp.GET("/attendance", middleware.RequirePermission("attendance:view_all"), adminHandler.GetAllAttendance)
			adminGrp.GET("/attendance/fraud", middleware.RequirePermission("attendance:view_fraud"), adminHandler.GetFraudAttendance)
		}

		// Users
		usersGrp := protected.Group("/users")
		{
			usersGrp.GET("", middleware.RequirePermission("user:view"), userMgmtHandler.List)
			usersGrp.GET("/:id", middleware.RequirePermission("user:view"), userMgmtHandler.Get)
			usersGrp.POST("", middleware.RequirePermission("user:create"), userMgmtHandler.Create)
			usersGrp.PUT("/:id", middleware.RequirePermission("user:update"), userMgmtHandler.Update)
			usersGrp.DELETE("/:id", middleware.RequirePermission("user:delete"), userMgmtHandler.Delete)
			usersGrp.PATCH("/:id/role", middleware.RequirePermission("user:assign_role"), userMgmtHandler.AssignRole)
		}

		// Roles
		rolesGrp := protected.Group("/roles")
		{
			rolesGrp.GET("", middleware.RequirePermission("role:view"), roleHandler.List)
			rolesGrp.GET("/:id", middleware.RequirePermission("role:view"), roleHandler.Get)
			rolesGrp.POST("", middleware.RequirePermission("role:create"), roleHandler.Create)
			rolesGrp.PUT("/:id", middleware.RequirePermission("role:update"), roleHandler.Update)
			rolesGrp.DELETE("/:id", middleware.RequirePermission("role:delete"), roleHandler.Delete)
			rolesGrp.PUT("/:id/permissions", middleware.RequirePermission("role:update"), roleHandler.SetPermissions)
		}

		// Permissions
		permsGrp := protected.Group("/permissions")
		{
			permsGrp.GET("", middleware.RequirePermission("permission:view"), permHandler.List)
			permsGrp.POST("", middleware.RequirePermission("permission:create"), permHandler.Create)
			permsGrp.PUT("/:id", middleware.RequirePermission("permission:update"), permHandler.Update)
			permsGrp.DELETE("/:id", middleware.RequirePermission("permission:delete"), permHandler.Delete)
		}

		// Geofence management
		gfGrp := protected.Group("/geofence")
		gfGrp.Use(middleware.RequirePermission("geofence:manage"))
		{
			gfGrp.GET("", geofenceHandler.List)
			gfGrp.GET("/:id", geofenceHandler.Get)
			gfGrp.POST("", geofenceHandler.Create)
			gfGrp.PUT("/:id", geofenceHandler.Update)
			gfGrp.DELETE("/:id", geofenceHandler.Delete)
			gfGrp.PATCH("/:id/toggle", geofenceHandler.Toggle)
		}

		// Face recognition management
		faceGrp := protected.Group("/admin/face")
		faceGrp.Use(middleware.RequirePermission("face:manage"))
		{
			faceGrp.GET("", faceHandler.List)
			faceGrp.POST("/users/:userID/enroll", faceHandler.EnrollForUser)
			faceGrp.PATCH("/:id/active", faceHandler.SetActive)
		}
	}

	log.Printf("🚀 AttendGuard API running on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
