package controllers

import (
	// "database/sql"
	"database/sql"
	"encoding/json"
	"gd/database"
	"log"
	"net/http"
)

type BookingInfo struct {
    StudentID         string `json:"student_id"`
    StudentName       string `json:"student_name"`
    StudentEmail      string `json:"student_email,omitempty"`
    StudentDepartment string `json:"student_department,omitempty"`
    VenueID           string `json:"venue_id"`
    VenueName         string `json:"venue_name"`
    SessionID         string `json:"session_id"`
    SessionLevel      int    `json:"session_level"`
    SessionStatus     string `json:"session_status,omitempty"`
    SessionStart      string `json:"session_start,omitempty"`
    SessionEnd        string `json:"session_end,omitempty"`
    BookedAt          string `json:"booked_at"`
}


func GetStudentBookings(w http.ResponseWriter, r *http.Request) {
    // Get optional status filter from query parameters
    statusFilter := r.URL.Query().Get("status")
    
    baseQuery := `
        SELECT 
            su.id as student_id,
            su.full_name as student_name,
            su.email as student_email,
            su.department as student_department,
            v.id as venue_id,
            v.name as venue_name,
            s.id as session_id,
            s.level as session_level,
            s.status as session_status,
            s.start_time as session_start,
            s.end_time as session_end,
            sp.joined_at as booked_at
        FROM session_participants sp
        JOIN student_users su ON sp.student_id = su.id
        JOIN gd_sessions s ON sp.session_id = s.id
        JOIN venues v ON s.venue_id = v.id
        WHERE sp.is_dummy = FALSE
    `
    
    // Add status filter if provided
    if statusFilter != "" && statusFilter != "all" {
        baseQuery += " AND s.status = '" + statusFilter + "'"
    }
    
    baseQuery += " ORDER BY sp.joined_at DESC"
    
    rows, err := database.GetDB().Query(baseQuery)
    
    if err != nil {
        log.Printf("Database error: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode([]BookingInfo{})
        return
    }
    defer rows.Close()

    var bookings []BookingInfo
    for rows.Next() {
        var booking BookingInfo
        var sessionStatus, sessionStart, sessionEnd sql.NullString
        var studentEmail, studentDepartment sql.NullString
        
        if err := rows.Scan(
            &booking.StudentID,
            &booking.StudentName,
            &studentEmail,
            &studentDepartment,
            &booking.VenueID,
            &booking.VenueName,
            &booking.SessionID,
            &booking.SessionLevel,
            &sessionStatus,
            &sessionStart,
            &sessionEnd,
            &booking.BookedAt,
        ); err != nil {
            log.Printf("Error scanning booking row: %v", err)
            continue
        }
        
        // Add additional fields to the booking info
        booking.SessionStatus = sessionStatus.String
        booking.SessionStart = sessionStart.String
        booking.SessionEnd = sessionEnd.String
        booking.StudentEmail = studentEmail.String
        booking.StudentDepartment = studentDepartment.String
        
        bookings = append(bookings, booking)
    }

    if bookings == nil {
        bookings = []BookingInfo{}
    }

    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(bookings); err != nil {
        log.Printf("Error encoding bookings: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode([]BookingInfo{})
    }
}


func GetStudentBookingDetails(w http.ResponseWriter, r *http.Request) {
    studentID := r.URL.Query().Get("student_id")
    if studentID == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "student_id is required"})
        return
    }

    var booking struct {
        StudentID    string         `json:"student_id"`
        StudentName  string         `json:"student_name"`
        SessionID    sql.NullString `json:"session_id"`
        VenueName    sql.NullString `json:"venue_name"`
        SessionLevel sql.NullInt64  `json:"session_level"`
        SessionStart sql.NullString `json:"session_start"`
        SessionEnd   sql.NullString `json:"session_end"`
        Status       sql.NullString `json:"status"`
        BookedAt     sql.NullString `json:"booked_at"`
    }

    err := database.GetDB().QueryRow(`
        SELECT 
            su.id,
            su.full_name,
            su.current_booking,
            v.name,
            s.level,
            s.start_time,
            s.end_time,
            s.status,
            sp.joined_at
        FROM student_users su
        LEFT JOIN gd_sessions s ON su.current_booking = s.id
        LEFT JOIN venues v ON s.venue_id = v.id
        LEFT JOIN session_participants sp ON s.id = sp.session_id AND sp.student_id = su.id
        WHERE su.id = ?`,
        studentID).Scan(
            &booking.StudentID,
            &booking.StudentName,
            &booking.SessionID,
            &booking.VenueName,
            &booking.SessionLevel,
            &booking.SessionStart,
            &booking.SessionEnd,
            &booking.Status,
            &booking.BookedAt,
        )

    if err != nil {
        if err == sql.ErrNoRows {
            w.WriteHeader(http.StatusNotFound)
            json.NewEncoder(w).Encode(map[string]string{"error": "Student not found"})
        } else {
            log.Printf("Database error: %v", err)
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        }
        return
    }

    response := map[string]interface{}{
        "student_id":   booking.StudentID,
        "student_name": booking.StudentName,
        "has_booking":  booking.SessionID.Valid,
    }

    if booking.SessionID.Valid {
        response["session_id"] = booking.SessionID.String
        response["venue_name"] = booking.VenueName.String
        response["session_level"] = booking.SessionLevel.Int64
        response["session_start"] = booking.SessionStart.String
        response["session_end"] = booking.SessionEnd.String
        response["status"] = booking.Status.String
        response["booked_at"] = booking.BookedAt.String
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

