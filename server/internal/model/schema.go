package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

type Schema struct {
	ID         int        `gorm:"autoIncrement;primaryKey" json:"id"`
	UserID     int        `gorm:"not null;index" json:"user_id"`
	Name       string     `gorm:"size:128;not null" json:"name"`
	Data       SchemaData `gorm:"type:jsonb;not null" json:"data"`
	IsPublic   bool       `gorm:"default:false" json:"is_public"`
	ShareToken string     `gorm:"size:64;uniqueIndex" json:"share_token,omitempty"`
	ShareAccess string    `gorm:"size:16;default:none" json:"share_access"` // none, view, edit
	CreatedAt  time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt  time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
}

type SchemaData struct {
	Tables []Table `json:"tables"`
}

type Table struct {
	Name        string       `json:"name"`
	Columns     []Column     `json:"columns"`
	ForeignKeys []ForeignKey `json:"foreignKeys,omitempty"`
	Engine      string       `json:"engine,omitempty"`
	Color       string       `json:"color,omitempty"`
}

type Column struct {
	Name          string   `json:"name"`
	Type          string   `json:"type"`
	PrimaryKey    bool     `json:"primaryKey,omitempty"`
	NotNull       bool     `json:"notNull,omitempty"`
	Unique        bool     `json:"unique,omitempty"`
	Default       *string  `json:"default,omitempty"`
	AutoIncrement bool     `json:"autoIncrement,omitempty"`
	EnumValues    []string `json:"enumValues,omitempty"`
}

type ForeignKey struct {
	Column       string    `json:"column"`
	References   Reference `json:"references"`
	RelationType string    `json:"relationType,omitempty"`
	OnDelete     string    `json:"onDelete,omitempty"`
	OnUpdate     string    `json:"onUpdate,omitempty"`
}

type Reference struct {
	Table  string `json:"table"`
	Column string `json:"column"`
}

func (s SchemaData) Value() (driver.Value, error) {
	return json.Marshal(s)
}

func (s *SchemaData) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, s)
}
