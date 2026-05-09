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
	actor, err := h.currentUser(c)
	if err != nil {
		h.respondError(c, http.StatusUnauthorized, "User not found", "user not found")
		return
	}
	var userID *uint
	raw := c.Query("assigned_user")
	if raw == "" {
		raw = c.Query("user_id")
	}
	if raw != "" {
		id, err := strconv.ParseUint(raw, 10, 32)
		if err != nil {
			h.respondError(c, http.StatusBadRequest, "Invalid assigned user", err.Error())
			return
		}
		value := uint(id)
		userID = &value
	}
	items, err := h.svc.List(actor, service.DailyActivityFilterRequest{
		TenantID:   c.GetUint("tenant_id"),
		UserID:     userID,
		Status:     c.Query("status"),
		DatePreset: c.DefaultQuery("date_preset", "today"),
		DateFrom:   c.Query("date_from"),
		DateTo:     c.Query("date_to"),
	})
	if err != nil {
		h.activityError(c, err)
		return
	}
	h.respondSuccess(c, http.StatusOK, "Daily activities fetched successfully", gin.H{
		"activities": items,
		"total":      len(items),
	})
}

func (h *DailyActivityHandler) Get(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid ID", "invalid ID")
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respondError(c, http.StatusUnauthorized, "User not found", "user not found")
		return
	}
	item, err := h.svc.GetByID(id, actor)
	if err != nil {
		h.activityError(c, err)
		return
	}
	h.respondSuccess(c, http.StatusOK, "Daily activity fetched successfully", item)
}

func (h *DailyActivityHandler) Create(c *gin.Context) {
	var req service.CreateDailyActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respondError(c, http.StatusUnauthorized, "User not found", "user not found")
		return
	}
	item, err := h.svc.Create(actor, req)
	if err != nil {
		h.activityError(c, err)
		return
	}
	h.respondSuccess(c, http.StatusCreated, "Daily activity created successfully", item)
}

func (h *DailyActivityHandler) Update(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid ID", "invalid ID")
		return
	}
	var req service.UpdateDailyActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respondError(c, http.StatusUnauthorized, "User not found", "user not found")
		return
	}
	item, err := h.svc.Update(id, actor, req)
	if err != nil {
		h.activityError(c, err)
		return
	}
	h.respondSuccess(c, http.StatusOK, "Daily activity updated successfully", item)
}

func (h *DailyActivityHandler) Delete(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid ID", "invalid ID")
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respondError(c, http.StatusUnauthorized, "User not found", "user not found")
		return
	}
	if err := h.svc.Delete(id, actor); err != nil {
		h.activityError(c, err)
		return
	}
	h.respondSuccess(c, http.StatusOK, "Daily activity deleted successfully", gin.H{"id": id})
}

func (h *DailyActivityHandler) CreateTask(c *gin.Context) {
	activityID, err := parseUintParam(c, "id")
	if err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid ID", "invalid ID")
		return
	}
	var req service.CreateDailyActivityTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respondError(c, http.StatusUnauthorized, "User not found", "user not found")
		return
	}
	task, activity, err := h.svc.CreateTask(activityID, actor, req)
	if err != nil {
		h.activityError(c, err)
		return
	}
	h.respondSuccess(c, http.StatusCreated, "Task created successfully", gin.H{
		"task":     task,
		"activity": activity,
	})
}

func (h *DailyActivityHandler) UpdateTask(c *gin.Context) {
	taskID, err := parseUintParam(c, "id")
	if err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid ID", "invalid ID")
		return
	}
	var req service.UpdateDailyActivityTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respondError(c, http.StatusUnauthorized, "User not found", "user not found")
		return
	}
	task, activity, err := h.svc.UpdateTask(taskID, actor, req)
	if err != nil {
		h.activityError(c, err)
		return
	}
	h.respondSuccess(c, http.StatusOK, "Task updated successfully", gin.H{
		"task":     task,
		"activity": activity,
	})
}

func (h *DailyActivityHandler) ToggleTask(c *gin.Context) {
	taskID, err := parseUintParam(c, "id")
	if err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid ID", "invalid ID")
		return
	}
	var req service.ToggleDailyActivityTaskRequest
	if c.Request.ContentLength > 0 {
		if err := c.ShouldBindJSON(&req); err != nil {
			h.respondError(c, http.StatusBadRequest, "Invalid request body", err.Error())
			return
		}
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respondError(c, http.StatusUnauthorized, "User not found", "user not found")
		return
	}
	task, activity, err := h.svc.ToggleTask(taskID, actor, req)
	if err != nil {
		h.activityError(c, err)
		return
	}
	h.respondSuccess(c, http.StatusOK, "Task updated successfully", gin.H{
		"task":     task,
		"activity": activity,
	})
}

