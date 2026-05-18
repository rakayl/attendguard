package service

import (
	"errors"
	"testing"
	"time"

	"attendance-system/internal/model"
	"attendance-system/internal/repository"
)

type fakeUserRepo struct {
	usersByID    map[uint]*model.User
	usersByEmail map[string]*model.User
}

func (f *fakeUserRepo) FindByEmail(email string) (*model.User, error) {
	user, ok := f.usersByEmail[email]
	if !ok {
		return nil, errors.New("user not found")
	}
	return user, nil
}

func (f *fakeUserRepo) FindByEmailWithRole(email string) (*model.User, error) {
	return f.FindByEmail(email)
}

func (f *fakeUserRepo) Create(user *model.User) error { return nil }
func (f *fakeUserRepo) Update(user *model.User) error { return nil }
func (f *fakeUserRepo) Delete(id uint) error          { return nil }

func (f *fakeUserRepo) FindByID(id uint) (*model.User, error) {
	user, ok := f.usersByID[id]
	if !ok {
		return nil, errors.New("user not found")
	}
	return user, nil
}

func (f *fakeUserRepo) FindByIDWithRole(id uint) (*model.User, error) {
	return f.FindByID(id)
}

func (f *fakeUserRepo) FindAll() ([]model.User, error) {
	items := make([]model.User, 0, len(f.usersByID))
	for _, user := range f.usersByID {
		items = append(items, *user)
	}
	return items, nil
}

func (f *fakeUserRepo) FindAllWithRole() ([]model.User, error) {
	return f.FindAll()
}

type fakeTeamRepo struct {
	*fakeBoardRepo
	users             map[uint]model.User
	teams             map[uint]*model.Team
	teamMembers       map[uint]*model.TeamMember
	workspaces        map[uint]*model.Workspace
	workspaceMembers  []model.WorkspaceMember
	boardMembers      []model.BoardMember
	boardsByWorkspace map[uint][]model.Board
	nextTeamID        uint
	nextMemberID      uint
	nextWorkspaceID   uint
	forceMemberLookup *model.TeamMember
	forceMemberErr    error
}

func newFakeTeamRepo(users ...model.User) *fakeTeamRepo {
	userMap := make(map[uint]model.User, len(users))
	for _, user := range users {
		userMap[user.ID] = user
	}
	return &fakeTeamRepo{
		fakeBoardRepo:     &fakeBoardRepo{},
		users:             userMap,
		teams:             map[uint]*model.Team{},
		teamMembers:       map[uint]*model.TeamMember{},
		workspaces:        map[uint]*model.Workspace{},
		boardsByWorkspace: map[uint][]model.Board{},
		nextTeamID:        1,
		nextMemberID:      1,
		nextWorkspaceID:   1,
	}
}

func (f *fakeTeamRepo) WithTransaction(fn func(repo repository.BoardRepository) error) error {
	return fn(f)
}

func (f *fakeTeamRepo) CreateTeam(team *model.Team) error {
	team.ID = f.nextTeamID
	f.nextTeamID++
	copyTeam := *team
	f.teams[team.ID] = &copyTeam
	return nil
}

func (f *fakeTeamRepo) UpdateTeam(team *model.Team) error {
	copyTeam := *team
	f.teams[team.ID] = &copyTeam
	return nil
}

func (f *fakeTeamRepo) FindTeamByID(id uint) (*model.Team, error) {
	team, ok := f.teams[id]
	if !ok {
		return nil, errors.New("team not found")
	}
	copyTeam := *team
	if creator, ok := f.users[copyTeam.CreatedBy]; ok {
		copyTeam.Creator = creator
	}
	for _, member := range f.teamMembers {
		if member.TeamID != id {
			continue
		}
		copyMember := *member
		if user, ok := f.users[copyMember.UserID]; ok {
			copyMember.User = user
		}
		if copyMember.InvitedBy != nil {
			if inviter, ok := f.users[*copyMember.InvitedBy]; ok {
				copyMember.Inviter = &inviter
			}
		}
		copyTeam.Members = append(copyTeam.Members, copyMember)
	}
	for _, workspace := range f.workspaces {
		if workspace.TeamID == nil || *workspace.TeamID != id {
			continue
		}
		copyWorkspace := *workspace
		if owner, ok := f.users[copyWorkspace.OwnerID]; ok {
			copyWorkspace.Owner = owner
		}
		copyWorkspace.Boards = append([]model.Board(nil), f.boardsByWorkspace[copyWorkspace.ID]...)
		copyTeam.Workspaces = append(copyTeam.Workspaces, copyWorkspace)
	}
	return &copyTeam, nil
}

