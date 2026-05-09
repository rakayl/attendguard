package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"attendance-system/internal/model"
	"attendance-system/internal/repository"
)

var (
	ErrActivityForbidden       = errors.New("you are not allowed to modify this daily activity")
	ErrTaskForbidden           = errors.New("you are not allowed to modify this task")
	ErrCommentForbidden        = errors.New("you are not allowed to modify this comment")
	ErrDailyActivityBadRequest = errors.New("invalid daily activity request")
)

type DailyActivityStatus string

const (
	DailyActivityPending    DailyActivityStatus = "pending"
	DailyActivityInProgress DailyActivityStatus = "in_progress"
	DailyActivityCompleted  DailyActivityStatus = "completed"
	DailyActivityCancelled  DailyActivityStatus = "cancelled"
)

type DailyActivityFilterRequest struct {
	TenantID   uint
	UserID     *uint
	Status     string
	DatePreset string
	DateFrom   string
	DateTo     string
}

type DailyActivityCalendarMonthResource struct {
	Month string                             `json:"month"`
	Days  []DailyActivityCalendarDayResource `json:"days"`
}

type DailyActivityCalendarDayResource struct {
	Date       string                  `json:"date"`
	Total      int                     `json:"total"`
	Pending    int                     `json:"pending"`
	InProgress int                     `json:"in_progress"`
	Completed  int                     `json:"completed"`
	Cancelled  int                     `json:"cancelled"`
	Activities []DailyActivityResource `json:"activities,omitempty"`
}

type CreateDailyActivityRequest struct {
	Title        string `json:"title" binding:"required,max=120"`
	Description  string `json:"description" binding:"max=2000"`
	TemplateColor string `json:"template_color"`
	AssignedTo   uint   `json:"assigned_to" binding:"required"`
	ActivityDate string `json:"activity_date" binding:"required"`
}

type UpdateDailyActivityRequest struct {
	Title        string `json:"title" binding:"required,max=120"`
	Description  string `json:"description" binding:"max=2000"`
	TemplateColor string `json:"template_color"`
	AssignedTo   uint   `json:"assigned_to" binding:"required"`
	ActivityDate string `json:"activity_date" binding:"required"`
	Status       string `json:"status"`
}

type CreateDailyActivityTaskRequest struct {
	Title       string `json:"title" binding:"required,max=160"`
	Description string `json:"description" binding:"max=2000"`
}

type UpdateDailyActivityTaskRequest struct {
	Title       string `json:"title" binding:"required,max=160"`
	Description string `json:"description" binding:"max=2000"`
}

type ToggleDailyActivityTaskRequest struct {
	IsCompleted *bool `json:"is_completed"`
}

type CreateDailyActivityCommentRequest struct {
	Message string `json:"message" binding:"required"`
}

type UpdateDailyActivityCommentRequest struct {
	Message string `json:"message" binding:"required"`
}

type DailyActivityUserResource struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	RoleName    string `json:"role_name,omitempty"`
	DisplayRole string `json:"display_role,omitempty"`
}

type DailyActivityTaskResource struct {
	ID              uint                       `json:"id"`
	DailyActivityID uint                       `json:"daily_activity_id"`
	Title           string                     `json:"title"`
	Description     string                     `json:"description"`
	IsCompleted     bool                       `json:"is_completed"`
	CompletedAt     *time.Time                 `json:"completed_at"`
	CreatedBy       uint                       `json:"created_by"`
	UpdatedBy       *uint                      `json:"updated_by"`
	Creator         DailyActivityUserResource  `json:"creator"`
	Updater         *DailyActivityUserResource `json:"updater,omitempty"`
	CreatedAt       time.Time                  `json:"created_at"`
	UpdatedAt       time.Time                  `json:"updated_at"`
}

type DailyActivityCommentResource struct {
	ID              uint                      `json:"id"`
	DailyActivityID uint                      `json:"daily_activity_id"`
	Message         string                    `json:"message"`
	User            DailyActivityUserResource `json:"user"`
	CreatedAt       time.Time                 `json:"created_at"`
	UpdatedAt       time.Time                 `json:"updated_at"`
}

type DailyActivityLogResource struct {
	ID              uint                      `json:"id"`
	DailyActivityID *uint                     `json:"daily_activity_id"`
	TaskID          *uint                     `json:"task_id,omitempty"`
	CommentID       *uint                     `json:"comment_id,omitempty"`
	User            DailyActivityUserResource `json:"user"`
	Action          string                    `json:"action"`
	OldValue        json.RawMessage           `json:"old_value,omitempty"`
	NewValue        json.RawMessage           `json:"new_value,omitempty"`
	Description     string                    `json:"description"`
	CreatedAt       time.Time                 `json:"created_at"`
}

