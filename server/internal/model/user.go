package model

import "time"

type User struct {
	ID              int        `gorm:"autoIncrement; primaryKey" json:"id"`
	Email           string     `gorm:"size:64;not null;unique" json:"email"`
	EmailVerified   bool       `db:"email_verified"`
	VerifyToken     *string    `db:"verify_token"`
	VerifyExpiresAt *time.Time `db:"verify_expires_at"`
	ResetToken      *string    `db:"reset_token"`
	ResetExpiresAt  *time.Time `db:"reset_expires_at"`
	Name            string     `gorm:"size:64;not null" json:"name"`
	PasswordHash    string     `gorm:"not null" json:"-"`
	CreatedAt       time.Time  `gorm:"autoCreateTime" json:"created_at"`
}