func (f *fakeTeamRepo) FindTeamsByUser(userID, tenantID uint) ([]model.Team, error) {
	items := []model.Team{}
	for _, member := range f.teamMembers {
		if member.UserID != userID {
			continue
		}
		team, err := f.FindTeamByID(member.TeamID)
		if err != nil {
			continue
		}
		if team.TenantID == tenantID {
			items = append(items, *team)
		}
	}
	return items, nil
}

func (f *fakeTeamRepo) CreateTeamMember(member *model.TeamMember) error {
	member.ID = f.nextMemberID
	f.nextMemberID++
	copyMember := *member
	f.teamMembers[member.ID] = &copyMember
	return nil
}

func (f *fakeTeamRepo) UpdateTeamMember(member *model.TeamMember) error {
	copyMember := *member
	f.teamMembers[member.ID] = &copyMember
	return nil
}

func (f *fakeTeamRepo) FindTeamMemberByID(id uint) (*model.TeamMember, error) {
	member, ok := f.teamMembers[id]
	if !ok {
		return nil, errors.New("team member not found")
	}
	copyMember := *member
	if user, ok := f.users[copyMember.UserID]; ok {
		copyMember.User = user
	}
	return &copyMember, nil
}

func (f *fakeTeamRepo) FindTeamMember(teamID, userID uint) (*model.TeamMember, error) {
	if f.forceMemberLookup != nil || f.forceMemberErr != nil {
		if f.forceMemberErr != nil && f.forceMemberErr.Error() == "team member not found" {
			return nil, nil
		}
		return f.forceMemberLookup, f.forceMemberErr
	}
	for _, member := range f.teamMembers {
		if member.TeamID == teamID && member.UserID == userID {
			copyMember := *member
			if user, ok := f.users[copyMember.UserID]; ok {
				copyMember.User = user
			}
			return &copyMember, nil
		}
	}
	return nil, nil
}

func (f *fakeTeamRepo) FindTeamMembers(teamID uint) ([]model.TeamMember, error) {
	items := []model.TeamMember{}
	for _, member := range f.teamMembers {
		if member.TeamID != teamID {
			continue
		}
		copyMember := *member
		if user, ok := f.users[copyMember.UserID]; ok {
			copyMember.User = user
		}
		items = append(items, copyMember)
	}
	return items, nil
}

func (f *fakeTeamRepo) FindJoinedTeamMembers(teamID uint) ([]model.TeamMember, error) {
	items := []model.TeamMember{}
	for _, member := range f.teamMembers {
		if member.TeamID == teamID && member.JoinedAt != nil {
			copyMember := *member
			items = append(items, copyMember)
		}
	}
	return items, nil
}

func (f *fakeTeamRepo) DeleteTeamMember(id uint) error {
	delete(f.teamMembers, id)
	return nil
}

func (f *fakeTeamRepo) CreateWorkspace(workspace *model.Workspace) error {
	workspace.ID = f.nextWorkspaceID
	f.nextWorkspaceID++
	copyWorkspace := *workspace
	if owner, ok := f.users[workspace.OwnerID]; ok {
		copyWorkspace.Owner = owner
	}
	f.workspaces[workspace.ID] = &copyWorkspace
	return nil
}

func (f *fakeTeamRepo) CreateWorkspaceMember(member *model.WorkspaceMember) error {
	f.workspaceMembers = append(f.workspaceMembers, *member)
	return nil
}

