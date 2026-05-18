package repository

import (
	"attendance-system/internal/model"
	"errors"

	"gorm.io/gorm"
)

type BoardRepository interface {
	WithTransaction(fn func(repo BoardRepository) error) error
	CreateTeam(team *model.Team) error
	UpdateTeam(team *model.Team) error
	FindTeamByID(id uint) (*model.Team, error)
	FindTeamsByUser(userID, tenantID uint) ([]model.Team, error)
	CreateTeamMember(member *model.TeamMember) error
	UpdateTeamMember(member *model.TeamMember) error
	FindTeamMemberByID(id uint) (*model.TeamMember, error)
	FindTeamMember(teamID, userID uint) (*model.TeamMember, error)
	FindTeamMembers(teamID uint) ([]model.TeamMember, error)
	FindJoinedTeamMembers(teamID uint) ([]model.TeamMember, error)
	DeleteTeamMember(id uint) error
	CreateWorkspace(workspace *model.Workspace) error
	CreateWorkspaceMember(member *model.WorkspaceMember) error
	DeleteWorkspaceMember(workspaceID, userID uint) error
	FindWorkspaceByID(id uint) (*model.Workspace, error)
	FindWorkspacesByUser(userID, tenantID uint) ([]model.Workspace, error)
	FindWorkspacesByTeam(teamID uint) ([]model.Workspace, error)
	CreateBoard(board *model.Board) error
	UpdateBoard(board *model.Board) error
	FindBoardsByWorkspace(workspaceID uint) ([]model.Board, error)
	FindBoardByID(id uint) (*model.Board, error)
	CreateBoardMember(member *model.BoardMember) error
	DeleteBoardMember(boardID, userID uint) error
	ReplaceBoardMembers(boardID uint, userIDs []uint) error
	CreateList(list *model.BoardList) error
	UpdateList(list *model.BoardList) error
	FindListByID(id uint) (*model.BoardList, error)
	FindListsByBoard(boardID uint) ([]model.BoardList, error)
	CreateCard(card *model.BoardCard) error
	UpdateCard(card *model.BoardCard) error
	MoveCard(cardID, sourceListID, targetListID uint, sourcePosition, targetPosition int) error
	FindCardByID(id uint) (*model.BoardCard, error)
	CreateCardComment(comment *model.BoardCardComment) error
	CreateChecklist(checklist *model.BoardCardChecklist) error
	FindChecklistByID(id uint) (*model.BoardCardChecklist, error)
	CreateChecklistItem(item *model.BoardCardChecklistItem) error
	FindChecklistItemByID(id uint) (*model.BoardCardChecklistItem, error)
	UpdateChecklistItem(item *model.BoardCardChecklistItem) error
	CreateCardLabel(label *model.BoardCardLabel) error
	DeleteLabelsByCard(cardID uint) error
	CreateCardMember(member *model.BoardCardMember) error
	DeleteCardMembersByCard(cardID uint) error
	CreateActivity(activity *model.BoardActivity) error
	FindActivitiesByBoard(boardID uint) ([]model.BoardActivity, error)
}

type boardRepository struct{ db *gorm.DB }

func NewBoardRepository(db *gorm.DB) BoardRepository {
	return &boardRepository{db: db}
}

func (r *boardRepository) WithTransaction(fn func(repo BoardRepository) error) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		return fn(&boardRepository{db: tx})
	})
}

func (r *boardRepository) CreateTeam(team *model.Team) error {
	return r.db.Create(team).Error
}

func (r *boardRepository) UpdateTeam(team *model.Team) error {
	return r.db.Save(team).Error
}

func (r *boardRepository) FindTeamByID(id uint) (*model.Team, error) {
	var team model.Team
	err := r.db.
		Preload("Creator").
		Preload("Members.User").
		Preload("Members.Inviter").
		Preload("Workspaces", func(db *gorm.DB) *gorm.DB { return db.Where("is_archived = false").Order("updated_at desc") }).
		Preload("Workspaces.Owner").
		Preload("Workspaces.Team").
		Preload("Workspaces.Boards", func(db *gorm.DB) *gorm.DB { return db.Where("is_archived = false").Order("updated_at desc") }).
		Preload("Workspaces.Boards.Creator").
		Where("deleted_at IS NULL").
		First(&team, id).Error
	return &team, err
}