type DailyActivityResource struct {
	ID                 uint                           `json:"id"`
	Title              string                         `json:"title"`
	Description        string                         `json:"description"`
	TemplateColor      string                         `json:"template_color"`
	AssignedTo         uint                           `json:"assigned_to"`
	AssignedUser       DailyActivityUserResource      `json:"assigned_user"`
	CreatedBy          uint                           `json:"created_by"`
	Creator            DailyActivityUserResource      `json:"creator"`
	ActivityDate       string                         `json:"activity_date"`
	Status             string                         `json:"status"`
	ProgressPercentage int                            `json:"progress_percentage"`
	TotalTasks         int                            `json:"total_tasks"`
	CompletedTasks     int                            `json:"completed_tasks"`
	CompletedAt        *time.Time                     `json:"completed_at"`
	Tasks              []DailyActivityTaskResource    `json:"tasks,omitempty"`
	Comments           []DailyActivityCommentResource `json:"comments,omitempty"`
	CreatedAt          time.Time                      `json:"created_at"`
	UpdatedAt          time.Time                      `json:"updated_at"`
}

type DailyActivityService interface {
	List(actor *model.User, filter DailyActivityFilterRequest) ([]DailyActivityResource, error)
	GetByID(id uint, actor *model.User) (*DailyActivityResource, error)
	Create(actor *model.User, req CreateDailyActivityRequest) (*DailyActivityResource, error)
	Update(id uint, actor *model.User, req UpdateDailyActivityRequest) (*DailyActivityResource, error)
	Delete(id uint, actor *model.User) error
	CreateTask(activityID uint, actor *model.User, req CreateDailyActivityTaskRequest) (*DailyActivityTaskResource, *DailyActivityResource, error)
	UpdateTask(taskID uint, actor *model.User, req UpdateDailyActivityTaskRequest) (*DailyActivityTaskResource, *DailyActivityResource, error)
	ToggleTask(taskID uint, actor *model.User, req ToggleDailyActivityTaskRequest) (*DailyActivityTaskResource, *DailyActivityResource, error)
	DeleteTask(taskID uint, actor *model.User) (*DailyActivityResource, error)
	CreateComment(activityID uint, actor *model.User, req CreateDailyActivityCommentRequest) (*DailyActivityCommentResource, *DailyActivityResource, error)
	UpdateComment(commentID uint, actor *model.User, req UpdateDailyActivityCommentRequest) (*DailyActivityCommentResource, *DailyActivityResource, error)
	DeleteComment(commentID uint, actor *model.User) (*DailyActivityResource, error)
	GetLogs(activityID uint, actor *model.User) ([]DailyActivityLogResource, error)
	GetCalendarMonth(actor *model.User, month string) (*DailyActivityCalendarMonthResource, error)
	GetCalendarDate(actor *model.User, date string) (*DailyActivityCalendarDayResource, error)
}

type dailyActivityService struct {
	repo     repository.DailyActivityRepository
	userRepo repository.UserRepository
}

func NewDailyActivityService(repo repository.DailyActivityRepository, userRepo repository.UserRepository) DailyActivityService {
	return &dailyActivityService{repo: repo, userRepo: userRepo}
}

func (s *dailyActivityService) List(actor *model.User, filter DailyActivityFilterRequest) ([]DailyActivityResource, error) {
	dateFrom, dateTo, err := resolveDateFilter(filter.DatePreset, filter.DateFrom, filter.DateTo)
	if err != nil {
		return nil, err
	}
	items, err := s.repo.FindActivities(repository.DailyActivityFilter{
		TenantID: filter.TenantID,
		UserID:   filter.UserID,
		Status:   filter.Status,
		DateFrom: dateFrom,
		DateTo:   dateTo,
	})
	if err != nil {
		return nil, err
	}
	res := make([]DailyActivityResource, 0, len(items))
	for _, item := range items {
		if !canViewActivity(actor, &item) {
			continue
		}
		res = append(res, toDailyActivityResource(item, false))
	}
	return res, nil
}

func (s *dailyActivityService) GetByID(id uint, actor *model.User) (*DailyActivityResource, error) {
	item, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if !canViewActivity(actor, item) {
		return nil, ErrActivityForbidden
	}
	res := toDailyActivityResource(*item, true)
	return &res, nil
}

func (s *dailyActivityService) Create(actor *model.User, req CreateDailyActivityRequest) (*DailyActivityResource, error) {
	title, description, templateColor, assignedTo, activityDate, err := validateActivityInput(req.Title, req.Description, req.TemplateColor, req.AssignedTo, req.ActivityDate)
	if err != nil {
		return nil, err
	}
	if err := s.ensureActivityAssignmentAllowed(actor, assignedTo); err != nil {
		return nil, err
	}
	if err := s.ensureAssignableUser(actor.TenantID, assignedTo); err != nil {
		return nil, err
	}
	var resource *DailyActivityResource
	err = s.repo.WithTransaction(func(repo repository.DailyActivityRepository) error {
		activity := &model.DailyActivity{
			TenantID:           actor.TenantID,
			Title:              title,
			Description:        description,
			TemplateColor:      templateColor,
			AssignedTo:         assignedTo,
			CreatedBy:          actor.ID,
			ActivityDate:       activityDate,
			Status:             string(DailyActivityPending),
			ProgressPercentage: 0,
			TotalTasks:         0,
			CompletedTasks:     0,
		}
		if err := repo.Create(activity); err != nil {
			return err
		}
		if err := repo.CreateLog(buildLog(activity.ID, nil, nil, actor.ID, "activity.created", nil, activitySnapshot(activity), fmt.Sprintf("Created daily activity '%s'", activity.Title))); err != nil {
			return err
		}
		created, err := repo.FindByID(activity.ID)
		if err != nil {
			return err
		}
		value := toDailyActivityResource(*created, true)
		resource = &value
		return nil
	})
	return resource, err
}

