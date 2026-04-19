package service

import (
	"errors"

	"attendance-system/internal/model"
	"attendance-system/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

// ============================================================
// Permission Service
// ============================================================

type CreatePermissionRequest struct {
	Name        string `json:"name" binding:"required"`
	DisplayName string `json:"display_name" binding:"required"`
	Module      string `json:"module" binding:"required"`
	Description string `json:"description"`
}

type UpdatePermissionRequest struct {
	DisplayName string `json:"display_name"`
	Module      string `json:"module"`
	Description string `json:"description"`
}

type PermissionService interface {
	Create(req CreatePermissionRequest) (*model.Permission, error)
	Update(id uint, req UpdatePermissionRequest) (*model.Permission, error)
	Delete(id uint) error
	GetByID(id uint) (*model.Permission, error)
	GetAll() ([]model.Permission, error)
	GetByModule(module string) ([]model.Permission, error)
	GetModules() ([]string, error)
}

type permissionService struct {
	repo repository.PermissionRepository
}

func NewPermissionService(repo repository.PermissionRepository) PermissionService {
	return &permissionService{repo}
}

func (s *permissionService) Create(req CreatePermissionRequest) (*model.Permission, error) {
	if existing, _ := s.repo.FindByName(req.Name); existing != nil {
		return nil, errors.New("permission name already exists")
	}
	p := &model.Permission{
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Module:      req.Module,
		Description: req.Description,
	}
	return p, s.repo.Create(p)
}

func (s *permissionService) Update(id uint, req UpdatePermissionRequest) (*model.Permission, error) {
	p, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("permission not found")
	}
	if req.DisplayName != "" {
		p.DisplayName = req.DisplayName
	}
	if req.Module != "" {
		p.Module = req.Module
	}
	if req.Description != "" {
		p.Description = req.Description
	}
	return p, s.repo.Update(p)
}

func (s *permissionService) Delete(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return errors.New("permission not found")
	}
	return s.repo.Delete(id)
}

func (s *permissionService) GetByID(id uint) (*model.Permission, error) { return s.repo.FindByID(id) }
func (s *permissionService) GetAll() ([]model.Permission, error)         { return s.repo.FindAll() }
func (s *permissionService) GetByModule(module string) ([]model.Permission, error) {
	return s.repo.FindByModule(module)
}
func (s *permissionService) GetModules() ([]string, error) { return s.repo.Modules() }

// ============================================================
// Role Service
// ============================================================

type CreateRoleRequest struct {
	Name          string `json:"name" binding:"required"`
	DisplayName   string `json:"display_name" binding:"required"`
	Description   string `json:"description"`
	PermissionIDs []uint `json:"permission_ids"`
}

type UpdateRoleRequest struct {
	DisplayName   string `json:"display_name"`
	Description   string `json:"description"`
	PermissionIDs []uint `json:"permission_ids"`
}

type RoleService interface {
	Create(req CreateRoleRequest) (*model.Role, error)
	Update(id uint, req UpdateRoleRequest) (*model.Role, error)
	Delete(id uint) error
	GetByID(id uint) (*model.Role, error)
	GetAll() ([]model.Role, error)
	SetPermissions(roleID uint, permIDs []uint) error
}

type roleService struct{ roleRepo repository.RoleRepository }

func NewRoleService(roleRepo repository.RoleRepository) RoleService {
	return &roleService{roleRepo}
}

func (s *roleService) Create(req CreateRoleRequest) (*model.Role, error) {
	if existing, _ := s.roleRepo.FindByName(req.Name); existing != nil {
		return nil, errors.New("role name already exists")
	}
	role := &model.Role{Name: req.Name, DisplayName: req.DisplayName, Description: req.Description}
	if err := s.roleRepo.Create(role); err != nil {
		return nil, err
	}
	if len(req.PermissionIDs) > 0 {
		_ = s.roleRepo.SetPermissions(role.ID, req.PermissionIDs)
	}
	return s.roleRepo.FindWithPermissions(role.ID)
}

func (s *roleService) Update(id uint, req UpdateRoleRequest) (*model.Role, error) {
	role, err := s.roleRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("role not found")
	}
	if req.DisplayName != "" {
		role.DisplayName = req.DisplayName
	}
	if req.Description != "" {
		role.Description = req.Description
	}
	if err := s.roleRepo.Update(role); err != nil {
		return nil, err
	}
	if req.PermissionIDs != nil {
		_ = s.roleRepo.SetPermissions(id, req.PermissionIDs)
	}
	return s.roleRepo.FindWithPermissions(id)
}

func (s *roleService) Delete(id uint) error {
	role, err := s.roleRepo.FindByID(id)
	if err != nil {
		return errors.New("role not found")
	}
	if role.IsSystem {
		return errors.New("system roles cannot be deleted")
	}
	return s.roleRepo.Delete(id)
}

func (s *roleService) GetByID(id uint) (*model.Role, error) {
	return s.roleRepo.FindWithPermissions(id)
}
func (s *roleService) GetAll() ([]model.Role, error) { return s.roleRepo.FindAll() }
func (s *roleService) SetPermissions(roleID uint, permIDs []uint) error {
	return s.roleRepo.SetPermissions(roleID, permIDs)
}

// ============================================================
// User Management Service
// ============================================================

type CreateUserRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	RoleID   *uint  `json:"role_id"`
}

type UpdateUserRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	RoleID   *uint  `json:"role_id"`
	IsActive *bool  `json:"is_active"`
}

type UserManagementService interface {
	Create(req CreateUserRequest) (*model.User, error)
	Update(id uint, req UpdateUserRequest) (*model.User, error)
	Delete(id uint) error
	GetByID(id uint) (*model.User, error)
	GetAll() ([]model.User, error)
	AssignRole(userID uint, roleID *uint) (*model.User, error)
}

type userManagementService struct{ userRepo repository.UserRepository }

func NewUserManagementService(userRepo repository.UserRepository) UserManagementService {
	return &userManagementService{userRepo}
}

func (s *userManagementService) Create(req CreateUserRequest) (*model.User, error) {
	if existing, _ := s.userRepo.FindByEmail(req.Email); existing != nil {
		return nil, errors.New("email already registered")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	user := &model.User{Name: req.Name, Email: req.Email, Password: string(hash), RoleID: req.RoleID, IsActive: true}
	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}
	return s.userRepo.FindByIDWithRole(user.ID)
}

func (s *userManagementService) Update(id uint, req UpdateUserRequest) (*model.User, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("user not found")
	}
	if req.Name != "" {
		user.Name = req.Name
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		user.Password = string(hash)
	}
	if req.RoleID != nil {
		user.RoleID = req.RoleID
	}
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}
	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}
	return s.userRepo.FindByIDWithRole(id)
}

func (s *userManagementService) Delete(id uint) error {
	if _, err := s.userRepo.FindByID(id); err != nil {
		return errors.New("user not found")
	}
	return s.userRepo.Delete(id)
}

func (s *userManagementService) GetByID(id uint) (*model.User, error) {
	return s.userRepo.FindByIDWithRole(id)
}

func (s *userManagementService) GetAll() ([]model.User, error) {
	return s.userRepo.FindAllWithRole()
}

func (s *userManagementService) AssignRole(userID uint, roleID *uint) (*model.User, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}
	user.RoleID = roleID
	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}
	return s.userRepo.FindByIDWithRole(userID)
}
