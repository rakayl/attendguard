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
	ErrTaskStatusTransition    = errors.New("invalid task status transition")
	ErrDailyActivityBadRequest = errors.New("invalid daily activity request")
)

type DailyActivityStatus string
type DailyActivityTaskStatus string
type DailyActivityTaskPriority string

const (
	DailyActivityPending    DailyActivityStatus = "pending"
	DailyActivityInProgress DailyActivityStatus = "in_progress"
	DailyActivityCompleted  DailyActivityStatus = "completed"
	DailyActivityCancelled  DailyActivityStatus = "cancelled"

	TaskPending   DailyActivityTaskStatus = "pending"
	TaskProgress  DailyActivityTaskStatus = "progress"
	TaskDone      DailyActivityTaskStatus = "done"
	TaskCancelled DailyActivityTaskStatus = "cancelled"

	TaskPriorityLow    DailyActivityTaskPriority = "low"
	TaskPriorityMedium DailyActivityTaskPriority = "medium"
	TaskPriorityHigh   DailyActivityTaskPriority = "high"
)

type DailyActivityFilterRequest struct {
	TenantID   uint
	UserID     *uint
	Status     string
	DatePreset string
	DateFrom   string
	DateTo     string
}

type CreateDailyActivityRequest struct {
	Title        string `json:"title" binding:"required,max=120"`
	Description  string `json:"description" binding:"max=2000"`
	AssignedTo   uint   `json:"assigned_to" binding:"required"`
	ActivityDate string `json:"activity_date" binding:"required"`
}

type UpdateDailyActivityRequest struct {
	Title        string `json:"title" binding:"required,max=120"`
	Description  string `json:"description" binding:"max=2000"`
	AssignedTo   uint   `json:"assigned_to" binding:"required"`
	ActivityDate string `json:"activity_date" binding:"required"`
}

type CreateDailyActivityTaskRequest struct {
	Title       string `json:"title" binding:"required,max=160"`
	Description string `json:"description" binding:"max=2000"`
	Status      string `json:"status"`
	Priority    string `json:"priority"`
	DueTime     string `json:"due_time"`
}

type UpdateDailyActivityTaskRequest struct {
	Title       string `json:"title" binding:"required,max=160"`
	Description string `json:"description" binding:"max=2000"`
	Status      string `json:"status" binding:"required"`
	Priority    string `json:"priority" binding:"required"`
	DueTime     string `json:"due_time"`
}

type UpdateDailyActivityTaskStatusRequest struct {
	Status string `json:"status" binding:"required"`
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
	Status          string                     `json:"status"`
	Priority        string                     `json:"priority"`
	DueTime         *time.Time                 `json:"due_time"`
	UpdatedBy       *uint                      `json:"updated_by"`
	Updater         *DailyActivityUserResource `json:"updater,omitempty"`
	CreatedAt       time.Time                  `json:"created_at"`
	UpdatedAt       time.Time                  `json:"updated_at"`
}

type DailyActivityLogResource struct {
	ID                  uint                      `json:"id"`
	DailyActivityID     *uint                     `json:"daily_activity_id"`
	DailyActivityTaskID *uint                     `json:"daily_activity_task_id"`
	User                DailyActivityUserResource `json:"user"`
	Action              string                    `json:"action"`
	OldValue            json.RawMessage           `json:"old_value,omitempty"`
	NewValue            json.RawMessage           `json:"new_value,omitempty"`
	Description         string                    `json:"description"`
	CreatedAt           time.Time                 `json:"created_at"`
}