func (s *dailyActivityService) Update(id uint, actor *model.User, req UpdateDailyActivityRequest) (*DailyActivityResource, error) {
	title, description, templateColor, assignedTo, activityDate, err := validateActivityInput(req.Title, req.Description, req.TemplateColor, req.AssignedTo, req.ActivityDate)
	if err != nil {
		return nil, err
	}
	statusOverride, err := normalizeActivityStatus(req.Status)
	if err != nil {
		return nil, err
	}
	if err := s.ensureActivityAssignmentAllowed(actor, assignedTo); err != nil {
		return nil, err
	}
	if err := s.ensureAssignableUser(actor.TenantID, assignedTo); err != nil {
		return nil, err
	}
	var resource *DailyActivityResource
	err = s.repo.WithTransaction(func(repo repository.DailyActivityRepository) error {
		activity, err := repo.FindByID(id)
		if err != nil {
			return err
		}
		if !canManageActivity(actor, activity) {
			return ErrActivityForbidden
		}
		oldValue := activitySnapshot(activity)
		activity.Title = title
		activity.Description = description
		activity.TemplateColor = templateColor
		activity.AssignedTo = assignedTo
		activity.ActivityDate = activityDate
		if statusOverride == string(DailyActivityCancelled) {
			activity.Status = string(DailyActivityCancelled)
			activity.CompletedAt = nil
		} else {
			applyActivityProgress(activity)
		}
		if err := repo.Update(activity); err != nil {
			return err
		}
		if err := repo.CreateLog(buildLog(activity.ID, nil, nil, actor.ID, "activity.updated", oldValue, activitySnapshot(activity), fmt.Sprintf("Updated daily activity '%s'", activity.Title))); err != nil {
			return err
		}
		updated, err := repo.FindByID(id)
		if err != nil {
			return err
		}
		value := toDailyActivityResource(*updated, true)
		resource = &value
		return nil
	})
	return resource, err
}

func (s *dailyActivityService) Delete(id uint, actor *model.User) error {
	return s.repo.WithTransaction(func(repo repository.DailyActivityRepository) error {
		activity, err := repo.FindByID(id)
		if err != nil {
			return err
		}
		if !canManageActivity(actor, activity) {
			return ErrActivityForbidden
		}
		oldValue := activitySnapshot(activity)
		if err := repo.SoftDelete(id); err != nil {
			return err
		}
		return repo.CreateLog(buildLog(activity.ID, nil, nil, actor.ID, "activity.deleted", oldValue, nil, fmt.Sprintf("Deleted daily activity '%s'", activity.Title)))
	})
}

func (s *dailyActivityService) CreateTask(activityID uint, actor *model.User, req CreateDailyActivityTaskRequest) (*DailyActivityTaskResource, *DailyActivityResource, error) {
	title, description, err := validateTaskInput(req.Title, req.Description)
	if err != nil {
		return nil, nil, err
	}
	var taskRes *DailyActivityTaskResource
	var activityRes *DailyActivityResource
	err = s.repo.WithTransaction(func(repo repository.DailyActivityRepository) error {
		activity, err := repo.FindByID(activityID)
		if err != nil {
			return err
		}
		if !canManageActivity(actor, activity) {
			return ErrActivityForbidden
		}
		task := &model.DailyActivityTask{
			DailyActivityID: activityID,
			Title:           title,
			Description:     description,
			CreatedBy:       actor.ID,
			UpdatedBy:       &actor.ID,
		}
		if err := repo.CreateTask(task); err != nil {
			return err
		}
		updatedActivity, err := repo.FindByID(activityID)
		if err != nil {
			return err
		}
		applyActivityProgress(updatedActivity)
		if err := repo.Update(updatedActivity); err != nil {
			return err
		}
		if err := repo.CreateLog(buildLog(activityID, &task.ID, nil, actor.ID, "task.created", nil, taskSnapshot(task), fmt.Sprintf("Created task '%s'", task.Title))); err != nil {
			return err
		}
		freshTask, err := repo.FindTaskByID(task.ID)
		if err != nil {
			return err
		}
		freshActivity, err := repo.FindByID(activityID)
		if err != nil {
			return err
		}
		taskValue := toTaskResource(*freshTask)
		activityValue := toDailyActivityResource(*freshActivity, true)
		taskRes = &taskValue
		activityRes = &activityValue
		return nil
	})
	return taskRes, activityRes, err
}

