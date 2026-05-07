package handler

import (
	"errors"
	"net/http"
	"strconv"

	"attendance-system/internal/model"
	"attendance-system/internal/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type DailyActivityHandler struct {
	svc     service.DailyActivityService
	userSvc service.UserManagementService
}

func NewDailyActivityHandler(svc service.DailyActivityService, userSvc service.UserManagementService) *DailyActivityHandler {
	return &DailyActivityHandler{svc: svc, userSvc: userSvc}
}

func (h *DailyActivityHandler) List(c *gin.Context) {
	var userID *uint
	raw := c.Query("assigned_user")
	if raw == "" {
		raw = c.Query("user_id")
	}
	if raw != "" {
		id, err := strconv.ParseUint(raw, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid assigned_user"})
			return
		}
		value := uint(id)
		userID = &value
	}
	items, err := h.svc.List(service.DailyActivityFilterRequest{
		TenantID:   c.GetUint("tenant_id"),
		UserID:     userID,
		Status:     c.Query("status"),
		DatePreset: c.DefaultQuery("date_preset", "today"),
		DateFrom:   c.Query("date_from"),
		DateTo:     c.Query("date_to"),
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"activities": items, "total": len(items)})
}

func (h *DailyActivityHandler) Get(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}
	item, err := h.svc.GetByID(id, c.GetUint("user_id"))
	if err != nil {
		h.activityError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"activity": item})
}

func (h *DailyActivityHandler) Create(c *gin.Context) {
	var req service.CreateDailyActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}
	item, err := h.svc.Create(actor, req)
	if err != nil {
		h.activityError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"activity": item, "message": "Daily activity created"})
}

func (h *DailyActivityHandler) Update(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}
	var req service.UpdateDailyActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}
	item, err := h.svc.Update(id, actor, req)
	if err != nil {
		h.activityError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"activity": item, "message": "Daily activity updated"})
}

func (h *DailyActivityHandler) Delete(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}
	if err := h.svc.Delete(id, actor); err != nil {
		h.activityError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Daily activity deleted"})
}

func (h *DailyActivityHandler) CreateTask(c *gin.Context) {
	activityID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}
	var req service.CreateDailyActivityTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}
	task, activity, err := h.svc.CreateTask(activityID, actor, req)
	if err != nil {
		h.activityError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"task":     task,
		"activity": activity,
		"message":  "Task created",
	})
}

func (h *DailyActivityHandler) UpdateTask(c *gin.Context) {
	taskID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}
	var req service.UpdateDailyActivityTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}
	task, activity, err := h.svc.UpdateTask(taskID, actor, req)
	if err != nil {
		h.activityError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"task":     task,
		"activity": activity,
		"message":  "Task updated",
	})
}

func (h *DailyActivityHandler) UpdateTaskStatus(c *gin.Context) {
	taskID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}
	var req service.UpdateDailyActivityTaskStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}
	task, activity, err := h.svc.UpdateTaskStatus(taskID, actor, req)
	if err != nil {
		h.activityError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"task":     task,
		"activity": activity,
		"message":  "Task status updated",
	})
}

func (h *DailyActivityHandler) DeleteTask(c *gin.Context) {
	taskID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}
	activity, err := h.svc.DeleteTask(taskID, actor)
	if err != nil {
		h.activityError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"activity": activity,
		"message":  "Task deleted",
	})
}

func (h *DailyActivityHandler) Logs(c *gin.Context) {
	activityID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}
	items, err := h.svc.GetLogs(activityID, c.GetUint("user_id"))
	if err != nil {
		h.activityError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"logs": items, "total": len(items)})
}

func (h *DailyActivityHandler) currentUser(c *gin.Context) (*model.User, error) {
	return h.userSvc.GetByID(c.GetUint("user_id"))
}

func (h *DailyActivityHandler) activityError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrActivityForbidden), errors.Is(err, service.ErrTaskForbidden):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	case errors.Is(err, service.ErrTaskStatusTransition):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "resource not found"})
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}
}

func parseUintParam(c *gin.Context, key string) (uint, error) {
	raw := c.Param(key)
	value, err := strconv.ParseUint(raw, 10, 32)
	if err != nil {
		return 0, err
	}
	return uint(value), nil
}
