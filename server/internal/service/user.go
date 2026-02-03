package service

import (
	"github.com/Dragodui/db-schemas-generator/internal/model"
	"github.com/Dragodui/db-schemas-generator/internal/repository"
)

type UserService struct {
	repo repository.UserRepository
}

func NewUserService(repo repository.UserRepository) UserService {
	return UserService{
		repo: repo,
	}
}

func (svc *UserService) FindByEmail(email string) (*model.User, error) {
	return svc.repo.FindByEmail(email)
}

func (svc *UserService) FindByID(id int) (*model.User, error) {
	return svc.repo.FindByID(id)
}

func (svc *UserService) FindByName(name string) (*model.User, error) {
	return svc.repo.FindByName(name)
}
