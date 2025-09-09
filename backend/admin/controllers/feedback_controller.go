package controllers

import (
	"database/sql"
	"encoding/json"
	"gd/database"
	"net/http"
	"strconv"
)

func GetSessionFeedbacks(w http.ResponseWriter, r *http.Request) {
	// Get query parameters
	sessionID := r.URL.Query().Get("session_id")
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")
	
	// Set default pagination
	page := 1
	limit := 20
	
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}
	
	offset := (page - 1) * limit

	// Build query based on whether session_id is provided
	var query string
	var args []interface{}
	var countQuery string
	var countArgs []interface{}
	
	if sessionID != "" {
		query = `
			SELECT 
				sf.id, sf.rating, sf.comments, sf.created_at,
				sf.session_id, sf.student_id
			FROM session_feedback sf
			WHERE sf.session_id = ?
			ORDER BY sf.created_at DESC
			LIMIT ? OFFSET ?`
		args = []interface{}{sessionID, limit, offset}
		countQuery = "SELECT COUNT(*) FROM session_feedback WHERE session_id = ?"
		countArgs = []interface{}{sessionID}
	} else {
		query = `
			SELECT 
				sf.id, sf.rating, sf.comments, sf.created_at,
				sf.session_id, sf.student_id
			FROM session_feedback sf
			ORDER BY sf.created_at DESC
			LIMIT ? OFFSET ?`
		args = []interface{}{limit, offset}
		countQuery = "SELECT COUNT(*) FROM session_feedback"
		countArgs = []interface{}{}
	}
	
	rows, err := database.GetDB().Query(query, args...)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database query error: " + err.Error()})
		return
	}
	defer rows.Close()

	type Feedback struct {
		ID        string `json:"id"`
		Rating    int    `json:"rating"`
		Comments  string `json:"comments"`
		CreatedAt string `json:"created_at"`
		SessionID string `json:"session_id"`
		StudentID string `json:"student_id"`
	}

	var feedbacks []Feedback
	for rows.Next() {
		var f Feedback
		var createdAt sql.NullTime
		
		// Scan only the columns that exist in session_feedback table
		err := rows.Scan(
			&f.ID, &f.Rating, &f.Comments, &createdAt,
			&f.SessionID, &f.StudentID,
		)
		if err != nil {
			// Log the error but continue processing other rows
			continue
		}
		
		if createdAt.Valid {
			f.CreatedAt = createdAt.Time.Format("2006-01-02 15:04:05")
		}
		
		feedbacks = append(feedbacks, f)
	}

	// Get total count for pagination
	var totalCount int
	err = database.GetDB().QueryRow(countQuery, countArgs...).Scan(&totalCount)
	if err != nil {
		// If count query fails, use the number of fetched rows as fallback
		totalCount = len(feedbacks)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"feedbacks": feedbacks,
		"total":     totalCount,
		"page":      page,
		"limit":     limit,
		"pages":     (totalCount + limit - 1) / limit,
	})
}

func GetFeedbackStats(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    stats := make(map[string]interface{})
    
    // Get average rating
    var avgRating sql.NullFloat64
    err := database.GetDB().QueryRow("SELECT AVG(rating) FROM session_feedback").Scan(&avgRating)
    if err != nil {
        // Log the error but continue with default values
        stats["average_rating"] = 0
    } else if avgRating.Valid {
        stats["average_rating"] = avgRating.Float64
    } else {
        stats["average_rating"] = 0
    }
    
    // Get total feedback count
    var totalCount int
    err = database.GetDB().QueryRow("SELECT COUNT(*) FROM session_feedback").Scan(&totalCount)
    if err != nil {
        stats["total_feedbacks"] = 0
    } else {
        stats["total_feedbacks"] = totalCount
    }
    
    // Get rating distribution
    ratingDist := make(map[int]int)
    for i := 1; i <= 5; i++ {
        var count int
        err := database.GetDB().QueryRow("SELECT COUNT(*) FROM session_feedback WHERE rating = ?", i).Scan(&count)
        if err != nil {
            ratingDist[i] = 0
        } else {
            ratingDist[i] = count
        }
    }
    stats["rating_distribution"] = ratingDist

    json.NewEncoder(w).Encode(map[string]interface{}{
        "stats": stats,
    })
}