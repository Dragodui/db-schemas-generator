package handler

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/Dragodui/db-schemas-generator/internal/middleware"
	"github.com/Dragodui/db-schemas-generator/internal/model"
	"github.com/Dragodui/db-schemas-generator/internal/repository"
	"github.com/go-chi/chi/v5"
)

func generateShareToken() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

type SchemaHandler struct {
	schemaRepo repository.SchemaRepository
}

func NewSchemaHandler(schemaRepo repository.SchemaRepository) *SchemaHandler {
	return &SchemaHandler{schemaRepo: schemaRepo}
}

type CreateSchemaRequest struct {
	Name     string           `json:"name"`
	Data     model.SchemaData `json:"data"`
	IsPublic bool             `json:"is_public"`
}

type UpdateSchemaRequest struct {
	Name        *string           `json:"name,omitempty"`
	Data        *model.SchemaData `json:"data,omitempty"`
	IsPublic    *bool             `json:"is_public,omitempty"`
	ShareAccess *string           `json:"share_access,omitempty"` // none, view, edit
}

type ShareSchemaRequest struct {
	Access string `json:"access"` // none, view, edit
}

type ShareResponse struct {
	ShareToken  string `json:"share_token"`
	ShareAccess string `json:"share_access"`
	ShareURL    string `json:"share_url"`
}

