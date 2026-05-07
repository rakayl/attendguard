package service

import (
	"testing"
	"time"

	"attendance-system/internal/model"
)

func TestValidateTaskStatusTransition(t *testing.T) {
	cases := []struct {
		name      string
		current   DailyActivityTaskStatus
		next      DailyActivityTaskStatus
		wantError bool
	}{
		{"pending to progress", TaskPending, TaskProgress, false},
		{"progress to done", TaskProgress, TaskDone, false},
		{"pending to cancelled", TaskPending, TaskCancelled, false},
		{"progress to cancelled", TaskProgress, TaskCancelled, false},
		{"pending to done blocked", TaskPending, TaskDone, true},
		{"done to progress blocked", TaskDone, TaskProgress, true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateTaskStatusTransition(tc.current, tc.next)
			if tc.wantError && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !tc.wantError && err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
		})
	}
}

func TestSummarizeActivityTasks(t *testing.T) {
	now := time.Now()
	later := now.Add(5 * time.Minute)

	status, startedAt, completedAt := summarizeActivityTasks([]model.DailyActivityTask{
		{Status: string(TaskPending)},
		{Status: string(TaskPending)},
	})
	if status != DailyActivityPending || startedAt != nil || completedAt != nil {
		t.Fatalf("expected pending with nil timestamps, got %s", status)
	}

	status, startedAt, completedAt = summarizeActivityTasks([]model.DailyActivityTask{
		{Status: string(TaskProgress)},
		{Status: string(TaskPending)},
	})
	if status != DailyActivityInProgress || startedAt == nil || completedAt != nil {
		t.Fatalf("expected in_progress with startedAt only, got %s", status)
	}

	status, startedAt, completedAt = summarizeActivityTasks([]model.DailyActivityTask{
		{Status: string(TaskDone), UpdatedAt: now},
		{Status: string(TaskDone), UpdatedAt: later},
	})
	if status != DailyActivityCompleted || startedAt != nil || completedAt == nil || !completedAt.Equal(later) {
		t.Fatalf("expected completed with latest completedAt, got %s", status)
	}

	status, startedAt, completedAt = summarizeActivityTasks([]model.DailyActivityTask{
		{Status: string(TaskCancelled)},
		{Status: string(TaskCancelled)},
	})
	if status != DailyActivityCancelled || startedAt != nil || completedAt != nil {
		t.Fatalf("expected cancelled with nil timestamps, got %s", status)
	}
}