func (s *dailyActivityService) UpdateTask(taskID uint, actor *model.User, req UpdateDailyActivityTaskRequest) (*DailyActivityTaskResource, *DailyActivityResource, error) {
	title, description, err := validateTaskInput(req.Title, req.Description)
	if err != nil {
		return nil, nil, err
	}
	var taskRes *DailyActivityTaskResource
	var activityRes *DailyActivityResource
	err = s.repo.WithTransaction(func(repo repository.DailyActivityRepository) error {
		task, err := repo.FindTaskByID(taskID)
		if err != nil {
			return err
		}
		if !canManageActivity(actor, &task.DailyActivity) {
			return ErrTaskForbidden
		}
		oldValue := taskSnapshot(task)
		task.Title = title
		task.Description = description
		task.UpdatedBy = &actor.ID
		if err := repo.UpdateTask(task); err != nil {
			return err
		}
		if err := repo.CreateLog(buildLog(task.DailyActivityID, &task.ID, nil, actor.ID, "task.updated", oldValue, taskSnapshot(task), fmt.Sprintf("Updated task '%s'", task.Title))); err != nil {
			return err
		}
		freshTask, err := repo.FindTaskByID(task.ID)
		if err != nil {
			return err
		}
		freshActivity, err := repo.FindByID(task.DailyActivityID)
		if err != nil {
			return err
		}
		taskValue := toTaskResource(*freshTask)
		activityValue := toDailyActivityResource(*freshActivity, true)
		taskRes = &taskValue
		activityRes = &activityValue
		return nil
	})
	return taskRes, activityRes, err
}

func (s *dailyActivityService) ToggleTask(taskID uint, actor *model.User, req ToggleDailyActivityTaskRequest) (*DailyActivityTaskResource, *DailyActivityResource, error) {
	var taskRes *DailyActivityTaskResource
	var activityRes *DailyActivityResource
	err := s.repo.WithTransaction(func(repo repository.DailyActivityRepository) error {
		task, err := repo.FindTaskByID(taskID)
		if err != nil {
			return err
		}
		if !canToggleTask(actor, task) {
			return ErrTaskForbidden
		}
		if task.DailyActivity.Status == string(DailyActivityCancelled) && !canManageActivity(actor, &task.DailyActivity) {
			return fmt.Errorf("%w: cancelled activity cannot be updated", ErrTaskForbidden)
		}
		oldValue := taskSnapshot(task)
		nextCompleted := !task.IsCompleted
		if req.IsCompleted != nil {
			nextCompleted = *req.IsCompleted
		}
		task.IsCompleted = nextCompleted
		if nextCompleted {
			now := time.Now()
			task.CompletedAt = &now
		} else {
			task.CompletedAt = nil
		}
		task.UpdatedBy = &actor.ID
		if err := repo.UpdateTask(task); err != nil {
			return err
		}
		updatedActivity, err := repo.FindByID(task.DailyActivityID)
		if err != nil {
			return err
		}
		applyActivityProgress(updatedActivity)
		if err := repo.Update(updatedActivity); err != nil {
			return err
		}
		action := "task.checked"
		description := fmt.Sprintf("Checked task '%s'", task.Title)
		if !nextCompleted {
			action = "task.unchecked"
			description = fmt.Sprintf("Unchecked task '%s'", task.Title)
		}
		if err := repo.CreateLog(buildLog(task.DailyActivityID, &task.ID, nil, actor.ID, action, oldValue, taskSnapshot(task), description)); err != nil {
			return err
		}
		freshTask, err := repo.FindTaskByID(task.ID)
		if err != nil {
			return err
		}
		freshActivity, err := repo.FindByID(task.DailyActivityID)
		if err != nil {
			return err
		}
		taskValue := toTaskResource(*freshTask)
		activityValue := toDailyActivityResource(*freshActivity, true)
		taskRes = &taskValue
		activityRes = &activityValue
		return nil
	})
	return taskRes, activityRes, err
}

func (s *dailyActivityService) DeleteTask(taskID uint, actor *model.User) (*DailyActivityResource, error) {
	var activityRes *DailyActivityResource
	err := s.repo.WithTransaction(func(repo repository.DailyActivityRepository) error {
		task, err := repo.FindTaskByID(taskID)
		if err != nil {
			return err
		}
		if !canManageActivity(actor, &task.DailyActivity) {
			return ErrTaskForbidden
		}
		oldValue := taskSnapshot(task)
		if err := repo.DeleteTask(taskID); err != nil {
			return err
		}
		updatedActivity, err := repo.FindByID(task.DailyActivityID)
		if err != nil {
			return err
		}
		applyActivityProgress(updatedActivity)
		if err := repo.Update(updatedActivity); err != nil {
			return err
		}
		if err := repo.CreateLog(buildLog(task.DailyActivityID, &task.ID, nil, actor.ID, "task.deleted", oldValue, nil, fmt.Sprintf("Deleted task '%s'", task.Title))); err != nil {
			return err
		}
		freshActivity, err := repo.FindByID(task.DailyActivityID)
		if err != nil {
			return err
		}
		value := toDailyActivityResource(*freshActivity, true)
		activityRes = &value
		return nil
	})
	return activityRes, err
}

