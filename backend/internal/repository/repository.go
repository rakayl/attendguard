package repository

import (
	"attendance-system/internal/model"
	"gorm.io/gorm"
)

// ---- User Repository ----

type UserRepository interface {
	FindByEmail(email string) (*model.User, error)
	FindByEmailWithRole(email string) (*model.User, error)
	Create(user *model.User) error
	Update(user *model.User) error
	Delete(id uint) error
	FindByID(id uint) (*model.User, error)
	FindByIDWithRole(id uint) (*model.User, error)
	FindAll() ([]model.User, error)
	FindAllWithRole() ([]model.User, error)
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db}
}

func (r *userRepository) FindByEmail(email string) (*model.User, error) {
	var user model.User
	return &user, r.db.Where("email = ?", email).First(&user).Error
}

func (r *userRepository) FindByEmailWithRole(email string) (*model.User, error) {
	var user model.User
	return &user, r.db.Preload("Tenant").Preload("Role.Permissions").Where("email = ?", email).First(&user).Error
}

func (r *userRepository) Create(user *model.User) error {
	return r.db.Create(user).Error
}

func (r *userRepository) Update(user *model.User) error {
	return r.db.Save(user).Error
}

func (r *userRepository) Delete(id uint) error {
	return r.db.Delete(&model.User{}, id).Error
}

func (r *userRepository) FindByID(id uint) (*model.User, error) {
	var user model.User
	return &user, r.db.First(&user, id).Error
}

func (r *userRepository) FindByIDWithRole(id uint) (*model.User, error) {
	var user model.User
	return &user, r.db.Preload("Tenant").Preload("Role.Permissions").First(&user, id).Error
}

func (r *userRepository) FindAll() ([]model.User, error) {
	var users []model.User
	return users, r.db.Find(&users).Error
}

func (r *userRepository) FindAllWithRole() ([]model.User, error) {
	var users []model.User
	return users, r.db.Preload("Tenant").Preload("Role.Permissions").Order("id").Find(&users).Error
}

// ---- Attendance Repository ----

type AttendanceRepository interface {
	Create(log *model.AttendanceLog) error
	Update(log *model.AttendanceLog) error
	FindByID(id uint) (*model.AttendanceLog, error)
	FindByUserID(userID uint) ([]model.AttendanceLog, error)
	FindActiveCheckIn(userID uint) (*model.AttendanceLog, error)
	FindAll() ([]model.AttendanceLog, error)
	FindFraud() ([]model.AttendanceLog, error)
	SaveFlags(flags []model.FraudFlag) error
}

type attendanceRepository struct {
	db *gorm.DB
}

func NewAttendanceRepository(db *gorm.DB) AttendanceRepository {
	return &attendanceRepository{db}
}

func (r *attendanceRepository) Create(log *model.AttendanceLog) error {
	return r.db.Create(log).Error
}

func (r *attendanceRepository) Update(log *model.AttendanceLog) error {
	return r.db.Save(log).Error
}

func (r *attendanceRepository) FindByID(id uint) (*model.AttendanceLog, error) {
	var log model.AttendanceLog
	if err := r.db.Preload("User").Preload("FraudFlags").First(&log, id).Error; err != nil {
		return nil, err
	}
	return &log, nil
}

