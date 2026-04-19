package repository

import (
	"attendance-system/internal/model"
	"gorm.io/gorm"
)

type GeofenceRepository interface {
	Create(zone *model.GeofenceZone) error
	Update(zone *model.GeofenceZone) error
	Delete(id uint) error
	FindByID(id uint) (*model.GeofenceZone, error)
	FindAll() ([]model.GeofenceZone, error)
	FindActive() ([]model.GeofenceZone, error)
	// Replace all points for a zone atomically
	ReplacePoints(zoneID uint, points []model.GeofencePoint) error
}

type geofenceRepository struct{ db *gorm.DB }

func NewGeofenceRepository(db *gorm.DB) GeofenceRepository {
	return &geofenceRepository{db}
}

func (r *geofenceRepository) Create(zone *model.GeofenceZone) error {
	return r.db.Create(zone).Error
}

func (r *geofenceRepository) Update(zone *model.GeofenceZone) error {
	return r.db.Save(zone).Error
}

func (r *geofenceRepository) Delete(id uint) error {
	return r.db.Delete(&model.GeofenceZone{}, id).Error
}

func (r *geofenceRepository) FindByID(id uint) (*model.GeofenceZone, error) {
	var zone model.GeofenceZone
	err := r.db.Preload("Points", func(db *gorm.DB) *gorm.DB {
		return db.Order("geofence_points.sequence ASC")
	}).First(&zone, id).Error
	return &zone, err
}

func (r *geofenceRepository) FindAll() ([]model.GeofenceZone, error) {
	var zones []model.GeofenceZone
	err := r.db.Preload("Points", func(db *gorm.DB) *gorm.DB {
		return db.Order("geofence_points.sequence ASC")
	}).Order("id").Find(&zones).Error
	return zones, err
}

func (r *geofenceRepository) FindActive() ([]model.GeofenceZone, error) {
	var zones []model.GeofenceZone
	err := r.db.Preload("Points", func(db *gorm.DB) *gorm.DB {
		return db.Order("geofence_points.sequence ASC")
	}).Where("is_active = true").Find(&zones).Error
	return zones, err
}

func (r *geofenceRepository) ReplacePoints(zoneID uint, points []model.GeofencePoint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("zone_id = ?", zoneID).Delete(&model.GeofencePoint{}).Error; err != nil {
			return err
		}
		if len(points) == 0 {
			return nil
		}
		for i := range points {
			points[i].ZoneID = zoneID
			points[i].Sequence = i
		}
		return tx.Create(&points).Error
	})
}
