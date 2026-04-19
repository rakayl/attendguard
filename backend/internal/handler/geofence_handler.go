package handler

import (
	"net/http"
	"strconv"

	"attendance-system/internal/service"

	"github.com/gin-gonic/gin"
)

type GeofenceHandler struct{ svc service.GeofenceService }

func NewGeofenceHandler(svc service.GeofenceService) *GeofenceHandler {
	return &GeofenceHandler{svc}
}

// GET /geofence — returns all zones (admin) or only active zones (public)
func (h *GeofenceHandler) List(c *gin.Context) {
	zones, err := h.svc.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch zones"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"zones": zones, "total": len(zones)})
}

// GET /geofence/active — only active zones (used by check-in map)
func (h *GeofenceHandler) ListActive(c *gin.Context) {
	zones, err := h.svc.GetActive()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch active zones"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"zones": zones})
}

// GET /geofence/:id
func (h *GeofenceHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	zone, err := h.svc.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Zone not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"zone": zone})
}

// POST /geofence
func (h *GeofenceHandler) Create(c *gin.Context) {
	var req service.CreateZoneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	zone, err := h.svc.Create(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"zone": zone, "message": "Geofence zone created"})
}

// PUT /geofence/:id
func (h *GeofenceHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	var req service.UpdateZoneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	zone, err := h.svc.Update(uint(id), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"zone": zone, "message": "Zone updated"})
}

// DELETE /geofence/:id
func (h *GeofenceHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	if err := h.svc.Delete(uint(id)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Zone deleted"})
}

// POST /geofence/check — validate a coordinate (for frontend pre-check)
func (h *GeofenceHandler) CheckPoint(c *gin.Context) {
	var req struct {
		Lat  float64 `json:"lat" binding:"required"`
		Long float64 `json:"long" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result := h.svc.CheckPoint(req.Lat, req.Long)
	status := http.StatusOK
	if !result.InsideAnyZone {
		status = http.StatusForbidden
	}
	c.JSON(status, gin.H{"result": result})
}

// PATCH /geofence/:id/toggle — toggle active status
func (h *GeofenceHandler) Toggle(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	zone, err := h.svc.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Zone not found"})
		return
	}
	newActive := !zone.IsActive
	zone, err = h.svc.Update(uint(id), service.UpdateZoneRequest{IsActive: &newActive})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"zone": zone, "message": "Zone status toggled"})
}