func (r *boardRepository) FindTeamsByUser(userID, tenantID uint) ([]model.Team, error) {
	var teams []model.Team
	err := r.db.
		Joins("JOIN team_members ON team_members.team_id = teams.id").
		Where("team_members.user_id = ? AND teams.tenant_id = ? AND teams.deleted_at IS NULL", userID, tenantID).
		Preload("Creator").
		Preload("Members.User").
		Preload("Workspaces", func(db *gorm.DB) *gorm.DB { return db.Where("is_archived = false") }).
		Order("teams.updated_at desc").
		Find(&teams).Error
	return teams, err
}

func (r *boardRepository) CreateTeamMember(member *model.TeamMember) error {
	return r.db.Create(member).Error
}

func (r *boardRepository) UpdateTeamMember(member *model.TeamMember) error {
	return r.db.Save(member).Error
}

func (r *boardRepository) FindTeamMemberByID(id uint) (*model.TeamMember, error) {
	var member model.TeamMember
	err := r.db.Preload("User").Preload("Inviter").First(&member, id).Error
	return &member, err
}

func (r *boardRepository) FindTeamMember(teamID, userID uint) (*model.TeamMember, error) {
	var member model.TeamMember
	err := r.db.Preload("User").Preload("Inviter").Where("team_id = ? AND user_id = ?", teamID, userID).First(&member).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &member, err
}

func (r *boardRepository) FindTeamMembers(teamID uint) ([]model.TeamMember, error) {
	var members []model.TeamMember
	err := r.db.Preload("User").Preload("Inviter").Where("team_id = ?", teamID).Order("created_at asc").Find(&members).Error
	return members, err
}

func (r *boardRepository) FindJoinedTeamMembers(teamID uint) ([]model.TeamMember, error) {
	var members []model.TeamMember
	err := r.db.Preload("User").Preload("Inviter").Where("team_id = ? AND joined_at IS NOT NULL", teamID).Order("created_at asc").Find(&members).Error
	return members, err
}

func (r *boardRepository) DeleteTeamMember(id uint) error {
	return r.db.Delete(&model.TeamMember{}, id).Error
}

func (r *boardRepository) CreateWorkspace(workspace *model.Workspace) error {
	return r.db.Create(workspace).Error
}

func (r *boardRepository) CreateWorkspaceMember(member *model.WorkspaceMember) error {
	return r.db.Create(member).Error
}

func (r *boardRepository) DeleteWorkspaceMember(workspaceID, userID uint) error {
	return r.db.Where("workspace_id = ? AND user_id = ?", workspaceID, userID).Delete(&model.WorkspaceMember{}).Error
}

func (r *boardRepository) FindWorkspaceByID(id uint) (*model.Workspace, error) {
	var workspace model.Workspace
	err := r.db.Preload("Owner").
		Preload("Team").
		Preload("Members.User").
		Where("is_archived = false").
		First(&workspace, id).Error
	return &workspace, err
}

func (r *boardRepository) FindWorkspacesByUser(userID, tenantID uint) ([]model.Workspace, error) {
	var workspaces []model.Workspace
	err := r.db.
		Joins("JOIN workspace_members ON workspace_members.workspace_id = workspaces.id").
		Where("workspace_members.user_id = ? AND workspaces.tenant_id = ? AND workspaces.is_archived = false", userID, tenantID).
		Preload("Owner").
		Preload("Team").
		Order("workspaces.updated_at desc").
		Find(&workspaces).Error
	return workspaces, err
}

func (r *boardRepository) FindWorkspacesByTeam(teamID uint) ([]model.Workspace, error) {
	var workspaces []model.Workspace
	err := r.db.Where("team_id = ? AND is_archived = false", teamID).
		Preload("Owner").
		Preload("Team").
		Preload("Boards", func(db *gorm.DB) *gorm.DB { return db.Where("is_archived = false").Order("updated_at desc") }).
		Order("updated_at desc").
		Find(&workspaces).Error
	return workspaces, err
}

func (r *boardRepository) CreateBoard(board *model.Board) error {
	return r.db.Create(board).Error
}

func (r *boardRepository) UpdateBoard(board *model.Board) error {
	return r.db.Save(board).Error
}

