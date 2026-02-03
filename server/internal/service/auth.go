package service

import (
	"errors"

	"github.com/Dragodui/db-schemas-generator/internal/model"
	"github.com/Dragodui/db-schemas-generator/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	repo repository.UserRepository
}

func NewAuthService(repo repository.UserRepository) AuthService {
	return AuthService{
		repo: repo,
	}
}

func (svc *AuthService) Register(email, password, name string) error {
	existing, _ := svc.repo.FindByEmail(email)
	if existing != nil {
		return errors.New("email already registered")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("failed to hash password")
	}

	user := &model.User{
		Name:         name,
		Email:        email,
		PasswordHash: string(hash),
	}

	if err := svc.repo.Create(user); err != nil {
		return errors.New("failed to create user")
	}

	// TODO: implement sending email
	// if err := svc.repo.

	return nil
}

func (svc *AuthService) Login(email, password string) (*model.User, error) {
	user, err := svc.repo.FindByEmail(email)
	if err != nil || user == nil {
		return nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	return user, nil

}
