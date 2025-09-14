package controllers

import (
	// "database/sql"
	"encoding/json"
	"fmt"
	"gd/admin/models"
	qr "gd/admin/utils"
	"gd/database"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	// "strings"

	"github.com/google/uuid"
)
type Venue struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Capacity  int    `json:"capacity"`
	Level     int    `json:"level"`
	QRSecret  string `json:"qr_secret"`
	IsActive  bool   `json:"is_active"`
	CreatedBy string `json:"created_by"`
	SessionTiming string `json:"session_timing"`
	AvailableDays string `json:"available_days"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
	TableDetails  string `json:"table_details"`
}

// var db *sql.DB // Make sure this is properly initialized in main.go
// func SetDB(database *sql.DB) {
//     db = database
// }
func GetVenues(w http.ResponseWriter, r *http.Request) {
	// Ensure db connection is available
	db := database.GetDB()
	if db == nil {
		log.Println("Database connection is nil")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database connection error"})
		return
	}

	rows, err := db.Query("SELECT id, name, capacity, level, session_timing, table_details FROM venues WHERE is_active = TRUE")
	if err != nil {
		log.Printf("Error fetching venues: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch venues"})
		return
	}
	defer rows.Close()

	var venues []models.Venue
	for rows.Next() {
		var v models.Venue
	if err := rows.Scan(&v.ID, &v.Name, &v.Capacity, &v.Level, &v.SessionTiming, &v.TableDetails); err != nil {
			log.Printf("Error scanning venue: %v", err)
			continue
		}
		venues = append(venues, v)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(venues)
}

func DeleteVenue(w http.ResponseWriter, r *http.Request) {
    venueID := r.URL.Query().Get("id")
    if venueID == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Venue ID is required"})
        return
    }

    // Check if venue is expired (session timing is in the past)
    var sessionTiming string
    err := database.GetDB().QueryRow(
        "SELECT session_timing FROM venues WHERE id = ?",
        venueID,
    ).Scan(&sessionTiming)

    if err != nil {
        log.Printf("Error fetching venue timing: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }

    isExpired := false
    if sessionTiming != "" {
        parts := strings.Split(sessionTiming, " | ")
        if len(parts) == 2 {
            datePart := parts[0]
            // Parse date in DD/MM/YYYY format
            dateParts := strings.Split(datePart, "/")
            if len(dateParts) == 3 {
                day, _ := strconv.Atoi(dateParts[0])
                month, _ := strconv.Atoi(dateParts[1])
                year, _ := strconv.Atoi(dateParts[2])
                
                venueDate := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.Local)
                if venueDate.Before(time.Now().AddDate(0, 0, -1)) { // Allow 1 day grace period
                    isExpired = true
                }
            }
        }
    }

    if !isExpired {
        // For non-expired venues, check for active sessions
        var sessionCount int
        err := database.GetDB().QueryRow(
            "SELECT COUNT(*) FROM gd_sessions WHERE venue_id = ? AND status IN ('pending', 'active')",
            venueID,
        ).Scan(&sessionCount)

        if err != nil {
            log.Printf("Error checking venue sessions: %v", err)
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
            return
        }

        if sessionCount > 0 {
            w.WriteHeader(http.StatusConflict)
            json.NewEncoder(w).Encode(map[string]string{"error": "Cannot delete venue with active sessions"})
            return
        }
    }

    // Soft delete the venue
    result, err := database.GetDB().Exec(
        "UPDATE venues SET is_active = FALSE WHERE id = ?",
        venueID,
    )

    if err != nil {
        log.Printf("Error deleting venue: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete venue"})
        return
    }

    rowsAffected, _ := result.RowsAffected()
    if rowsAffected == 0 {
        w.WriteHeader(http.StatusNotFound)
        json.NewEncoder(w).Encode(map[string]string{"error": "Venue not found"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    if isExpired {
        json.NewEncoder(w).Encode(map[string]string{"status": "expired_venue_deleted"})
    } else {
        json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
    }
}

// Update the UpdateVenue function to handle table_details
func UpdateVenue(w http.ResponseWriter, r *http.Request) {
    var venue Venue
    if err := json.NewDecoder(r.Body).Decode(&venue); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
        return
    }

    // Validate required fields
    if venue.ID == "" || venue.Name == "" || venue.Capacity <= 0 {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Missing required fields"})
        return
    }

    // Parse and validate session timing format
    if venue.SessionTiming != "" {
        parts := strings.Split(venue.SessionTiming, " | ")
        if len(parts) != 2 {
            w.WriteHeader(http.StatusBadRequest)
            json.NewEncoder(w).Encode(map[string]string{"error": "Invalid session timing format. Use: DD/MM/YYYY | HH:MM AM/PM - HH:MM AM/PM"})
            return
        }
        
        datePart := parts[0]
        timePart := parts[1]
        
        // Validate date format
        dateParts := strings.Split(datePart, "/")
        if len(dateParts) != 3 {
            w.WriteHeader(http.StatusBadRequest)
            json.NewEncoder(w).Encode(map[string]string{"error": "Invalid date format. Use: DD/MM/YYYY"})
            return
        }
        
        // Validate time range format
        if !strings.Contains(timePart, " - ") {
            w.WriteHeader(http.StatusBadRequest)
            json.NewEncoder(w).Encode(map[string]string{"error": "Invalid time range format. Use: HH:MM AM/PM - HH:MM AM/PM"})
            return
        }
    }

    _, err := database.GetDB().Exec(`
        UPDATE venues 
        SET name = ?, capacity = ?, level = ?, session_timing = ?, table_details = ?
        WHERE id = ?`,
        venue.Name, venue.Capacity, venue.Level, venue.SessionTiming, venue.TableDetails, venue.ID)

    if err != nil {
        log.Printf("Error updating venue: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update venue"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

func CreateVenue(w http.ResponseWriter, r *http.Request) {
    db := database.GetDB()
    if db == nil {
        log.Println("Database connection is nil")
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database connection error"})
        return
    }

    var venue models.Venue
    if err := json.NewDecoder(r.Body).Decode(&venue); err != nil {
        log.Printf("Error decoding venue data: %v", err)
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request data"})
        return
    }

    // Generate a UUID if ID is not provided
    if venue.ID == "" {
        venue.ID = uuid.New().String() 
    }

    // Generate secure QR payload (modified part)
    qrData, err := qr.GenerateSecureQR(venue.ID, 5*time.Minute)
    if err != nil {
        log.Printf("Error generating QR secret: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to generate venue QR"})
        return
    }
    venue.QRSecret = qrData
    
    venue.IsActive = true
    venue.CreatedBy = "admin1"

    if err := models.CreateVenue(db, venue); err != nil {
        log.Printf("Error creating venue: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Venue creation failed: " + err.Error()})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(venue)
}

func CleanupExpiredVenues(w http.ResponseWriter, r *http.Request) {
    db := database.GetDB()
    if db == nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database connection error"})
        return
    }

    // Delete venues that have no active sessions and are past their session time
    result, err := db.Exec(`
        UPDATE venues 
        SET is_active = FALSE 
        WHERE is_active = TRUE 
        AND id NOT IN (
            SELECT DISTINCT venue_id 
            FROM gd_sessions 
            WHERE status IN ('pending', 'active')
        )
        AND session_timing != ''
        AND STR_TO_DATE(
            SUBSTRING_INDEX(session_timing, ' | ', 1), 
            '%d/%m/%Y'
        ) < CURDATE()
    `)

    if err != nil {
        log.Printf("Error cleaning up expired venues: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to cleanup expired venues"})
        return
    }

    rowsAffected, _ := result.RowsAffected()
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "status": "cleanup_completed",
        "venues_removed": fmt.Sprintf("%d", rowsAffected),
    })
}