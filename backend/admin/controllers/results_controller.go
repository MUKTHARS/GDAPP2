package controllers

import (
	// "database/sql"
	"encoding/json"
	"gd/database"
	"log"
	"net/http"
	"sort"
	"strconv"
	"time"
)

func GetTopParticipants(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    levelStr := r.URL.Query().Get("level")
    var level int
    var err error
    
    if levelStr != "" {
        level, err = strconv.Atoi(levelStr)
        if err != nil {
            w.WriteHeader(http.StatusBadRequest)
            json.NewEncoder(w).Encode(map[string]string{"error": "Invalid level parameter"})
            return
        }
    }

    // Updated query to include venue name and properly format time
    query := `
        SELECT 
            sr.session_id,
            s.level as session_level,
            sr.responder_id as id,
            su.full_name as name,
            su.current_gd_level as student_level,
            COUNT(DISTINCT sr.session_id) as session_count,
            SUM(sr.score) as total_score,
            AVG(sr.score) as avg_score,
            s.start_time as session_date,
            v.name as venue_name,
            DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i:%s') as formatted_time
        FROM survey_results sr
        JOIN student_users su ON sr.responder_id = su.id
        JOIN gd_sessions s ON sr.session_id = s.id
        LEFT JOIN venues v ON s.venue_id = v.id
        WHERE su.is_active = TRUE AND sr.is_completed = TRUE
    `

    if level > 0 {
        query += " AND s.level = " + strconv.Itoa(level)
    }

    query += `
        GROUP BY sr.session_id, sr.responder_id, su.full_name, su.current_gd_level, 
                 s.level, s.start_time, v.name
        ORDER BY s.start_time DESC, total_score DESC
    `

    rows, err := database.GetDB().Query(query)
    if err != nil {
        log.Printf("Error fetching top participants: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }
    defer rows.Close()

    type TopParticipant struct {
        SessionID     string    `json:"session_id"`
        SessionLevel  int       `json:"session_level"`
        ID            string    `json:"id"`
        Name          string    `json:"name"`
        StudentLevel  int       `json:"student_level"`
        SessionCount  int       `json:"session_count"`
        TotalScore    float64   `json:"total_score"`
        AvgScore      float64   `json:"avg_score"`
        SessionDate   time.Time `json:"session_date"`
        VenueName     string    `json:"venue_name"` // Add venue name field
        FormattedTime string    `json:"formatted_time"` // Add formatted time field
    }

    var allResults []TopParticipant
    for rows.Next() {
        var r TopParticipant
        var dateStr string
        if err := rows.Scan(&r.SessionID, &r.SessionLevel, &r.ID, &r.Name, 
            &r.StudentLevel, &r.SessionCount, &r.TotalScore, &r.AvgScore, 
            &dateStr, &r.VenueName, &r.FormattedTime); err != nil {
            log.Printf("Error scanning result: %v", err)
            continue
        }
        
        // Parse the date string
        if parsedTime, err := time.Parse("2006-01-02 15:04:05", dateStr); err == nil {
            r.SessionDate = parsedTime
        } else {
            r.SessionDate = time.Now()
        }
        
        allResults = append(allResults, r)
    }

    // Group results by session
    sessions := make(map[string]map[string]interface{})
    for _, result := range allResults {
        sessionID := result.SessionID
        
        if sessions[sessionID] == nil {
            sessions[sessionID] = make(map[string]interface{})
            sessions[sessionID]["session_id"] = sessionID
            sessions[sessionID]["session_level"] = result.SessionLevel
            sessions[sessionID]["session_date"] = result.SessionDate
            sessions[sessionID]["venue_name"] = result.VenueName // Add venue name
            sessions[sessionID]["formatted_time"] = result.FormattedTime // Add formatted time
            sessions[sessionID]["top_participants"] = []TopParticipant{}
        }
        
        // Add participant to this session (limit to top 3 per session)
        participants := sessions[sessionID]["top_participants"].([]TopParticipant)
        if len(participants) < 3 {
            participants = append(participants, result)
            sessions[sessionID]["top_participants"] = participants
        }
    }

    // Convert sessions map to slice
    var sessionResults []map[string]interface{}
    for _, session := range sessions {
        sessionResults = append(sessionResults, session)
    }

    // Sort sessions by date (newest first)
    sort.Slice(sessionResults, func(i, j int) bool {
        dateI := sessionResults[i]["session_date"].(time.Time)
        dateJ := sessionResults[j]["session_date"].(time.Time)
        return dateI.After(dateJ)
    })

    json.NewEncoder(w).Encode(map[string]interface{}{
        "sessions": sessionResults,
        "level":    level,
    })
}

