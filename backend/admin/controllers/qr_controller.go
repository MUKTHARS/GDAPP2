package controllers

import (
	"encoding/json"
	"fmt"
	qr "gd/admin/utils"
	"gd/database"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)


func GenerateQR(w http.ResponseWriter, r *http.Request) {
    venueID := r.URL.Query().Get("venue_id")
    if venueID == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "venue_id parameter is required"})
        return
    }



adminID := r.Context().Value("userID").(string)
    if adminID == "" {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "Admin authentication required"})
        return
    }

    // Check if force_new parameter is set
    forceNew := r.URL.Query().Get("force_new") == "true"

    // If not forcing new, check for existing active QR codes with available capacity
    if !forceNew {
        var availableQR struct {
            ID           string
            QRData       string
            ExpiresAt    time.Time
            MaxCapacity  int
            CurrentUsage int
        }
        
        err := database.GetDB().QueryRow(`
    SELECT id, qr_data, expires_at, max_capacity, current_usage
    FROM venue_qr_codes 
    WHERE venue_id = ? AND created_by = ? 
    AND expires_at > NOW()
    AND current_usage < max_capacity
    ORDER BY created_at DESC LIMIT 1`,
    venueID, adminID,
).Scan(&availableQR.ID, &availableQR.QRData, &availableQR.ExpiresAt, 
      &availableQR.MaxCapacity, &availableQR.CurrentUsage)

       if err == nil {
            // Found available QR code - return it
            w.Header().Set("Content-Type", "application/json")
            json.NewEncoder(w).Encode(map[string]interface{}{
                "success":        true,
                "qr_string":      availableQR.QRData,
                "expires_in":     time.Until(availableQR.ExpiresAt).Minutes(),
                "expires_at":     availableQR.ExpiresAt.Format(time.RFC3339),
                "qr_id":          availableQR.ID,
                "max_capacity":   availableQR.MaxCapacity,
                "current_usage":  availableQR.CurrentUsage,
                "remaining_slots": availableQR.MaxCapacity - availableQR.CurrentUsage,
                "is_new":         false, // Indicate this is an existing QR
            })
            return
        }
        
        // If we get here, no available QR was found (either expired or full)
        // Check if there are any full QR codes that should trigger new generation
       var fullQRCount int
        database.GetDB().QueryRow(`
            SELECT COUNT(*) FROM venue_qr_codes 
            WHERE venue_id = ? AND created_by = ? AND is_active = TRUE 
            AND expires_at > NOW()
            AND current_usage >= max_capacity`,
            venueID, adminID).Scan(&fullQRCount) // Added adminID filter
            
        if fullQRCount > 0 {
            // There are full QR codes, so we should generate a new one
            // BUT only if force_new is explicitly requested or this is an auto-generation scenario
            // For manual requests, we should return the full QR unless force_new=true
            if r.URL.Query().Get("auto_generate") == "true" {
                forceNew = true
            } else {
                // Return the full QR code for manual requests
                var fullQR struct {
                    ID           string
                    QRData       string
                    ExpiresAt    time.Time
                    MaxCapacity  int
                    CurrentUsage int
                }
                
                err := database.GetDB().QueryRow(`
                    SELECT id, qr_data, expires_at, max_capacity, current_usage
                    FROM venue_qr_codes 
                    WHERE venue_id = ? AND created_by = ? AND is_active = TRUE 
                    AND expires_at > NOW()
                    AND current_usage >= max_capacity
                    ORDER BY created_at DESC LIMIT 1`,
                    venueID, adminID, // Added adminID filter
                ).Scan(&fullQR.ID, &fullQR.QRData, &fullQR.ExpiresAt, 
                      &fullQR.MaxCapacity, &fullQR.CurrentUsage)

                 if err == nil {
                    w.Header().Set("Content-Type", "application/json")
                    json.NewEncoder(w).Encode(map[string]interface{}{
                        "success":        true,
                        "qr_string":      fullQR.QRData,
                        "expires_in":     time.Until(fullQR.ExpiresAt).Minutes(),
                        "expires_at":     fullQR.ExpiresAt.Format(time.RFC3339),
                        "qr_id":          fullQR.ID,
                        "max_capacity":   fullQR.MaxCapacity,
                        "current_usage":  fullQR.CurrentUsage,
                        "remaining_slots": 0,
                        "is_new":         false,
                        "is_full":        true, // Indicate this QR is full
                    })
                    return
                }
            }
        }
    }

    // Generate new QR code
    expiresAt := time.Now().Add(240 * time.Minute)
    qrData, err := qr.GenerateSecureQR(venueID, 240*time.Minute)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "failed to generate QR code"})
        return
    }

    // Generate a QR group ID for tracking
    qrGroupID := uuid.New().String()
    qrID := uuid.New().String()

    // Set max capacity to 2 (not 15) - keep 15 commented as requested
    maxCapacity := 15 // 15 // Keep 15 commented near 2

    // Store the new QR code with fixed capacity of 2
   _, err = database.GetDB().Exec(`
        INSERT INTO venue_qr_codes 
        (id, venue_id, qr_data, expires_at, is_active, max_capacity, current_usage, qr_group_id, created_by) 
        VALUES (?, ?, ?, NOW() + INTERVAL 240 MINUTE, TRUE, ?, 0, ?, ?)`, // Added created_by
        qrID, venueID, qrData, maxCapacity, qrGroupID, adminID) // Added adminID
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "failed to store QR code"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "success":        true,
        "qr_string":      qrData,
        "expires_in":     240,
        "expires_at":     expiresAt.Format(time.RFC3339),
        "qr_id":          qrID,
        "max_capacity":   maxCapacity,
        "current_usage":  0,
        "remaining_slots": maxCapacity,
        "qr_group_id":    qrGroupID,
        "is_new":         true, // Indicate this is a new QR
    })
}


