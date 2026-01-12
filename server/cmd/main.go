package main

import (
	"log"
	"net/http"

	"github.com/Dragodui/db-schemas-generator/internal/config"
	"github.com/Dragodui/db-schemas-generator/internal/handler"
	"github.com/Dragodui/db-schemas-generator/internal/logger"
	"github.com/Dragodui/db-schemas-generator/internal/middleware"
	"github.com/Dragodui/db-schemas-generator/internal/model"
	"github.com/Dragodui/db-schemas-generator/internal/repository"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
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

	// auto migrate
	if err := db.AutoMigrate(&model.User{}, &model.Schema{}); err != nil {
		log.Fatal("failed to migrate:", err)
	}

	// repos
	userRepo := repository.NewUserRepository(db)
	schemaRepo := repository.NewSchemaRepository(db)

	// handlers
	authHandler := handler.NewAuthHandler(userRepo, cfg.JWTSecret)
	schemaHandler := handler.NewSchemaHandler(schemaRepo)
	exportHandler := handler.NewExportHandler(schemaRepo)

	// router
	r := chi.NewRouter()

	// middleware
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.ClientURL, "http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Content-Disposition"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	// public routes
	r.Route("/api", func(r chi.Router) {
		// auth routes
		r.Post("/auth/register", authHandler.Register)
		r.Post("/auth/login", authHandler.Login)

		// public schemas
		r.Get("/schemas/public", schemaHandler.GetPublic)

		// export without auth (direct)
		r.Post("/export", exportHandler.ExportDirect)

		// protected routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTAuth(cfg.JWTSecret))

			// auth
			r.Get("/auth/me", authHandler.Me)

			// schemas CRUD
			r.Post("/schemas", schemaHandler.Create)
			r.Get("/schemas", schemaHandler.GetMySchemas)
			r.Get("/schemas/{id}", schemaHandler.GetByID)
			r.Put("/schemas/{id}", schemaHandler.Update)
			r.Delete("/schemas/{id}", schemaHandler.Delete)

			// export
			r.Get("/schemas/{id}/export", exportHandler.ExportSchema)
			r.Get("/schemas/{id}/download", exportHandler.DownloadExport)
		})
	})

	// serve server
	log.Printf("Server starting on port %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatal(err)
	}
}
