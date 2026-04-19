package service

import (
	"errors"
	"math"

	"attendance-system/internal/model"
	"attendance-system/internal/repository"
)

// ── Point-in-Polygon (Ray Casting Algorithm) ────────────────────────────────
// Returns true if the point (lat, lng) is inside the polygon defined by points.
// Uses the ray casting algorithm which works for any simple polygon.
func PointInPolygon(lat, lng float64, points []model.GeofencePoint) bool {
	n := len(points)
	if n < 3 {
		return false
	}

	inside := false
	j := n - 1
	for i := 0; i < n; i++ {
		xi, yi := points[i].Long, points[i].Lat
		xj, yj := points[j].Long, points[j].Lat

		intersect := ((yi > lat) != (yj > lat)) &&
			(lng < (xj-xi)*(lat-yi)/(yj-yi)+xi)
		if intersect {
			inside = !inside
		}
		j = i
	}
	return inside
}

// DistanceToPolygonEdge returns the shortest distance (meters) from a point
// to the nearest edge of the polygon. Useful for "how far outside" messages.
func DistanceToPolygonEdge(lat, lng float64, points []model.GeofencePoint) float64 {
	n := len(points)
	if n == 0 {
		return math.MaxFloat64
	}
	minDist := math.MaxFloat64
	for i := 0; i < n; i++ {
		j := (i + 1) % n
		d := distPointToSegment(lat, lng, points[i].Lat, points[i].Long, points[j].Lat, points[j].Long)
		if d < minDist {
			minDist = d
		}
	}
	return minDist
}

func distPointToSegment(plat, plng, alat, alng, blat, blng float64) float64 {
	ax, ay := alng, alat
	bx, by := blng, blat
	px, py := plng, plat

	dx, dy := bx-ax, by-ay
	lenSq := dx*dx + dy*dy
	var t float64
	if lenSq != 0 {
		t = ((px-ax)*dx + (py-ay)*dy) / lenSq
		if t < 0 {
			t = 0
		} else if t > 1 {
			t = 1
		}
	}
	nx := ax + t*dx
	ny := ay + t*dy
	return haversineDistance(py, px, ny, nx)
}

// ── Geofence Service ─────────────────────────────────────────────────────────

type PointInput struct {
	Lat  float64 `json:"lat"`
	Long float64 `json:"long"`
	Seq  int     `json:"seq"`
}

type CreateZoneRequest struct {
	Name        string       `json:"name" binding:"required"`
	Description string       `json:"description"`
	Color       string       `json:"color"`
	IsActive    bool         `json:"is_active"`
	Points      []PointInput `json:"points"`
}

type UpdateZoneRequest struct {
	Name        string       `json:"name"`
	Description string       `json:"description"`
	Color       string       `json:"color"`
	IsActive    *bool        `json:"is_active"`
	Points      []PointInput `json:"points"`
}

type ZoneCheckResult struct {
	InsideAnyZone bool   `json:"inside_any_zone"`
	ZoneName      string `json:"zone_name,omitempty"`
	ZoneID        uint   `json:"zone_id,omitempty"`
	DistanceOut   float64 `json:"distance_out_meters,omitempty"` // 0 if inside
}

type GeofenceService interface {
	Create(req CreateZoneRequest) (*model.GeofenceZone, error)
	Update(id uint, req UpdateZoneRequest) (*model.GeofenceZone, error)
	Delete(id uint) error
	GetByID(id uint) (*model.GeofenceZone, error)
	GetAll() ([]model.GeofenceZone, error)
	GetActive() ([]model.GeofenceZone, error)
	// CheckPoint validates a GPS coordinate against all active zones
	CheckPoint(lat, lng float64) ZoneCheckResult
	// CheckPointAgainstZones — use when zones already loaded (avoids extra DB hit)
	CheckPointAgainstZones(lat, lng float64, zones []model.GeofenceZone) ZoneCheckResult
}

type geofenceService struct {
	repo repository.GeofenceRepository
}

func NewGeofenceService(repo repository.GeofenceRepository) GeofenceService {
	return &geofenceService{repo}
}

func (s *geofenceService) Create(req CreateZoneRequest) (*model.GeofenceZone, error) {
	if len(req.Points) < 3 {
		return nil, errors.New("a polygon zone requires at least 3 points")
	}
	color := req.Color
	if color == "" {
		color = "#06b6d4"
	}
	zone := &model.GeofenceZone{
		Name:        req.Name,
		Description: req.Description,
		Color:       color,
		IsActive:    req.IsActive,
	}
	if err := s.repo.Create(zone); err != nil {
		return nil, err
	}
	points := make([]model.GeofencePoint, len(req.Points))
	for i, p := range req.Points {
		points[i] = model.GeofencePoint{Lat: p.Lat, Long: p.Long, Sequence: i}
	}
	if err := s.repo.ReplacePoints(zone.ID, points); err != nil {
		return nil, err
	}
	return s.repo.FindByID(zone.ID)
}

func (s *geofenceService) Update(id uint, req UpdateZoneRequest) (*model.GeofenceZone, error) {
	zone, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("zone not found")
	}
	if req.Name != "" {
		zone.Name = req.Name
	}
	if req.Description != "" {
		zone.Description = req.Description
	}
	if req.Color != "" {
		zone.Color = req.Color
	}
	if req.IsActive != nil {
		zone.IsActive = *req.IsActive
	}
	if err := s.repo.Update(zone); err != nil {
		return nil, err
	}
	if req.Points != nil {
		if len(req.Points) > 0 && len(req.Points) < 3 {
			return nil, errors.New("polygon requires at least 3 points")
		}
		points := make([]model.GeofencePoint, len(req.Points))
		for i, p := range req.Points {
			points[i] = model.GeofencePoint{Lat: p.Lat, Long: p.Long, Sequence: i}
		}
		if err := s.repo.ReplacePoints(id, points); err != nil {
			return nil, err
		}
	}
	return s.repo.FindByID(id)
}

func (s *geofenceService) Delete(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return errors.New("zone not found")
	}
	return s.repo.Delete(id)
}

func (s *geofenceService) GetByID(id uint) (*model.GeofenceZone, error) {
	return s.repo.FindByID(id)
}

func (s *geofenceService) GetAll() ([]model.GeofenceZone, error) {
	return s.repo.FindAll()
}

func (s *geofenceService) GetActive() ([]model.GeofenceZone, error) {
	return s.repo.FindActive()
}

func (s *geofenceService) CheckPoint(lat, lng float64) ZoneCheckResult {
	zones, err := s.repo.FindActive()
	if err != nil || len(zones) == 0 {
		// No active zones configured → allow check-in (open mode)
		return ZoneCheckResult{InsideAnyZone: true}
	}
	return s.CheckPointAgainstZones(lat, lng, zones)
}

func (s *geofenceService) CheckPointAgainstZones(lat, lng float64, zones []model.GeofenceZone) ZoneCheckResult {
	if len(zones) == 0 {
		return ZoneCheckResult{InsideAnyZone: true}
	}
	for _, zone := range zones {
		if PointInPolygon(lat, lng, zone.Points) {
			return ZoneCheckResult{
				InsideAnyZone: true,
				ZoneName:      zone.Name,
				ZoneID:        zone.ID,
			}
		}
	}
	// Find nearest zone and compute distance to its edge
	minDist := math.MaxFloat64
	for _, zone := range zones {
		d := DistanceToPolygonEdge(lat, lng, zone.Points)
		if d < minDist {
			minDist = d
		}
	}
	return ZoneCheckResult{
		InsideAnyZone: false,
		DistanceOut:   minDist,
	}
}
