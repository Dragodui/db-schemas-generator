package service

import (
	"errors"
	"fmt"
	"time"

	"github.com/Dragodui/db-schemas-generator/internal/model"
	"github.com/Dragodui/db-schemas-generator/internal/pkg/security"
	"github.com/Dragodui/db-schemas-generator/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	mailer Mailer
	repo   repository.UserRepository
}

func NewAuthService(repo repository.UserRepository, mailer Mailer) AuthService {
	return AuthService{
		mailer: mailer,
		repo:   repo,
	}
}

func (svc *AuthService) Register(email, password, name, clientURL string) error {
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
		return err
	}

	// Generate unique verify token
	verifyToken, err := svc.generateUniqueToken()
	if err != nil {
		svc.repo.Delete(user.ID) // rollback
		return err
	}

	expiryDate := time.Now().Add(time.Minute * 10)
	if err := svc.repo.SetVerifyToken(email, verifyToken, expiryDate); err != nil {
		svc.repo.Delete(user.ID) // rollback
		return err
	}

	link := fmt.Sprintf("%s/verify?token=%s", clientURL, verifyToken)
	body := fmt.Sprintf("Verify email using <a href=\"%s\">this link</a>", link)

	if err := svc.mailer.Send(email, "Verify your email", body); err != nil {
		svc.repo.Delete(user.ID) // rollback
		return fmt.Errorf("failed to send verification email: %w", err)
	}

	return nil
}

func (svc *AuthService) generateUniqueToken() (string, error) {
	const maxAttempts = 5
	for i := 0; i < maxAttempts; i++ {
		token := security.GenerateVerifyToken()
		exists, err := svc.repo.VerifyTokenExists(token)
		if err != nil {
			return "", err
		}
		if !exists {
			return token, nil
		}
	}
	return "", errors.New("failed to generate unique token")
}

func (svc *AuthService) Login(email, password string) (*model.User, error) {
	user, err := svc.repo.FindByEmail(email)
	if err != nil || user == nil {
		return nil, errors.New("invalid credentials")
	}

	if !user.EmailVerified {
		return nil, errors.New("verify your email first")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	return user, nil
}

func (svc *AuthService) VerifyEmail(token string) error {
	return svc.repo.VerifyEmail(token)
}

func (svc *AuthService) ResendVerification(email, clientURL string) error {
	user, err := svc.repo.FindByEmail(email)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}
	if user.EmailVerified {
		return errors.New("email already verified")
	}

	verifyToken, err := svc.generateUniqueToken()
	if err != nil {
		return err
	}

	expiryDate := time.Now().Add(time.Minute * 10)
	if err := svc.repo.SetVerifyToken(email, verifyToken, expiryDate); err != nil {
		return err
	}

	link := fmt.Sprintf("%s/verify?token=%s", clientURL, verifyToken)
	body := fmt.Sprintf("Verify email using <a href=\"%s\">this link</a>", link)

	if err := svc.mailer.Send(email, "Verify your email", body); err != nil {
		return fmt.Errorf("failed to send verification email: %w", err)
	}

	return nil
}