func GetQRHistory(w http.ResponseWriter, r *http.Request) {
    venueID := r.URL.Query().Get("venue_id")
    if venueID == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]interface{}{
            "success": false,
            "error":   "venue_id parameter is required",
            "data":    []interface{}{},
        })
        return
    }

    adminID := r.Context().Value("userID").(string)
    if adminID == "" {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]interface{}{
            "success": false,
            "error":   "Admin authentication required",
            "data":    []interface{}{},
        })
        return
    }

    // Debug logging
    fmt.Printf("GetQRHistory - venueID: %s, adminID: %s\n", venueID, adminID)

    // Modified query: Remove created_by filter and handle expires_at as string first
    rows, err := database.GetDB().Query(`
        SELECT id, qr_data, expires_at, is_active, max_capacity, current_usage, qr_group_id, created_at, created_by
        FROM venue_qr_codes 
        WHERE venue_id = ?
        ORDER BY created_at DESC`,
        venueID)
    
    if err != nil {
        fmt.Printf("Database error: %v\n", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]interface{}{
            "success": false,
            "error":   "Database error: " + err.Error(),
            "data":    []interface{}{},
        })
        return
    }
    defer rows.Close()

    var qrCodes []map[string]interface{}
    for rows.Next() {
        var qr struct {
            ID          string
            QRData      string
            ExpiresAt   []byte  // Change to []byte to handle the raw database value
            IsActive    bool
            MaxCapacity int
            CurrentUsage int
            QRGroupID   string
            CreatedAt   []byte  // Change to []byte for created_at as well
            CreatedBy   string
        }
        
        // Scan into byte arrays first
        if err := rows.Scan(&qr.ID, &qr.QRData, &qr.ExpiresAt, &qr.IsActive, 
                          &qr.MaxCapacity, &qr.CurrentUsage, &qr.QRGroupID, &qr.CreatedAt, &qr.CreatedBy); err != nil {
            fmt.Printf("Row scan error: %v\n", err)
            continue
        }

        // Convert byte arrays to time.Time objects
        expiresAtStr := string(qr.ExpiresAt)
        createdAtStr := string(qr.CreatedAt)
        
        var expiresAtTime time.Time
        var createdAtTime time.Time
        
        // Parse expires_at - try multiple formats
        if t, err := time.Parse("2006-01-02 15:04:05", expiresAtStr); err == nil {
            expiresAtTime = t
        } else if t, err := time.Parse(time.RFC3339, expiresAtStr); err == nil {
            expiresAtTime = t
        } else {
            fmt.Printf("Could not parse expires_at: %s\n", expiresAtStr)
            expiresAtTime = time.Now() // fallback
        }
        
        // Parse created_at - try multiple formats
        if t, err := time.Parse("2006-01-02 15:04:05", createdAtStr); err == nil {
            createdAtTime = t
        } else if t, err := time.Parse(time.RFC3339, createdAtStr); err == nil {
            createdAtTime = t
        } else {
            fmt.Printf("Could not parse created_at: %s\n", createdAtStr)
            createdAtTime = time.Now() // fallback
        }

        qrCodes = append(qrCodes, map[string]interface{}{
            "id":            qr.ID,
            "qr_data":       qr.QRData,
            "expires_at":    expiresAtTime.Format(time.RFC3339),
            "is_active":     qr.IsActive,
            "max_capacity":  qr.MaxCapacity,
            "current_usage": qr.CurrentUsage,
            "remaining":     qr.MaxCapacity - qr.CurrentUsage,
            "is_full":       qr.CurrentUsage >= qr.MaxCapacity,
            "is_expired":    time.Now().After(expiresAtTime),
            "qr_group_id":   qr.QRGroupID,
            "created_at":    createdAtTime.Format(time.RFC3339),
            "created_by":    qr.CreatedBy,
        })
    }

    fmt.Printf("Found %d QR codes for venue %s\n", len(qrCodes), venueID)

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "success": true,
        "data":    qrCodes,
        "count":   len(qrCodes),
    })
}



