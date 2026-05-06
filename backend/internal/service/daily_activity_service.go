package service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"attendance-system/internal/model"
	"attendance-system/internal/repository"

	"gorm.io/gorm"
)

var (
	ErrActivityForbidden = errors.New("you can only modify your own activities")
	ErrActivityConflict  = errors.New("activity has been updated by someone else")
)

type DailyActivityStatus string

const (
	DailyActivityPlanned DailyActivityStatus = "planned"
	DailyActivityOngoing DailyActivityStatus = "ongoing"
	DailyActivityDone    DailyActivityStatus = "done"
)

type DailyActivityFilterRequest struct {
	TenantID   uint
	UserID     *uint
	DatePreset string
	DateFrom   string
	DateTo     string
}

type CreateDailyActivityRequest struct {
	Title        string `json:"title" binding:"required,max=120"`
	Description  string `json:"description" binding:"max=2000"`
	ActivityDate string `json:"activity_date" binding:"required"`
	StartTime    string `json:"start_time" binding:"required"`
	EndTime      string `json:"end_time" binding:"required"`
	Status       string `json:"status" binding:"required"`
	Progress     int    `json:"progress"`
	AllowOverlap bool   `json:"allow_overlap"`
}

type UpdateDailyActivityRequest struct {
	Title        string `json:"title" binding:"required,max=120"`
	Description  string `json:"description" binding:"max=2000"`
	ActivityDate string `json:"activity_date" binding:"required"`
	StartTime    string `json:"start_time" binding:"required"`
	EndTime      string `json:"end_time" binding:"required"`
	Status       string `json:"status" binding:"required"`
	Progress     int    `json:"progress"`
	AllowOverlap bool   `json:"allow_overlap"`
	Version      *int   `json:"version"`
}

type DailyActivityUserResource struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	RoleName    string `json:"role_name,omitempty"`
	DisplayRole string `json:"display_role,omitempty"`
}

type DailyActivityResource struct {
	ID           uint                      `json:"id"`
	UserID       uint                      `json:"user_id"`
	User         DailyActivityUserResource `json:"user"`
	Title        string                    `json:"title"`
	Description  string                    `json:"description"`
	ActivityDate string                    `json:"activity_date"`
	StartTime    string                    `json:"start_time"`
	EndTime      string                    `json:"end_time"`
	Status       string                    `json:"status"`
	Progress     int                       `json:"progress"`
	Version      int                       `json:"version"`
	IsToday      bool                      `json:"is_today"`
	CreatedAt    time.Time                 `json:"created_at"`
	UpdatedAt    time.Time                 `json:"updated_at"`
}

type DailyActivityService interface {
	List(filter DailyActivityFilterRequest) ([]DailyActivityResource, error)
	GetByID(id, actorID uint) (*DailyActivityResource, error)
	Create(actor *model.User, req CreateDailyActivityRequest) (*DailyActivityResource, error)
	Update(id uint, actor *model.User, req UpdateDailyActivityRequest) (*DailyActivityResource, error)
	Delete(id uint, actor *model.User) error
}

type dailyActivityService struct {
	repo repository.DailyActivityRepository
}

func NewDailyActivityService(repo repository.DailyActivityRepository) DailyActivityService {
	return &dailyActivityService{repo: repo}
}

func (s *dailyActivityService) List(filter DailyActivityFilterRequest) ([]DailyActivityResource, error) {
	dateFrom, dateTo, err := resolveDateFilter(filter.DatePreset, filter.DateFrom, filter.DateTo)
	if err != nil {
		return nil, err
	}
	activities, err := s.repo.FindAll(repository.DailyActivityFilter{
		TenantID: filter.TenantID,
		UserID:   filter.UserID,
		DateFrom: dateFrom,
		DateTo:   dateTo,
	})
	if err != nil {
		return nil, err
	}
	res := make([]DailyActivityResource, 0, len(activities))
	today := time.Now().In(time.Local).Format("2006-01-02")
	for _, activity := range activities {
		res = append(res, toDailyActivityResource(activity, today))
	}
	return res, nil
}