func (r *boardRepository) FindBoardsByWorkspace(workspaceID uint) ([]model.Board, error) {
	var boards []model.Board
	err := r.db.Where("workspace_id = ? AND is_archived = false", workspaceID).
		Preload("Creator").
		Order("updated_at desc").
		Find(&boards).Error
	return boards, err
}

func (r *boardRepository) FindBoardByID(id uint) (*model.Board, error) {
	var board model.Board
	err := r.db.
		Preload("Workspace").
		Preload("Workspace.Team").
		Preload("Workspace.Owner").
		Preload("Workspace.Members.User").
		Preload("Creator").
		Preload("Members.User").
		Preload("Lists", func(db *gorm.DB) *gorm.DB { return db.Where("is_archived = false").Order("position asc") }).
		Preload("Lists.Cards", func(db *gorm.DB) *gorm.DB { return db.Where("is_archived = false").Order("position asc") }).
		Preload("Lists.Cards.Creator").
		Preload("Lists.Cards.Members.User").
		Preload("Lists.Cards.Labels").
		Preload("Lists.Cards.Checklists", func(db *gorm.DB) *gorm.DB { return db.Order("position asc") }).
		Preload("Lists.Cards.Checklists.Items", func(db *gorm.DB) *gorm.DB { return db.Order("position asc") }).
		Preload("Lists.Cards.Comments", func(db *gorm.DB) *gorm.DB { return db.Order("created_at asc") }).
		Preload("Lists.Cards.Comments.User").
		First(&board, id).Error
	return &board, err
}

func (r *boardRepository) CreateBoardMember(member *model.BoardMember) error {
	return r.db.Create(member).Error
}

func (r *boardRepository) DeleteBoardMember(boardID, userID uint) error {
	return r.db.Where("board_id = ? AND user_id = ?", boardID, userID).Delete(&model.BoardMember{}).Error
}

func (r *boardRepository) ReplaceBoardMembers(boardID uint, userIDs []uint) error {
	if err := r.db.Where("board_id = ?", boardID).Delete(&model.BoardMember{}).Error; err != nil {
		return err
	}
	if len(userIDs) == 0 {
		return nil
	}
	members := make([]model.BoardMember, 0, len(userIDs))
	for _, userID := range userIDs {
		members = append(members, model.BoardMember{BoardID: boardID, UserID: userID, Role: "member"})
	}
	return r.db.Create(&members).Error
}

func (r *boardRepository) CreateList(list *model.BoardList) error {
	return r.db.Create(list).Error
}

func (r *boardRepository) UpdateList(list *model.BoardList) error {
	return r.db.Save(list).Error
}

func (r *boardRepository) FindListByID(id uint) (*model.BoardList, error) {
	var list model.BoardList
	err := r.db.Preload("Board").Preload("Cards", func(db *gorm.DB) *gorm.DB {
		return db.Where("is_archived = false").Order("position asc")
	}).First(&list, id).Error
	return &list, err
}

func (r *boardRepository) FindListsByBoard(boardID uint) ([]model.BoardList, error) {
	var lists []model.BoardList
	err := r.db.Where("board_id = ?", boardID).Order("position asc").Find(&lists).Error
	return lists, err
}

func (r *boardRepository) CreateCard(card *model.BoardCard) error {
	return r.db.Create(card).Error
}

func (r *boardRepository) UpdateCard(card *model.BoardCard) error {
	return r.db.Save(card).Error
}