func (s *dailyActivityService) CreateComment(activityID uint, actor *model.User, req CreateDailyActivityCommentRequest) (*DailyActivityCommentResource, *DailyActivityResource, error) {
	message, err := validateCommentMessage(req.Message)
	if err != nil {
		return nil, nil, err
	}
	var commentRes *DailyActivityCommentResource
	var activityRes *DailyActivityResource
	err = s.repo.WithTransaction(func(repo repository.DailyActivityRepository) error {
		activity, err := repo.FindByID(activityID)
		if err != nil {
			return err
		}
		if !canComment(actor, activity) {
			return ErrCommentForbidden
		}
		comment := &model.DailyActivityComment{
			DailyActivityID: activityID,
			UserID:          actor.ID,
			Message:         message,
		}
		if err := repo.CreateComment(comment); err != nil {
			return err
		}
		if err := repo.CreateLog(buildLog(activityID, nil, &comment.ID, actor.ID, "comment.created", nil, commentSnapshot(comment), "Added a comment")); err != nil {
			return err
		}
		freshComment, err := repo.FindCommentByID(comment.ID)
		if err != nil {
			return err
		}
		freshActivity, err := repo.FindByID(activityID)
		if err != nil {
			return err
		}
		commentValue := toCommentResource(*freshComment)
		activityValue := toDailyActivityResource(*freshActivity, true)
		commentRes = &commentValue
		activityRes = &activityValue
		return nil
	})
	return commentRes, activityRes, err
}

func (s *dailyActivityService) UpdateComment(commentID uint, actor *model.User, req UpdateDailyActivityCommentRequest) (*DailyActivityCommentResource, *DailyActivityResource, error) {
	message, err := validateCommentMessage(req.Message)
	if err != nil {
		return nil, nil, err
	}
	var commentRes *DailyActivityCommentResource
	var activityRes *DailyActivityResource
	err = s.repo.WithTransaction(func(repo repository.DailyActivityRepository) error {
		comment, err := repo.FindCommentByID(commentID)
		if err != nil {
			return err
		}
		if !canManageComment(actor, comment) {
			return ErrCommentForbidden
		}
		oldValue := commentSnapshot(comment)
		comment.Message = message
		if err := repo.UpdateComment(comment); err != nil {
			return err
		}
		if err := repo.CreateLog(buildLog(comment.DailyActivityID, nil, &comment.ID, actor.ID, "comment.updated", oldValue, commentSnapshot(comment), "Updated a comment")); err != nil {
			return err
		}
		freshComment, err := repo.FindCommentByID(comment.ID)
		if err != nil {
			return err
		}
		freshActivity, err := repo.FindByID(comment.DailyActivityID)
		if err != nil {
			return err
		}
		commentValue := toCommentResource(*freshComment)
		activityValue := toDailyActivityResource(*freshActivity, true)
		commentRes = &commentValue
		activityRes = &activityValue
		return nil
	})
	return commentRes, activityRes, err
}

func (s *dailyActivityService) DeleteComment(commentID uint, actor *model.User) (*DailyActivityResource, error) {
	var activityRes *DailyActivityResource
	err := s.repo.WithTransaction(func(repo repository.DailyActivityRepository) error {
		comment, err := repo.FindCommentByID(commentID)
		if err != nil {
			return err
		}
		if !canManageComment(actor, comment) {
			return ErrCommentForbidden
		}
		oldValue := commentSnapshot(comment)
		if err := repo.DeleteComment(commentID); err != nil {
			return err
		}
		if err := repo.CreateLog(buildLog(comment.DailyActivityID, nil, &comment.ID, actor.ID, "comment.deleted", oldValue, nil, "Deleted a comment")); err != nil {
			return err
		}
		freshActivity, err := repo.FindByID(comment.DailyActivityID)
		if err != nil {
			return err
		}
		value := toDailyActivityResource(*freshActivity, true)
		activityRes = &value
		return nil
	})
	return activityRes, err
}

func (s *dailyActivityService) GetLogs(activityID uint, actor *model.User) ([]DailyActivityLogResource, error) {
	activity, err := s.repo.FindByID(activityID)
	if err != nil {
		return nil, err
	}
	if !canViewActivity(actor, activity) {
		return nil, ErrActivityForbidden
	}
	logs, err := s.repo.FindLogsByActivityID(activityID)
	if err != nil {
		return nil, err
	}
	res := make([]DailyActivityLogResource, 0, len(logs))
	for _, item := range logs {
		res = append(res, toLogResource(item))
	}
	return res, nil
}

func (s *dailyActivityService) GetCalendarMonth(actor *model.User, month string) (*DailyActivityCalendarMonthResource, error) {
	start, end, canonicalMonth, err := resolveCalendarMonth(month)
	if err != nil {
		return nil, err
	}
	items, err := s.repo.FindActivities(repository.DailyActivityFilter{
		TenantID: actor.TenantID,
		DateFrom: &start,
		DateTo:   &end,
	})
	if err != nil {
		return nil, err
	}
	grouped := make(map[string]*DailyActivityCalendarDayResource)
	for _, item := range items {
		if !canViewActivity(actor, &item) {
			continue
		}
		key := item.ActivityDate.Format("2006-01-02")
		day := grouped[key]
		if day == nil {
			day = &DailyActivityCalendarDayResource{Date: key}
			grouped[key] = day
		}
		day.Total++
		incrementDayStatus(day, item.Status)
		day.Activities = append(day.Activities, toDailyActivityResource(item, false))
	}
	days := make([]DailyActivityCalendarDayResource, 0, len(grouped))
	for cursor := mustParseDate(start); !cursor.After(mustParseDate(end)); cursor = cursor.AddDate(0, 0, 1) {
		key := cursor.Format("2006-01-02")
		if day, ok := grouped[key]; ok {
			days = append(days, *day)
			continue
		}
		days = append(days, DailyActivityCalendarDayResource{Date: key})
	}
	return &DailyActivityCalendarMonthResource{
		Month: canonicalMonth,
		Days:  days,
	}, nil
}

