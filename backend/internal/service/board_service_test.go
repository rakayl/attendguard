package service

import (
	"errors"
	"testing"
	"time"

	"attendance-system/internal/model"
	"attendance-system/internal/repository"
)

type fakeBoardRepo struct {
	card              *model.BoardCard
	targetList        *model.BoardList
	board             *model.Board
	activities        []model.BoardActivity
	moveCalled        bool
	moveSourceListID  uint
	moveTargetListID  uint
	moveSourcePos     int
	moveTargetPos     int
	updateCardCalled  bool
	targetListErr     error
}

func (f *fakeBoardRepo) WithTransaction(fn func(repo repository.BoardRepository) error) error {
	return fn(f)
}

func (f *fakeBoardRepo) CreateWorkspace(workspace *model.Workspace) error { return nil }
func (f *fakeBoardRepo) CreateWorkspaceMember(member *model.WorkspaceMember) error {
	return nil
}
func (f *fakeBoardRepo) FindWorkspaceByID(id uint) (*model.Workspace, error) { return nil, nil }
func (f *fakeBoardRepo) FindWorkspacesByUser(userID, tenantID uint) ([]model.Workspace, error) {
	return nil, nil
}
func (f *fakeBoardRepo) CreateBoard(board *model.Board) error { return nil }
func (f *fakeBoardRepo) UpdateBoard(board *model.Board) error { return nil }
func (f *fakeBoardRepo) FindBoardsByWorkspace(workspaceID uint) ([]model.Board, error) {
	return nil, nil
}
func (f *fakeBoardRepo) CreateBoardMember(member *model.BoardMember) error { return nil }
func (f *fakeBoardRepo) ReplaceBoardMembers(boardID uint, userIDs []uint) error {
	return nil
}
func (f *fakeBoardRepo) CreateList(list *model.BoardList) error { return nil }
func (f *fakeBoardRepo) UpdateList(list *model.BoardList) error { return nil }
func (f *fakeBoardRepo) FindListsByBoard(boardID uint) ([]model.BoardList, error) {
	return nil, nil
}
func (f *fakeBoardRepo) CreateCard(card *model.BoardCard) error { return nil }
func (f *fakeBoardRepo) UpdateCard(card *model.BoardCard) error {
	f.updateCardCalled = true
	return nil
}

func (f *fakeBoardRepo) MoveCard(cardID, sourceListID, targetListID uint, sourcePosition, targetPosition int) error {
	f.moveCalled = true
	f.moveSourceListID = sourceListID
	f.moveTargetListID = targetListID
	f.moveSourcePos = sourcePosition
	f.moveTargetPos = targetPosition
	if f.card != nil && f.card.ID == cardID {
		f.card.ListID = targetListID
		f.card.Position = targetPosition
		f.card.UpdatedAt = time.Now()
	}
	if f.board != nil {
		for listIdx := range f.board.Lists {
			filtered := make([]model.BoardCard, 0, len(f.board.Lists[listIdx].Cards))
			for _, existing := range f.board.Lists[listIdx].Cards {
				if existing.ID != cardID {
					filtered = append(filtered, existing)
				}
			}
			f.board.Lists[listIdx].Cards = filtered
		}
		for listIdx := range f.board.Lists {
			if f.board.Lists[listIdx].ID == targetListID && f.card != nil {
				f.board.Lists[listIdx].Cards = append(f.board.Lists[listIdx].Cards, *f.card)
			}
		}
	}
	return nil
}

func (f *fakeBoardRepo) FindBoardByID(id uint) (*model.Board, error) {
	if f.board == nil || f.board.ID != id {
		return nil, errors.New("board not found")
	}
	return f.board, nil
}

func (f *fakeBoardRepo) FindListByID(id uint) (*model.BoardList, error) {
	if f.targetListErr != nil {
		return nil, f.targetListErr
	}
	if f.targetList != nil && f.targetList.ID == id {
		return f.targetList, nil
	}
	for _, list := range f.board.Lists {
		if list.ID == id {
			copyList := list
			return &copyList, nil
		}
	}
	return nil, errors.New("list not found")
}

func (f *fakeBoardRepo) FindCardByID(id uint) (*model.BoardCard, error) {
	if f.card == nil || f.card.ID != id {
		return nil, errors.New("card not found")
	}
	return f.card, nil
}

