package controllers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"gd/database"
)

func GetQuestionsForStudent(w http.ResponseWriter, r *http.Request) {
    levelStr := r.URL.Query().Get("level")
    studentID := r.Context().Value("studentID").(string)
    
    log.Printf("GetQuestionsForStudent called with level: %s, studentID: %s", levelStr, studentID)
    
    level, err := strconv.Atoi(levelStr)
    if err != nil {
        log.Printf("Invalid level parameter: %s", levelStr)
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid level"})
        return
    }

    log.Printf("Querying questions for level: %d", level)
    
    // FIXED: Enhanced query with better error handling
    rows, err := database.GetDB().Query(`
        SELECT id, question_text, weight 
        FROM survey_questions 
        WHERE level = ? AND is_active = 1
        ORDER BY created_at`, level)
    
    if err != nil {
        log.Printf("Database error: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }
    defer rows.Close()

    var questions []map[string]interface{}
    var questionCount int
    
    for rows.Next() {
        var question struct {
            ID     string
            Text   string
            Weight float64
        }
        if err := rows.Scan(&question.ID, &question.Text, &question.Weight); err != nil {
            log.Printf("Error scanning row: %v", err)
            continue
        }
        questions = append(questions, map[string]interface{}{
            "id":     question.ID,
            "text":   question.Text,
            "weight": question.Weight,
        })
        questionCount++
        
        log.Printf("Found question: ID=%s, Text=%s, Weight=%.1f", 
            question.ID, question.Text, question.Weight)
    }

    // Check for any errors during iteration
    if err := rows.Err(); err != nil {
        log.Printf("Row iteration error: %v", err)
    }

    log.Printf("Total questions found for level %d: %d", level, questionCount)

    // If no questions found, use defaults
    if len(questions) == 0 {
        log.Printf("No questions found for level %d, using fallback questions", level)
        
        // Debug: Check what's actually in the database
        debugRows, debugErr := database.GetDB().Query(`
            SELECT id, question_text, weight, level, is_active 
            FROM survey_questions 
            ORDER BY created_at`)
        
        if debugErr == nil {
            defer debugRows.Close()
            var debugCount int
            for debugRows.Next() {
                var id, text string
                var weight float64
                var dbLevel int
                var isActive bool
                if err := debugRows.Scan(&id, &text, &weight, &dbLevel, &isActive); err == nil {
                    log.Printf("DB Question: ID=%s, Text=%s, Level=%d, Active=%t", 
                        id, text, dbLevel, isActive)
                    debugCount++
                }
            }
            log.Printf("Total questions in database: %d", debugCount)
        }
        
        questions = []map[string]interface{}{
            {"id": "q1", "text": "Clarity of arguments", "weight": 1.0},
            {"id": "q2", "text": "Contribution to discussion", "weight": 1.0},
            {"id": "q3", "text": "Teamwork and collaboration", "weight": 1.0},
        }
    }

    // Create a consistent but user-specific shuffle seed
    sessionID := r.URL.Query().Get("session_id")
    shuffleSeed := studentID
    if sessionID != "" {
        shuffleSeed += sessionID
    }

    log.Printf("Shuffling %d questions with seed: %s", len(questions), shuffleSeed)

    // Shuffle questions using a consistent seed for this user
    shuffledQuestions := shuffleQuestionsWithSeed(questions, shuffleSeed)

    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(shuffledQuestions); err != nil {
        log.Printf("Error encoding response: %v", err)
    }
}