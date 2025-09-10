// backend/admin/controllers/session_config_controller.go
package controllers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	// "time"

	"gd/database"

	"github.com/google/uuid"
)

type SessionConfig struct {
	PrepTime     int `json:"prep_time"`
	Discussion   int `json:"discussion"`
	Survey       int `json:"survey"`
	Level        int `json:"level"`
	VenueID      string `json:"venue_id"`
	SurveyWeights map[string]float64 `json:"survey_weights"`
}
type SessionRequest struct {
	VenueID       string                 `json:"venue_id"`
	Level         int                    `json:"level"`
	StartTime     time.Time              `json:"start_time"`
	EndTime       time.Time              `json:"end_time"`
	Agenda        map[string]interface{} `json:"agenda"`
	SurveyWeights map[string]float64     `json:"survey_weights"`
}
func CreateBulkSessions(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Sessions []SessionRequest `json:"sessions"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
		return
	}

	if len(request.Sessions) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "No sessions provided"})
		return
	}

	tx, err := database.GetDB().Begin()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	defer tx.Rollback()

	var createdSessions []map[string]interface{}

	for _, session := range request.Sessions {
		sessionID := uuid.New().String()
		
		agendaJSON, err := json.Marshal(session.Agenda)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to marshal agenda"})
			return
		}

		surveyWeightsJSON, err := json.Marshal(session.SurveyWeights)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to marshal survey weights"})
			return
		}

		_, err = tx.Exec(`
			INSERT INTO gd_sessions 
			(id, venue_id, level, start_time, end_time, agenda, survey_weights, status) 
			VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
			sessionID,
			session.VenueID,
			session.Level,
			session.StartTime,
			session.EndTime,
			agendaJSON,
			surveyWeightsJSON,
		)

		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create session: " + err.Error()})
			return
		}

		createdSessions = append(createdSessions, map[string]interface{}{
			"id":         sessionID,
			"venue_id":   session.VenueID,
			"start_time": session.StartTime,
			"end_time":   session.EndTime,
		})
	}

	if err := tx.Commit(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to commit transaction"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   "success",
		"sessions": createdSessions,
	})
}


func GetSessionRules(w http.ResponseWriter, r *http.Request) {
    sessionID := r.URL.Query().Get("session_id")
    if sessionID == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "session_id is required"})
        return
    }

    // Get session details including agenda
    var agendaJSON []byte
    err := database.GetDB().QueryRow(`
        SELECT agenda FROM gd_sessions WHERE id = ?`,
        sessionID,
    ).Scan(&agendaJSON)

    if err != nil {
        if err == sql.ErrNoRows {
            w.WriteHeader(http.StatusNotFound)
            json.NewEncoder(w).Encode(map[string]string{"error": "Session not found"})
        } else {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        }
        return
    }

    // Parse agenda with defaults
    var agenda struct {
        PrepTime   int `json:"prep_time"`
        Discussion int `json:"discussion"`
        Survey     int `json:"survey"`
    }
    
    // Set default values
    agenda.PrepTime = 1
    agenda.Discussion = 1
    agenda.Survey = 5
    
    if len(agendaJSON) > 0 {
        if err := json.Unmarshal(agendaJSON, &agenda); err != nil {
            log.Printf("Error parsing agenda JSON: %v", err)
            // Use defaults if parsing fails
        }
    }

    response := map[string]interface{}{
        "prep_time":       agenda.PrepTime,
        "discussion_time": agenda.Discussion,
        "survey_time":      agenda.Survey,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}




func UpdateSessionRules(w http.ResponseWriter, r *http.Request) {
    var request struct {
        SessionID string `json:"session_id"`
        PrepTime  int    `json:"prep_time"`
        Discussion int   `json:"discussion_time"`
        Survey    int    `json:"survey_time"`
    }

    if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
        return
    }

    // Create new agenda
    newAgenda := map[string]int{
        "prep_time":  request.PrepTime,
        "discussion": request.Discussion,
        "survey":     request.Survey,
    }

    agendaJSON, err := json.Marshal(newAgenda)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create agenda"})
        return
    }

    // Calculate total duration
    totalMinutes := request.PrepTime + request.Discussion + request.Survey

    // Update session with new agenda and recalculated end time
    _, err = database.GetDB().Exec(`
        UPDATE gd_sessions 
        SET agenda = ?,
            end_time = DATE_ADD(start_time, INTERVAL ? MINUTE)
        WHERE id = ?`,
        string(agendaJSON),
        totalMinutes,
        request.SessionID,
    )

    if err != nil {
        log.Printf("Error updating session rules: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update rules"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}



func GetSessions(w http.ResponseWriter, r *http.Request) {
    rows, err := database.GetDB().Query(`
        SELECT id, venue_id, level, start_time, end_time, agenda, status 
        FROM gd_sessions 
        ORDER BY created_at DESC
    `)
    
    if err != nil {
        log.Printf("Database error fetching sessions: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }
    defer rows.Close()

    var sessions []map[string]interface{}
    for rows.Next() {
        var session struct {
            ID        string
            VenueID   string
            Level     int
            StartTime string
            EndTime   string
            AgendaJSON []byte
            Status    string
        }
        
        if err := rows.Scan(&session.ID, &session.VenueID, &session.Level, 
            &session.StartTime, &session.EndTime, &session.AgendaJSON, &session.Status); err != nil {
            log.Printf("Error scanning session row: %v", err)
            continue
        }

        var agenda map[string]interface{}
        if len(session.AgendaJSON) > 0 {
            if err := json.Unmarshal(session.AgendaJSON, &agenda); err != nil {
                log.Printf("Error unmarshaling agenda JSON: %v", err)
                agenda = map[string]interface{}{
                    "prep_time": 0,
                    "discussion": 0,
                    "survey": 0,
                }
            }
        } else {
            agenda = map[string]interface{}{
                "prep_time": 0,
                "discussion": 0,
                "survey": 0,
            }
        }

        sessions = append(sessions, map[string]interface{}{
            "id":         session.ID,
            "venue_id":   session.VenueID,
            "level":      session.Level,
            "start_time": session.StartTime,
            "end_time":   session.EndTime,
            "agenda":     agenda,
            "status":     session.Status,
        })
    }

    if err := rows.Err(); err != nil {
        log.Printf("Row iteration error: %v", err)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(sessions)
}