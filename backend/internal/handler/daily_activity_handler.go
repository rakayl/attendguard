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
	if raw := c.Query("user_id"); raw != "" {
		id, err := strconv.ParseUint(raw, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id"})
			return
		}
		parsed := uint(id)
		userID = &parsed
	}
	items, err := h.svc.List(service.DailyActivityFilterRequest{
		TenantID:   c.GetUint("tenant_id"),
		UserID:     userID,
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
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}
	item, err := h.svc.GetByID(uint(id), c.GetUint("user_id"))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "activity not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"activity": item, "message": "Activity created"})
}

func (h *DailyActivityHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
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
	item, err := h.svc.Update(uint(id), actor, req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrActivityForbidden):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case errors.Is(err, service.ErrActivityConflict):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "activity not found"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"activity": item, "message": "Activity updated"})
}

func (h *DailyActivityHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}
	actor, err := h.currentUser(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}
	if err := h.svc.Delete(uint(id), actor); err != nil {
		switch {
		case errors.Is(err, service.ErrActivityForbidden):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "activity not found"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Activity deleted"})
}

func (h *DailyActivityHandler) currentUser(c *gin.Context) (*model.User, error) {
	return h.userSvc.GetByID(c.GetUint("user_id"))
}
