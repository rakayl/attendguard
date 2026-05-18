package service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"attendance-system/internal/model"
	"attendance-system/internal/repository"
)

type TeamMemberUserResource struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	DisplayRole string `json:"display_role,omitempty"`
}

type TeamMemberResource struct {
	ID        uint                    `json:"id"`
	Role      string                  `json:"role"`
	User      TeamMemberUserResource  `json:"user"`
	InvitedBy *TeamMemberUserResource `json:"invited_by,omitempty"`
	JoinedAt  *time.Time              `json:"joined_at,omitempty"`
	CreatedAt time.Time               `json:"created_at"`
	UpdatedAt time.Time               `json:"updated_at"`
}

type TeamWorkspaceResource struct {
	ID          uint                   `json:"id"`
	TeamID      *uint                  `json:"team_id,omitempty"`
	Name        string                 `json:"name"`
	Slug        string                 `json:"slug"`
	Description string                 `json:"description"`
	Owner       BoardUserResource      `json:"owner"`
	Boards      []BoardSummaryResource `json:"boards,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

type TeamResource struct {
	ID             uint                    `json:"id"`
	Name           string                  `json:"name"`
	Description    string                  `json:"description"`
	Avatar         string                  `json:"avatar"`
	CreatedBy      uint                    `json:"created_by"`
	Creator        TeamMemberUserResource  `json:"creator"`
	MemberCount    int                     `json:"member_count"`
	WorkspaceCount int                     `json:"workspace_count"`
	Members        []TeamMemberResource    `json:"members,omitempty"`
	Workspaces     []TeamWorkspaceResource `json:"workspaces,omitempty"`
	CreatedAt      time.Time               `json:"created_at"`
	UpdatedAt      time.Time               `json:"updated_at"`
}

type CreateTeamRequest struct {
	Name        string `json:"name" binding:"required,max=120"`
	Description string `json:"description" binding:"max=2000"`
	Avatar      string `json:"avatar"`
}

type UpdateTeamRequest struct {
	Name        string `json:"name" binding:"required,max=120"`
	Description string `json:"description" binding:"max=2000"`
	Avatar      string `json:"avatar"`
}

type InviteTeamMemberRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type UpdateTeamMemberRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

type CreateTeamWorkspaceRequest struct {
	Name        string `json:"name" binding:"required,max=120"`
	Description string `json:"description" binding:"max=2000"`
}

type TeamService interface {
	ListTeams(actor *model.User) ([]TeamResource, error)
	CreateTeam(actor *model.User, req CreateTeamRequest) (*TeamResource, error)
	GetTeam(teamID uint, actor *model.User) (*TeamResource, error)
	UpdateTeam(teamID uint, actor *model.User, req UpdateTeamRequest) (*TeamResource, error)
	DeleteTeam(teamID uint, actor *model.User) error
	ListMembers(teamID uint, actor *model.User) ([]TeamMemberResource, error)
	InviteMember(teamID uint, actor *model.User, req InviteTeamMemberRequest) (*TeamMemberResource, error)
	RemoveMember(teamID, memberID uint, actor *model.User) error
	UpdateMemberRole(teamID, memberID uint, actor *model.User, req UpdateTeamMemberRoleRequest) (*TeamMemberResource, error)
	CreateWorkspace(teamID uint, actor *model.User, req CreateTeamWorkspaceRequest) (*TeamWorkspaceResource, error)
	ListWorkspaces(teamID uint, actor *model.User) ([]TeamWorkspaceResource, error)
}

type teamService struct {
	repo     repository.BoardRepository
	userRepo repository.UserRepository
}

func NewTeamService(repo repository.BoardRepository, userRepo repository.UserRepository) TeamService {
	return &teamService{repo: repo, userRepo: userRepo}
}

func (s *teamService) ListTeams(actor *model.User) ([]TeamResource, error) {
	teams, err := s.repo.FindTeamsByUser(actor.ID, actor.TenantID)
	if err != nil {
		return nil, err
	}
	res := make([]TeamResource, 0, len(teams))
	for _, team := range teams {
		res = append(res, toTeamResource(team, false))
	}
	return res, nil
}

func (s *teamService) CreateTeam(actor *model.User, req CreateTeamRequest) (*TeamResource, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, errors.New("team name is required")
	}

	var resource *TeamResource
	err := s.repo.WithTransaction(func(repo repository.BoardRepository) error {
		team := &model.Team{
			TenantID:    actor.TenantID,
			Name:        name,
			Description: strings.TrimSpace(req.Description),
			Avatar:      strings.TrimSpace(req.Avatar),
			CreatedBy:   actor.ID,
		}
		if err := repo.CreateTeam(team); err != nil {
			return err
		}
		now := time.Now()
		member := &model.TeamMember{
			TeamID:    team.ID,
			UserID:    actor.ID,
			Role:      "owner",
			InvitedBy: &actor.ID,
			JoinedAt:  &now,
		}
		if err := repo.CreateTeamMember(member); err != nil {
			return err
		}
		fresh, err := repo.FindTeamByID(team.ID)
		if err != nil {
			return err
		}
		value := toTeamResource(*fresh, true)
		resource = &value
		return nil
	})
	return resource, err
}

func (s *teamService) GetTeam(teamID uint, actor *model.User) (*TeamResource, error) {
	team, err := s.requireTeamAccess(teamID, actor)
	if err != nil {
		return nil, err
	}
	value := toTeamResource(*team, true)
	return &value, nil
}

func (s *teamService) UpdateTeam(teamID uint, actor *model.User, req UpdateTeamRequest) (*TeamResource, error) {
	team, member, err := s.requireTeamOwner(teamID, actor)
	if err != nil {
		return nil, err
	}
	_ = member
	team.Name = strings.TrimSpace(req.Name)
	team.Description = strings.TrimSpace(req.Description)
	team.Avatar = strings.TrimSpace(req.Avatar)
	if team.Name == "" {
		return nil, errors.New("team name is required")
	}
	if err := s.repo.UpdateTeam(team); err != nil {
		return nil, err
	}
	return s.GetTeam(teamID, actor)
}

func (s *teamService) DeleteTeam(teamID uint, actor *model.User) error {
	team, _, err := s.requireTeamOwner(teamID, actor)
	if err != nil {
		return err
	}
	now := time.Now()
	team.DeletedAt = &now
	return s.repo.UpdateTeam(team)
}

func (s *teamService) ListMembers(teamID uint, actor *model.User) ([]TeamMemberResource, error) {
	_, err := s.requireTeamAccess(teamID, actor)
	if err != nil {
		return nil, err
	}
	members, err := s.repo.FindTeamMembers(teamID)
	if err != nil {
		return nil, err
	}
	res := make([]TeamMemberResource, 0, len(members))
	for _, member := range members {
		res = append(res, toTeamMemberResource(member))
	}
	return res, nil
}

func (s *teamService) InviteMember(teamID uint, actor *model.User, req InviteTeamMemberRequest) (*TeamMemberResource, error) {
	team, _, err := s.requireTeamOwner(teamID, actor)
	if err != nil {
		return nil, err
	}
	user, err := s.userRepo.FindByEmailWithRole(strings.TrimSpace(req.Email))
	if err != nil {
		return nil, errors.New("user not found")
	}
	if user.TenantID != team.TenantID {
		return nil, errors.New("user does not belong to the same tenant")
	}
	existing, err := s.repo.FindTeamMember(teamID, user.ID)
	if err != nil {
		return nil, err
	}
	if existing != nil && existing.ID != 0 {
		return nil, errors.New("user is already a team member")
	}

	var resource *TeamMemberResource
	err = s.repo.WithTransaction(func(repo repository.BoardRepository) error {
		now := time.Now()
		member := &model.TeamMember{
			TeamID:    teamID,
			UserID:    user.ID,
			Role:      "member",
			InvitedBy: &actor.ID,
			JoinedAt:  &now,
		}
		if err := repo.CreateTeamMember(member); err != nil {
			return err
		}
		workspaces, err := repo.FindWorkspacesByTeam(teamID)
		if err != nil {
			return err
		}
		for _, workspace := range workspaces {
			if err := repo.CreateWorkspaceMember(&model.WorkspaceMember{
				WorkspaceID: workspace.ID,
				UserID:      user.ID,
				Role:        "member",
			}); err != nil {
				return err
			}
			boards, err := repo.FindBoardsByWorkspace(workspace.ID)
			if err != nil {
				return err
			}
			for _, board := range boards {
				if err := repo.CreateBoardMember(&model.BoardMember{BoardID: board.ID, UserID: user.ID, Role: "member"}); err != nil {
					return err
				}
			}
		}
		fresh, err := repo.FindTeamMemberByID(member.ID)
		if err != nil {
			return err
		}
		value := toTeamMemberResource(*fresh)
		resource = &value
		return nil
	})
	return resource, err
}

func (s *teamService) RemoveMember(teamID, memberID uint, actor *model.User) error {
	team, _, err := s.requireTeamOwner(teamID, actor)
	if err != nil {
		return err
	}
	member, err := s.repo.FindTeamMemberByID(memberID)
	if err != nil {
		return err
	}
	if member.TeamID != teamID {
		return errors.New("member does not belong to the selected team")
	}
	if member.Role == "owner" {
		members, err := s.repo.FindTeamMembers(teamID)
		if err != nil {
			return err
		}
		owners := 0
		for _, item := range members {
			if item.Role == "owner" {
				owners++
			}
		}
		if owners <= 1 {
			return errors.New("team must have at least one owner")
		}
	}
	return s.repo.WithTransaction(func(repo repository.BoardRepository) error {
		workspaces, err := repo.FindWorkspacesByTeam(team.ID)
		if err != nil {
			return err
		}
		for _, workspace := range workspaces {
			if err := repo.DeleteWorkspaceMember(workspace.ID, member.UserID); err != nil {
				return err
			}
			boards, err := repo.FindBoardsByWorkspace(workspace.ID)
			if err != nil {
				return err
			}
			for _, board := range boards {
				if err := repo.DeleteBoardMember(board.ID, member.UserID); err != nil {
					return err
				}
			}
		}
		return repo.DeleteTeamMember(member.ID)
	})
}

func (s *teamService) UpdateMemberRole(teamID, memberID uint, actor *model.User, req UpdateTeamMemberRoleRequest) (*TeamMemberResource, error) {
	_, _, err := s.requireTeamOwner(teamID, actor)
	if err != nil {
		return nil, err
	}
	member, err := s.repo.FindTeamMemberByID(memberID)
	if err != nil {
		return nil, err
	}
	if member.TeamID != teamID {
		return nil, errors.New("member does not belong to the selected team")
	}
	role := normalizeTeamMemberRole(req.Role)
	if member.Role == "owner" && role != "owner" {
		members, err := s.repo.FindTeamMembers(teamID)
		if err != nil {
			return nil, err
		}
		owners := 0
		for _, item := range members {
			if item.Role == "owner" {
				owners++
			}
		}
		if owners <= 1 {
			return nil, errors.New("team must have at least one owner")
		}
	}
	member.Role = role
	if err := s.repo.UpdateTeamMember(member); err != nil {
		return nil, err
	}
	value := toTeamMemberResource(*member)
	return &value, nil
}

func (s *teamService) CreateWorkspace(teamID uint, actor *model.User, req CreateTeamWorkspaceRequest) (*TeamWorkspaceResource, error) {
	team, _, err := s.requireTeamOwner(teamID, actor)
	if err != nil {
		return nil, err
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, errors.New("workspace name is required")
	}

	var resource *TeamWorkspaceResource
	err = s.repo.WithTransaction(func(repo repository.BoardRepository) error {
		slug := slugPattern.ReplaceAllString(strings.ToLower(name), "-")
		slug = strings.Trim(slug, "-")
		if slug == "" {
			slug = fmt.Sprintf("workspace-%d", time.Now().Unix())
		}
		workspace := &model.Workspace{
			TenantID:    actor.TenantID,
			TeamID:      &team.ID,
			Name:        name,
			Slug:        fmt.Sprintf("%s-%d", slug, time.Now().Unix()),
			Description: strings.TrimSpace(req.Description),
			OwnerID:     actor.ID,
		}
		if err := repo.CreateWorkspace(workspace); err != nil {
			return err
		}
		members, err := repo.FindJoinedTeamMembers(teamID)
		if err != nil {
			return err
		}
		for _, member := range members {
			role := "member"
			if member.Role == "owner" {
				role = "owner"
			}
			if err := repo.CreateWorkspaceMember(&model.WorkspaceMember{
				WorkspaceID: workspace.ID,
				UserID:      member.UserID,
				Role:        role,
			}); err != nil {
				return err
			}
		}
		fresh, err := repo.FindWorkspaceByID(workspace.ID)
		if err != nil {
			return err
		}
		value := toTeamWorkspaceResource(*fresh, nil)
		resource = &value
		return nil
	})
	return resource, err
}

func (s *teamService) ListWorkspaces(teamID uint, actor *model.User) ([]TeamWorkspaceResource, error) {
	_, err := s.requireTeamAccess(teamID, actor)
	if err != nil {
		return nil, err
	}
	workspaces, err := s.repo.FindWorkspacesByTeam(teamID)
	if err != nil {
		return nil, err
	}
	res := make([]TeamWorkspaceResource, 0, len(workspaces))
	for _, workspace := range workspaces {
		res = append(res, toTeamWorkspaceResource(workspace, workspace.Boards))
	}
	return res, nil
}

func (s *teamService) requireTeamAccess(teamID uint, actor *model.User) (*model.Team, error) {
	team, err := s.repo.FindTeamByID(teamID)
	if err != nil {
		return nil, err
	}
	if team.TenantID != actor.TenantID {
		return nil, ErrWorkspaceDenied
	}
	if isAdmin(actor) {
		return team, nil
	}
	for _, member := range team.Members {
		if member.UserID == actor.ID {
			return team, nil
		}
	}
	return nil, ErrWorkspaceDenied
}

func (s *teamService) requireTeamOwner(teamID uint, actor *model.User) (*model.Team, *model.TeamMember, error) {
	team, err := s.repo.FindTeamByID(teamID)
	if err != nil {
		return nil, nil, err
	}
	if team.TenantID != actor.TenantID {
		return nil, nil, ErrWorkspaceDenied
	}
	if isAdmin(actor) {
		member, _ := s.repo.FindTeamMember(teamID, actor.ID)
		return team, member, nil
	}
	for _, member := range team.Members {
		if member.UserID == actor.ID && member.Role == "owner" {
			copyMember := member
			return team, &copyMember, nil
		}
	}
	return nil, nil, ErrWorkspaceDenied
}

func normalizeTeamMemberRole(role string) string {
	if strings.TrimSpace(role) == "owner" {
		return "owner"
	}
	return "member"
}

func toTeamMemberUserResource(user model.User) TeamMemberUserResource {
	role := ""
	if user.Role != nil {
		role = user.Role.DisplayName
	}
	return TeamMemberUserResource{
		ID:          user.ID,
		Name:        user.Name,
		Email:       user.Email,
		DisplayRole: role,
	}
}

func toTeamMemberResource(member model.TeamMember) TeamMemberResource {
	res := TeamMemberResource{
		ID:        member.ID,
		Role:      member.Role,
		User:      toTeamMemberUserResource(member.User),
		JoinedAt:  member.JoinedAt,
		CreatedAt: member.CreatedAt,
		UpdatedAt: member.UpdatedAt,
	}
	if member.Inviter != nil {
		inviter := toTeamMemberUserResource(*member.Inviter)
		res.InvitedBy = &inviter
	}
	return res
}

func toTeamWorkspaceResource(workspace model.Workspace, boards []model.Board) TeamWorkspaceResource {
	res := TeamWorkspaceResource{
		ID:          workspace.ID,
		TeamID:      workspace.TeamID,
		Name:        workspace.Name,
		Slug:        workspace.Slug,
		Description: workspace.Description,
		Owner:       toBoardUserResource(workspace.Owner),
		CreatedAt:   workspace.CreatedAt,
		UpdatedAt:   workspace.UpdatedAt,
	}
	sourceBoards := boards
	if len(sourceBoards) == 0 {
		sourceBoards = workspace.Boards
	}
	for _, board := range sourceBoards {
		res.Boards = append(res.Boards, toBoardSummaryResource(board))
	}
	return res
}

func toTeamResource(team model.Team, includeChildren bool) TeamResource {
	res := TeamResource{
		ID:             team.ID,
		Name:           team.Name,
		Description:    team.Description,
		Avatar:         team.Avatar,
		CreatedBy:      team.CreatedBy,
		Creator:        toTeamMemberUserResource(team.Creator),
		MemberCount:    len(team.Members),
		WorkspaceCount: len(team.Workspaces),
		CreatedAt:      team.CreatedAt,
		UpdatedAt:      team.UpdatedAt,
	}
	if includeChildren {
		for _, member := range team.Members {
			res.Members = append(res.Members, toTeamMemberResource(member))
		}
		for _, workspace := range team.Workspaces {
			res.Workspaces = append(res.Workspaces, toTeamWorkspaceResource(workspace, workspace.Boards))
		}
	}
	return res
}
