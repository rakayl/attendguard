package handler

import (
	"net/http"
	"strconv"

	"attendance-system/internal/service"

	"github.com/gin-gonic/gin"
)

// ---- Auth Handler ----

type AuthHandler struct {
	authSvc service.AuthService
}

func NewAuthHandler(authSvc service.AuthService) *AuthHandler {
	return &AuthHandler{authSvc}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token, user, err := h.authSvc.Login(req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  user,
	})
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req struct {
		Name     string `json:"name" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.authSvc.Register(req.Name, req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"user": user, "message": "Registration successful"})
}

// ---- Attendance Handler ----

type AttendanceHandler struct {
	attendanceSvc service.AttendanceService
}

func NewAttendanceHandler(attendanceSvc service.AttendanceService) *AttendanceHandler {
	return &AttendanceHandler{attendanceSvc}
}

func (h *AttendanceHandler) CheckIn(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req service.CheckInRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.IPAddress = c.ClientIP()

	log, err := h.attendanceSvc.CheckIn(userID, req)
	if err != nil {
		// Hard-block errors return 403 with structured body
		if blocked, ok := err.(*service.BlockedError); ok {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   blocked.Reason,
				"code":    blocked.Code,
				"blocked": true,
			})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Check-in successful",
		"attendance": log,
	})
}

func (h *AttendanceHandler) CheckOut(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req service.CheckOutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log, err := h.attendanceSvc.CheckOut(userID, req)
	if err != nil {
		if blocked, ok := err.(*service.BlockedError); ok {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   blocked.Reason,
				"code":    blocked.Code,
				"blocked": true,
			})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Check-out successful",
		"attendance": log,
	})
}

func (h *AttendanceHandler) History(c *gin.Context) {
	userID := c.GetUint("user_id")

	logs, err := h.attendanceSvc.History(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"attendance": logs})
}

func (h *AttendanceHandler) GetFraudDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	log, err := h.attendanceSvc.GetFraudDetail(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Attendance record not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"attendance": log})
}

// ---- Device Handler ----

type DeviceHandler struct {
	deviceSvc service.DeviceService
}

func NewDeviceHandler(deviceSvc service.DeviceService) *DeviceHandler {
	return &DeviceHandler{deviceSvc}
}

func (h *DeviceHandler) Register(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req service.RegisterDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	device, err := h.deviceSvc.Register(userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register device"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"device": device, "message": "Device registered"})
}

func (h *DeviceHandler) List(c *gin.Context) {
	userID := c.GetUint("user_id")

	devices, err := h.deviceSvc.List(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch devices"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"devices": devices})
}

// ---- Admin Handler ----

type AdminHandler struct {
	adminSvc service.AdminService
}

func NewAdminHandler(adminSvc service.AdminService) *AdminHandler {
	return &AdminHandler{adminSvc}
}

func (h *AdminHandler) GetAllAttendance(c *gin.Context) {
	logs, err := h.adminSvc.GetAllAttendance()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch attendance"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"attendance": logs, "total": len(logs)})
}

func (h *AdminHandler) GetFraudAttendance(c *gin.Context) {
	logs, err := h.adminSvc.GetFraudAttendance()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch fraud records"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"attendance": logs, "total": len(logs)})
}

func (h *AdminHandler) GetAllUsers(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Users endpoint"})
}
