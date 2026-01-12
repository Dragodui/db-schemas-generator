package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/Dragodui/db-schemas-generator/internal/exporter"
	"github.com/Dragodui/db-schemas-generator/internal/middleware"
	"github.com/Dragodui/db-schemas-generator/internal/model"
	"github.com/Dragodui/db-schemas-generator/internal/repository"
	"github.com/go-chi/chi/v5"
)

type ExportHandler struct {
	schemaRepo repository.SchemaRepository
}

func NewExportHandler(schemaRepo repository.SchemaRepository) *ExportHandler {
	return &ExportHandler{schemaRepo: schemaRepo}
}

type ExportRequest struct {
	Data   model.SchemaData `json:"data"`
	Format string           `json:"format"`
}

type ExportResponse struct {
	SQL    string `json:"sql"`
	Format string `json:"format"`
}

// ExportSchema exports a saved schema by ID
func (h *ExportHandler) ExportSchema(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, `{"error":"invalid schema id"}`, http.StatusBadRequest)
		return
	}

	format := r.URL.Query().Get("format")
	if format == "" {
		format = "postgres"
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
	if !schema.IsPublic && (!hasUser || schema.UserID != userID) {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}

	sql, err := exporter.Export(schema.Data, exporter.ExportFormat(format))
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ExportResponse{SQL: sql, Format: format})
}

// ExportDirect exports schema data directly without saving
func (h *ExportHandler) ExportDirect(w http.ResponseWriter, r *http.Request) {
	var req ExportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Format == "" {
		req.Format = "postgres"
	}

	sql, err := exporter.Export(req.Data, exporter.ExportFormat(req.Format))
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ExportResponse{SQL: sql, Format: req.Format})
}

// DownloadExport returns SQL as downloadable file
func (h *ExportHandler) DownloadExport(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, `{"error":"invalid schema id"}`, http.StatusBadRequest)
		return
	}

	format := r.URL.Query().Get("format")
	if format == "" {
		format = "postgres"
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
	if !schema.IsPublic && (!hasUser || schema.UserID != userID) {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}

	sql, err := exporter.Export(schema.Data, exporter.ExportFormat(format))
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	ext := "sql"
	if format == "mongo" {
		ext = "js"
	}

	filename := schema.Name + "_" + format + "." + ext
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", "attachment; filename=\""+filename+"\"")
	w.Write([]byte(sql))
}
