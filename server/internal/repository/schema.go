package repository

import (
	"errors"

	"github.com/Dragodui/db-schemas-generator/internal/model"
	"gorm.io/gorm"
)

type SchemaRepository interface {
	Create(s *model.Schema) error
	FindByID(id int) (*model.Schema, error)
	FindByUserID(userID int) ([]model.Schema, error)
	FindPublic() ([]model.Schema, error)
	Update(s *model.Schema) error
	Delete(id int, userID int) error
}

type schemaRepo struct {
	db *gorm.DB
}

func NewSchemaRepository(db *gorm.DB) SchemaRepository {
	return &schemaRepo{db: db}
}

func (r *schemaRepo) Create(s *model.Schema) error {
	return r.db.Create(s).Error
}

func (r *schemaRepo) FindByID(id int) (*model.Schema, error) {
	var s model.Schema
	err := r.db.Where("id = ?", id).First(&s).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &s, err
}

func (r *schemaRepo) FindByUserID(userID int) ([]model.Schema, error) {
	var schemas []model.Schema
	err := r.db.Where("user_id = ?", userID).Order("updated_at DESC").Find(&schemas).Error
	return schemas, err
}

func (r *schemaRepo) FindPublic() ([]model.Schema, error) {
	var schemas []model.Schema
	err := r.db.Where("is_public = ?", true).Order("updated_at DESC").Find(&schemas).Error
	return schemas, err
}

func (r *schemaRepo) Update(s *model.Schema) error {
	return r.db.Save(s).Error
}

func (r *schemaRepo) Delete(id int, userID int) error {
	result := r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&model.Schema{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("schema not found or unauthorized")
	}
	return nil
}
