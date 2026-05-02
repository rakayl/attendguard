package service

import (
	"errors"
	"time"

	"attendance-system/config"
	"attendance-system/internal/model"
	"attendance-system/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthService interface {
	Login(email, password string) (string, *model.User, error)
	Register(name, email, password string) (*model.User, error)
}

type authService struct {
	userRepo repository.UserRepository
	cfg      *config.Config
}

func NewAuthService(userRepo repository.UserRepository, cfg *config.Config) AuthService {
	return &authService{userRepo, cfg}
}

func (s *authService) Login(email, password string) (string, *model.User, error) {
	user, err := s.userRepo.FindByEmailWithRole(email)
	if err != nil {
		return "", nil, errors.New("invalid credentials")
	}
	if !user.IsActive {
		return "", nil, errors.New("account is deactivated")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return "", nil, errors.New("invalid credentials")
	}
	token, err := s.generateToken(user)
	if err != nil {
		return "", nil, err
	}
	return token, user, nil
}

func (s *authService) Register(name, email, password string) (*model.User, error) {

	// 🔥 STEP 1: cek email dengan error handling benar
	existing, err := s.userRepo.FindByEmail(email)
	if err != nil {
		return nil, err
	}

	if existing != nil {
		return nil, errors.New("email already registered")
	}

	// 🔥 STEP 2: hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// 🔥 STEP 3: create user
	user := &model.User{
		Name:     name,
		Email:    email,
		Password: string(hash),
		IsActive: true,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	return user, nil
}
func (s *authService) generateToken(user *model.User) (string, error) {
	// Embed permission names into token for fast middleware checks
	permNames := user.PermissionNames()

	// Detect system admin: role name == "admin"
	isSystemAdmin := false
	roleName := ""
	if user.Role != nil {
		roleName = user.Role.Name
		isSystemAdmin = user.Role.Name == "admin"
	}

	claims := jwt.MapClaims{
		"user_id":         user.ID,
		"email":           user.Email,
		"role_name":       roleName,
		"is_system_admin": isSystemAdmin,
		"permissions":     permNames,
		"exp":             time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}
