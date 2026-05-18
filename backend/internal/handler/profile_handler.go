package handler

import (
	"net/http"

	"attendance-system/internal/service"

	"github.com/gin-gonic/gin"
)

type ProfileHandler struct {
	profileSvc service.ProfileService
}

func NewProfileHandler(profileSvc service.ProfileService) *ProfileHandler {
	return &ProfileHandler{profileSvc: profileSvc}
}

func (h *ProfileHandler) UpdateProfile(c *gin.Context) {
	var req service.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.profileSvc.UpdateProfile(c.GetUint("user_id"), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Profile updated successfully",
		"user":    user,
	})
}

func (h *ProfileHandler) ChangePassword(c *gin.Context) {
	var req service.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.profileSvc.ChangePassword(c.GetUint("user_id"), req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password updated successfully",
	})
}