func (s *dailyActivityService) GetCalendarDate(actor *model.User, date string) (*DailyActivityCalendarDayResource, error) {
	parsed, err := time.Parse("2006-01-02", strings.TrimSpace(date))
	if err != nil {
		return nil, fmt.Errorf("%w: date must use YYYY-MM-DD format", ErrDailyActivityBadRequest)
	}
	dayValue := parsed.Format("2006-01-02")
	items, err := s.repo.FindActivities(repository.DailyActivityFilter{
		TenantID: actor.TenantID,
		DateFrom: &dayValue,
		DateTo:   &dayValue,
	})
	if err != nil {
		return nil, err
	}
	resource := &DailyActivityCalendarDayResource{
		Date:       dayValue,
		Activities: make([]DailyActivityResource, 0),
	}
	for _, item := range items {
		if !canViewActivity(actor, &item) {
			continue
		}
		resource.Total++
		incrementDayStatus(resource, item.Status)
		resource.Activities = append(resource.Activities, toDailyActivityResource(item, true))
	}
	return resource, nil
}

func validateActivityInput(title, description, templateColor string, assignedTo uint, activityDate string) (string, string, string, uint, time.Time, error) {
	title = strings.TrimSpace(title)
	description = strings.TrimSpace(description)
	if title == "" {
		return "", "", "", 0, time.Time{}, fmt.Errorf("%w: title is required", ErrDailyActivityBadRequest)
	}
	if len(title) > 120 {
		return "", "", "", 0, time.Time{}, fmt.Errorf("%w: title must be 120 characters or less", ErrDailyActivityBadRequest)
	}
	if len(description) > 2000 {
		return "", "", "", 0, time.Time{}, fmt.Errorf("%w: description must be 2000 characters or less", ErrDailyActivityBadRequest)
	}
	if assignedTo == 0 {
		return "", "", "", 0, time.Time{}, fmt.Errorf("%w: assigned_to is required", ErrDailyActivityBadRequest)
	}
	dateValue, err := time.Parse("2006-01-02", activityDate)
	if err != nil {
		return "", "", "", 0, time.Time{}, fmt.Errorf("%w: activity_date must use YYYY-MM-DD format", ErrDailyActivityBadRequest)
	}
	return title, description, normalizeActivityTemplateColor(templateColor), assignedTo, dateValue, nil
}

func validateTaskInput(title, description string) (string, string, error) {
	title = strings.TrimSpace(title)
	description = strings.TrimSpace(description)
	if title == "" {
		return "", "", fmt.Errorf("%w: task title is required", ErrDailyActivityBadRequest)
	}
	if len(title) > 160 {
		return "", "", fmt.Errorf("%w: task title must be 160 characters or less", ErrDailyActivityBadRequest)
	}
	if len(description) > 2000 {
		return "", "", fmt.Errorf("%w: task description must be 2000 characters or less", ErrDailyActivityBadRequest)
	}
	return title, description, nil
}

func validateCommentMessage(message string) (string, error) {
	message = strings.TrimSpace(message)
	if message == "" {
		return "", fmt.Errorf("%w: message is required", ErrDailyActivityBadRequest)
	}
	if len(message) > 3000 {
		return "", fmt.Errorf("%w: message must be 3000 characters or less", ErrDailyActivityBadRequest)
	}
	return message, nil
}

func normalizeActivityStatus(raw string) (string, error) {
	status := strings.TrimSpace(raw)
	switch status {
	case "", string(DailyActivityPending), string(DailyActivityInProgress), string(DailyActivityCompleted):
		return status, nil
	case string(DailyActivityCancelled):
		return status, nil
	default:
		return "", fmt.Errorf("%w: status must be pending, in_progress, completed, or cancelled", ErrDailyActivityBadRequest)
	}
}

func normalizeActivityTemplateColor(raw string) string {
	switch strings.TrimSpace(raw) {
	case "emerald", "amber", "rose", "violet", "slate":
		return strings.TrimSpace(raw)
	default:
		return "cyan"
	}
}

func (s *dailyActivityService) ensureAssignableUser(tenantID, userID uint) error {
	user, err := s.userRepo.FindByIDWithRole(userID)
	if err != nil {
		return fmt.Errorf("%w: assigned user not found", ErrDailyActivityBadRequest)
	}
	if !user.IsActive {
		return fmt.Errorf("%w: assigned user is inactive", ErrDailyActivityBadRequest)
	}
	if user.TenantID != tenantID {
		return fmt.Errorf("%w: assigned user belongs to a different tenant", ErrDailyActivityBadRequest)
	}
	return nil
}

