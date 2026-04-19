package service

import (
	"errors"
	"fmt"
	"time"

	"attendance-system/config"
	"attendance-system/internal/model"
	"attendance-system/internal/repository"
)

type CheckInRequest struct {
	Lat        float64    `json:"lat" binding:"required"`
	Long       float64    `json:"long" binding:"required"`
	Accuracy   float64    `json:"accuracy"`
	IsMock     bool       `json:"is_mock"`
	DeviceTime *time.Time `json:"device_time"`
	DeviceID   string     `json:"device_id"`
	IPAddress  string     `json:"ip_address"`
}

type CheckOutRequest struct {
	Lat        float64    `json:"lat" binding:"required"`
	Long       float64    `json:"long" binding:"required"`
	Accuracy   float64    `json:"accuracy"`
	IsMock     bool       `json:"is_mock"`
	DeviceTime *time.Time `json:"device_time"`
	DeviceID   string     `json:"device_id"`
}

// BlockedError signals a hard-blocked check-in (not just fraud-flagged)
type BlockedError struct {
	Reason string
	Code   string // FAKE_GPS | OUTSIDE_ZONE
}

func (e *BlockedError) Error() string { return e.Reason }

type AttendanceService interface {
	CheckIn(userID uint, req CheckInRequest) (*model.AttendanceLog, error)
	CheckOut(userID uint, req CheckOutRequest) (*model.AttendanceLog, error)
	History(userID uint) ([]model.AttendanceLog, error)
	GetFraudDetail(id uint) (*model.AttendanceLog, error)
}

type attendanceService struct {
	attendanceRepo repository.AttendanceRepository
	deviceRepo     repository.DeviceRepository
	fraudSvc       FraudDetectionService
	geofenceSvc    GeofenceService
	cfg            *config.Config
}

func NewAttendanceService(
	attendanceRepo repository.AttendanceRepository,
	deviceRepo repository.DeviceRepository,
	fraudSvc FraudDetectionService,
	geofenceSvc GeofenceService,
	cfg *config.Config,
) AttendanceService {
	return &attendanceService{attendanceRepo, deviceRepo, fraudSvc, geofenceSvc, cfg}
}

func (s *attendanceService) CheckIn(userID uint, req CheckInRequest) (*model.AttendanceLog, error) {
	// ── HARD BLOCK 1: Fake GPS ────────────────────────────────────────────────
	// If the device reports is_mock=true, reject immediately — no record saved.
	if req.IsMock {
		return nil, &BlockedError{
			Reason: "Check-in blocked: Fake/mock GPS detected. Please disable GPS spoofing apps and try again.",
			Code:   "FAKE_GPS",
		}
	}

	// ── HARD BLOCK 2: Outside all active geofence zones ──────────────────────
	zoneResult := s.geofenceSvc.CheckPoint(req.Lat, req.Long)
	if !zoneResult.InsideAnyZone {
		msg := "Check-in blocked: You are outside the allowed attendance zone."
		if zoneResult.DistanceOut > 0 {
			msg = fmt.Sprintf("Check-in blocked: You are %.0f meters outside the allowed attendance zone.", zoneResult.DistanceOut)
		}
		return nil, &BlockedError{Reason: msg, Code: "OUTSIDE_ZONE"}
	}

	// ── Already checked in? ───────────────────────────────────────────────────
	existing, err := s.attendanceRepo.FindActiveCheckIn(userID)
	if err == nil && existing != nil {
		return nil, errors.New("already checked in, please check out first")
	}

	now := time.Now()
	checkInAt := now

	// Device registration check
	isNewDevice := false
	if req.DeviceID != "" {
		if _, err := s.deviceRepo.FindByUserAndDeviceID(userID, req.DeviceID); err != nil {
			isNewDevice = true
		}
	}

	// ── Fraud analysis (scoring only — not a block) ───────────────────────────
	fraudInput := FraudInput{
		IsMock:      false, // already blocked above if true
		Accuracy:    req.Accuracy,
		Lat:         req.Lat,
		Long:        req.Long,
		DeviceTime:  req.DeviceTime,
		ServerTime:  now,
		DeviceID:    req.DeviceID,
		UserID:      userID,
		IsNewDevice: isNewDevice,
		// Polygon geofence is now enforced as a hard block above,
		// so OUTSIDE_GEOFENCE flag will never appear (user is inside).
	}
	fraudResult := s.fraudSvc.Analyze(fraudInput)

	log := &model.AttendanceLog{
		UserID:      userID,
		Lat:         req.Lat,
		Long:        req.Long,
		Accuracy:    req.Accuracy,
		CheckInAt:   &checkInAt,
		DeviceTime:  req.DeviceTime,
		ServerTime:  now,
		FraudScore:  fraudResult.Score,
		FraudStatus: fraudResult.Status,
		IsMock:      false,
		DeviceID:    req.DeviceID,
		IPAddress:   req.IPAddress,
	}

	if err := s.attendanceRepo.Create(log); err != nil {
		return nil, err
	}

	for i := range fraudResult.Flags {
		fraudResult.Flags[i].AttendanceID = log.ID
	}
	_ = s.attendanceRepo.SaveFlags(fraudResult.Flags)

	log.FraudFlags = fraudResult.Flags
	return log, nil
}

func (s *attendanceService) CheckOut(userID uint, req CheckOutRequest) (*model.AttendanceLog, error) {
	// Hard block fake GPS on checkout too
	if req.IsMock {
		return nil, &BlockedError{
			Reason: "Check-out blocked: Fake/mock GPS detected.",
			Code:   "FAKE_GPS",
		}
	}

	log, err := s.attendanceRepo.FindActiveCheckIn(userID)
	if err != nil || log == nil {
		return nil, errors.New("no active check-in found")
	}

	now := time.Now()

	isNewDevice := false
	if req.DeviceID != "" {
		if _, err := s.deviceRepo.FindByUserAndDeviceID(userID, req.DeviceID); err != nil {
			isNewDevice = true
		}
	}

	fraudInput := FraudInput{
		IsMock:        false,
		Accuracy:      req.Accuracy,
		Lat:           req.Lat,
		Long:          req.Long,
		DeviceTime:    req.DeviceTime,
		ServerTime:    now,
		DeviceID:      req.DeviceID,
		UserID:        userID,
		IsNewDevice:   isNewDevice,
		PrevLat:       &log.Lat,
		PrevLong:      &log.Long,
		PrevCheckInAt: log.CheckInAt,
	}

	fraudResult := s.fraudSvc.Analyze(fraudInput)

	log.CheckOutAt = &now
	log.FraudScore = (log.FraudScore + fraudResult.Score) / 2
	log.FraudStatus = determineFraudStatus(log.FraudScore)

	if err := s.attendanceRepo.Update(log); err != nil {
		return nil, err
	}

	for i := range fraudResult.Flags {
		fraudResult.Flags[i].AttendanceID = log.ID
	}
	_ = s.attendanceRepo.SaveFlags(fraudResult.Flags)

	return s.attendanceRepo.FindByID(log.ID)
}

func (s *attendanceService) History(userID uint) ([]model.AttendanceLog, error) {
	return s.attendanceRepo.FindByUserID(userID)
}

func (s *attendanceService) GetFraudDetail(id uint) (*model.AttendanceLog, error) {
	return s.attendanceRepo.FindByID(id)
}

func determineFraudStatus(score int) string {
	if score >= 80 {
		return "FRAUD"
	} else if score >= 40 {
		return "SUSPICIOUS"
	}
	return "SAFE"
}