func (h *SchemaHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req CreateSchemaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, `{"error":"name is required"}`, http.StatusBadRequest)
		return
	}

	schema := &model.Schema{
		UserID:   userID,
		Name:     req.Name,
		Data:     req.Data,
		IsPublic: req.IsPublic,
	}

	if err := h.schemaRepo.Create(schema); err != nil {
		http.Error(w, `{"error":"failed to create schema"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(schema)
}

func (h *SchemaHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, `{"error":"invalid schema id"}`, http.StatusBadRequest)
		return
	}

	schema, err := h.schemaRepo.FindByID(id)
	if err != nil {
		http.Error(w, `{"error":"failed to fetch schema"}`, http.StatusInternalServerError)
		return
	}
	if schema == nil {
		http.Error(w, `{"error":"schema not found"}`, http.StatusNotFound)
		return
	}

	// Check access
	userID, hasUser := middleware.GetUserID(r.Context())
	shareToken := r.URL.Query().Get("token")

	isOwner := hasUser && schema.UserID == userID
	hasValidShareToken := shareToken != "" && schema.ShareToken == shareToken && schema.ShareAccess != "none"

	if !schema.IsPublic && !isOwner && !hasValidShareToken {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}

	// Add access level info to response
	response := struct {
		*model.Schema
		AccessLevel string `json:"access_level"` // owner, edit, view
	}{
		Schema: schema,
	}

	if isOwner {
		response.AccessLevel = "owner"
	} else if hasValidShareToken && schema.ShareAccess == "edit" {
		response.AccessLevel = "edit"
	} else {
		response.AccessLevel = "view"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetByShareToken fetches schema by share token
func (h *SchemaHandler) GetByShareToken(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		http.Error(w, `{"error":"token required"}`, http.StatusBadRequest)
		return
	}

	schema, err := h.schemaRepo.FindByShareToken(token)
	if err != nil {
		http.Error(w, `{"error":"failed to fetch schema"}`, http.StatusInternalServerError)
		return
	}
	if schema == nil || schema.ShareAccess == "none" {
		http.Error(w, `{"error":"schema not found or sharing disabled"}`, http.StatusNotFound)
		return
	}

	response := struct {
		*model.Schema
		AccessLevel string `json:"access_level"`
	}{
		Schema:      schema,
		AccessLevel: schema.ShareAccess,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *SchemaHandler) GetMySchemas(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	schemas, err := h.schemaRepo.FindByUserID(userID)
	if err != nil {
		http.Error(w, `{"error":"failed to fetch schemas"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(schemas)
}

func (h *SchemaHandler) GetPublic(w http.ResponseWriter, r *http.Request) {
	schemas, err := h.schemaRepo.FindPublic()
	if err != nil {
		http.Error(w, `{"error":"failed to fetch schemas"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(schemas)
}

func (h *SchemaHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, `{"error":"invalid schema id"}`, http.StatusBadRequest)
		return
	}

	schema, err := h.schemaRepo.FindByID(id)
	if err != nil {
		http.Error(w, `{"error":"failed to fetch schema"}`, http.StatusInternalServerError)
		return
	}
	if schema == nil {
		http.Error(w, `{"error":"schema not found"}`, http.StatusNotFound)
		return
	}

	// Check access - owner or share token with edit access
	userID, hasUser := middleware.GetUserID(r.Context())
	shareToken := r.URL.Query().Get("token")

	isOwner := hasUser && schema.UserID == userID
	canEdit := shareToken != "" && schema.ShareToken == shareToken && schema.ShareAccess == "edit"

	if !isOwner && !canEdit {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}

	var req UpdateSchemaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Name != nil {
		schema.Name = *req.Name
	}
	if req.Data != nil {
		schema.Data = *req.Data
	}
	// Only owner can change public/share settings
	if isOwner {
		if req.IsPublic != nil {
			schema.IsPublic = *req.IsPublic
		}
		if req.ShareAccess != nil {
			schema.ShareAccess = *req.ShareAccess
		}
	}

	if err := h.schemaRepo.Update(schema); err != nil {
		http.Error(w, `{"error":"failed to update schema"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(schema)
}

// UpdateShare updates sharing settings and generates share token
func (h *SchemaHandler) UpdateShare(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, `{"error":"invalid schema id"}`, http.StatusBadRequest)
		return
	}

	schema, err := h.schemaRepo.FindByID(id)
	if err != nil {
		http.Error(w, `{"error":"failed to fetch schema"}`, http.StatusInternalServerError)
		return
	}
	if schema == nil {
		http.Error(w, `{"error":"schema not found"}`, http.StatusNotFound)
		return
	}

	if schema.UserID != userID {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}

	var req ShareSchemaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Validate access level
	if req.Access != "none" && req.Access != "view" && req.Access != "edit" {
		http.Error(w, `{"error":"invalid access level, must be: none, view, or edit"}`, http.StatusBadRequest)
		return
	}

	schema.ShareAccess = req.Access

	// Generate token if sharing is enabled and no token exists
	if req.Access != "none" && schema.ShareToken == "" {
		schema.ShareToken = generateShareToken()
	}

	// Clear token if sharing is disabled
	if req.Access == "none" {
		schema.ShareToken = ""
	}

	if err := h.schemaRepo.Update(schema); err != nil {
		http.Error(w, `{"error":"failed to update schema"}`, http.StatusInternalServerError)
		return
	}

	response := ShareResponse{
		ShareToken:  schema.ShareToken,
		ShareAccess: schema.ShareAccess,
	}
	if schema.ShareToken != "" {
		response.ShareURL = "/shared/" + schema.ShareToken
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// RegenerateShareToken creates a new share token
func (h *SchemaHandler) RegenerateShareToken(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, `{"error":"invalid schema id"}`, http.StatusBadRequest)
		return
	}

	schema, err := h.schemaRepo.FindByID(id)
	if err != nil {
		http.Error(w, `{"error":"failed to fetch schema"}`, http.StatusInternalServerError)
		return
	}
	if schema == nil {
		http.Error(w, `{"error":"schema not found"}`, http.StatusNotFound)
		return
	}

	if schema.UserID != userID {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}

	schema.ShareToken = generateShareToken()

	if err := h.schemaRepo.Update(schema); err != nil {
		http.Error(w, `{"error":"failed to update schema"}`, http.StatusInternalServerError)
		return
	}

	response := ShareResponse{
		ShareToken:  schema.ShareToken,
		ShareAccess: schema.ShareAccess,
		ShareURL:    "/shared/" + schema.ShareToken,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *SchemaHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, `{"error":"invalid schema id"}`, http.StatusBadRequest)
		return
	}

	if err := h.schemaRepo.Delete(id, userID); err != nil {
		http.Error(w, `{"error":"schema not found or unauthorized"}`, http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
