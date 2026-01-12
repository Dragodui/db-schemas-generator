package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/Dragodui/db-schemas-generator/internal/middleware"
	"github.com/Dragodui/db-schemas-generator/internal/model"
	"github.com/Dragodui/db-schemas-generator/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo  repository.UserRepository
	jwtSecret string
}

func NewAuthHandler(userRepo repository.UserRepository, jwtSecret string) *AuthHandler {
	return &AuthHandler{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
	}
}

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  *model.User `json:"user"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.Email == "" || req.Password == "" {
		http.Error(w, `{"error":"name, email, and password are required"}`, http.StatusBadRequest)
		return
	}

	existing, _ := h.userRepo.FindByEmail(req.Email)
	if existing != nil {
		http.Error(w, `{"error":"email already registered"}`, http.StatusConflict)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, `{"error":"failed to hash password"}`, http.StatusInternalServerError)
		return
	}

	user := &model.User{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hash),
	}

	if err := h.userRepo.Create(user); err != nil {
		http.Error(w, `{"error":"failed to create user"}`, http.StatusInternalServerError)
		return
	}

	token, err := h.generateToken(user.ID)
	if err != nil {
		http.Error(w, `{"error":"failed to generate token"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(AuthResponse{Token: token, User: user})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		http.Error(w, `{"error":"email and password are required"}`, http.StatusBadRequest)
		return
	}

	user, err := h.userRepo.FindByEmail(req.Email)
	if err != nil || user == nil {
		http.Error(w, `{"error":"invalid credentials"}`, http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		http.Error(w, `{"error":"invalid credentials"}`, http.StatusUnauthorized)
		return
	}

	token, err := h.generateToken(user.ID)
	if err != nil {
		http.Error(w, `{"error":"failed to generate token"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AuthResponse{Token: token, User: user})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	user, err := h.userRepo.FindByID(userID)
	if err != nil || user == nil {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *AuthHandler) generateToken(userID int) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(24 * 7 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.jwtSecret))
}