func (s *dailyActivityService) GetByID(id, actorID uint) (*DailyActivityResource, error) {
	activity, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	res := toDailyActivityResource(*activity, time.Now().In(time.Local).Format("2006-01-02"))
	return &res, nil
}

func (s *dailyActivityService) Create(actor *model.User, req CreateDailyActivityRequest) (*DailyActivityResource, error) {
	activityDate, startMinute, endMinute, status, err := validateDailyActivityInput(req.Title, req.Description, req.ActivityDate, req.StartTime, req.EndTime, req.Status, req.Progress)
	if err != nil {
		return nil, err
	}
	if !req.AllowOverlap {
		if conflict, err := s.repo.FindOverlap(actor.TenantID, actor.ID, req.ActivityDate, startMinute, endMinute, nil); err == nil && conflict != nil {
			return nil, fmt.Errorf("time conflict with another activity from %s to %s", minuteToTime(conflict.StartMinute), minuteToTime(conflict.EndMinute))
		} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	activity := &model.DailyActivity{
		TenantID:     actor.TenantID,
		UserID:       actor.ID,
		Title:        strings.TrimSpace(req.Title),
		Description:  strings.TrimSpace(req.Description),
		ActivityDate: activityDate,
		StartMinute:  startMinute,
		EndMinute:    endMinute,
		Status:       string(status),
		Progress:     req.Progress,
		Version:      1,
	}
	if err := s.repo.Create(activity); err != nil {
		return nil, err
	}
	created, err := s.repo.FindByID(activity.ID)
	if err != nil {
		return nil, err
	}
	res := toDailyActivityResource(*created, time.Now().In(time.Local).Format("2006-01-02"))
	return &res, nil
}

func (s *dailyActivityService) Update(id uint, actor *model.User, req UpdateDailyActivityRequest) (*DailyActivityResource, error) {
	activity, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if activity.UserID != actor.ID {
		return nil, ErrActivityForbidden
	}
	if req.Version != nil && activity.Version != *req.Version {
		return nil, ErrActivityConflict
	}
	activityDate, startMinute, endMinute, status, err := validateDailyActivityInput(req.Title, req.Description, req.ActivityDate, req.StartTime, req.EndTime, req.Status, req.Progress)
	if err != nil {
		return nil, err
	}
	if !req.AllowOverlap {
		excludeID := activity.ID
		if conflict, err := s.repo.FindOverlap(actor.TenantID, actor.ID, req.ActivityDate, startMinute, endMinute, &excludeID); err == nil && conflict != nil {
			return nil, fmt.Errorf("time conflict with another activity from %s to %s", minuteToTime(conflict.StartMinute), minuteToTime(conflict.EndMinute))
		} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	activity.Title = strings.TrimSpace(req.Title)
	activity.Description = strings.TrimSpace(req.Description)
	activity.ActivityDate = activityDate
	activity.StartMinute = startMinute
	activity.EndMinute = endMinute
	activity.Status = string(status)
	activity.Progress = req.Progress
	activity.Version++
	if err := s.repo.Update(activity); err != nil {
		return nil, err
	}
	updated, err := s.repo.FindByID(activity.ID)
	if err != nil {
		return nil, err
	}
	res := toDailyActivityResource(*updated, time.Now().In(time.Local).Format("2006-01-02"))
	return &res, nil
}

func (s *dailyActivityService) Delete(id uint, actor *model.User) error {
	activity, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	if activity.UserID != actor.ID {
		return ErrActivityForbidden
	}
	return s.repo.Delete(id)
}

func validateDailyActivityInput(title, description, activityDate, startTime, endTime, status string, progress int) (time.Time, int, int, DailyActivityStatus, error) {
	trimmedTitle := strings.TrimSpace(title)
	if trimmedTitle == "" {
		return time.Time{}, 0, 0, "", errors.New("title is required")
	}
	if len(trimmedTitle) > 120 {
		return time.Time{}, 0, 0, "", errors.New("title must be 120 characters or less")
	}
	if len(strings.TrimSpace(description)) > 2000 {
		return time.Time{}, 0, 0, "", errors.New("description must be 2000 characters or less")
	}
	dateValue, err := time.Parse("2006-01-02", activityDate)
	if err != nil {
		return time.Time{}, 0, 0, "", errors.New("activity_date must use YYYY-MM-DD format")
	}
	startMinute, err := parseClock(startTime)
	if err != nil {
		return time.Time{}, 0, 0, "", err
	}
	endMinute, err := parseClock(endTime)
	if err != nil {
		return time.Time{}, 0, 0, "", err
	}
	if endMinute <= startMinute {
		return time.Time{}, 0, 0, "", errors.New("end_time must be after start_time")
	}
	if progress < 0 || progress > 100 {
		return time.Time{}, 0, 0, "", errors.New("progress must be between 0 and 100")
	}
	switch DailyActivityStatus(status) {
	case DailyActivityPlanned, DailyActivityOngoing, DailyActivityDone:
	default:
		return time.Time{}, 0, 0, "", errors.New("status must be one of: planned, ongoing, done")
	}
	return dateValue, startMinute, endMinute, DailyActivityStatus(status), nil
}

func resolveDateFilter(preset, from, to string) (*string, *string, error) {
	now := time.Now().In(time.Local)
	switch preset {
	case "", "today":
		value := now.Format("2006-01-02")
		return &value, &value, nil
	case "tomorrow":
		value := now.AddDate(0, 0, 1).Format("2006-01-02")
		return &value, &value, nil
	case "week":
		start := now.Format("2006-01-02")
		end := now.AddDate(0, 0, 6).Format("2006-01-02")
		return &start, &end, nil
	case "range":
		if from == "" || to == "" {
			return nil, nil, errors.New("date_from and date_to are required for range filter")
		}
		if _, err := time.Parse("2006-01-02", from); err != nil {
			return nil, nil, errors.New("date_from must use YYYY-MM-DD format")
		}
		if _, err := time.Parse("2006-01-02", to); err != nil {
			return nil, nil, errors.New("date_to must use YYYY-MM-DD format")
		}
		if from > to {
			return nil, nil, errors.New("date_from must be before or equal to date_to")
		}
		return &from, &to, nil
	default:
		return nil, nil, errors.New("date_preset must be today, tomorrow, week, or range")
	}
}

func parseClock(raw string) (int, error) {
	parsed, err := time.Parse("15:04", raw)
	if err != nil {
		return 0, errors.New("time must use HH:MM format")
	}
	return parsed.Hour()*60 + parsed.Minute(), nil
}

func minuteToTime(value int) string {
	return fmt.Sprintf("%02d:%02d", value/60, value%60)
}

func toDailyActivityResource(activity model.DailyActivity, today string) DailyActivityResource {
	roleName := ""
	displayRole := ""
	if activity.User.Role != nil {
		roleName = activity.User.Role.Name
		displayRole = activity.User.Role.DisplayName
	}
	dateText := activity.ActivityDate.Format("2006-01-02")
	return DailyActivityResource{
		ID:     activity.ID,
		UserID: activity.UserID,
		User: DailyActivityUserResource{
			ID:          activity.User.ID,
			Name:        activity.User.Name,
			Email:       activity.User.Email,
			RoleName:    roleName,
			DisplayRole: displayRole,
		},
		Title:        activity.Title,
		Description:  activity.Description,
		ActivityDate: dateText,
		StartTime:    minuteToTime(activity.StartMinute),
		EndTime:      minuteToTime(activity.EndMinute),
		Status:       activity.Status,
		Progress:     activity.Progress,
		Version:      activity.Version,
		IsToday:      dateText == today,
		CreatedAt:    activity.CreatedAt,
		UpdatedAt:    activity.UpdatedAt,
	}
}
