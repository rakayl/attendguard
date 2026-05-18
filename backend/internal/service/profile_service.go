package service

import (
	"errors"
	"strings"

	"attendance-system/internal/model"
	"attendance-system/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

type ProfileService interface {
	UpdateProfile(userID uint, req UpdateProfileRequest) (*model.User, error)
	ChangePassword(userID uint, req ChangePasswordRequest) error
}

type UpdateProfileRequest struct {
	Name string `json:"name" binding:"required"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=6"`
}

type profileService struct {
	userRepo repository.UserRepository
}

func NewProfileService(userRepo repository.UserRepository) ProfileService {
	return &profileService{userRepo: userRepo}
}

func (s *profileService) UpdateProfile(userID uint, req UpdateProfileRequest) (*model.User, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, errors.New("name is required")
	}

	user.Name = name
	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	return s.userRepo.FindByIDWithRole(user.ID)
}

func (s *profileService) ChangePassword(userID uint, req ChangePasswordRequest) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return errors.New("user not found")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.CurrentPassword)); err != nil {
		return errors.New("current password is incorrect")
	}

	newPassword := strings.TrimSpace(req.NewPassword)
	if len(newPassword) < 6 {
		return errors.New("new password must be at least 6 characters")
	}
	if req.CurrentPassword == req.NewPassword {
		return errors.New("new password must be different from current password")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user.Password = string(hash)
	return s.userRepo.Update(user)
}
