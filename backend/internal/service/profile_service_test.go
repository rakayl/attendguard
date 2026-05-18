package service

import (
	"errors"
	"testing"

	"attendance-system/internal/model"

	"golang.org/x/crypto/bcrypt"
)

type fakeProfileUserRepo struct {
	users map[uint]*model.User
}

func (f *fakeProfileUserRepo) FindByEmail(email string) (*model.User, error) {
	return nil, errors.New("not implemented")
}
func (f *fakeProfileUserRepo) FindByEmailWithRole(email string) (*model.User, error) {
	return nil, errors.New("not implemented")
}
func (f *fakeProfileUserRepo) Create(user *model.User) error { return nil }
func (f *fakeProfileUserRepo) Update(user *model.User) error {
	copyUser := *user
	f.users[user.ID] = &copyUser
	return nil
}
func (f *fakeProfileUserRepo) Delete(id uint) error { return nil }
func (f *fakeProfileUserRepo) FindByID(id uint) (*model.User, error) {
	user, ok := f.users[id]
	if !ok {
		return nil, errors.New("not found")
	}
	copyUser := *user
	return &copyUser, nil
}
func (f *fakeProfileUserRepo) FindByIDWithRole(id uint) (*model.User, error) {
	return f.FindByID(id)
}
func (f *fakeProfileUserRepo) FindAll() ([]model.User, error)         { return nil, nil }
func (f *fakeProfileUserRepo) FindAllWithRole() ([]model.User, error) { return nil, nil }

func TestUpdateProfileTrimsAndPersistsName(t *testing.T) {
	repo := &fakeProfileUserRepo{
		users: map[uint]*model.User{
			7: {ID: 7, Name: "Old Name", Email: "user@example.com", Role: &model.Role{Name: "employee"}},
		},
	}
	svc := NewProfileService(repo)

	user, err := svc.UpdateProfile(7, UpdateProfileRequest{Name: "  New Name  "})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if user.Name != "New Name" {
		t.Fatalf("expected trimmed name, got %q", user.Name)
	}
}

func TestChangePasswordRejectsWrongCurrentPassword(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("oldpass"), bcrypt.DefaultCost)
	repo := &fakeProfileUserRepo{
		users: map[uint]*model.User{
			9: {ID: 9, Password: string(hash)},
		},
	}
	svc := NewProfileService(repo)

	err := svc.ChangePassword(9, ChangePasswordRequest{
		CurrentPassword: "wrongpass",
		NewPassword:     "newpass123",
	})
	if err == nil {
		t.Fatal("expected error for wrong current password")
	}
}

func TestChangePasswordUpdatesHash(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("oldpass"), bcrypt.DefaultCost)
	repo := &fakeProfileUserRepo{
		users: map[uint]*model.User{
			9: {ID: 9, Password: string(hash)},
		},
	}
	svc := NewProfileService(repo)

	err := svc.ChangePassword(9, ChangePasswordRequest{
		CurrentPassword: "oldpass",
		NewPassword:     "newpass123",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	updated := repo.users[9]
	if bcrypt.CompareHashAndPassword([]byte(updated.Password), []byte("newpass123")) != nil {
		t.Fatal("expected password hash to be updated")
	}
}