func (f *fakeBoardRepo) CreateCardComment(comment *model.BoardCardComment) error { return nil }
func (f *fakeBoardRepo) CreateChecklist(checklist *model.BoardCardChecklist) error { return nil }
func (f *fakeBoardRepo) FindChecklistByID(id uint) (*model.BoardCardChecklist, error) {
	return nil, nil
}
func (f *fakeBoardRepo) CreateChecklistItem(item *model.BoardCardChecklistItem) error { return nil }
func (f *fakeBoardRepo) FindChecklistItemByID(id uint) (*model.BoardCardChecklistItem, error) {
	return nil, nil
}
func (f *fakeBoardRepo) UpdateChecklistItem(item *model.BoardCardChecklistItem) error { return nil }
func (f *fakeBoardRepo) CreateCardLabel(label *model.BoardCardLabel) error { return nil }
func (f *fakeBoardRepo) DeleteLabelsByCard(cardID uint) error { return nil }
func (f *fakeBoardRepo) CreateCardMember(member *model.BoardCardMember) error { return nil }
func (f *fakeBoardRepo) DeleteCardMembersByCard(cardID uint) error { return nil }
func (f *fakeBoardRepo) CreateActivity(activity *model.BoardActivity) error { return nil }
func (f *fakeBoardRepo) FindActivitiesByBoard(boardID uint) ([]model.BoardActivity, error) {
	return f.activities, nil
}

func TestBoardMoveCardUsesExplicitMoveAndReturnsTargetList(t *testing.T) {
	card := &model.BoardCard{
		ID:        10,
		BoardID:   1,
		ListID:    1,
		Position:  0,
		Title:     "Task A",
		CreatedBy: 1,
		Creator:   model.User{ID: 1, Name: "Administrator", Email: "admin@company.com"},
	}
	board := &model.Board{
		ID:          1,
		WorkspaceID: 1,
		Name:        "Engineering",
		Visibility:  "public",
		Theme:       "graphite",
		CreatedBy:   1,
		Workspace:   model.Workspace{ID: 1, OwnerID: 1, TenantID: 1},
		Creator:     model.User{ID: 1, Name: "Administrator", Email: "admin@company.com"},
		Lists: []model.BoardList{
			{ID: 1, BoardID: 1, Name: "Backlog", Position: 0, Cards: []model.BoardCard{*card}},
			{ID: 2, BoardID: 1, Name: "In Progress", Position: 1},
		},
	}
	repo := &fakeBoardRepo{
		card:       card,
		targetList: &model.BoardList{ID: 2, BoardID: 1, Name: "In Progress", Position: 1},
		board:      board,
	}
	svc := NewBoardService(repo, nil)
	actor := &model.User{ID: 1, TenantID: 1, Role: &model.Role{Name: "admin"}}

	result, err := svc.MoveCard(10, actor, MoveBoardCardRequest{ListID: 2, Position: 0})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !repo.moveCalled {
		t.Fatal("expected repository MoveCard to be called")
	}
	if repo.updateCardCalled {
		t.Fatal("did not expect UpdateCard to be used for move")
	}
	if repo.moveSourceListID != 1 || repo.moveTargetListID != 2 {
		t.Fatalf("unexpected move lists source=%d target=%d", repo.moveSourceListID, repo.moveTargetListID)
	}
	if len(result.Lists) != 2 {
		t.Fatalf("expected 2 lists, got %d", len(result.Lists))
	}
	if len(result.Lists[0].Cards) != 0 {
		t.Fatalf("expected source list to be empty, got %d cards", len(result.Lists[0].Cards))
	}
	if len(result.Lists[1].Cards) != 1 || result.Lists[1].Cards[0].ID != 10 {
		t.Fatalf("expected moved card in target list, got %+v", result.Lists[1].Cards)
	}
	if result.Lists[1].Cards[0].ListID != 2 {
		t.Fatalf("expected moved card list_id=2, got %d", result.Lists[1].Cards[0].ListID)
	}
}

func TestBoardMoveCardRejectsTargetListFromAnotherBoard(t *testing.T) {
	card := &model.BoardCard{
		ID:        10,
		BoardID:   1,
		ListID:    1,
		Position:  0,
		Title:     "Task A",
		CreatedBy: 1,
	}
	board := &model.Board{
		ID:          1,
		WorkspaceID: 1,
		Name:        "Engineering",
		Visibility:  "public",
		Theme:       "graphite",
		CreatedBy:   1,
		Workspace:   model.Workspace{ID: 1, OwnerID: 1, TenantID: 1},
		Lists:       []model.BoardList{{ID: 1, BoardID: 1, Name: "Backlog", Position: 0, Cards: []model.BoardCard{*card}}},
	}
	repo := &fakeBoardRepo{
		card:       card,
		targetList: &model.BoardList{ID: 3, BoardID: 99, Name: "Foreign", Position: 0},
		board:      board,
	}
	svc := NewBoardService(repo, nil)
	actor := &model.User{ID: 1, TenantID: 1, Role: &model.Role{Name: "admin"}}

	_, err := svc.MoveCard(10, actor, MoveBoardCardRequest{ListID: 3, Position: 0})
	if err == nil {
		t.Fatal("expected error for target list outside board")
	}
	if repo.moveCalled {
		t.Fatal("did not expect repository MoveCard to run when target list is invalid")
	}
}
