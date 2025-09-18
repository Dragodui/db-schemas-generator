package main

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/Dragodui/db-schemas-generator/internal/config"
	"github.com/Dragodui/db-schemas-generator/internal/logger"
	"github.com/Dragodui/db-schemas-generator/internal/repository"
	"github.com/go-chi/chi/v5"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// logger
	logger.Init("app.log")

	// config
	cfg := config.Load()

	// database
	db, err := gorm.Open(postgres.Open(cfg.DB_DSN), &gorm.Config{})
	if err != nil {
		panic(err)
	}

	// repos
	userRepo := repository.NewUserRepository(db)

	// router with test route
	r := chi.NewRouter()
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode("OK")
	})

	// serve server
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatal(err)
	}
}