func (r *attendanceRepository) FindByUserID(userID uint) ([]model.AttendanceLog, error) {
	var logs []model.AttendanceLog
	if err := r.db.Preload("FraudFlags").
		Where("user_id = ?", userID).
		Order("created_at desc").
		Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

func (r *attendanceRepository) FindActiveCheckIn(userID uint) (*model.AttendanceLog, error) {
	var log model.AttendanceLog
	if err := r.db.Where("user_id = ? AND check_in_at IS NOT NULL AND check_out_at IS NULL", userID).
		Order("created_at desc").
		First(&log).Error; err != nil {
		return nil, err
	}
	return &log, nil
}

func (r *attendanceRepository) FindAll() ([]model.AttendanceLog, error) {
	var logs []model.AttendanceLog
	if err := r.db.Preload("User").Preload("User.Tenant").Preload("FraudFlags").
		Order("created_at desc").
		Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

func (r *attendanceRepository) FindFraud() ([]model.AttendanceLog, error) {
	var logs []model.AttendanceLog
	if err := r.db.Preload("User").Preload("User.Tenant").Preload("FraudFlags").
		Where("fraud_status IN ?", []string{"SUSPICIOUS", "FRAUD"}).
		Order("fraud_score desc").
		Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

func (r *attendanceRepository) SaveFlags(flags []model.FraudFlag) error {
	if len(flags) == 0 {
		return nil
	}
	return r.db.Create(&flags).Error
}

// ---- Device Repository ----

type DeviceRepository interface {
	Create(device *model.Device) error
	FindByUserID(userID uint) ([]model.Device, error)
	FindByDeviceID(deviceID string) (*model.Device, error)
	FindByUserAndDeviceID(userID uint, deviceID string) (*model.Device, error)
}

type deviceRepository struct {
	db *gorm.DB
}

func NewDeviceRepository(db *gorm.DB) DeviceRepository {
	return &deviceRepository{db}
}

func (r *deviceRepository) Create(device *model.Device) error {
	return r.db.Create(device).Error
}

func (r *deviceRepository) FindByUserID(userID uint) ([]model.Device, error) {
	var devices []model.Device
	if err := r.db.Where("user_id = ?", userID).Find(&devices).Error; err != nil {
		return nil, err
	}
	return devices, nil
}

func (r *deviceRepository) FindByDeviceID(deviceID string) (*model.Device, error) {
	var device model.Device
	if err := r.db.Where("device_id = ?", deviceID).First(&device).Error; err != nil {
		return nil, err
	}
	return &device, nil
}

func (r *deviceRepository) FindByUserAndDeviceID(userID uint, deviceID string) (*model.Device, error) {
	var device model.Device
	if err := r.db.Where("user_id = ? AND device_id = ?", userID, deviceID).First(&device).Error; err != nil {
		return nil, err
	}
	return &device, nil
}

// ---- Tenant Repository ----

type TenantRepository interface {
	Create(tenant *model.Tenant) error
	Update(tenant *model.Tenant) error
	FindByID(id uint) (*model.Tenant, error)
	FindAll() ([]model.Tenant, error)
}

type tenantRepository struct{ db *gorm.DB }

func NewTenantRepository(db *gorm.DB) TenantRepository { return &tenantRepository{db} }

func (r *tenantRepository) Create(tenant *model.Tenant) error { return r.db.Create(tenant).Error }
func (r *tenantRepository) Update(tenant *model.Tenant) error { return r.db.Save(tenant).Error }
func (r *tenantRepository) FindByID(id uint) (*model.Tenant, error) {
	var tenant model.Tenant
	if err := r.db.First(&tenant, id).Error; err != nil {
		return nil, err
	}
	return &tenant, nil
}
func (r *tenantRepository) FindAll() ([]model.Tenant, error) {
	var tenants []model.Tenant
	return tenants, r.db.Order("id").Find(&tenants).Error
}

// ---- Face Profile Repository ----

type FaceProfileRepository interface {
	Create(profile *model.FaceProfile) error
	Update(profile *model.FaceProfile) error
	FindByID(id uint) (*model.FaceProfile, error)
	FindByUserID(userID uint) ([]model.FaceProfile, error)
	FindActiveByUserID(userID uint) (*model.FaceProfile, error)
	FindAll() ([]model.FaceProfile, error)
	DeactivateForUser(userID uint) error
}

type faceProfileRepository struct{ db *gorm.DB }

func NewFaceProfileRepository(db *gorm.DB) FaceProfileRepository {
	return &faceProfileRepository{db}
}

func (r *faceProfileRepository) Create(profile *model.FaceProfile) error {
	return r.db.Create(profile).Error
}

func (r *faceProfileRepository) Update(profile *model.FaceProfile) error {
	return r.db.Save(profile).Error
}

func (r *faceProfileRepository) FindByID(id uint) (*model.FaceProfile, error) {
	var profile model.FaceProfile
	if err := r.db.Preload("User").First(&profile, id).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

func (r *faceProfileRepository) FindByUserID(userID uint) ([]model.FaceProfile, error) {
	var profiles []model.FaceProfile
	return profiles, r.db.Where("user_id = ?", userID).Order("created_at desc").Find(&profiles).Error
}

func (r *faceProfileRepository) FindActiveByUserID(userID uint) (*model.FaceProfile, error) {
	var profile model.FaceProfile
	if err := r.db.Where("user_id = ? AND is_active = true", userID).Order("created_at desc").First(&profile).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

func (r *faceProfileRepository) FindAll() ([]model.FaceProfile, error) {
	var profiles []model.FaceProfile
	return profiles, r.db.Preload("User").Order("updated_at desc").Find(&profiles).Error
}

func (r *faceProfileRepository) DeactivateForUser(userID uint) error {
	return r.db.Model(&model.FaceProfile{}).Where("user_id = ?", userID).Update("is_active", false).Error
}
