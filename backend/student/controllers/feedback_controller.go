package controllers

import (
	"database/sql"
	"encoding/json"
	"gd/database"
	"net/http"
)

type FeedbackRequest struct {
	SessionID string `json:"session_id"`
	Rating    int    `json:"rating"`
	Comments  string `json:"comments"`
}

func SubmitFeedback(w http.ResponseWriter, r *http.Request) {
	studentID := r.Context().Value("studentID").(string)
	
	var req FeedbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
		return
	}

	// Check if student already submitted feedback for this session
	var exists bool
	err := database.GetDB().QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM session_feedback 
			WHERE session_id = ? AND student_id = ?
		)`, req.SessionID, studentID).Scan(&exists)
	
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	if exists {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"error": "Feedback already submitted for this session"})
		return
	}

	// Insert feedback
	_, err = database.GetDB().Exec(`
		INSERT INTO session_feedback 
		(id, session_id, student_id, rating, comments)
		VALUES (UUID(), ?, ?, ?, ?)`,
		req.SessionID, studentID, req.Rating, req.Comments)
	
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to submit feedback"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func GetFeedback(w http.ResponseWriter, r *http.Request) {
    studentID := r.Context().Value("studentID").(string)
    sessionID := r.URL.Query().Get("session_id")

    var feedback struct {
        Rating   int    `json:"rating"`
        Comments string `json:"comments"`
    }

    err := database.GetDB().QueryRow(`
        SELECT rating, comments FROM session_feedback
        WHERE session_id = ? AND student_id = ?`,
        sessionID, studentID).Scan(&feedback.Rating, &feedback.Comments)

    if err != nil {
        if err == sql.ErrNoRows {
            // Return empty response with 200 status when no feedback exists
            w.Header().Set("Content-Type", "application/json")
            json.NewEncoder(w).Encode(map[string]interface{}{})
            return
        }
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(feedback)
}