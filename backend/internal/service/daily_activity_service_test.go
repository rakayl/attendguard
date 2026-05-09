package service

import (
	"testing"
	"time"

	"attendance-system/internal/model"
)

func TestApplyActivityProgress(t *testing.T) {
	now := time.Now()
	later := now.Add(5 * time.Minute)

	tests := []struct {
		name               string
		activity           model.DailyActivity
		wantStatus         string
		wantProgress       int
		wantTotal          int
		wantCompleted      int
		wantCompletedAtNil bool
	}{
		{
			name:               "no tasks stays pending",
			activity:           model.DailyActivity{Status: string(DailyActivityPending)},
			wantStatus:         string(DailyActivityPending),
			wantProgress:       0,
			wantTotal:          0,
			wantCompleted:      0,
			wantCompletedAtNil: true,
		},
		{
			name: "partial completion becomes in progress",
			activity: model.DailyActivity{
				Tasks: []model.DailyActivityTask{
					{IsCompleted: true, CompletedAt: &now},
					{IsCompleted: false},
				},
			},
			wantStatus:         string(DailyActivityInProgress),
			wantProgress:       50,
			wantTotal:          2,
			wantCompleted:      1,
			wantCompletedAtNil: true,
		},
		{
			name: "all completed becomes completed",
			activity: model.DailyActivity{
				Tasks: []model.DailyActivityTask{
					{IsCompleted: true, CompletedAt: &now},
					{IsCompleted: true, CompletedAt: &later},
				},
			},
			wantStatus:         string(DailyActivityCompleted),
			wantProgress:       100,
			wantTotal:          2,
			wantCompleted:      2,
			wantCompletedAtNil: false,
		},
		{
			name: "cancelled stays cancelled",
			activity: model.DailyActivity{
				Status: string(DailyActivityCancelled),
				Tasks: []model.DailyActivityTask{
					{IsCompleted: true, CompletedAt: &now},
				},
			},
			wantStatus:         string(DailyActivityCancelled),
			wantProgress:       100,
			wantTotal:          1,
			wantCompleted:      1,
			wantCompletedAtNil: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			activity := tt.activity
			applyActivityProgress(&activity)

			if activity.Status != tt.wantStatus {
				t.Fatalf("expected status %s, got %s", tt.wantStatus, activity.Status)
			}
			if activity.ProgressPercentage != tt.wantProgress {
				t.Fatalf("expected progress %d, got %d", tt.wantProgress, activity.ProgressPercentage)
			}
			if activity.TotalTasks != tt.wantTotal {
				t.Fatalf("expected total %d, got %d", tt.wantTotal, activity.TotalTasks)
			}
			if activity.CompletedTasks != tt.wantCompleted {
				t.Fatalf("expected completed %d, got %d", tt.wantCompleted, activity.CompletedTasks)
			}
			if tt.wantCompletedAtNil && activity.CompletedAt != nil {
				t.Fatalf("expected completed_at nil, got %v", activity.CompletedAt)
			}
			if !tt.wantCompletedAtNil && (activity.CompletedAt == nil || !activity.CompletedAt.Equal(later)) {
				t.Fatalf("expected completed_at %v, got %v", later, activity.CompletedAt)
			}
		})
	}
}

func TestValidateCommentMessage(t *testing.T) {
	if _, err := validateCommentMessage("   "); err == nil {
		t.Fatal("expected error for blank comment")
	}
	if msg, err := validateCommentMessage(" noted "); err != nil || msg != "noted" {
		t.Fatalf("expected trimmed comment, got msg=%q err=%v", msg, err)
	}
}

func TestMustJSONNilReturnsJSONNull(t *testing.T) {
	if got := mustJSON(nil); got != "null" {
		t.Fatalf("expected null, got %q", got)
	}
}

func TestCanViewActivityHonorsRoleAndOwnership(t *testing.T) {
	admin := &model.User{ID: 1, Role: &model.Role{Name: "admin"}}
	creator := &model.User{ID: 2, Role: &model.Role{Name: "manager"}}
	employee := &model.User{ID: 3, Role: &model.Role{Name: "employee"}}
	other := &model.User{ID: 4, Role: &model.Role{Name: "employee"}}
	activity := &model.DailyActivity{CreatedBy: 2, AssignedTo: 3}

	if !canViewActivity(admin, activity) {
		t.Fatal("expected admin to view activity")
	}
	if !canViewActivity(creator, activity) {
		t.Fatal("expected creator to view activity")
	}
	if !canViewActivity(employee, activity) {
		t.Fatal("expected assignee to view activity")
	}
	if canViewActivity(other, activity) {
		t.Fatal("expected unrelated user to be denied")
	}
}

func TestResolveCalendarMonth(t *testing.T) {
	start, end, month, err := resolveCalendarMonth("2026-05")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if start != "2026-05-01" || end != "2026-05-31" || month != "2026-05" {
		t.Fatalf("unexpected month range start=%s end=%s month=%s", start, end, month)
	}
}