func (h *DailyActivityHandler) DeleteTask(c *gin.Context) {
	taskID, err := parseUintParam(c, "id")
	if err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid ID", "invalid ID")
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respondError(c, http.StatusUnauthorized, "User not found", "user not found")
		return
	}
	activity, err := h.svc.DeleteTask(taskID, actor)
	if err != nil {
		h.activityError(c, err)
		return
	}
	h.respondSuccess(c, http.StatusOK, "Task deleted successfully", activity)
}

func (h *DailyActivityHandler) CreateComment(c *gin.Context) {
	activityID, err := parseUintParam(c, "id")
	if err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid ID", "invalid ID")
		return
	}
	var req service.CreateDailyActivityCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respondError(c, http.StatusUnauthorized, "User not found", "user not found")
		return
	}
	comment, activity, err := h.svc.CreateComment(activityID, actor, req)
	if err != nil {
		h.activityError(c, err)
		return
	}
	h.respondSuccess(c, http.StatusCreated, "Comment created successfully", gin.H{
		"comment":  comment,
		"activity": activity,
	})
}

func (h *DailyActivityHandler) UpdateComment(c *gin.Context) {
	commentID, err := parseUintParam(c, "id")
	if err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid ID", "invalid ID")
		return
	}
	var req service.UpdateDailyActivityCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respondError(c, http.StatusUnauthorized, "User not found", "user not found")
		return
	}
	comment, activity, err := h.svc.UpdateComment(commentID, actor, req)
	if err != nil {
		h.activityError(c, err)
		return
	}
	h.respondSuccess(c, http.StatusOK, "Comment updated successfully", gin.H{
		"comment":  comment,
		"activity": activity,
	})
}

func (h *DailyActivityHandler) DeleteComment(c *gin.Context) {
	commentID, err := parseUintParam(c, "id")
	if err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid ID", "invalid ID")
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respondError(c, http.StatusUnauthorized, "User not found", "user not found")
		return
	}
	activity, err := h.svc.DeleteComment(commentID, actor)
	if err != nil {
		h.activityError(c, err)
		return
	}
	h.respondSuccess(c, http.StatusOK, "Comment deleted successfully", activity)
}

func (h *DailyActivityHandler) Logs(c *gin.Context) {
	activityID, err := parseUintParam(c, "id")
	if err != nil {
		h.respondError(c, http.StatusBadRequest, "Invalid ID", "invalid ID")
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		h.respondError(c, http.StatusUnauthorized, "User not found", "user not found")
		return
	}
	items, err := h.svc.GetLogs(activityID, actor)
	if err != nil {
		h.activityError(c, err)
		return
	}
	h.respondSuccess(c, http.StatusOK, "Daily activity logs fetched successfully", gin.H{
		"logs":  items,
		"total": len(items),
	})
}

func (h *DailyActivityHandler) CalendarMonth(c *gin.Context) {
	actor, err := h.currentUser(c)
	if err != nil {
		h.respondError(c, http.StatusUnauthorized, "User not found", "user not found")
		return
	}
	item, err := h.svc.GetCalendarMonth(actor, c.Query("month"))
	if err != nil {
		h.activityError(c, err)
		return
	}
	h.respondSuccess(c, http.StatusOK, "Daily activity calendar fetched successfully", item)
}

func (h *DailyActivityHandler) CalendarDate(c *gin.Context) {
	actor, err := h.currentUser(c)
	if err != nil {
		h.respondError(c, http.StatusUnauthorized, "User not found", "user not found")
		return
	}
	item, err := h.svc.GetCalendarDate(actor, c.Param("date"))
	if err != nil {
		h.activityError(c, err)
		return
	}
	h.respondSuccess(c, http.StatusOK, "Daily activity calendar day fetched successfully", item)
}

func (h *DailyActivityHandler) currentUser(c *gin.Context) (*model.User, error) {
	return h.userSvc.GetByID(c.GetUint("user_id"))
}

func (h *DailyActivityHandler) activityError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrActivityForbidden), errors.Is(err, service.ErrTaskForbidden), errors.Is(err, service.ErrCommentForbidden):
		h.respondError(c, http.StatusForbidden, "Forbidden", err.Error())
	case errors.Is(err, gorm.ErrRecordNotFound):
		h.respondError(c, http.StatusNotFound, "Resource not found", "resource not found")
	default:
		h.respondError(c, http.StatusBadRequest, "Request failed", err.Error())
	}
}

func (h *DailyActivityHandler) respondSuccess(c *gin.Context, code int, message string, data any) {
	c.JSON(code, gin.H{
		"success": true,
		"message": message,
		"data":    data,
	})
}

func (h *DailyActivityHandler) respondError(c *gin.Context, code int, message string, detail string) {
	c.JSON(code, gin.H{
		"success": false,
		"message": message,
		"error":   detail,
	})
}

func parseUintParam(c *gin.Context, key string) (uint, error) {
	raw := c.Param(key)
	value, err := strconv.ParseUint(raw, 10, 32)
	if err != nil {
		return 0, err
	}
	return uint(value), nil
}
