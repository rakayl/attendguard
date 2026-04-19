package service

import (
	"attendance-system/internal/model"
	"attendance-system/internal/repository"
)

// ---- Device Service ----

type RegisterDeviceRequest struct {
	DeviceID   string `json:"device_id" binding:"required"`
	DeviceName string `json:"device_name"`
	Platform   string `json:"platform"`
}

type DeviceService interface {
	Register(userID uint, req RegisterDeviceRequest) (*model.Device, error)
	List(userID uint) ([]model.Device, error)
}

type deviceService struct {
	deviceRepo repository.DeviceRepository
}

func NewDeviceService(deviceRepo repository.DeviceRepository) DeviceService {
	return &deviceService{deviceRepo}
}

func (s *deviceService) Register(userID uint, req RegisterDeviceRequest) (*model.Device, error) {
	// Check if already registered
	existing, _ := s.deviceRepo.FindByUserAndDeviceID(userID, req.DeviceID)
	if existing != nil {
		return existing, nil
	}

	device := &model.Device{
		UserID:     userID,
		DeviceID:   req.DeviceID,
		DeviceName: req.DeviceName,
		Platform:   req.Platform,
		Trusted:    true,
	}

	if err := s.deviceRepo.Create(device); err != nil {
		return nil, err
	}
	return device, nil
}

func (s *deviceService) List(userID uint) ([]model.Device, error) {
	return s.deviceRepo.FindByUserID(userID)
}

// ---- Admin Service ----

type AdminService interface {
	GetAllAttendance() ([]model.AttendanceLog, error)
	GetFraudAttendance() ([]model.AttendanceLog, error)
}

type adminService struct {
	attendanceRepo repository.AttendanceRepository
}

func NewAdminService(attendanceRepo repository.AttendanceRepository) AdminService {
	return &adminService{attendanceRepo}
}

func (s *adminService) GetAllAttendance() ([]model.AttendanceLog, error) {
	return s.attendanceRepo.FindAll()
}

func (s *adminService) GetFraudAttendance() ([]model.AttendanceLog, error) {
	return s.attendanceRepo.FindFraud()
}
