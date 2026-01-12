package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/Dragodui/db-schemas-generator/internal/middleware"
	"github.com/Dragodui/db-schemas-generator/internal/model"
	"github.com/Dragodui/db-schemas-generator/internal/repository"
	"github.com/go-chi/chi/v5"
)

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
	Name     *string           `json:"name,omitempty"`
	Data     *model.SchemaData `json:"data,omitempty"`
	IsPublic *bool             `json:"is_public,omitempty"`
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

	// Check access: public schemas or owned by user
	userID, hasUser := middleware.GetUserID(r.Context())
	if !schema.IsPublic && (!hasUser || schema.UserID != userID) {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(schema)
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
	if req.IsPublic != nil {
		schema.IsPublic = *req.IsPublic
	}

	if err := h.schemaRepo.Update(schema); err != nil {
		http.Error(w, `{"error":"failed to update schema"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(schema)
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
