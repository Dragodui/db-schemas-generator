package config

import (
	"log"
	"os"

	"github.com/lpernett/godotenv"
)

type Config struct {
	DB_DSN    string
	JWTSecret string
	Port      string
	ClientURL string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println(".env file not found, using environment variables")
	}

	cfg := &Config{
		Port:      os.Getenv("PORT"),
		JWTSecret: os.Getenv("JWT_SECRET"),
		DB_DSN:    os.Getenv("DB_DSN"),
		ClientURL: os.Getenv("CLIENT_URL"),
	}

	if cfg.Port == "" {
		cfg.Port = "8000"
	}

	if cfg.ClientURL == "" {
		cfg.ClientURL = "https://localhost:5173"
	}

	return cfg
}
