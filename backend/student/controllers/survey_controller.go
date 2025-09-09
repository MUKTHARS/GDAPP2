// Create a new file survey_controller.go in student/controllers
package controllers

import (
	// "database/sql"
	"database/sql"
	"encoding/json"
	"fmt"
	"gd/database"
	"log"
	"net/http"
	"strconv"
	"time"
)

func StartSurveyTimer(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "session_id is required"})
		return
	}

	// Set timer for 30 seconds per question * number of questions
	_, err := database.GetDB().Exec(`
		UPDATE gd_sessions 
		SET survey_end_time = DATE_ADD(NOW(), INTERVAL 30 SECOND)
		WHERE id = ?`, sessionID)
	
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to start timer"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "timer_started"})
}

func CheckSurveyTimeout(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session_id")
	// studentID := r.Context().Value("studentID").(string)

	var surveyEndTime time.Time
	err := database.GetDB().QueryRow(`
		SELECT survey_end_time FROM gd_sessions WHERE id = ?`, sessionID).Scan(&surveyEndTime)
	
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	remaining := time.Until(surveyEndTime).Seconds()
	if remaining < 0 {
		remaining = 0
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"remaining_seconds": remaining,
		"is_timed_out":      remaining <= 0,
	})
}

func ApplySurveyPenalties(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "session_id is required"})
		return
	}

	tx, err := database.GetDB().Begin()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	defer tx.Rollback()

	// Calculate average scores per question
	_, err = tx.Exec(`
		UPDATE survey_results sr
		JOIN (
			SELECT 
				question_id,
				AVG(score) as avg_score
			FROM survey_results
			WHERE session_id = ?
			GROUP BY question_id
		) as averages ON sr.question_id = averages.question_id
		SET sr.penalty_points = CASE
			WHEN sr.score < (averages.avg_score - 2) THEN 1
			ELSE 0
		END
		WHERE sr.session_id = ?`, sessionID, sessionID)
	
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to calculate penalties"})
		return
	}

	// Detect biased responses
	_, err = tx.Exec(`
		UPDATE survey_results sr
		SET sr.is_biased = TRUE
		WHERE sr.session_id = ? AND sr.responder_id IN (
			SELECT responder_id FROM (
				SELECT 
					responder_id,
					COUNT(DISTINCT student_id) as unique_rankings
				FROM survey_results
				WHERE session_id = ?
				GROUP BY responder_id
				HAVING unique_rankings < 3
			) as potential_bias
		)`, sessionID, sessionID)
	
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to detect bias"})
		return
	}

	if err := tx.Commit(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to apply penalties"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "penalties_applied"})
}