type DailyActivityResource struct {
	ID                 uint                        `json:"id"`
	Title              string                      `json:"title"`
	Description        string                      `json:"description"`
	AssignedTo         uint                        `json:"assigned_to"`
	AssignedUser       DailyActivityUserResource   `json:"assigned_user"`
	CreatedBy          uint                        `json:"created_by"`
	Creator            DailyActivityUserResource   `json:"creator"`
	ActivityDate       string                      `json:"activity_date"`
	Status             string                      `json:"status"`
	StartedAt          *time.Time                  `json:"started_at"`
	CompletedAt        *time.Time                  `json:"completed_at"`
	TaskCount          int                         `json:"task_count"`
	CompletedTaskCount int                         `json:"completed_task_count"`
	ProgressPercentage int                         `json:"progress_percentage"`
	Tasks              []DailyActivityTaskResource `json:"tasks,omitempty"`
	CreatedAt          time.Time                   `json:"created_at"`
	UpdatedAt          time.Time                   `json:"updated_at"`
}

type DailyActivityService interface {
	List(filter DailyActivityFilterRequest) ([]DailyActivityResource, error)
	GetByID(id, actorID uint) (*DailyActivityResource, error)
	Create(actor *model.User, req CreateDailyActivityRequest) (*DailyActivityResource, error)
	Update(id uint, actor *model.User, req UpdateDailyActivityRequest) (*DailyActivityResource, error)
	Delete(id uint, actor *model.User) error
	CreateTask(activityID uint, actor *model.User, req CreateDailyActivityTaskRequest) (*DailyActivityTaskResource, *DailyActivityResource, error)
	UpdateTask(taskID uint, actor *model.User, req UpdateDailyActivityTaskRequest) (*DailyActivityTaskResource, *DailyActivityResource, error)
	UpdateTaskStatus(taskID uint, actor *model.User, req UpdateDailyActivityTaskStatusRequest) (*DailyActivityTaskResource, *DailyActivityResource, error)
	DeleteTask(taskID uint, actor *model.User) (*DailyActivityResource, error)
	GetLogs(activityID uint, actorID uint) ([]DailyActivityLogResource, error)
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
		res = append(res, toDailyActivityResource(item, false))
	}
	return res, nil
}

func (s *dailyActivityService) GetByID(id, actorID uint) (*DailyActivityResource, error) {
	item, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	res := toDailyActivityResource(*item, true)
	return &res, nil
}

