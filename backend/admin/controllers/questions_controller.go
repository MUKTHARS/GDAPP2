package controllers

import (
	// "database/sql"
	"database/sql"
	"encoding/json"
	"gd/database"
	"log"
	"net/http"
	"strconv"
	"strings"

	// "strings"

	"github.com/google/uuid"
)

type Question struct {
	ID      string  `json:"id"`
	Text    string  `json:"text"`
	Weight  float64 `json:"weight"`
	Levels  []int   `json:"levels"`
}

type QuestionRequest struct {
	Text   string  `json:"text"`
	Weight float64 `json:"weight"`
	Levels []int   `json:"levels"`
}

func GetQuestions(w http.ResponseWriter, r *http.Request) {
    rows, err := database.GetDB().Query(`
        SELECT 
            q.id,
            q.question_text,
            q.weight,
            q.is_active,
            GROUP_CONCAT(ql.level) as levels
        FROM survey_questions q
        LEFT JOIN question_levels ql ON q.id = ql.question_id
        GROUP BY q.id
        ORDER BY q.created_at DESC`)
    
    if err != nil {
        log.Printf("Database error: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }
    defer rows.Close()

    type Question struct {
        ID       string  `json:"id"`
        Text     string  `json:"text"`
        Weight   float32 `json:"weight"`
        IsActive bool    `json:"is_active"`
        Levels   []int   `json:"levels"`
    }

    var questions []Question
    for rows.Next() {
        var q Question
        var levelsStr sql.NullString
        if err := rows.Scan(&q.ID, &q.Text, &q.Weight, &q.IsActive, &levelsStr); err != nil {
            log.Printf("Error scanning question: %v", err)
            continue
        }
        
        // Parse levels
        if levelsStr.Valid {
            levels := strings.Split(levelsStr.String, ",")
            for _, l := range levels {
                if level, err := strconv.Atoi(l); err == nil {
                    q.Levels = append(q.Levels, level)
                }
            }
        }
        
        questions = append(questions, q)
    }

    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(questions); err != nil {
        log.Printf("Error encoding response: %v", err)
    }
}

func CreateQuestion(w http.ResponseWriter, r *http.Request) {
	var req QuestionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	if req.Text == "" || len(req.Levels) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Text and levels are required"})
		return
	}

	tx, err := database.GetDB().Begin()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	defer tx.Rollback()

	questionID := uuid.New().String()
	_, err = tx.Exec(`
		INSERT INTO survey_questions (id, question_text, weight)
		VALUES (?, ?, ?)`,
		questionID, req.Text, req.Weight)
	
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create question"})
		return
	}

	for _, level := range req.Levels {
		_, err = tx.Exec(`
			INSERT INTO question_levels (question_id, level)
			VALUES (?, ?)`,
			questionID, level)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to assign levels"})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save question"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
		"id":     questionID,
	})
}

func UpdateQuestion(w http.ResponseWriter, r *http.Request) {
    var req struct {
        ID      string   `json:"id"`
        Text    *string  `json:"text"`
        Weight  *float64 `json:"weight"`
        Levels  []int    `json:"levels"`
        Active  *bool    `json:"is_active"`
    }
    
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
        return
    }

    if req.ID == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Question ID is required"})
        return
    }

    tx, err := database.GetDB().Begin()
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }
    defer tx.Rollback()

    // Update question fields if provided
    if req.Text != nil || req.Weight != nil || req.Active != nil {
        query := "UPDATE survey_questions SET "
        var args []interface{}
        
        if req.Text != nil {
            query += "question_text = ?, "
            args = append(args, *req.Text)
        }
        if req.Weight != nil {
            query += "weight = ?, "
            args = append(args, *req.Weight)
        }
        if req.Active != nil {
            query += "is_active = ?, "
            args = append(args, *req.Active)
        }
        
        query = query[:len(query)-2] + " WHERE id = ?"
        args = append(args, req.ID) // Use req.ID instead of questionID from URL
        
        _, err = tx.Exec(query, args...)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update question"})
            return
        }
    }

    // Update levels if provided
    if req.Levels != nil {
        // First delete existing level mappings
        _, err = tx.Exec("DELETE FROM question_levels WHERE question_id = ?", req.ID) // Use req.ID
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update levels"})
            return
        }

        // Add new level mappings
        for _, level := range req.Levels {
            _, err = tx.Exec(`
                INSERT INTO question_levels (question_id, level)
                VALUES (?, ?)`,
                req.ID, level) // Use req.ID
            if err != nil {
                w.WriteHeader(http.StatusInternalServerError)
                json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update levels"})
                return
            }
        }
    }

    if err := tx.Commit(); err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update question"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func DeleteQuestion(w http.ResponseWriter, r *http.Request) {
	questionID := r.URL.Query().Get("id")
	if questionID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Question ID is required"})
		return
	}

	_, err := database.GetDB().Exec("DELETE FROM survey_questions WHERE id = ?", questionID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete question"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}