func (s *dailyActivityService) ensureActivityAssignmentAllowed(actor *model.User, assignedTo uint) error {
	target, err := s.userRepo.FindByIDWithRole(assignedTo)
	if err != nil {
		return fmt.Errorf("%w: assigned user not found", ErrDailyActivityBadRequest)
	}
	if actor == nil {
		return ErrActivityForbidden
	}
	if isAdmin(actor) {
		return nil
	}
	if actor.ID == target.ID {
		return nil
	}
	if isEmployee(actor) {
		return fmt.Errorf("%w: employees can only create activities for themselves", ErrActivityForbidden)
	}
	if isEmployee(target) {
		return nil
	}
	return fmt.Errorf("%w: you can only assign activities to yourself or employee accounts", ErrActivityForbidden)
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
			return nil, nil, fmt.Errorf("%w: date_from and date_to are required for range filter", ErrDailyActivityBadRequest)
		}
		if _, err := time.Parse("2006-01-02", from); err != nil {
			return nil, nil, fmt.Errorf("%w: date_from must use YYYY-MM-DD format", ErrDailyActivityBadRequest)
		}
		if _, err := time.Parse("2006-01-02", to); err != nil {
			return nil, nil, fmt.Errorf("%w: date_to must use YYYY-MM-DD format", ErrDailyActivityBadRequest)
		}
		if from > to {
			return nil, nil, fmt.Errorf("%w: date_from must be before or equal to date_to", ErrDailyActivityBadRequest)
		}
		return &from, &to, nil
	default:
		return nil, nil, fmt.Errorf("%w: date_preset must be today, tomorrow, week, or range", ErrDailyActivityBadRequest)
	}
}

func applyActivityProgress(activity *model.DailyActivity) {
	totalTasks := len(activity.Tasks)
	completedTasks := 0
	var latestCompletedAt *time.Time
	for i := range activity.Tasks {
		task := activity.Tasks[i]
		if task.IsCompleted {
			completedTasks++
			if task.CompletedAt != nil && (latestCompletedAt == nil || task.CompletedAt.After(*latestCompletedAt)) {
				ts := *task.CompletedAt
				latestCompletedAt = &ts
			}
		}
	}
	activity.TotalTasks = totalTasks
	activity.CompletedTasks = completedTasks
	if totalTasks == 0 {
		activity.ProgressPercentage = 0
		activity.CompletedAt = nil
		if activity.Status != string(DailyActivityCancelled) {
			activity.Status = string(DailyActivityPending)
		}
		return
	}
	activity.ProgressPercentage = int((float64(completedTasks) / float64(totalTasks)) * 100)
	if activity.Status == string(DailyActivityCancelled) {
		activity.CompletedAt = nil
		return
	}
	switch {
	case completedTasks == 0:
		activity.Status = string(DailyActivityPending)
		activity.CompletedAt = nil
	case completedTasks == totalTasks:
		activity.Status = string(DailyActivityCompleted)
		activity.CompletedAt = latestCompletedAt
	default:
		activity.Status = string(DailyActivityInProgress)
		activity.CompletedAt = nil
	}
}

func canViewActivity(actor *model.User, activity *model.DailyActivity) bool {
	if actor == nil || activity == nil {
		return false
	}
	if isAdmin(actor) {
		return true
	}
	return actor.ID == activity.CreatedBy || actor.ID == activity.AssignedTo
}

func canManageActivity(actor *model.User, activity *model.DailyActivity) bool {
	return actor.ID == activity.CreatedBy || isAdmin(actor)
}

func canToggleTask(actor *model.User, task *model.DailyActivityTask) bool {
	return actor.ID == task.DailyActivity.CreatedBy || actor.ID == task.DailyActivity.AssignedTo || isAdmin(actor)
}

func canComment(actor *model.User, activity *model.DailyActivity) bool {
	return actor.ID == activity.CreatedBy || actor.ID == activity.AssignedTo || isAdmin(actor)
}

func canManageComment(actor *model.User, comment *model.DailyActivityComment) bool {
	return actor.ID == comment.UserID || isAdmin(actor)
}

func isAdmin(actor *model.User) bool {
	return actor != nil && actor.Role != nil && actor.Role.Name == "admin"
}

func isEmployee(actor *model.User) bool {
	return actor != nil && actor.Role != nil && actor.Role.Name == "employee"
}

func incrementDayStatus(day *DailyActivityCalendarDayResource, status string) {
	switch status {
	case string(DailyActivityCompleted):
		day.Completed++
	case string(DailyActivityInProgress):
		day.InProgress++
	case string(DailyActivityCancelled):
		day.Cancelled++
	default:
		day.Pending++
	}
}

func resolveCalendarMonth(month string) (string, string, string, error) {
	base := strings.TrimSpace(month)
	if base == "" {
		now := time.Now()
		base = now.Format("2006-01")
	}
	parsed, err := time.Parse("2006-01", base)
	if err != nil {
		return "", "", "", fmt.Errorf("%w: month must use YYYY-MM format", ErrDailyActivityBadRequest)
	}
	start := time.Date(parsed.Year(), parsed.Month(), 1, 0, 0, 0, 0, time.Local)
	end := start.AddDate(0, 1, -1)
	return start.Format("2006-01-02"), end.Format("2006-01-02"), start.Format("2006-01"), nil
}

func mustParseDate(value string) time.Time {
	parsed, _ := time.Parse("2006-01-02", value)
	return parsed
}

