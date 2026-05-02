package handler

import (
	"net/http"
	"strconv"

	"attendance-system/internal/service"

	"github.com/gin-gonic/gin"
)

type FaceHandler struct {
	faceSvc service.FaceRecognitionService
}

func NewFaceHandler(faceSvc service.FaceRecognitionService) *FaceHandler {
	return &FaceHandler{faceSvc: faceSvc}
}

func (h *FaceHandler) EnrollSelf(c *gin.Context) {
	userID := c.GetUint("user_id")
	var req service.EnrollFaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.UserID = userID
	profile, err := h.faceSvc.Enroll(userID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"profile": profile, "message": "Face profile enrolled"})
}

func (h *FaceHandler) VerifySelf(c *gin.Context) {
	userID := c.GetUint("user_id")
	var req service.VerifyFaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.faceSvc.Verify(userID, req.FaceImage)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	status := http.StatusOK
	if !result.Verified {
		status = http.StatusForbidden
	}
	c.JSON(status, gin.H{"result": result})
}

func (h *FaceHandler) MyProfiles(c *gin.Context) {
	userID := c.GetUint("user_id")
	profiles, err := h.faceSvc.ListByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch face profiles"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"profiles": profiles})
}

func (h *FaceHandler) List(c *gin.Context) {
	profiles, err := h.faceSvc.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch face profiles"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"profiles": profiles, "total": len(profiles)})
}

func (h *FaceHandler) EnrollForUser(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("userID"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	var req service.EnrollFaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.UserID = uint(userID)
	profile, err := h.faceSvc.Enroll(uint(userID), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"profile": profile, "message": "Face profile enrolled"})
}

func (h *FaceHandler) SetActive(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	profile, err := h.faceSvc.SetActive(uint(id), req.IsActive)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"profile": profile, "message": "Face profile updated"})
}
