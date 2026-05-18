package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"attendance-system/internal/model"
	"attendance-system/internal/repository"
)

var (
	ErrBoardForbidden  = errors.New("you are not allowed to access this board")
	ErrWorkspaceDenied = errors.New("you are not allowed to access this workspace")
)

var slugPattern = regexp.MustCompile(`[^a-z0-9]+`)

type BoardUserResource struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	DisplayRole string `json:"display_role,omitempty"`
}

type WorkspaceResource struct {
	ID          uint                   `json:"id"`
	TeamID      *uint                  `json:"team_id,omitempty"`
	Name        string                 `json:"name"`
	Slug        string                 `json:"slug"`
	Description string                 `json:"description"`
	Owner       BoardUserResource      `json:"owner"`
	Team        *BoardTeamSummary      `json:"team,omitempty"`
	Boards      []BoardSummaryResource `json:"boards,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

type BoardTeamSummary struct {
	ID     uint   `json:"id"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
}

type BoardSummaryResource struct {
	ID          uint              `json:"id"`
	WorkspaceID uint              `json:"workspace_id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Visibility  string            `json:"visibility"`
	Theme       string            `json:"theme"`
	IsFavorite  bool              `json:"is_favorite"`
	CreatedBy   uint              `json:"created_by"`
	Creator     BoardUserResource `json:"creator"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

type BoardLabelResource struct {
	ID    uint   `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

type BoardChecklistItemResource struct {
	ID          uint       `json:"id"`
	Title       string     `json:"title"`
	IsCompleted bool       `json:"is_completed"`
	CompletedAt *time.Time `json:"completed_at"`
	Position    int        `json:"position"`
}

type BoardChecklistResource struct {
	ID       uint                         `json:"id"`
	Title    string                       `json:"title"`
	Position int                          `json:"position"`
	Items    []BoardChecklistItemResource `json:"items"`
}

type BoardCommentResource struct {
	ID        uint              `json:"id"`
	Message   string            `json:"message"`
	User      BoardUserResource `json:"user"`
	CreatedAt time.Time         `json:"created_at"`
	UpdatedAt time.Time         `json:"updated_at"`
}

type BoardCardResource struct {
	ID                  uint                     `json:"id"`
	BoardID             uint                     `json:"board_id"`
	ListID              uint                     `json:"list_id"`
	Title               string                   `json:"title"`
	Description         string                   `json:"description"`
	MarkdownDescription string                   `json:"markdown_description"`
	CoverImage          string                   `json:"cover_image"`
	DueDate             *time.Time               `json:"due_date"`
	Priority            string                   `json:"priority"`
	Position            int                      `json:"position"`
	IsArchived          bool                     `json:"is_archived"`
	Creator             BoardUserResource        `json:"creator"`
	Members             []BoardUserResource      `json:"members"`
	Labels              []BoardLabelResource     `json:"labels"`
	Checklists          []BoardChecklistResource `json:"checklists"`
	Comments            []BoardCommentResource   `json:"comments"`
	CreatedAt           time.Time                `json:"created_at"`
	UpdatedAt           time.Time                `json:"updated_at"`
}

type BoardListResource struct {
	ID         uint                `json:"id"`
	BoardID    uint                `json:"board_id"`
	Name       string              `json:"name"`
	Position   int                 `json:"position"`
	IsArchived bool                `json:"is_archived"`
	Cards      []BoardCardResource `json:"cards"`
}

type BoardActivityResource struct {
	ID          uint              `json:"id"`
	Action      string            `json:"action"`
	Description string            `json:"description"`
	User        BoardUserResource `json:"user"`
	CreatedAt   time.Time         `json:"created_at"`
}

type BoardDetailResource struct {
	BoardSummaryResource
	Lists      []BoardListResource     `json:"lists"`
	Members    []BoardUserResource     `json:"members"`
	Activities []BoardActivityResource `json:"activities"`
}

type CreateWorkspaceRequest struct {
	Name        string `json:"name" binding:"required,max=120"`
	Description string `json:"description" binding:"max=2000"`
}

type CreateBoardRequest struct {
	Name        string `json:"name" binding:"required,max=120"`
	Description string `json:"description" binding:"max=2000"`
	Visibility  string `json:"visibility"`
	Theme       string `json:"theme"`
}

type UpdateBoardRequest struct {
	Name        string `json:"name" binding:"required,max=120"`
	Description string `json:"description" binding:"max=2000"`
	Visibility  string `json:"visibility"`
	Theme       string `json:"theme"`
	IsFavorite  bool   `json:"is_favorite"`
	IsArchived  bool   `json:"is_archived"`
}

type CreateBoardListRequest struct {
	Name string `json:"name" binding:"required,max=120"`
}

type UpdateBoardListRequest struct {
	Name       string `json:"name" binding:"required,max=120"`
	Position   int    `json:"position"`
	IsArchived bool   `json:"is_archived"`
}

type CreateBoardCardRequest struct {
	Title               string   `json:"title" binding:"required,max=160"`
	Description         string   `json:"description" binding:"max=4000"`
	MarkdownDescription string   `json:"markdown_description"`
	Priority            string   `json:"priority"`
	DueDate             string   `json:"due_date"`
	CoverImage          string   `json:"cover_image"`
	LabelNames          []string `json:"label_names"`
	LabelColors         []string `json:"label_colors"`
	MemberIDs           []uint   `json:"member_ids"`
}

type UpdateBoardCardRequest struct {
	Title               string   `json:"title" binding:"required,max=160"`
	Description         string   `json:"description" binding:"max=4000"`
	MarkdownDescription string   `json:"markdown_description"`
	Priority            string   `json:"priority"`
	DueDate             string   `json:"due_date"`
	CoverImage          string   `json:"cover_image"`
	LabelNames          []string `json:"label_names"`
	LabelColors         []string `json:"label_colors"`
	MemberIDs           []uint   `json:"member_ids"`
	IsArchived          bool     `json:"is_archived"`
}

type MoveBoardCardRequest struct {
	ListID   uint `json:"list_id" binding:"required"`
	Position int  `json:"position"`
}

type CreateChecklistRequest struct {
	Title string `json:"title" binding:"required,max=120"`
}

type CreateChecklistItemRequest struct {
	Title string `json:"title" binding:"required,max=160"`
}

type ToggleChecklistItemRequest struct {
	IsCompleted *bool `json:"is_completed"`
}

type CreateBoardCommentRequest struct {
	Message string `json:"message" binding:"required"`
}

type BoardService interface {
	ListWorkspaces(actor *model.User) ([]WorkspaceResource, error)
	CreateWorkspace(actor *model.User, req CreateWorkspaceRequest) (*WorkspaceResource, error)
	CreateBoard(workspaceID uint, actor *model.User, req CreateBoardRequest) (*BoardSummaryResource, error)
	ListBoardsByWorkspace(workspaceID uint, actor *model.User) ([]BoardSummaryResource, error)
	GetBoard(boardID uint, actor *model.User) (*BoardDetailResource, error)
	UpdateBoard(boardID uint, actor *model.User, req UpdateBoardRequest) (*BoardDetailResource, error)
	CreateList(boardID uint, actor *model.User, req CreateBoardListRequest) (*BoardDetailResource, error)
	UpdateList(listID uint, actor *model.User, req UpdateBoardListRequest) (*BoardDetailResource, error)
	CreateCard(listID uint, actor *model.User, req CreateBoardCardRequest) (*BoardDetailResource, error)
	UpdateCard(cardID uint, actor *model.User, req UpdateBoardCardRequest) (*BoardDetailResource, error)
	MoveCard(cardID uint, actor *model.User, req MoveBoardCardRequest) (*BoardDetailResource, error)
	CreateChecklist(cardID uint, actor *model.User, req CreateChecklistRequest) (*BoardCardResource, error)
	CreateChecklistItem(checklistID uint, actor *model.User, req CreateChecklistItemRequest) (*BoardCardResource, error)
	ToggleChecklistItem(itemID uint, actor *model.User, req ToggleChecklistItemRequest) (*BoardCardResource, error)
	CreateComment(cardID uint, actor *model.User, req CreateBoardCommentRequest) (*BoardCardResource, error)
}

type boardService struct {
	repo     repository.BoardRepository
	userRepo repository.UserRepository
}

func NewBoardService(repo repository.BoardRepository, userRepo repository.UserRepository) BoardService {
	return &boardService{repo: repo, userRepo: userRepo}
}

func (s *boardService) ListWorkspaces(actor *model.User) ([]WorkspaceResource, error) {
	items, err := s.repo.FindWorkspacesByUser(actor.ID, actor.TenantID)
	if err != nil {
		return nil, err
	}
	res := make([]WorkspaceResource, 0, len(items))
	for _, item := range items {
		boards, err := s.repo.FindBoardsByWorkspace(item.ID)
		if err != nil {
			return nil, err
		}
		ws := toWorkspaceResource(item)
		ws.Boards = make([]BoardSummaryResource, 0, len(boards))
		for _, board := range boards {
			ws.Boards = append(ws.Boards, toBoardSummaryResource(board))
		}
		res = append(res, ws)
	}
	return res, nil
}

func (s *boardService) CreateWorkspace(actor *model.User, req CreateWorkspaceRequest) (*WorkspaceResource, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, errors.New("workspace name is required")
	}
	slug := slugPattern.ReplaceAllString(strings.ToLower(name), "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		slug = fmt.Sprintf("workspace-%d", time.Now().Unix())
	}
	var resource *WorkspaceResource
	err := s.repo.WithTransaction(func(repo repository.BoardRepository) error {
		workspace := &model.Workspace{
			TenantID:    actor.TenantID,
			Name:        name,
			Slug:        fmt.Sprintf("%s-%d", slug, time.Now().Unix()),
			Description: strings.TrimSpace(req.Description),
			OwnerID:     actor.ID,
		}
		if err := repo.CreateWorkspace(workspace); err != nil {
			return err
		}
		if err := repo.CreateWorkspaceMember(&model.WorkspaceMember{WorkspaceID: workspace.ID, UserID: actor.ID, Role: "owner"}); err != nil {
			return err
		}
		resourceValue := toWorkspaceResource(*workspace)
		resource = &resourceValue
		return nil
	})
	return resource, err
}

func (s *boardService) CreateBoard(workspaceID uint, actor *model.User, req CreateBoardRequest) (*BoardSummaryResource, error) {
	workspace, err := s.repo.FindWorkspaceByID(workspaceID)
	if err != nil {
		return nil, err
	}
	if workspace.TeamID == nil {
		return nil, errors.New("workspace must belong to a team before creating a board")
	}
	if err := s.ensureWorkspaceWrite(actor, workspace); err != nil {
		return nil, ErrWorkspaceDenied
	}
	board := &model.Board{
		WorkspaceID: workspaceID,
		Name:        strings.TrimSpace(req.Name),
		Description: strings.TrimSpace(req.Description),
		Visibility:  normalizeBoardVisibility(req.Visibility),
		Theme:       normalizeBoardTheme(req.Theme),
		CreatedBy:   actor.ID,
	}
	if err := s.repo.CreateBoard(board); err != nil {
		return nil, err
	}
	_ = s.repo.CreateBoardMember(&model.BoardMember{BoardID: board.ID, UserID: actor.ID, Role: "owner"})
	for _, member := range workspace.Members {
		if member.UserID == actor.ID {
			continue
		}
		_ = s.repo.CreateBoardMember(&model.BoardMember{BoardID: board.ID, UserID: member.UserID, Role: "member"})
	}
	for i, name := range []string{"Backlog", "Todo", "In Progress", "Review", "Done"} {
		_ = s.repo.CreateList(&model.BoardList{BoardID: board.ID, Name: name, Position: i})
	}
	fresh, err := s.repo.FindBoardByID(board.ID)
	if err != nil {
		return nil, err
	}
	return ptrBoardSummaryResource(toBoardSummaryResource(*fresh)), nil
}

func (s *boardService) ListBoardsByWorkspace(workspaceID uint, actor *model.User) ([]BoardSummaryResource, error) {
	workspace, err := s.repo.FindWorkspaceByID(workspaceID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureWorkspaceAccess(actor, workspace); err != nil {
		return nil, err
	}
	boards, err := s.repo.FindBoardsByWorkspace(workspaceID)
	if err != nil {
		return nil, err
	}
	res := make([]BoardSummaryResource, 0, len(boards))
	for _, board := range boards {
		res = append(res, toBoardSummaryResource(board))
	}
	return res, nil
}

func (s *boardService) GetBoard(boardID uint, actor *model.User) (*BoardDetailResource, error) {
	board, err := s.repo.FindBoardByID(boardID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureBoardAccess(actor, board); err != nil {
		return nil, err
	}
	activities, err := s.repo.FindActivitiesByBoard(boardID)
	if err != nil {
		return nil, err
	}
	value := toBoardDetailResource(*board, activities)
	return &value, nil
}

func (s *boardService) UpdateBoard(boardID uint, actor *model.User, req UpdateBoardRequest) (*BoardDetailResource, error) {
	board, err := s.repo.FindBoardByID(boardID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureBoardWrite(actor, board); err != nil {
		return nil, err
	}
	board.Name = strings.TrimSpace(req.Name)
	board.Description = strings.TrimSpace(req.Description)
	board.Visibility = normalizeBoardVisibility(req.Visibility)
	board.Theme = normalizeBoardTheme(req.Theme)
	board.IsFavorite = req.IsFavorite
	board.IsArchived = req.IsArchived
	if err := s.repo.UpdateBoard(board); err != nil {
		return nil, err
	}
	_ = s.repo.CreateActivity(buildBoardActivity(board.WorkspaceID, board.ID, nil, nil, actor.ID, "board.updated", nil, board, fmt.Sprintf("Updated board '%s'", board.Name)))
	return s.GetBoard(boardID, actor)
}

func (s *boardService) CreateList(boardID uint, actor *model.User, req CreateBoardListRequest) (*BoardDetailResource, error) {
	board, err := s.repo.FindBoardByID(boardID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureBoardWrite(actor, board); err != nil {
		return nil, err
	}
	lists, err := s.repo.FindListsByBoard(boardID)
	if err != nil {
		return nil, err
	}
	list := &model.BoardList{BoardID: boardID, Name: strings.TrimSpace(req.Name), Position: len(lists)}
	if err := s.repo.CreateList(list); err != nil {
		return nil, err
	}
	_ = s.repo.CreateActivity(buildBoardActivity(board.WorkspaceID, board.ID, &list.ID, nil, actor.ID, "list.created", nil, list, fmt.Sprintf("Created list '%s'", list.Name)))
	return s.GetBoard(boardID, actor)
}

func (s *boardService) UpdateList(listID uint, actor *model.User, req UpdateBoardListRequest) (*BoardDetailResource, error) {
	list, err := s.repo.FindListByID(listID)
	if err != nil {
		return nil, err
	}
	board, err := s.repo.FindBoardByID(list.BoardID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureBoardWrite(actor, board); err != nil {
		return nil, err
	}
	old := *list
	list.Name = strings.TrimSpace(req.Name)
	list.Position = req.Position
	list.IsArchived = req.IsArchived
	if err := s.repo.UpdateList(list); err != nil {
		return nil, err
	}
	_ = s.repo.CreateActivity(buildBoardActivity(board.WorkspaceID, board.ID, &list.ID, nil, actor.ID, "list.updated", old, list, fmt.Sprintf("Updated list '%s'", list.Name)))
	return s.GetBoard(board.ID, actor)
}

func (s *boardService) CreateCard(listID uint, actor *model.User, req CreateBoardCardRequest) (*BoardDetailResource, error) {
	list, err := s.repo.FindListByID(listID)
	if err != nil {
		return nil, err
	}
	board, err := s.repo.FindBoardByID(list.BoardID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureBoardWrite(actor, board); err != nil {
		return nil, err
	}
	position := len(list.Cards)
	card := &model.BoardCard{
		BoardID:             board.ID,
		ListID:              list.ID,
		Title:               strings.TrimSpace(req.Title),
		Description:         strings.TrimSpace(req.Description),
		MarkdownDescription: strings.TrimSpace(req.MarkdownDescription),
		CoverImage:          strings.TrimSpace(req.CoverImage),
		DueDate:             parseBoardDueDate(req.DueDate),
		Priority:            normalizeBoardPriority(req.Priority),
		Position:            position,
		CreatedBy:           actor.ID,
	}
	if err := s.repo.CreateCard(card); err != nil {
		return nil, err
	}
	if err := s.replaceCardMembersAndLabels(card.ID, req.MemberIDs, req.LabelNames, req.LabelColors); err != nil {
		return nil, err
	}
	_ = s.repo.CreateActivity(buildBoardActivity(board.WorkspaceID, board.ID, &list.ID, &card.ID, actor.ID, "card.created", nil, card, fmt.Sprintf("Created card '%s'", card.Title)))
	return s.GetBoard(board.ID, actor)
}

func (s *boardService) UpdateCard(cardID uint, actor *model.User, req UpdateBoardCardRequest) (*BoardDetailResource, error) {
	card, err := s.repo.FindCardByID(cardID)
	if err != nil {
		return nil, err
	}
	board, err := s.repo.FindBoardByID(card.BoardID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureBoardWrite(actor, board); err != nil {
		return nil, err
	}
	old := *card
	card.Title = strings.TrimSpace(req.Title)
	card.Description = strings.TrimSpace(req.Description)
	card.MarkdownDescription = strings.TrimSpace(req.MarkdownDescription)
	card.CoverImage = strings.TrimSpace(req.CoverImage)
	card.DueDate = parseBoardDueDate(req.DueDate)
	card.Priority = normalizeBoardPriority(req.Priority)
	card.IsArchived = req.IsArchived
	if err := s.repo.UpdateCard(card); err != nil {
		return nil, err
	}
	if err := s.replaceCardMembersAndLabels(card.ID, req.MemberIDs, req.LabelNames, req.LabelColors); err != nil {
		return nil, err
	}
	_ = s.repo.CreateActivity(buildBoardActivity(board.WorkspaceID, board.ID, &card.ListID, &card.ID, actor.ID, "card.updated", old, card, fmt.Sprintf("Updated card '%s'", card.Title)))
	return s.GetBoard(board.ID, actor)
}

func (s *boardService) MoveCard(cardID uint, actor *model.User, req MoveBoardCardRequest) (*BoardDetailResource, error) {
	card, err := s.repo.FindCardByID(cardID)
	if err != nil {
		return nil, err
	}
	board, err := s.repo.FindBoardByID(card.BoardID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureBoardWrite(actor, board); err != nil {
		return nil, err
	}
	targetList, err := s.repo.FindListByID(req.ListID)
	if err != nil {
		return nil, err
	}
	if targetList.BoardID != board.ID {
		return nil, errors.New("target list does not belong to the same board")
	}
	old := *card
	if err := s.repo.MoveCard(card.ID, card.ListID, req.ListID, card.Position, req.Position); err != nil {
		return nil, err
	}
	freshCard, err := s.repo.FindCardByID(card.ID)
	if err != nil {
		return nil, err
	}
	_ = s.repo.CreateActivity(buildBoardActivity(board.WorkspaceID, board.ID, &freshCard.ListID, &freshCard.ID, actor.ID, "card.moved", old, freshCard, fmt.Sprintf("Moved card '%s'", freshCard.Title)))
	return s.GetBoard(board.ID, actor)
}

func (s *boardService) CreateChecklist(cardID uint, actor *model.User, req CreateChecklistRequest) (*BoardCardResource, error) {
	card, err := s.repo.FindCardByID(cardID)
	if err != nil {
		return nil, err
	}
	board, err := s.repo.FindBoardByID(card.BoardID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureBoardWrite(actor, board); err != nil {
		return nil, err
	}
	checklist := &model.BoardCardChecklist{CardID: cardID, Title: strings.TrimSpace(req.Title), Position: len(card.Checklists)}
	if err := s.repo.CreateChecklist(checklist); err != nil {
		return nil, err
	}
	_ = s.repo.CreateActivity(buildBoardActivity(board.WorkspaceID, board.ID, &card.ListID, &card.ID, actor.ID, "checklist.created", nil, checklist, fmt.Sprintf("Added checklist '%s' to '%s'", checklist.Title, card.Title)))
	fresh, err := s.repo.FindCardByID(cardID)
	if err != nil {
		return nil, err
	}
	value := toBoardCardResource(*fresh)
	return &value, nil
}

func (s *boardService) CreateChecklistItem(checklistID uint, actor *model.User, req CreateChecklistItemRequest) (*BoardCardResource, error) {
	card, checklist, board, err := s.findChecklistContext(checklistID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureBoardWrite(actor, board); err != nil {
		return nil, err
	}
	item := &model.BoardCardChecklistItem{ChecklistID: checklistID, Title: strings.TrimSpace(req.Title), Position: len(checklist.Items)}
	if err := s.repo.CreateChecklistItem(item); err != nil {
		return nil, err
	}
	_ = s.repo.CreateActivity(buildBoardActivity(board.WorkspaceID, board.ID, &card.ListID, &card.ID, actor.ID, "checklist_item.created", nil, item, fmt.Sprintf("Added checklist item '%s' to '%s'", item.Title, card.Title)))
	fresh, err := s.repo.FindCardByID(card.ID)
	if err != nil {
		return nil, err
	}
	value := toBoardCardResource(*fresh)
	return &value, nil
}

func (s *boardService) ToggleChecklistItem(itemID uint, actor *model.User, req ToggleChecklistItemRequest) (*BoardCardResource, error) {
	card, item, board, err := s.findChecklistItemContext(itemID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureBoardWrite(actor, board); err != nil {
		return nil, err
	}
	old := *item
	next := !item.IsCompleted
	if req.IsCompleted != nil {
		next = *req.IsCompleted
	}
	item.IsCompleted = next
	if next {
		now := time.Now()
		item.CompletedAt = &now
	} else {
		item.CompletedAt = nil
	}
	if err := s.repo.UpdateChecklistItem(item); err != nil {
		return nil, err
	}
	action := "checklist_item.unchecked"
	description := fmt.Sprintf("Unchecked '%s' on '%s'", item.Title, card.Title)
	if item.IsCompleted {
		action = "checklist_item.checked"
		description = fmt.Sprintf("Checked '%s' on '%s'", item.Title, card.Title)
	}
	_ = s.repo.CreateActivity(buildBoardActivity(board.WorkspaceID, board.ID, &card.ListID, &card.ID, actor.ID, action, old, item, description))
	fresh, err := s.repo.FindCardByID(card.ID)
	if err != nil {
		return nil, err
	}
	value := toBoardCardResource(*fresh)
	return &value, nil
}

func (s *boardService) CreateComment(cardID uint, actor *model.User, req CreateBoardCommentRequest) (*BoardCardResource, error) {
	card, err := s.repo.FindCardByID(cardID)
	if err != nil {
		return nil, err
	}
	board, err := s.repo.FindBoardByID(card.BoardID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureBoardAccess(actor, board); err != nil {
		return nil, err
	}
	comment := &model.BoardCardComment{CardID: cardID, UserID: actor.ID, Message: strings.TrimSpace(req.Message)}
	if err := s.repo.CreateCardComment(comment); err != nil {
		return nil, err
	}
	_ = s.repo.CreateActivity(buildBoardActivity(board.WorkspaceID, board.ID, &card.ListID, &card.ID, actor.ID, "card.comment", nil, comment, fmt.Sprintf("Commented on card '%s'", card.Title)))
	fresh, err := s.repo.FindCardByID(cardID)
	if err != nil {
		return nil, err
	}
	value := toBoardCardResource(*fresh)
	return &value, nil
}

func (s *boardService) ensureBoardAccess(actor *model.User, board *model.Board) error {
	if board.Workspace.TeamID != nil {
		return s.ensureWorkspaceAccess(actor, &board.Workspace)
	}
	if board.Workspace.OwnerID == actor.ID || board.CreatedBy == actor.ID || isAdmin(actor) {
		return nil
	}
	for _, member := range board.Members {
		if member.UserID == actor.ID {
			return nil
		}
	}
	if board.Visibility == "public" && board.Workspace.TenantID == actor.TenantID {
		return nil
	}
	return ErrBoardForbidden
}

func (s *boardService) ensureBoardWrite(actor *model.User, board *model.Board) error {
	if board.Workspace.TeamID != nil {
		if err := s.ensureWorkspaceAccess(actor, &board.Workspace); err != nil {
			return err
		}
	}
	if board.Workspace.OwnerID == actor.ID || board.CreatedBy == actor.ID || isAdmin(actor) {
		return nil
	}
	for _, member := range board.Members {
		if member.UserID == actor.ID && member.Role != "viewer" {
			return nil
		}
	}
	return ErrBoardForbidden
}

func normalizeBoardVisibility(raw string) string {
	if strings.TrimSpace(raw) == "public" {
		return "public"
	}
	return "private"
}

func (s *boardService) ensureWorkspaceAccess(actor *model.User, workspace *model.Workspace) error {
	if workspace.OwnerID == actor.ID || isAdmin(actor) {
		return nil
	}
	for _, member := range workspace.Members {
		if member.UserID == actor.ID {
			return nil
		}
	}
	return ErrWorkspaceDenied
}

func (s *boardService) ensureWorkspaceWrite(actor *model.User, workspace *model.Workspace) error {
	if workspace.OwnerID == actor.ID || isAdmin(actor) {
		return nil
	}
	for _, member := range workspace.Members {
		if member.UserID == actor.ID && member.Role == "owner" {
			return nil
		}
	}
	return ErrWorkspaceDenied
}

func normalizeBoardTheme(raw string) string {
	theme := strings.TrimSpace(raw)
	if theme == "" {
		return "ocean"
	}
	return theme
}

func normalizeBoardPriority(raw string) string {
	switch strings.TrimSpace(raw) {
	case "low", "high", "urgent":
		return strings.TrimSpace(raw)
	default:
		return "medium"
	}
}

func parseBoardDueDate(raw string) *time.Time {
	value := strings.TrimSpace(raw)
	if value == "" {
		return nil
	}
	layouts := []string{time.RFC3339, "2006-01-02T15:04", "2006-01-02"}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, value); err == nil {
			return &parsed
		}
	}
	return nil
}

func (s *boardService) replaceCardMembersAndLabels(cardID uint, memberIDs []uint, labelNames, labelColors []string) error {
	if err := s.repo.DeleteCardMembersByCard(cardID); err != nil {
		return err
	}
	for _, memberID := range memberIDs {
		if err := s.repo.CreateCardMember(&model.BoardCardMember{CardID: cardID, UserID: memberID}); err != nil {
			return err
		}
	}
	if err := s.repo.DeleteLabelsByCard(cardID); err != nil {
		return err
	}
	for idx, name := range labelNames {
		trimmed := strings.TrimSpace(name)
		if trimmed == "" {
			continue
		}
		color := "#06b6d4"
		if idx < len(labelColors) && strings.TrimSpace(labelColors[idx]) != "" {
			color = strings.TrimSpace(labelColors[idx])
		}
		if err := s.repo.CreateCardLabel(&model.BoardCardLabel{CardID: cardID, Name: trimmed, Color: color}); err != nil {
			return err
		}
	}
	return nil
}

func (s *boardService) findChecklistContext(checklistID uint) (*model.BoardCard, *model.BoardCardChecklist, *model.Board, error) {
	checklist, err := s.repo.FindChecklistByID(checklistID)
	if err != nil {
		return nil, nil, nil, err
	}
	card, err := s.repo.FindCardByID(checklist.CardID)
	if err != nil {
		return nil, nil, nil, err
	}
	board, err := s.repo.FindBoardByID(card.BoardID)
	return card, checklist, board, err
}

func (s *boardService) findChecklistItemContext(itemID uint) (*model.BoardCard, *model.BoardCardChecklistItem, *model.Board, error) {
	item, err := s.repo.FindChecklistItemByID(itemID)
	if err != nil {
		return nil, nil, nil, err
	}
	card, err := s.repo.FindCardByID(item.Checklist.CardID)
	if err != nil {
		return nil, nil, nil, err
	}
	board, err := s.repo.FindBoardByID(card.BoardID)
	return card, item, board, err
}

func buildBoardActivity(workspaceID, boardID uint, listID, cardID *uint, userID uint, action string, oldValue any, newValue any, description string) *model.BoardActivity {
	return &model.BoardActivity{
		WorkspaceID: &workspaceID,
		BoardID:     &boardID,
		ListID:      listID,
		CardID:      cardID,
		UserID:      userID,
		Action:      action,
		OldValue:    mustBoardJSON(oldValue),
		NewValue:    mustBoardJSON(newValue),
		Description: description,
	}
}

func mustBoardJSON(value any) string {
	if value == nil {
		return "null"
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return "null"
	}
	return string(raw)
}

func toBoardUserResource(user model.User) BoardUserResource {
	role := ""
	if user.Role != nil {
		role = user.Role.DisplayName
	}
	return BoardUserResource{ID: user.ID, Name: user.Name, Email: user.Email, DisplayRole: role}
}

func toWorkspaceResource(workspace model.Workspace) WorkspaceResource {
	resource := WorkspaceResource{
		ID:          workspace.ID,
		TeamID:      workspace.TeamID,
		Name:        workspace.Name,
		Slug:        workspace.Slug,
		Description: workspace.Description,
		Owner:       toBoardUserResource(workspace.Owner),
		CreatedAt:   workspace.CreatedAt,
		UpdatedAt:   workspace.UpdatedAt,
	}
	if workspace.Team != nil {
		resource.Team = &BoardTeamSummary{
			ID:     workspace.Team.ID,
			Name:   workspace.Team.Name,
			Avatar: workspace.Team.Avatar,
		}
	}
	return resource
}

func toBoardSummaryResource(board model.Board) BoardSummaryResource {
	return BoardSummaryResource{
		ID:          board.ID,
		WorkspaceID: board.WorkspaceID,
		Name:        board.Name,
		Description: board.Description,
		Visibility:  board.Visibility,
		Theme:       board.Theme,
		IsFavorite:  board.IsFavorite,
		CreatedBy:   board.CreatedBy,
		Creator:     toBoardUserResource(board.Creator),
		CreatedAt:   board.CreatedAt,
		UpdatedAt:   board.UpdatedAt,
	}
}

func ptrBoardSummaryResource(value BoardSummaryResource) *BoardSummaryResource { return &value }

func toBoardCardResource(card model.BoardCard) BoardCardResource {
	resource := BoardCardResource{
		ID:                  card.ID,
		BoardID:             card.BoardID,
		ListID:              card.ListID,
		Title:               card.Title,
		Description:         card.Description,
		MarkdownDescription: card.MarkdownDescription,
		CoverImage:          card.CoverImage,
		DueDate:             card.DueDate,
		Priority:            card.Priority,
		Position:            card.Position,
		IsArchived:          card.IsArchived,
		Creator:             toBoardUserResource(card.Creator),
		CreatedAt:           card.CreatedAt,
		UpdatedAt:           card.UpdatedAt,
	}
	for _, member := range card.Members {
		resource.Members = append(resource.Members, toBoardUserResource(member.User))
	}
	for _, label := range card.Labels {
		resource.Labels = append(resource.Labels, BoardLabelResource{ID: label.ID, Name: label.Name, Color: label.Color})
	}
	for _, checklist := range card.Checklists {
		checklistRes := BoardChecklistResource{ID: checklist.ID, Title: checklist.Title, Position: checklist.Position}
		for _, item := range checklist.Items {
			checklistRes.Items = append(checklistRes.Items, BoardChecklistItemResource{
				ID:          item.ID,
				Title:       item.Title,
				IsCompleted: item.IsCompleted,
				CompletedAt: item.CompletedAt,
				Position:    item.Position,
			})
		}
		resource.Checklists = append(resource.Checklists, checklistRes)
	}
	for _, comment := range card.Comments {
		resource.Comments = append(resource.Comments, BoardCommentResource{
			ID:        comment.ID,
			Message:   comment.Message,
			User:      toBoardUserResource(comment.User),
			CreatedAt: comment.CreatedAt,
			UpdatedAt: comment.UpdatedAt,
		})
	}
	return resource
}

func toBoardDetailResource(board model.Board, activities []model.BoardActivity) BoardDetailResource {
	resource := BoardDetailResource{
		BoardSummaryResource: toBoardSummaryResource(board),
	}
	for _, member := range board.Members {
		resource.Members = append(resource.Members, toBoardUserResource(member.User))
	}
	for _, list := range board.Lists {
		listRes := BoardListResource{
			ID:         list.ID,
			BoardID:    list.BoardID,
			Name:       list.Name,
			Position:   list.Position,
			IsArchived: list.IsArchived,
		}
		for _, card := range list.Cards {
			listRes.Cards = append(listRes.Cards, toBoardCardResource(card))
		}
		resource.Lists = append(resource.Lists, listRes)
	}
	for _, activity := range activities {
		resource.Activities = append(resource.Activities, BoardActivityResource{
			ID:          activity.ID,
			Action:      activity.Action,
			Description: activity.Description,
			User:        toBoardUserResource(activity.User),
			CreatedAt:   activity.CreatedAt,
		})
	}
	return resource
}
