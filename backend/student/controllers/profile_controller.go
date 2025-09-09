// C:\xampp\htdocs\GDAPPC\backend\student\controllers\profile_controller.go
package controllers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"log"
	"gd/database"
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
		photoURL = profile.PhotoURL.String
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