func isWithinSessionTime(sessionTiming, availableDays, startTime, endTime string) bool {
    now := time.Now()
    currentTime := now.Format("15:04")
    currentDay := strings.ToLower(now.Weekday().String()[:3]) // "mon", "tue", etc.

    // Parse session timing if available (DD/MM/YYYY | HH:MM AM/PM - HH:MM AM/PM)
    if sessionTiming != "" {
        parts := strings.Split(sessionTiming, " | ")
        if len(parts) == 2 {
            datePart := parts[0]
            timeRange := parts[1]
            
            // Parse date
            dateParts := strings.Split(datePart, "/")
            if len(dateParts) == 3 {
                day, _ := strconv.Atoi(dateParts[0])
                month, _ := strconv.Atoi(dateParts[1])
                year, _ := strconv.Atoi(dateParts[2])
                
                sessionDate := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.Local)
                today := time.Now().Truncate(24 * time.Hour)
                
                // Check if session is today
                if sessionDate.Equal(today) {
                    // Parse time range
                    timeParts := strings.Split(timeRange, " - ")
                    if len(timeParts) == 2 {
                        startStr := strings.TrimSpace(timeParts[0])
                        endStr := strings.TrimSpace(timeParts[1])
                        
                        start, err1 := parseTime12Hour(startStr)
                        end, err2 := parseTime12Hour(endStr)
                        
                        if err1 == nil && err2 == nil {
                            current := time.Now()
                            return current.After(start) && current.Before(end)
                        }
                    }
                }
            }
        }
    }

    // Fallback to available_days and start_time/end_time if session_timing is not set
    if availableDays != "" {
        days := strings.Split(strings.ToLower(availableDays), ",")
        dayAllowed := false
        for _, day := range days {
            if strings.TrimSpace(day) == currentDay {
                dayAllowed = true
                break
            }
        }
        
        if !dayAllowed {
            return false
        }
    }

    // Check time range
    if startTime != "" && endTime != "" {
        start, err1 := time.Parse("15:04", startTime)
        end, err2 := time.Parse("15:04", endTime)
        
        if err1 == nil && err2 == nil {
            current, err := time.Parse("15:04", currentTime)
            if err == nil {
                return current.After(start) && current.Before(end)
            }
        }
    }

    return true // Default to allowed if no timing restrictions
}

func parseTime12Hour(timeStr string) (time.Time, error) {
    layout := "3:04 PM"
    t, err := time.Parse(layout, timeStr)
    if err != nil {
        return time.Time{}, err
    }
    
    // Set to today's date
    now := time.Now()
    return time.Date(now.Year(), now.Month(), now.Day(), t.Hour(), t.Minute(), 0, 0, now.Location()), nil
}

func IncrementQRUsage(qrID string) error {
    _, err := database.GetDB().Exec(`
        UPDATE venue_qr_codes 
        SET current_usage = current_usage + 1 
        WHERE id = ? AND is_active = TRUE 
        AND current_usage < max_capacity
        AND expires_at > NOW()`,
        qrID)
    return err
}


func GetQRDetails(qrID string) (map[string]interface{}, error) {
    var details struct {
        VenueID      string
        MaxCapacity  int
        CurrentUsage int
        IsActive     bool
        ExpiresAt    time.Time
    }
    
    err := database.GetDB().QueryRow(`
        SELECT venue_id, max_capacity, current_usage, is_active, expires_at
        FROM venue_qr_codes 
        WHERE id = ?`,
        qrID).Scan(&details.VenueID, &details.MaxCapacity, 
                   &details.CurrentUsage, &details.IsActive, &details.ExpiresAt)
    
    if err != nil {
        return nil, err
    }
    
    return map[string]interface{}{
        "venue_id":      details.VenueID,
        "max_capacity":  details.MaxCapacity,
        "current_usage": details.CurrentUsage,
        "is_active":     details.IsActive,
        "expires_at":    details.ExpiresAt,
        "is_full":       details.CurrentUsage >= details.MaxCapacity,
        "is_expired":    time.Now().After(details.ExpiresAt),
    }, nil
}

func CleanupExpiredQRCodes() error {
    _, err := database.GetDB().Exec(
        "UPDATE venue_qr_codes SET is_active = FALSE WHERE expires_at < UTC_TIMESTAMP() AND is_active = TRUE",
    )
    return err
}
