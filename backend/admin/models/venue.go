package models

import (
	"database/sql"
	"time"
	
)

type Venue struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Capacity  int    `json:"capacity"`
	Level     int    `json:"level"`
	QRSecret  string `json:"qr_secret"`
	IsActive  bool   `json:"is_active"`
	CreatedBy string `json:"created_by"`
	SessionTiming string `json:"session_timing"`
	AvailableDays string `json:"available_days"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
	TableDetails  string `json:"table_details"`
}

func CreateVenue(db *sql.DB, v Venue) error {
	_, err := db.Exec(
		`INSERT INTO venues 
		(id, name, capacity, level, qr_secret, is_active, created_by, session_timing, table_details, created_at) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		v.ID, v.Name, v.Capacity, v.Level, v.QRSecret, v.IsActive, v.CreatedBy, v.SessionTiming, v.TableDetails, time.Now(),
	)
	return err
}