func StartQuestionTimer(w http.ResponseWriter, r *http.Request) {
    var req struct {
        SessionID  string `json:"session_id"`
        QuestionID int    `json:"question_id"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
        return
    }

    // Always set exactly 30 seconds for each question
    _, err := database.GetDB().Exec(`
        INSERT INTO question_timers (session_id, question_id, end_time)
        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 SECOND))
        ON DUPLICATE KEY UPDATE end_time = DATE_ADD(NOW(), INTERVAL 30 SECOND)`,
        req.SessionID, req.QuestionID)
    
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to start timer"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "timer_started"})
}

func CheckQuestionTimeout(w http.ResponseWriter, r *http.Request) {
    sessionID := r.URL.Query().Get("session_id")
    questionID := r.URL.Query().Get("question_id")

    // Default response if any error occurs
    defaultResponse := map[string]interface{}{
        "remaining_seconds": 30,
        "is_timed_out":      false,
    }

    var endTime time.Time
    err := database.GetDB().QueryRow(`
        SELECT end_time FROM question_timers
        WHERE session_id = ? AND question_id = ?`, sessionID, questionID).Scan(&endTime)
    
    if err != nil {
        if err == sql.ErrNoRows {
            // No timer found, return default values
            w.Header().Set("Content-Type", "application/json")
            json.NewEncoder(w).Encode(defaultResponse)
            return
        }
        // For other errors, still return default values
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(defaultResponse)
        return
    }

    remaining := time.Until(endTime).Seconds()
    if remaining < 0 {
        remaining = 0
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "remaining_seconds": remaining,
        "is_timed_out":      remaining <= 0,
    })
}

func ApplyQuestionPenalty(w http.ResponseWriter, r *http.Request) {
    var req struct {
        SessionID  string `json:"session_id"`
        QuestionID int    `json:"question_id"`
        StudentID  string `json:"student_id"`
    }
    
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
        return
    }

    // Check if penalty already exists
    var exists bool
    err := database.GetDB().QueryRow(`
        SELECT EXISTS(
            SELECT 1 FROM survey_penalties 
            WHERE session_id = ? AND question_id = ? AND student_id = ?
        )`, req.SessionID, req.QuestionID, req.StudentID).Scan(&exists)
    
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }

    if exists {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{"status": "penalty_already_applied"})
        return
    }

    // Apply penalty (0.5 points per question timeout)
    _, err = database.GetDB().Exec(`
        INSERT INTO survey_penalties 
        (id, session_id, student_id, question_id, penalty_points)
        VALUES (UUID(), ?, ?, ?, 0.5)`,
        req.SessionID, req.StudentID, req.QuestionID)
    
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to apply penalty"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "penalty_applied"})
}

func HandleSurveyTimeout(sessionID string, studentID string, questionID int) error {
    tx, err := database.GetDB().Begin()
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // Apply penalty for timeout
    _, err = tx.Exec(`
        INSERT INTO survey_penalties 
        (session_id, question_id, student_id, penalty_points, reason)
        VALUES (?, ?, ?, 1, 'timeout')
        ON DUPLICATE KEY UPDATE 
        penalty_points = penalty_points + 1,
        updated_at = NOW()`,
        sessionID, questionID, studentID)
    
    if err != nil {
        return err
    }

    // Record the timeout event
    _, err = tx.Exec(`
        INSERT INTO survey_timeouts
        (session_id, student_id, question_id)
        VALUES (?, ?, ?)`,
        sessionID, studentID, questionID)
    
    if err != nil {
        return err
    }

    return tx.Commit()
}

func GetSurveyQuestions(w http.ResponseWriter, r *http.Request) {
    levelStr := r.URL.Query().Get("level")
    sessionID := r.URL.Query().Get("session_id")
    studentID := r.URL.Query().Get("student_id")
    
    fmt.Printf("GetSurveyQuestions called with level=%s, sessionID=%s, studentID=%s\n", levelStr, sessionID, studentID)
    
    level, err := strconv.Atoi(levelStr)
    if err != nil || level < 1 {
        level = 1
    }

    // Get questions for the specified level - FIXED SQL QUERY
    rows, err := database.GetDB().Query(`
        SELECT id, question_text, weight 
        FROM survey_questions
        WHERE is_active = TRUE AND level = ?
        ORDER BY created_at`, level)
    
    if err != nil {
        fmt.Printf("Database error: %v\n", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }
    defer rows.Close()

    var questions []map[string]interface{}
    for rows.Next() {
        var question struct {
            ID     string
            Text   string
            Weight float64
        }
        if err := rows.Scan(&question.ID, &question.Text, &question.Weight); err != nil {
            fmt.Printf("Row scanning error: %v\n", err)
            continue
        }
        questions = append(questions, map[string]interface{}{
            "id":     question.ID,
            "text":   question.Text,
            "weight": question.Weight,
        })
    }

    // Check if we got any questions
    fmt.Printf("Found %d questions for level %d in database\n", len(questions), level)
    
    // If no questions found for this level, try to get default level 1 questions
    if len(questions) == 0 && level != 1 {
        fmt.Printf("No questions found for level %d, trying level 1\n", level)
        rows, err := database.GetDB().Query(`
            SELECT id, question_text, weight 
            FROM survey_questions
            WHERE is_active = TRUE AND level = 1
            ORDER BY created_at`)
        
        if err == nil {
            defer rows.Close()
            for rows.Next() {
                var question struct {
                    ID     string
                    Text   string
                    Weight float64
                }
                if err := rows.Scan(&question.ID, &question.Text, &question.Weight); err == nil {
                    questions = append(questions, map[string]interface{}{
                        "id":     question.ID,
                        "text":   question.Text,
                        "weight": question.Weight,
                    })
                }
            }
        }
    }
    
    // If still no questions found, return default questions
    if len(questions) == 0 {
        fmt.Println("No questions found in database, using fallback questions")
        questions = []map[string]interface{}{
            {"id": "q1", "text": "Clarity of arguments", "weight": 1.0},
            {"id": "q2", "text": "Contribution to discussion", "weight": 1.0},
            {"id": "q3", "text": "Teamwork and collaboration", "weight": 1.0},
        }
    }

    // Shuffle questions based on both session ID AND student ID for unique ordering per student
    if sessionID != "" && studentID != "" {
        uniqueSeed := sessionID + "-" + studentID
        fmt.Printf("Shuffling with unique seed: %s\n", uniqueSeed)
        questions = shuffleQuestionsWithSeed(questions, uniqueSeed)
    } else if sessionID != "" {
        fmt.Printf("Shuffling with session seed: %s\n", sessionID)
        questions = shuffleQuestionsWithSeed(questions, sessionID)
    } else {
        fmt.Println("No seed provided for shuffling")
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(questions)
}



type Participant struct {
    ID string
}

// getSessionParticipants retrieves all participant IDs for a given session.
func getSessionParticipants(sessionID string) ([]Participant, error) {
    rows, err := database.GetDB().Query(`
        SELECT DISTINCT responder_id 
        FROM survey_results 
        WHERE session_id = ?`, sessionID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var participants []Participant
    for rows.Next() {
        var id string
        if err := rows.Scan(&id); err != nil {
            return nil, err
        }
        participants = append(participants, Participant{ID: id})
    }
    return participants, nil
}

func CalculateFinalResults(sessionID string) (map[string]float64, error) {
    results := make(map[string]float64)
    
    // Get all participants
    participants, err := getSessionParticipants(sessionID)
    if err != nil {
        return nil, err
    }
    
    // Calculate raw scores
    for _, p := range participants {
        var totalScore float64
        err := database.GetDB().QueryRow(`
            SELECT COALESCE(SUM(score), 0) 
            FROM survey_results 
            WHERE responder_id = ? AND session_id = ?`,
            p.ID, sessionID).Scan(&totalScore)
        if err != nil {
            return nil, err
        }
        results[p.ID] = totalScore
    }
    
    // Apply penalties
    penaltyRows, err := database.GetDB().Query(`
        SELECT student_id, SUM(penalty_points) 
        FROM survey_penalties 
        WHERE session_id = ?
        GROUP BY student_id`, sessionID)
    if err != nil {
        return nil, err
    }
    defer penaltyRows.Close()
    
    for penaltyRows.Next() {
        var studentID string
        var penaltyPoints int
        if err := penaltyRows.Scan(&studentID, &penaltyPoints); err != nil {
            return nil, err
        }
        if score, exists := results[studentID]; exists {
            results[studentID] = score - float64(penaltyPoints)
        }
    }
    
    return results, nil
}

func getRankingPoints(level, rank int) (float64, error) {
    var points float64
    
    err := database.GetDB().QueryRow(`
        SELECT 
            CASE ?
                WHEN 1 THEN first_place_points
                WHEN 2 THEN second_place_points  
                WHEN 3 THEN third_place_points
                ELSE 0
            END as points
        FROM ranking_points_config 
        WHERE level = ? AND is_active = TRUE`,
        rank, level).Scan(&points)
    
    if err != nil {
        if err == sql.ErrNoRows {
            // Return default values if no config found
            switch rank {
            case 1:
                return 4.0, nil
            case 2:
                return 3.0, nil
            case 3:
                return 2.0, nil
            default:
                return 0.0, nil
            }
        }
        return 0.0, fmt.Errorf("error getting ranking points: %v", err)
    }
    
    return points, nil
}

func shuffleQuestionsWithSeed(questions []map[string]interface{}, seed string) []map[string]interface{} {
    // Convert seed to a numeric value
    seedValue := 0
    for _, char := range seed {
        seedValue = (seedValue*31 + int(char)) % 1000000
    }

    shuffled := make([]map[string]interface{}, len(questions))
    copy(shuffled, questions)

    // Fisher-Yates shuffle with deterministic seed
    for i := len(shuffled) - 1; i > 0; i-- {
        // Use the seed to generate a deterministic random index
        seedValue = (seedValue*9301 + 49297) % 233280
        j := int(float64(seedValue) / 233280 * float64(i+1))
        
        shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
    }

    return shuffled
}

func checkAndUpdateStudentLevel(studentID string, sessionID string) error {
    // Check if student is in top 3
    var rank int
    err := database.GetDB().QueryRow(`
        SELECT ranking FROM (
            SELECT 
                student_id,
                RANK() OVER (ORDER BY SUM(weighted_score - penalty_points) DESC) as ranking
            FROM survey_results 
            WHERE session_id = ? AND is_completed = 1
            GROUP BY student_id
        ) as ranks
        WHERE student_id = ?`,
        sessionID, studentID).Scan(&rank)
    
    if err != nil {
        return fmt.Errorf("error checking student rank: %v", err)
    }

    // If student is in top 3 (rank 1, 2, or 3), promote them
    if rank <= 3 {
        _, err := database.GetDB().Exec(`
            UPDATE student_users 
            SET current_gd_level = LEAST(current_gd_level + 1, 5) 
            WHERE id = ?`,
            studentID)
        
        if err != nil {
            return fmt.Errorf("error promoting student: %v", err)
        }
        
        log.Printf("Student %s promoted to next level (rank %d)", studentID, rank)
    }

    return nil
}