package models

import (
	"database/sql"
	"encoding/json"
	"time"
)

type Session struct {
	ID            string             `json:"id"`
	VenueID       string             `json:"venue_id"`
	Level         int                `json:"level"`
	StartTime     time.Time          `json:"start_time"`
	Agenda        map[string]int     `json:"agenda"`
	SurveyWeights map[string]float64 `json:"survey_weights"`
}

func BulkCreateSessions(db *sql.DB, sessions []Session) error {
	tx, _ := db.Begin()
	for _, s := range sessions {
		agendaJSON, _ := json.Marshal(s.Agenda)
		weightsJSON, _ := json.Marshal(s.SurveyWeights)

		_, err := tx.Exec(
			`INSERT INTO gd_sessions 
            (id, venue_id, level, start_time, end_time, agenda, survey_weights) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
			s.ID, s.VenueID, s.Level, s.StartTime,
			s.StartTime.Add(time.Minute*30), agendaJSON, weightsJSON,
		)
		if err != nil {
			tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}