func (r *boardRepository) MoveCard(cardID, sourceListID, targetListID uint, sourcePosition, targetPosition int) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var targetCount int64
		if err := tx.Model(&model.BoardCard{}).
			Where("list_id = ? AND is_archived = false AND id <> ?", targetListID, cardID).
			Count(&targetCount).Error; err != nil {
			return err
		}

		boundedPosition := targetPosition
		if boundedPosition < 0 {
			boundedPosition = 0
		}
		if boundedPosition > int(targetCount) {
			boundedPosition = int(targetCount)
		}

		if sourceListID == targetListID {
			if boundedPosition == sourcePosition {
				return nil
			}
			if boundedPosition > sourcePosition {
				if err := tx.Model(&model.BoardCard{}).
					Where("list_id = ? AND position > ? AND position <= ? AND id <> ?", sourceListID, sourcePosition, boundedPosition, cardID).
					Update("position", gorm.Expr("position - 1")).Error; err != nil {
					return err
				}
			} else {
				if err := tx.Model(&model.BoardCard{}).
					Where("list_id = ? AND position >= ? AND position < ? AND id <> ?", sourceListID, boundedPosition, sourcePosition, cardID).
					Update("position", gorm.Expr("position + 1")).Error; err != nil {
					return err
				}
			}
		} else {
			if err := tx.Model(&model.BoardCard{}).
				Where("list_id = ? AND position > ? AND id <> ?", sourceListID, sourcePosition, cardID).
				Update("position", gorm.Expr("position - 1")).Error; err != nil {
				return err
			}
			if err := tx.Model(&model.BoardCard{}).
				Where("list_id = ? AND position >= ? AND id <> ?", targetListID, boundedPosition, cardID).
				Update("position", gorm.Expr("position + 1")).Error; err != nil {
				return err
			}
		}

		return tx.Model(&model.BoardCard{}).
			Where("id = ?", cardID).
			Updates(map[string]any{
				"list_id":    targetListID,
				"position":   boundedPosition,
				"updated_at": gorm.Expr("NOW()"),
			}).Error
	})
}

func (r *boardRepository) FindCardByID(id uint) (*model.BoardCard, error) {
	var card model.BoardCard
	err := r.db.
		Preload("Board").
		Preload("Board.Workspace").
		Preload("Board.Workspace.Team").
		Preload("Board.Workspace.Owner").
		Preload("Board.Workspace.Members.User").
		Preload("List").
		Preload("Creator").
		Preload("Members.User").
		Preload("Labels").
		Preload("Checklists", func(db *gorm.DB) *gorm.DB { return db.Order("position asc") }).
		Preload("Checklists.Items", func(db *gorm.DB) *gorm.DB { return db.Order("position asc") }).
		Preload("Comments", func(db *gorm.DB) *gorm.DB { return db.Order("created_at asc") }).
		Preload("Comments.User").
		First(&card, id).Error
	return &card, err
}

func (r *boardRepository) CreateCardComment(comment *model.BoardCardComment) error {
	return r.db.Create(comment).Error
}

func (r *boardRepository) CreateChecklist(checklist *model.BoardCardChecklist) error {
	return r.db.Create(checklist).Error
}

func (r *boardRepository) FindChecklistByID(id uint) (*model.BoardCardChecklist, error) {
	var checklist model.BoardCardChecklist
	err := r.db.Preload("Card").Preload("Items", func(db *gorm.DB) *gorm.DB { return db.Order("position asc") }).First(&checklist, id).Error
	return &checklist, err
}

func (r *boardRepository) CreateChecklistItem(item *model.BoardCardChecklistItem) error {
	return r.db.Create(item).Error
}

func (r *boardRepository) FindChecklistItemByID(id uint) (*model.BoardCardChecklistItem, error) {
	var item model.BoardCardChecklistItem
	err := r.db.Preload("Checklist").Preload("Checklist.Card").First(&item, id).Error
	return &item, err
}

func (r *boardRepository) UpdateChecklistItem(item *model.BoardCardChecklistItem) error {
	return r.db.Save(item).Error
}

func (r *boardRepository) CreateCardLabel(label *model.BoardCardLabel) error {
	return r.db.Create(label).Error
}

func (r *boardRepository) DeleteLabelsByCard(cardID uint) error {
	return r.db.Where("card_id = ?", cardID).Delete(&model.BoardCardLabel{}).Error
}

func (r *boardRepository) CreateCardMember(member *model.BoardCardMember) error {
	return r.db.Create(member).Error
}

func (r *boardRepository) DeleteCardMembersByCard(cardID uint) error {
	return r.db.Where("card_id = ?", cardID).Delete(&model.BoardCardMember{}).Error
}

func (r *boardRepository) CreateActivity(activity *model.BoardActivity) error {
	return r.db.Create(activity).Error
}

func (r *boardRepository) FindActivitiesByBoard(boardID uint) ([]model.BoardActivity, error) {
	var items []model.BoardActivity
	err := r.db.Where("board_id = ?", boardID).
		Preload("User").
		Order("created_at desc").
		Limit(100).
		Find(&items).Error
	return items, err
}
