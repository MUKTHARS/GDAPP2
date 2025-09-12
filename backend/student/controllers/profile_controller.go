// C:\xampp\htdocs\GDAPPC\backend\student\controllers\profile_controller.go
package controllers

import (
	"database/sql"
	"encoding/json"
	"gd/database"
	"log"
	"net/http"
	"strings"
)

type StudentProfile struct {
	ID              string         `json:"id"`
	Email           string         `json:"email"`
	FullName        string         `json:"full_name"`
	RollNumber      sql.NullString `json:"roll_number"`
	Department      string         `json:"department"`
	Year            int            `json:"year"`
	PhotoURL        sql.NullString `json:"photo_url"`
	CurrentGDLevel  int            `json:"current_gd_level"`
	IsActive        bool           `json:"is_active"`
	CreatedAt       string         `json:"created_at"`
}

func GetStudentProfile(w http.ResponseWriter, r *http.Request) {
	// Get student ID from context (set by middleware)
	studentIDInterface := r.Context().Value("studentID")
	if studentIDInterface == nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Student ID not found in context"})
		return
	}

	studentID, ok := studentIDInterface.(string)
	if !ok || studentID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid student ID"})
		return
	}

	log.Printf("Fetching profile for student: %s", studentID)

	var profile StudentProfile
	
	err := database.GetDB().QueryRow(`
		SELECT 
			id, email, full_name, roll_number, department, year, 
			photo_url, current_gd_level, is_active, created_at
		FROM student_users 
		WHERE id = ? AND is_active = TRUE
	`, studentID).Scan(
		&profile.ID,
		&profile.Email,
		&profile.FullName,
		&profile.RollNumber,
		&profile.Department,
		&profile.Year,
		&profile.PhotoURL,
		&profile.CurrentGDLevel,
		&profile.IsActive,
		&profile.CreatedAt,
	)

	if err != nil {
		log.Printf("Database error for student %s: %v", studentID, err)
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Student profile not found"})
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error: " + err.Error()})
		}
		return
	}

	// Convert nullable fields to regular strings with empty string as default
	rollNumber := ""
	if profile.RollNumber.Valid {
		rollNumber = profile.RollNumber.String
	}

	photoURL := ""
	if profile.PhotoURL.Valid {
		
		if strings.HasPrefix(profile.PhotoURL.String, "http") {
			photoURL = profile.PhotoURL.String
		} else {
			photoURL = "http://" + r.Host + "/uploads/" + profile.PhotoURL.String
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"profile": map[string]interface{}{
			"id":               profile.ID,
			"email":            profile.Email,
			"full_name":        profile.FullName,
			"roll_number":      rollNumber,
			"department":       profile.Department,
			"year":             profile.Year,
			"photo_url":        photoURL,
			"current_gd_level": profile.CurrentGDLevel,
			"is_active":        profile.IsActive,
			"created_at":       profile.CreatedAt,
		},
	})
}

func GetStudentSessionHistory(w http.ResponseWriter, r *http.Request) {
    studentIDInterface := r.Context().Value("studentID")
    if studentIDInterface == nil {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "Student ID not found in context"})
        return
    }

    studentID, ok := studentIDInterface.(string)
    if !ok || studentID == "" {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid student ID"})
        return
    }

    rows, err := database.GetDB().Query(`
        SELECT 
            s.id as session_id,
            v.name as venue_name,
            s.start_time,
            s.end_time,
            s.level as session_level,
            COALESCE(SUM(sr.weighted_score - sr.penalty_points), 0) as total_score,
            COALESCE(SUM(sr.penalty_points), 0) as total_penalty,
            COALESCE(SUM(sr.weighted_score), 0) as raw_score,
            (SELECT COUNT(*) FROM survey_results sr2 
             WHERE sr2.session_id = s.id AND sr2.responder_id = ?) as questions_answered,
            (SELECT COUNT(*) FROM survey_questions 
             WHERE level = s.level AND is_active = TRUE) as total_questions,
            (SELECT COUNT(*) FROM session_participants sp2 
             WHERE sp2.session_id = s.id AND sp2.is_dummy = FALSE) as total_participants,
            (SELECT RANK() OVER (ORDER BY SUM(sr3.weighted_score - sr3.penalty_points) DESC) 
             FROM survey_results sr3 
             WHERE sr3.session_id = s.id AND sr3.student_id = ? 
             GROUP BY sr3.student_id) as student_rank,
            s.status as session_status
        FROM gd_sessions s
        JOIN venues v ON s.venue_id = v.id
        JOIN session_participants sp ON s.id = sp.session_id
        LEFT JOIN survey_results sr ON s.id = sr.session_id AND sr.student_id = ?
        WHERE sp.student_id = ? AND sp.is_dummy = FALSE
        GROUP BY s.id, v.name, s.start_time, s.end_time, s.level, s.status
        ORDER BY s.start_time DESC
    `, studentID, studentID, studentID, studentID)

    if err != nil {
        log.Printf("Database error fetching session history: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch session history"})
        return
    }
    defer rows.Close()

    var sessions []map[string]interface{}
    for rows.Next() {
        var session struct {
            SessionID        string
            VenueName        string
            StartTime        string
            EndTime          string
            SessionLevel     int
            TotalScore       float64
            TotalPenalty     float64
            RawScore         float64
            QuestionsAnswered int
            TotalQuestions   int
            TotalParticipants int
            StudentRank      sql.NullInt64
            SessionStatus    string
        }

        err := rows.Scan(
            &session.SessionID,
            &session.VenueName,
            &session.StartTime,
            &session.EndTime,
            &session.SessionLevel,
            &session.TotalScore,
            &session.TotalPenalty,
            &session.RawScore,
            &session.QuestionsAnswered,
            &session.TotalQuestions,
            &session.TotalParticipants,
            &session.StudentRank,
            &session.SessionStatus,
        )

        if err != nil {
            log.Printf("Error scanning session history: %v", err)
            continue
        }

        // Determine if student cleared the level (top 3 and not already at max level)
        cleared := false
        if session.StudentRank.Valid && session.StudentRank.Int64 <= 3 && session.StudentRank.Int64 > 0 {
            // Check if student was promoted (only if they weren't already at max level)
            var oldLevel int
            err := database.GetDB().QueryRow(`
                SELECT current_gd_level FROM student_users 
                WHERE id = ? AND created_at < ?
            `, studentID, session.StartTime).Scan(&oldLevel)
            
            if err == nil && oldLevel < 5 {
                cleared = true
            }
        }

        sessions = append(sessions, map[string]interface{}{
            "session_id":        session.SessionID,
            "venue_name":        session.VenueName,
            "start_time":        session.StartTime,
            "end_time":          session.EndTime,
            "session_level":     session.SessionLevel,
            "total_score":       session.TotalScore,
            "total_penalty":     session.TotalPenalty,
            "final_score":       session.TotalScore - session.TotalPenalty,
            "raw_score":         session.RawScore,
            "questions_answered": session.QuestionsAnswered,
            "total_questions":   session.TotalQuestions,
            "total_participants": session.TotalParticipants,
            "student_rank":      session.StudentRank.Int64,
            "session_status":    session.SessionStatus,
            "cleared":           cleared,
            "survey_completed":  session.QuestionsAnswered >= session.TotalQuestions,
        })
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "sessions": sessions,
        "count":    len(sessions),
    })
}