func (f *fakeTeamRepo) DeleteWorkspaceMember(workspaceID, userID uint) error {
	filtered := make([]model.WorkspaceMember, 0, len(f.workspaceMembers))
	for _, member := range f.workspaceMembers {
		if member.WorkspaceID == workspaceID && member.UserID == userID {
			continue
		}
		filtered = append(filtered, member)
	}
	f.workspaceMembers = filtered
	return nil
}

func (f *fakeTeamRepo) FindWorkspaceByID(id uint) (*model.Workspace, error) {
	workspace, ok := f.workspaces[id]
	if !ok {
		return nil, errors.New("workspace not found")
	}
	copyWorkspace := *workspace
	if owner, ok := f.users[copyWorkspace.OwnerID]; ok {
		copyWorkspace.Owner = owner
	}
	copyWorkspace.Boards = append([]model.Board(nil), f.boardsByWorkspace[id]...)
	return &copyWorkspace, nil
}

func (f *fakeTeamRepo) FindWorkspacesByUser(userID, tenantID uint) ([]model.Workspace, error) {
	items := []model.Workspace{}
	for _, member := range f.workspaceMembers {
		if member.UserID != userID {
			continue
		}
		workspace, err := f.FindWorkspaceByID(member.WorkspaceID)
		if err == nil && workspace.TenantID == tenantID {
			items = append(items, *workspace)
		}
	}
	return items, nil
}

func (f *fakeTeamRepo) FindWorkspacesByTeam(teamID uint) ([]model.Workspace, error) {
	items := []model.Workspace{}
	for _, workspace := range f.workspaces {
		if workspace.TeamID != nil && *workspace.TeamID == teamID {
			copyWorkspace := *workspace
			if owner, ok := f.users[copyWorkspace.OwnerID]; ok {
				copyWorkspace.Owner = owner
			}
			copyWorkspace.Boards = append([]model.Board(nil), f.boardsByWorkspace[copyWorkspace.ID]...)
			items = append(items, copyWorkspace)
		}
	}
	return items, nil
}

func (f *fakeTeamRepo) FindBoardsByWorkspace(workspaceID uint) ([]model.Board, error) {
	return append([]model.Board(nil), f.boardsByWorkspace[workspaceID]...), nil
}

func (f *fakeTeamRepo) CreateBoardMember(member *model.BoardMember) error {
	f.boardMembers = append(f.boardMembers, *member)
	return nil
}

func (f *fakeTeamRepo) DeleteBoardMember(boardID, userID uint) error {
	filtered := make([]model.BoardMember, 0, len(f.boardMembers))
	for _, member := range f.boardMembers {
		if member.BoardID == boardID && member.UserID == userID {
			continue
		}
		filtered = append(filtered, member)
	}
	f.boardMembers = filtered
	return nil
}

