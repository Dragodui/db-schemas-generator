package config

import (
	"log"
	"os"
	"strconv"

	"github.com/lpernett/godotenv"
)

type Config struct {
	DB_DSN     string
	JWTSecret  string
	Port       string
	ClientURL  string
	SMTPConfig SMTPConfig
}

type SMTPConfig struct {
	Host string
	Port int
	User string
	Pass string
	From string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println(".env file not found, using environment variables")
	}

	smtpPort, err := strconv.Atoi(os.Getenv("SMTP_PORT"))
	if err != nil {
		log.Fatalf("SMTP Port must be an int")
	}

	cfg := &Config{
		Port:      os.Getenv("PORT"),
		JWTSecret: os.Getenv("JWT_SECRET"),
		DB_DSN:    os.Getenv("DB_DSN"),
		ClientURL: os.Getenv("CLIENT_URL"),
		SMTPConfig: SMTPConfig{
			User: os.Getenv("SMTP_USER"),
			Pass: os.Getenv("SMTP_PASS"),
			Host: os.Getenv("SMTP_HOST"),
			Port: smtpPort,
			From: os.Getenv("SMTP_FROM"),
		},
	}

	if cfg.Port == "" {
		cfg.Port = "8000"
	}

	if cfg.ClientURL == "" {
		cfg.ClientURL = "https://localhost:5173"
	}

	return cfg
}
