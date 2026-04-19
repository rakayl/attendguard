package repository

import (
	"attendance-system/internal/model"
	"gorm.io/gorm"
)

// ---- Permission Repository ----

type PermissionRepository interface {
	Create(p *model.Permission) error
	Update(p *model.Permission) error
	Delete(id uint) error
	FindByID(id uint) (*model.Permission, error)
	FindAll() ([]model.Permission, error)
	FindByModule(module string) ([]model.Permission, error)
	FindByName(name string) (*model.Permission, error)
	Modules() ([]string, error)
}

type permissionRepository struct{ db *gorm.DB }

func NewPermissionRepository(db *gorm.DB) PermissionRepository {
	return &permissionRepository{db}
}

func (r *permissionRepository) Create(p *model.Permission) error {
	return r.db.Create(p).Error
}
func (r *permissionRepository) Update(p *model.Permission) error {
	return r.db.Save(p).Error
}
func (r *permissionRepository) Delete(id uint) error {
	// remove from join table first
	if err := r.db.Exec("DELETE FROM role_permissions WHERE permission_id = ?", id).Error; err != nil {
		return err
	}
	return r.db.Delete(&model.Permission{}, id).Error
}
func (r *permissionRepository) FindByID(id uint) (*model.Permission, error) {
	var p model.Permission
	return &p, r.db.First(&p, id).Error
}
func (r *permissionRepository) FindAll() ([]model.Permission, error) {
	var list []model.Permission
	return list, r.db.Order("module, name").Find(&list).Error
}
func (r *permissionRepository) FindByModule(module string) ([]model.Permission, error) {
	var list []model.Permission
	return list, r.db.Where("module = ?", module).Order("name").Find(&list).Error
}
func (r *permissionRepository) FindByName(name string) (*model.Permission, error) {
	var p model.Permission
	return &p, r.db.Where("name = ?", name).First(&p).Error
}
func (r *permissionRepository) Modules() ([]string, error) {
	var modules []string
	return modules, r.db.Model(&model.Permission{}).Distinct("module").Pluck("module", &modules).Error
}

// ---- Role Repository ----

type RoleRepository interface {
	Create(r *model.Role) error
	Update(r *model.Role) error
	Delete(id uint) error
	FindByID(id uint) (*model.Role, error)
	FindAll() ([]model.Role, error)
	FindByName(name string) (*model.Role, error)
	SetPermissions(roleID uint, permIDs []uint) error
	FindWithPermissions(id uint) (*model.Role, error)
}

type roleRepository struct{ db *gorm.DB }

func NewRoleRepository(db *gorm.DB) RoleRepository {
	return &roleRepository{db}
}

func (r *roleRepository) Create(role *model.Role) error {
	return r.db.Create(role).Error
}
func (r *roleRepository) Update(role *model.Role) error {
	return r.db.Save(role).Error
}
func (r *roleRepository) Delete(id uint) error {
	role, err := r.FindByID(id)
	if err != nil {
		return err
	}
	if role.IsSystem {
		return gorm.ErrInvalidData
	}
	// Remove all role-permission associations
	if err := r.db.Exec("DELETE FROM role_permissions WHERE role_id = ?", id).Error; err != nil {
		return err
	}
	// Nullify users that had this role
	if err := r.db.Model(&model.User{}).Where("role_id = ?", id).Update("role_id", nil).Error; err != nil {
		return err
	}
	return r.db.Delete(&model.Role{}, id).Error
}
func (r *roleRepository) FindByID(id uint) (*model.Role, error) {
	var role model.Role
	return &role, r.db.First(&role, id).Error
}
func (r *roleRepository) FindAll() ([]model.Role, error) {
	var list []model.Role
	return list, r.db.Preload("Permissions").Order("id").Find(&list).Error
}
func (r *roleRepository) FindByName(name string) (*model.Role, error) {
	var role model.Role
	return &role, r.db.Where("name = ?", name).First(&role).Error
}
func (r *roleRepository) SetPermissions(roleID uint, permIDs []uint) error {
	// Clear existing
	if err := r.db.Exec("DELETE FROM role_permissions WHERE role_id = ?", roleID).Error; err != nil {
		return err
	}
	if len(permIDs) == 0 {
		return nil
	}
	// Bulk insert
	rows := make([]model.RolePermission, 0, len(permIDs))
	for _, pid := range permIDs {
		rows = append(rows, model.RolePermission{RoleID: roleID, PermissionID: pid})
	}
	return r.db.Create(&rows).Error
}
func (r *roleRepository) FindWithPermissions(id uint) (*model.Role, error) {
	var role model.Role
	return &role, r.db.Preload("Permissions").First(&role, id).Error
}