func toDailyActivityResource(activity model.DailyActivity, includeDetails bool) DailyActivityResource {
	resource := DailyActivityResource{
		ID:                 activity.ID,
		Title:              activity.Title,
		Description:        activity.Description,
		TemplateColor:      activity.TemplateColor,
		AssignedTo:         activity.AssignedTo,
		AssignedUser:       toUserResource(activity.AssignedUser),
		CreatedBy:          activity.CreatedBy,
		Creator:            toUserResource(activity.Creator),
		ActivityDate:       activity.ActivityDate.Format("2006-01-02"),
		Status:             activity.Status,
		ProgressPercentage: activity.ProgressPercentage,
		TotalTasks:         activity.TotalTasks,
		CompletedTasks:     activity.CompletedTasks,
		CompletedAt:        activity.CompletedAt,
		CreatedAt:          activity.CreatedAt,
		UpdatedAt:          activity.UpdatedAt,
	}
	if includeDetails {
		resource.Tasks = make([]DailyActivityTaskResource, 0, len(activity.Tasks))
		for _, task := range activity.Tasks {
			resource.Tasks = append(resource.Tasks, toTaskResource(task))
		}
		resource.Comments = make([]DailyActivityCommentResource, 0, len(activity.Comments))
		for _, comment := range activity.Comments {
			resource.Comments = append(resource.Comments, toCommentResource(comment))
		}
	}
	return resource
}

func toTaskResource(task model.DailyActivityTask) DailyActivityTaskResource {
	resource := DailyActivityTaskResource{
		ID:              task.ID,
		DailyActivityID: task.DailyActivityID,
		Title:           task.Title,
		Description:     task.Description,
		IsCompleted:     task.IsCompleted,
		CompletedAt:     task.CompletedAt,
		CreatedBy:       task.CreatedBy,
		UpdatedBy:       task.UpdatedBy,
		Creator:         toUserResource(task.Creator),
		CreatedAt:       task.CreatedAt,
		UpdatedAt:       task.UpdatedAt,
	}
	if task.Updater != nil {
		userRes := toUserResource(*task.Updater)
		resource.Updater = &userRes
	}
	return resource
}

func toCommentResource(comment model.DailyActivityComment) DailyActivityCommentResource {
	return DailyActivityCommentResource{
		ID:              comment.ID,
		DailyActivityID: comment.DailyActivityID,
		Message:         comment.Message,
		User:            toUserResource(comment.User),
		CreatedAt:       comment.CreatedAt,
		UpdatedAt:       comment.UpdatedAt,
	}
}

func toLogResource(log model.DailyActivityLog) DailyActivityLogResource {
	resource := DailyActivityLogResource{
		ID:              log.ID,
		DailyActivityID: log.DailyActivityID,
		TaskID:          log.TaskID,
		CommentID:       log.CommentID,
		User:            toUserResource(log.User),
		Action:          log.Action,
		Description:     log.Description,
		CreatedAt:       log.CreatedAt,
	}
	if log.OldValue != "" && log.OldValue != "null" {
		resource.OldValue = json.RawMessage(log.OldValue)
	}
	if log.NewValue != "" && log.NewValue != "null" {
		resource.NewValue = json.RawMessage(log.NewValue)
	}
	return resource
}

func toUserResource(user model.User) DailyActivityUserResource {
	roleName := ""
	displayRole := ""
	if user.Role != nil {
		roleName = user.Role.Name
		displayRole = user.Role.DisplayName
	}
	return DailyActivityUserResource{
		ID:          user.ID,
		Name:        user.Name,
		Email:       user.Email,
		RoleName:    roleName,
		DisplayRole: displayRole,
	}
}

func buildLog(activityID uint, taskID *uint, commentID *uint, actorID uint, action string, oldValue any, newValue any, description string) *model.DailyActivityLog {
	return &model.DailyActivityLog{
		DailyActivityID: &activityID,
		TaskID:          taskID,
		CommentID:       commentID,
		UserID:          actorID,
		Action:          action,
		OldValue:        mustJSON(oldValue),
		NewValue:        mustJSON(newValue),
		Description:     description,
	}
}

func mustJSON(value any) string {
	if value == nil {
		return "null"
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return "null"
	}
	return string(raw)
}

func activitySnapshot(activity *model.DailyActivity) map[string]any {
	return map[string]any{
		"id":                  activity.ID,
		"title":               activity.Title,
		"description":         activity.Description,
		"template_color":      activity.TemplateColor,
		"assigned_to":         activity.AssignedTo,
		"created_by":          activity.CreatedBy,
		"activity_date":       activity.ActivityDate.Format("2006-01-02"),
		"status":              activity.Status,
		"progress_percentage": activity.ProgressPercentage,
		"total_tasks":         activity.TotalTasks,
		"completed_tasks":     activity.CompletedTasks,
		"completed_at":        activity.CompletedAt,
	}
}

func taskSnapshot(task *model.DailyActivityTask) map[string]any {
	return map[string]any{
		"id":                task.ID,
		"daily_activity_id": task.DailyActivityID,
		"title":             task.Title,
		"description":       task.Description,
		"is_completed":      task.IsCompleted,
		"completed_at":      task.CompletedAt,
		"created_by":        task.CreatedBy,
		"updated_by":        task.UpdatedBy,
	}
}

func commentSnapshot(comment *model.DailyActivityComment) map[string]any {
	return map[string]any{
		"id":                comment.ID,
		"daily_activity_id": comment.DailyActivityID,
		"user_id":           comment.UserID,
		"message":           comment.Message,
	}
}
