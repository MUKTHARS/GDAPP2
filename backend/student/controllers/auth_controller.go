package controllers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"gd/student/utils"
	"gd/database"
	"golang.org/x/crypto/bcrypt"
	"log"
)

type StudentLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Update the StudentData struct to match the scan order
type StudentData struct {
	ID           string
	PasswordHash string
	Level        int
	RollNumber   sql.NullString // Use sql.NullString for nullable fields
}

func StudentLogin(w http.ResponseWriter, r *http.Request) {
    var req StudentLoginRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
        return
    }

    log.Printf("Login attempt for: %s", req.Email)
    
    var student StudentData
    
    err := database.GetDB().QueryRow(
        `SELECT id, password_hash, current_gd_level, roll_number 
        FROM student_users 
        WHERE email = ? AND is_active = TRUE`,
        req.Email,
    ).Scan(&student.ID, &student.PasswordHash, &student.Level, &student.RollNumber)

    if err != nil {
        log.Printf("Database error for %s: %v", req.Email, err)
        if err == sql.ErrNoRows {
            w.WriteHeader(http.StatusUnauthorized)
            json.NewEncoder(w).Encode(map[string]string{"error": "Invalid credentials"})
        } else {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error: " + err.Error()})
        }
        return
    }

    log.Printf("Found student: %s", student.ID)
    
    // Compare password
    err = bcrypt.CompareHashAndPassword([]byte(student.PasswordHash), []byte(req.Password))
    if err != nil {
        log.Printf("Password mismatch for %s", req.Email)
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid credentials"})
        return
    }

    log.Printf("Found student: %s, level: %d, roll_number: %s", student.ID, student.Level, student.RollNumber.String)
    
    // Generate JWT token
    token, err := jwt.GenerateStudentToken(student.ID, student.Level)
    if err != nil {
        log.Printf("Token generation error: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error"})
        return
    }

    // Handle nullable roll_number
    rollNumber := ""
    if student.RollNumber.Valid {
        rollNumber = student.RollNumber.String
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "token": token,
        "level": student.Level,
        "user_id": student.ID,
        "roll_number": rollNumber,
    })
}