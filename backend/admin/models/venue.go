package models

import (
	"database/sql"
	"time"
)

type Venue struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Capacity      int       `json:"capacity"`
	Level         int       `json:"level"`
	QRSecret      string    `json:"qr_secret"`
	IsActive      bool      `json:"is_active"`
	CreatedBy     string    `json:"created_by"`
	SessionTiming string    `json:"session_timing"`
	AvailableDays string    `json:"available_days"`
	StartTime     string    `json:"start_time"`
	EndTime       string    `json:"end_time"`
	TableDetails  string    `json:"table_details"`
	CreatedAt     time.Time `json:"created_at"`
}

func CreateVenue(db *sql.DB, venue Venue) error {
	query := `
		INSERT INTO venues (id, name, capacity, level, qr_secret, is_active, created_by, 
		                   session_timing, available_days, start_time, end_time, table_details)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	
	_, err := db.Exec(query,
		venue.ID,
		venue.Name,
		venue.Capacity,
		venue.Level,
		venue.QRSecret,
		venue.IsActive,
		venue.CreatedBy,
		venue.SessionTiming,
		venue.AvailableDays,
		venue.StartTime,
		venue.EndTime,
		venue.TableDetails,
	)
	return err
}