func TestTeamCreateAutoAddsOwner(t *testing.T) {
	actor := model.User{ID: 1, TenantID: 1, Name: "Manager", Email: "manager@company.test", Role: &model.Role{Name: "manager", DisplayName: "Manager"}}
	repo := newFakeTeamRepo(actor)
	userRepo := &fakeUserRepo{
		usersByID:    map[uint]*model.User{actor.ID: &actor},
		usersByEmail: map[string]*model.User{actor.Email: &actor},
	}
	svc := NewTeamService(repo, userRepo)

	item, err := svc.CreateTeam(&actor, CreateTeamRequest{Name: "Operations Squad", Description: "Daily operations team"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if item.MemberCount != 1 {
		t.Fatalf("expected 1 member, got %d", item.MemberCount)
	}
	if len(item.Members) != 1 || item.Members[0].Role != "owner" {
		t.Fatalf("expected creator to be owner, got %+v", item.Members)
	}
	if item.Members[0].User.ID != actor.ID {
		t.Fatalf("expected owner user id %d, got %d", actor.ID, item.Members[0].User.ID)
	}
}

func TestTeamInviteMemberRequiresOwner(t *testing.T) {
	owner := model.User{ID: 1, TenantID: 1, Name: "Owner", Email: "owner@company.test", Role: &model.Role{Name: "manager", DisplayName: "Manager"}}
	memberUser := model.User{ID: 2, TenantID: 1, Name: "Member", Email: "member@company.test", Role: &model.Role{Name: "employee", DisplayName: "Employee"}}
	target := model.User{ID: 3, TenantID: 1, Name: "Invitee", Email: "invitee@company.test", Role: &model.Role{Name: "employee", DisplayName: "Employee"}}
	repo := newFakeTeamRepo(owner, memberUser, target)
	repo.teams[1] = &model.Team{ID: 1, TenantID: 1, Name: "Ops", CreatedBy: owner.ID}
	now := time.Now()
	repo.teamMembers[1] = &model.TeamMember{ID: 1, TeamID: 1, UserID: owner.ID, Role: "owner", JoinedAt: &now}
	repo.teamMembers[2] = &model.TeamMember{ID: 2, TeamID: 1, UserID: memberUser.ID, Role: "member", JoinedAt: &now}
	userRepo := &fakeUserRepo{
		usersByID: map[uint]*model.User{
			owner.ID:      &owner,
			memberUser.ID: &memberUser,
			target.ID:     &target,
		},
		usersByEmail: map[string]*model.User{
			owner.Email:      &owner,
			memberUser.Email: &memberUser,
			target.Email:     &target,
		},
	}
	svc := NewTeamService(repo, userRepo)

	_, err := svc.InviteMember(1, &memberUser, InviteTeamMemberRequest{Email: target.Email})
	if err == nil {
		t.Fatal("expected non-owner invite to be rejected")
	}
	if !errors.Is(err, ErrWorkspaceDenied) && err.Error() != ErrWorkspaceDenied.Error() {
		t.Fatalf("expected workspace denied error, got %v", err)
	}
}

func TestTeamCreateWorkspacePropagatesJoinedMembers(t *testing.T) {
	owner := model.User{ID: 1, TenantID: 1, Name: "Owner", Email: "owner@company.test", Role: &model.Role{Name: "manager", DisplayName: "Manager"}}
	memberUser := model.User{ID: 2, TenantID: 1, Name: "Member", Email: "member@company.test", Role: &model.Role{Name: "employee", DisplayName: "Employee"}}
	repo := newFakeTeamRepo(owner, memberUser)
	repo.teams[1] = &model.Team{ID: 1, TenantID: 1, Name: "Ops", CreatedBy: owner.ID}
	now := time.Now()
	repo.teamMembers[1] = &model.TeamMember{ID: 1, TeamID: 1, UserID: owner.ID, Role: "owner", JoinedAt: &now}
	repo.teamMembers[2] = &model.TeamMember{ID: 2, TeamID: 1, UserID: memberUser.ID, Role: "member", JoinedAt: &now}
	userRepo := &fakeUserRepo{
		usersByID: map[uint]*model.User{
			owner.ID:      &owner,
			memberUser.ID: &memberUser,
		},
		usersByEmail: map[string]*model.User{
			owner.Email:      &owner,
			memberUser.Email: &memberUser,
		},
	}
	svc := NewTeamService(repo, userRepo)

	item, err := svc.CreateWorkspace(1, &owner, CreateTeamWorkspaceRequest{Name: "Platform Workspace", Description: "Shared board space"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if item.TeamID == nil || *item.TeamID != 1 {
		t.Fatalf("expected team_id=1, got %+v", item.TeamID)
	}
	if len(repo.workspaceMembers) != 2 {
		t.Fatalf("expected 2 workspace members, got %d", len(repo.workspaceMembers))
	}
}

func TestTeamRemoveMemberRejectsLastOwner(t *testing.T) {
	owner := model.User{ID: 1, TenantID: 1, Name: "Owner", Email: "owner@company.test", Role: &model.Role{Name: "manager", DisplayName: "Manager"}}
	repo := newFakeTeamRepo(owner)
	repo.teams[1] = &model.Team{ID: 1, TenantID: 1, Name: "Ops", CreatedBy: owner.ID}
	now := time.Now()
	repo.teamMembers[1] = &model.TeamMember{ID: 1, TeamID: 1, UserID: owner.ID, Role: "owner", JoinedAt: &now}
	userRepo := &fakeUserRepo{
		usersByID:    map[uint]*model.User{owner.ID: &owner},
		usersByEmail: map[string]*model.User{owner.Email: &owner},
	}
	svc := NewTeamService(repo, userRepo)

	err := svc.RemoveMember(1, 1, &owner)
	if err == nil {
		t.Fatal("expected removing last owner to fail")
	}
	if err.Error() != "team must have at least one owner" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestTeamInviteMemberAllowsUserWhenLookupTreatsNotFoundAsEmptyMembership(t *testing.T) {
	owner := model.User{ID: 1, TenantID: 1, Name: "Owner", Email: "owner@company.test", Role: &model.Role{Name: "manager", DisplayName: "Manager"}}
	target := model.User{ID: 3, TenantID: 1, Name: "Invitee", Email: "invitee@company.test", Role: &model.Role{Name: "employee", DisplayName: "Employee"}}
	repo := newFakeTeamRepo(owner, target)
	repo.teams[1] = &model.Team{ID: 1, TenantID: 1, Name: "Ops", CreatedBy: owner.ID}
	now := time.Now()
	repo.teamMembers[1] = &model.TeamMember{ID: 1, TeamID: 1, UserID: owner.ID, Role: "owner", JoinedAt: &now}
	repo.forceMemberErr = errors.New("team member not found")
	userRepo := &fakeUserRepo{
		usersByID: map[uint]*model.User{
			owner.ID:  &owner,
			target.ID: &target,
		},
		usersByEmail: map[string]*model.User{
			owner.Email:  &owner,
			target.Email: &target,
		},
	}
	svc := NewTeamService(repo, userRepo)

	item, err := svc.InviteMember(1, &owner, InviteTeamMemberRequest{Email: target.Email})
	if err != nil {
		t.Fatalf("expected invite to succeed, got %v", err)
	}
	if item == nil || item.User.ID != target.ID {
		t.Fatalf("expected invited user id %d, got %+v", target.ID, item)
	}
}

func TestTeamInviteMemberAllowsUserToJoinAnotherTeam(t *testing.T) {
	owner := model.User{ID: 1, TenantID: 1, Name: "Owner", Email: "owner@company.test", Role: &model.Role{Name: "manager", DisplayName: "Manager"}}
	target := model.User{ID: 3, TenantID: 1, Name: "Invitee", Email: "invitee@company.test", Role: &model.Role{Name: "employee", DisplayName: "Employee"}}
	repo := newFakeTeamRepo(owner, target)
	repo.teams[1] = &model.Team{ID: 1, TenantID: 1, Name: "Ops", CreatedBy: owner.ID}
	repo.teams[2] = &model.Team{ID: 2, TenantID: 1, Name: "Finance", CreatedBy: owner.ID}
	now := time.Now()
	repo.teamMembers[1] = &model.TeamMember{ID: 1, TeamID: 1, UserID: owner.ID, Role: "owner", JoinedAt: &now}
	repo.teamMembers[2] = &model.TeamMember{ID: 2, TeamID: 2, UserID: target.ID, Role: "member", JoinedAt: &now}
	userRepo := &fakeUserRepo{
		usersByID: map[uint]*model.User{
			owner.ID:  &owner,
			target.ID: &target,
		},
		usersByEmail: map[string]*model.User{
			owner.Email:  &owner,
			target.Email: &target,
		},
	}
	svc := NewTeamService(repo, userRepo)

	item, err := svc.InviteMember(1, &owner, InviteTeamMemberRequest{Email: target.Email})
	if err != nil {
		t.Fatalf("expected invite into different team to succeed, got %v", err)
	}
	if item == nil || item.User.ID != target.ID {
		t.Fatalf("expected invited user id %d, got %+v", target.ID, item)
	}
}
