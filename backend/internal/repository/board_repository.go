package repository

import (
	"attendance-system/internal/model"

	"gorm.io/gorm"
)

type BoardRepository interface {
	WithTransaction(fn func(repo BoardRepository) error) error
	CreateWorkspace(workspace *model.Workspace) error
	CreateWorkspaceMember(member *model.WorkspaceMember) error
	FindWorkspaceByID(id uint) (*model.Workspace, error)
	FindWorkspacesByUser(userID, tenantID uint) ([]model.Workspace, error)
	CreateBoard(board *model.Board) error
	UpdateBoard(board *model.Board) error
	FindBoardsByWorkspace(workspaceID uint) ([]model.Board, error)
	FindBoardByID(id uint) (*model.Board, error)
	CreateBoardMember(member *model.BoardMember) error
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

func (r *boardRepository) CreateWorkspace(workspace *model.Workspace) error {
	return r.db.Create(workspace).Error
}

func (r *boardRepository) CreateWorkspaceMember(member *model.WorkspaceMember) error {
	return r.db.Create(member).Error
}

func (r *boardRepository) FindWorkspaceByID(id uint) (*model.Workspace, error) {
	var workspace model.Workspace
	err := r.db.Preload("Owner").Preload("Members.User").Where("is_archived = false").First(&workspace, id).Error
	return &workspace, err
}

func (r *boardRepository) FindWorkspacesByUser(userID, tenantID uint) ([]model.Workspace, error) {
	var workspaces []model.Workspace
	err := r.db.
		Joins("JOIN workspace_members ON workspace_members.workspace_id = workspaces.id").
		Where("workspace_members.user_id = ? AND workspaces.tenant_id = ? AND workspaces.is_archived = false", userID, tenantID).
		Preload("Owner").
		Order("workspaces.updated_at desc").
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
