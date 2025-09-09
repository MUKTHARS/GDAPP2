// backend/admin/controllers/qr_management_controller.go
package controllers

import (
	"encoding/json"
	"gd/database"
	"net/http"
)

func GetVenueQRCodes(w http.ResponseWriter, r *http.Request) {
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

    rows, err := database.GetDB().Query(`
        SELECT id, qr_data, expires_at, is_active, max_capacity, current_usage, qr_group_id, created_at
        FROM venue_qr_codes 
        WHERE venue_id = ? AND created_by = ? AND is_active = TRUE
        AND expires_at > NOW()
        ORDER BY created_at DESC`,
        venueID, adminID) 
    
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }
    defer rows.Close()

    var qrCodes []map[string]interface{}
    for rows.Next() {
        var qr struct {
            ID          string
            QRData      string
            ExpiresAt   string
            IsActive    bool
            MaxCapacity int
            CurrentUsage int
            QRGroupID   string
            CreatedAt   string
        }
        
        if err := rows.Scan(&qr.ID, &qr.QRData, &qr.ExpiresAt, &qr.IsActive, 
                          &qr.MaxCapacity, &qr.CurrentUsage, &qr.QRGroupID, &qr.CreatedAt); err != nil {
            continue
        }

        qrCodes = append(qrCodes, map[string]interface{}{
            "id":            qr.ID,
            "qr_data_short": qr.QRData[:20] + "...", // Show partial data for security
            "expires_at":    qr.ExpiresAt,
            "is_active":     qr.IsActive,
            "max_capacity":  qr.MaxCapacity,
            "current_usage": qr.CurrentUsage,
            "remaining":     qr.MaxCapacity - qr.CurrentUsage,
            "is_full":       qr.CurrentUsage >= qr.MaxCapacity,
            "qr_group_id":   qr.QRGroupID,
            "created_at":    qr.CreatedAt,
        })
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(qrCodes)
}

func DeactivateQR(w http.ResponseWriter, r *http.Request) {
    qrID := r.URL.Query().Get("qr_id")
    if qrID == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "qr_id parameter is required"})
        return
    }

 adminID := r.Context().Value("userID").(string)
    if adminID == "" {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "Admin authentication required"})
        return
    }


    _, err := database.GetDB().Exec(`
        UPDATE venue_qr_codes 
        SET is_active = FALSE 
       WHERE id = ? AND created_by = ?`, 
        qrID, adminID)
    
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to deactivate QR code"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}