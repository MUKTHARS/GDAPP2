package controllers

import (
	// "database/sql"
	"encoding/json"
	"gd/admin/models"
	qr "gd/admin/utils"
	"gd/database"
	"log"
	"net/http"
	"strings"
	"time"

	// "strings"

	"github.com/google/uuid"
)

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

func UpdateVenue(w http.ResponseWriter, r *http.Request) {
    db := database.GetDB()
    if db == nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database connection error"})
        return
    }

    // Extract ID from URL path if present
    var venueID string
    if strings.HasPrefix(r.URL.Path, "/admin/venues/") && len(r.URL.Path) > 13 {
        venueID = strings.TrimPrefix(r.URL.Path, "/admin/venues/")
    }

    // Parse the request body
    var requestBody struct {
        ID       string `json:"id"`
        Name     string `json:"name"`
        Capacity int    `json:"capacity"`
        Level    int    `json:"level"`
        SessionTiming string `json:"session_timing"`
        TableDetails  string `json:"table_details"`
    }
    
    if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request data"})
        return
    }

    // Use ID from URL if not in request body
    if requestBody.ID == "" && venueID != "" {
        requestBody.ID = venueID
    }

    if requestBody.ID == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Venue ID is required"})
        return
    }

    _, err := db.Exec(
    `UPDATE venues 
    SET name = ?, capacity = ?, level = ?, session_timing = ?, table_details = ?
    WHERE id = ? AND is_active = TRUE`,
    requestBody.Name, requestBody.Capacity, requestBody.Level, requestBody.SessionTiming, requestBody.TableDetails, requestBody.ID)
    
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update venue"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"message": "Venue updated successfully"})
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