func (s *dailyActivityService) Create(actor *model.User, req CreateDailyActivityRequest) (*DailyActivityResource, error) {
	title, description, assignedTo, activityDate, err := validateActivityInput(req.Title, req.Description, req.AssignedTo, req.ActivityDate)
	if err != nil {
		return nil, err
	}
	var resource *DailyActivityResource
	err = s.repo.WithTransaction(func(repo repository.DailyActivityRepository) error {
		activity := &model.DailyActivity{
			TenantID:     actor.TenantID,
			Title:        title,
			Description:  description,
			AssignedTo:   assignedTo,
			CreatedBy:    actor.ID,
			ActivityDate: activityDate,
			Status:       string(DailyActivityPending),
		}
		if err := repo.Create(activity); err != nil {
			return err
		}
		if err := repo.CreateLog(buildLog(activity.ID, nil, actor.ID, "activity.created", nil, activitySnapshot(activity), fmt.Sprintf("Created daily activity '%s'", activity.Title))); err != nil {
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
	title, description, assignedTo, activityDate, err := validateActivityInput(req.Title, req.Description, req.AssignedTo, req.ActivityDate)
	if err != nil {
		return nil, err
	}
	var resource *DailyActivityResource
	err = s.repo.WithTransaction(func(repo repository.DailyActivityRepository) error {
		activity, err := repo.FindByID(id)
		if err != nil {
			return err
		}
		if !canManageActivity(actor.ID, activity) {
			return ErrActivityForbidden
		}
		oldValue := activitySnapshot(activity)
		activity.Title = title
		activity.Description = description
		activity.AssignedTo = assignedTo
		activity.ActivityDate = activityDate
		if err := repo.Update(activity); err != nil {
			return err
		}
		if err := repo.CreateLog(buildLog(activity.ID, nil, actor.ID, "activity.updated", oldValue, activitySnapshot(activity), fmt.Sprintf("Updated daily activity '%s'", activity.Title))); err != nil {
			return err
		}
		updated, err := repo.FindByID(id)
		if err != nil {
			return err
		}
		next := toDailyActivityResource(*updated, true)
		resource = &next
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
		if !canManageActivity(actor.ID, activity) {
			return ErrActivityForbidden
		}
		oldValue := activitySnapshot(activity)
		if err := repo.SoftDelete(id); err != nil {
			return err
		}
		return repo.CreateLog(buildLog(activity.ID, nil, actor.ID, "activity.deleted", oldValue, nil, fmt.Sprintf("Deleted daily activity '%s'", activity.Title)))
	})
}

func (s *dailyActivityService) CreateTask(activityID uint, actor *model.User, req CreateDailyActivityTaskRequest) (*DailyActivityTaskResource, *DailyActivityResource, error) {
	title, description, status, priority, dueTime, err := validateTaskInput(req.Title, req.Description, req.Status, req.Priority, req.DueTime, true)
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
		if !canManageActivity(actor.ID, activity) {
			return ErrActivityForbidden
		}
		task := &model.DailyActivityTask{
			DailyActivityID: activityID,
			Title:           title,
			Description:     description,
			Status:          string(status),
			Priority:        string(priority),
			DueTime:         dueTime,
			UpdatedBy:       &actor.ID,
		}
		if err := repo.CreateTask(task); err != nil {
			return err
		}
		if err := repo.CreateLog(buildLog(activityID, &task.ID, actor.ID, "task.created", nil, taskSnapshot(task), fmt.Sprintf("Created task '%s'", task.Title))); err != nil {
			return err
		}
		if err := s.recalculateActivityState(repo, activityID, actor.ID); err != nil {
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
	title, description, status, priority, dueTime, err := validateTaskInput(req.Title, req.Description, req.Status, req.Priority, req.DueTime, false)
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
		if !canModifyTask(actor.ID, task) {
			return ErrTaskForbidden
		}
		oldValue := taskSnapshot(task)
		if !canManageActivity(actor.ID, &task.DailyActivity) && task.Status != string(status) {
			if err := validateTaskStatusTransition(DailyActivityTaskStatus(task.Status), status); err != nil {
				return err
			}
		}
		task.Title = title
		task.Description = description
		task.Status = string(status)
		task.Priority = string(priority)
		task.DueTime = dueTime
		task.UpdatedBy = &actor.ID
		if err := repo.UpdateTask(task); err != nil {
			return err
		}
		if err := repo.CreateLog(buildLog(task.DailyActivityID, &task.ID, actor.ID, "task.updated", oldValue, taskSnapshot(task), fmt.Sprintf("Updated task '%s'", task.Title))); err != nil {
			return err
		}
		if err := s.recalculateActivityState(repo, task.DailyActivityID, actor.ID); err != nil {
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

func (s *dailyActivityService) UpdateTaskStatus(taskID uint, actor *model.User, req UpdateDailyActivityTaskStatusRequest) (*DailyActivityTaskResource, *DailyActivityResource, error) {
	status := DailyActivityTaskStatus(req.Status)
	if !isValidTaskStatus(status) {
		return nil, nil, fmt.Errorf("%w: status must be pending, progress, done, or cancelled", ErrDailyActivityBadRequest)
	}
	var taskRes *DailyActivityTaskResource
	var activityRes *DailyActivityResource
	err := s.repo.WithTransaction(func(repo repository.DailyActivityRepository) error {
		task, err := repo.FindTaskByID(taskID)
		if err != nil {
			return err
		}
		if !canModifyTask(actor.ID, task) {
			return ErrTaskForbidden
		}
		if err := validateTaskStatusTransition(DailyActivityTaskStatus(task.Status), status); err != nil {
			return err
		}
		oldValue := taskSnapshot(task)
		task.Status = string(status)
		task.UpdatedBy = &actor.ID
		if err := repo.UpdateTask(task); err != nil {
			return err
		}
		if err := repo.CreateLog(buildLog(task.DailyActivityID, &task.ID, actor.ID, "task.status_changed", oldValue, taskSnapshot(task), fmt.Sprintf("Changed task '%s' status to %s", task.Title, task.Status))); err != nil {
			return err
		}
		if err := s.recalculateActivityState(repo, task.DailyActivityID, actor.ID); err != nil {
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
		if !canManageActivity(actor.ID, &task.DailyActivity) {
			return ErrTaskForbidden
		}
		oldValue := taskSnapshot(task)
		if err := repo.DeleteTask(taskID); err != nil {
			return err
		}
		if err := repo.CreateLog(buildLog(task.DailyActivityID, &task.ID, actor.ID, "task.deleted", oldValue, nil, fmt.Sprintf("Deleted task '%s'", task.Title))); err != nil {
			return err
		}
		if err := s.recalculateActivityState(repo, task.DailyActivityID, actor.ID); err != nil {
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

func (s *dailyActivityService) GetLogs(activityID uint, actorID uint) ([]DailyActivityLogResource, error) {
	activity, err := s.repo.FindByID(activityID)
	if err != nil {
		return nil, err
	}
	if actorID != activity.CreatedBy && actorID != activity.AssignedTo {
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

func (s *dailyActivityService) recalculateActivityState(repo repository.DailyActivityRepository, activityID, actorID uint) error {
	activity, err := repo.FindByID(activityID)
	if err != nil {
		return err
	}
	oldValue := activityStateSnapshot(activity)
	nextStatus, startedAt, completedAt := summarizeActivityTasks(activity.Tasks)
	activity.Status = string(nextStatus)
	activity.StartedAt = startedAt
	activity.CompletedAt = completedAt
	if err := repo.Update(activity); err != nil {
		return err
	}
	newValue := activityStateSnapshot(activity)
	if mustJSON(oldValue) == mustJSON(newValue) {
		return nil
	}
	return repo.CreateLog(buildLog(activity.ID, nil, actorID, "activity.status_synced", oldValue, newValue, fmt.Sprintf("Activity status recalculated to %s", activity.Status)))
}

func validateActivityInput(title, description string, assignedTo uint, activityDate string) (string, string, uint, time.Time, error) {
	title = strings.TrimSpace(title)
	description = strings.TrimSpace(description)
	if title == "" {
		return "", "", 0, time.Time{}, fmt.Errorf("%w: title is required", ErrDailyActivityBadRequest)
	}
	if len(title) > 120 {
		return "", "", 0, time.Time{}, fmt.Errorf("%w: title must be 120 characters or less", ErrDailyActivityBadRequest)
	}
	if len(description) > 2000 {
		return "", "", 0, time.Time{}, fmt.Errorf("%w: description must be 2000 characters or less", ErrDailyActivityBadRequest)
	}
	if assignedTo == 0 {
		return "", "", 0, time.Time{}, fmt.Errorf("%w: assigned_to is required", ErrDailyActivityBadRequest)
	}
	dateValue, err := time.Parse("2006-01-02", activityDate)
	if err != nil {
		return "", "", 0, time.Time{}, fmt.Errorf("%w: activity_date must use YYYY-MM-DD format", ErrDailyActivityBadRequest)
	}
	return title, description, assignedTo, dateValue, nil
}

func validateTaskInput(title, description, rawStatus, rawPriority, rawDueTime string, isCreate bool) (string, string, DailyActivityTaskStatus, DailyActivityTaskPriority, *time.Time, error) {
	title = strings.TrimSpace(title)
	description = strings.TrimSpace(description)
	if title == "" {
		return "", "", "", "", nil, fmt.Errorf("%w: task title is required", ErrDailyActivityBadRequest)
	}
	if len(title) > 160 {
		return "", "", "", "", nil, fmt.Errorf("%w: task title must be 160 characters or less", ErrDailyActivityBadRequest)
	}
	if len(description) > 2000 {
		return "", "", "", "", nil, fmt.Errorf("%w: task description must be 2000 characters or less", ErrDailyActivityBadRequest)
	}
	status := DailyActivityTaskStatus(rawStatus)
	if status == "" {
		status = TaskPending
	}
	if !isValidTaskStatus(status) {
		return "", "", "", "", nil, fmt.Errorf("%w: task status must be pending, progress, done, or cancelled", ErrDailyActivityBadRequest)
	}
	priority := DailyActivityTaskPriority(rawPriority)
	if priority == "" {
		priority = TaskPriorityMedium
	}
	if !isValidTaskPriority(priority) {
		return "", "", "", "", nil, fmt.Errorf("%w: task priority must be low, medium, or high", ErrDailyActivityBadRequest)
	}
	dueTime, err := parseOptionalDateTime(rawDueTime)
	if err != nil {
		return "", "", "", "", nil, err
	}
	if isCreate && status != TaskPending {
		return "", "", "", "", nil, fmt.Errorf("%w: new task must start as pending", ErrDailyActivityBadRequest)
	}
	return title, description, status, priority, dueTime, nil
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

func parseOptionalDateTime(raw string) (*time.Time, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}
	layouts := []string{time.RFC3339, "2006-01-02T15:04", "2006-01-02 15:04"}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, raw); err == nil {
			return &parsed, nil
		}
	}
	return nil, fmt.Errorf("%w: due_time must use RFC3339 or YYYY-MM-DDTHH:MM format", ErrDailyActivityBadRequest)
}

func validateTaskStatusTransition(current, next DailyActivityTaskStatus) error {
	if current == next {
		return nil
	}
	allowed := map[DailyActivityTaskStatus][]DailyActivityTaskStatus{
		TaskPending:   {TaskProgress, TaskCancelled},
		TaskProgress:  {TaskDone, TaskCancelled},
		TaskDone:      {},
		TaskCancelled: {},
	}
	for _, candidate := range allowed[current] {
		if candidate == next {
			return nil
		}
	}
	return fmt.Errorf("%w: %s cannot change to %s", ErrTaskStatusTransition, current, next)
}

func summarizeActivityTasks(tasks []model.DailyActivityTask) (DailyActivityStatus, *time.Time, *time.Time) {
	if len(tasks) == 0 {
		return DailyActivityPending, nil, nil
	}
	allDone := true
	allCancelled := true
	anyProgress := false
	var latest time.Time
	for _, task := range tasks {
		switch DailyActivityTaskStatus(task.Status) {
		case TaskProgress:
			anyProgress = true
			allDone = false
			allCancelled = false
		case TaskDone:
			allCancelled = false
			if task.UpdatedAt.After(latest) {
				latest = task.UpdatedAt
			}
		case TaskCancelled:
			allDone = false
		default:
			allDone = false
			allCancelled = false
		}
		if task.Status != string(TaskDone) {
			allDone = false
		}
		if task.Status != string(TaskCancelled) {
			allCancelled = false
		}
	}
	if allDone {
		completedAt := latest
		if completedAt.IsZero() {
			completedAt = time.Now()
		}
		return DailyActivityCompleted, nil, &completedAt
	}
	if anyProgress {
		startedAt := time.Now()
		return DailyActivityInProgress, &startedAt, nil
	}
	if allCancelled {
		return DailyActivityCancelled, nil, nil
	}
	return DailyActivityPending, nil, nil
}

func isValidTaskStatus(status DailyActivityTaskStatus) bool {
	switch status {
	case TaskPending, TaskProgress, TaskDone, TaskCancelled:
		return true
	default:
		return false
	}
}

func isValidTaskPriority(priority DailyActivityTaskPriority) bool {
	switch priority {
	case TaskPriorityLow, TaskPriorityMedium, TaskPriorityHigh:
		return true
	default:
		return false
	}
}

func canManageActivity(actorID uint, activity *model.DailyActivity) bool {
	return actorID == activity.CreatedBy
}

func canModifyTask(actorID uint, task *model.DailyActivityTask) bool {
	return actorID == task.DailyActivity.CreatedBy || actorID == task.DailyActivity.AssignedTo
}

func toDailyActivityResource(activity model.DailyActivity, includeTasks bool) DailyActivityResource {
	completedCount := 0
	for _, task := range activity.Tasks {
		if task.Status == string(TaskDone) {
			completedCount++
		}
	}
	progressPercentage := 0
	if len(activity.Tasks) > 0 {
		progressPercentage = int(float64(completedCount) / float64(len(activity.Tasks)) * 100)
	}
	resource := DailyActivityResource{
		ID:                 activity.ID,
		Title:              activity.Title,
		Description:        activity.Description,
		AssignedTo:         activity.AssignedTo,
		AssignedUser:       toUserResource(activity.AssignedUser),
		CreatedBy:          activity.CreatedBy,
		Creator:            toUserResource(activity.Creator),
		ActivityDate:       activity.ActivityDate.Format("2006-01-02"),
		Status:             activity.Status,
		StartedAt:          activity.StartedAt,
		CompletedAt:        activity.CompletedAt,
		TaskCount:          len(activity.Tasks),
		CompletedTaskCount: completedCount,
		ProgressPercentage: progressPercentage,
		CreatedAt:          activity.CreatedAt,
		UpdatedAt:          activity.UpdatedAt,
	}
	if includeTasks {
		resource.Tasks = make([]DailyActivityTaskResource, 0, len(activity.Tasks))
		for _, task := range activity.Tasks {
			resource.Tasks = append(resource.Tasks, toTaskResource(task))
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
		Status:          task.Status,
		Priority:        task.Priority,
		DueTime:         task.DueTime,
		UpdatedBy:       task.UpdatedBy,
		CreatedAt:       task.CreatedAt,
		UpdatedAt:       task.UpdatedAt,
	}
	if task.Updater != nil {
		userRes := toUserResource(*task.Updater)
		resource.Updater = &userRes
	}
	return resource
}

func toLogResource(log model.DailyActivityLog) DailyActivityLogResource {
	resource := DailyActivityLogResource{
		ID:                  log.ID,
		DailyActivityID:     log.DailyActivityID,
		DailyActivityTaskID: log.DailyActivityTaskID,
		User:                toUserResource(log.User),
		Action:              log.Action,
		Description:         log.Description,
		CreatedAt:           log.CreatedAt,
	}
	if log.OldValue != "" {
		resource.OldValue = json.RawMessage(log.OldValue)
	}
	if log.NewValue != "" {
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

func buildLog(activityID uint, taskID *uint, actorID uint, action string, oldValue any, newValue any, description string) *model.DailyActivityLog {
	return &model.DailyActivityLog{
		DailyActivityID:     &activityID,
		DailyActivityTaskID: taskID,
		UserID:              actorID,
		Action:              action,
		OldValue:            mustJSON(oldValue),
		NewValue:            mustJSON(newValue),
		Description:         description,
	}
}

func mustJSON(value any) string {
	if value == nil {
		return ""
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	return string(raw)
}

func activitySnapshot(activity *model.DailyActivity) map[string]any {
	return map[string]any{
		"id":            activity.ID,
		"title":         activity.Title,
		"description":   activity.Description,
		"assigned_to":   activity.AssignedTo,
		"created_by":    activity.CreatedBy,
		"activity_date": activity.ActivityDate.Format("2006-01-02"),
		"status":        activity.Status,
		"started_at":    activity.StartedAt,
		"completed_at":  activity.CompletedAt,
	}
}

func activityStateSnapshot(activity *model.DailyActivity) map[string]any {
	return map[string]any{
		"status":       activity.Status,
		"started_at":   activity.StartedAt,
		"completed_at": activity.CompletedAt,
	}
}

func taskSnapshot(task *model.DailyActivityTask) map[string]any {
	return map[string]any{
		"id":                task.ID,
		"daily_activity_id": task.DailyActivityID,
		"title":             task.Title,
		"description":       task.Description,
		"status":            task.Status,
		"priority":          task.Priority,
		"due_time":          task.DueTime,
		"updated_by":        task.UpdatedBy,
	}
}
