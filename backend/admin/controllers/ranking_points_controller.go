package controllers

import (
	"encoding/json"
	"gd/database"
	"log"
	"net/http"
	"strconv"

	"github.com/google/uuid"
)

type RankingPointsConfig struct {
	ID                string  `json:"id"`
	FirstPlacePoints  float64 `json:"first_place_points"`
	SecondPlacePoints float64 `json:"second_place_points"`
	ThirdPlacePoints  float64 `json:"third_place_points"`
	Level             int     `json:"level"`
	IsActive          bool    `json:"is_active"`
}

// Get all configurations or specific level
func GetRankingPointsConfig(w http.ResponseWriter, r *http.Request) {
	levelStr := r.URL.Query().Get("level")
	id := r.URL.Query().Get("id")
	
	var query string
	var args []interface{}

	if id != "" {
		// Get specific config by ID
		query = "SELECT id, first_place_points, second_place_points, third_place_points, level, is_active FROM ranking_points_config WHERE id = ?"
		args = []interface{}{id}
	} else if levelStr != "" {
		// Get config for specific level
		level, err := strconv.Atoi(levelStr)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid level"})
			return
		}
		query = "SELECT id, first_place_points, second_place_points, third_place_points, level, is_active FROM ranking_points_config WHERE level = ? ORDER BY created_at DESC"
		args = []interface{}{level}
	} else {
		// Get all configurations
		query = "SELECT id, first_place_points, second_place_points, third_place_points, level, is_active FROM ranking_points_config ORDER BY level, created_at DESC"
	}

	rows, err := database.GetDB().Query(query, args...)
	if err != nil {
		log.Printf("Database error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	defer rows.Close()

	var configs []RankingPointsConfig
	for rows.Next() {
		var config RankingPointsConfig
		if err := rows.Scan(&config.ID, &config.FirstPlacePoints, &config.SecondPlacePoints, &config.ThirdPlacePoints, &config.Level, &config.IsActive); err != nil {
			log.Printf("Error scanning config: %v", err)
			continue
		}
		configs = append(configs, config)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(configs)
}

// Create or update configuration
func UpdateRankingPointsConfig(w http.ResponseWriter, r *http.Request) {
	var config RankingPointsConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	// Validate points
	if config.FirstPlacePoints <= 0 || config.SecondPlacePoints <= 0 || config.ThirdPlacePoints <= 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Points must be positive values"})
		return
	}

	if config.FirstPlacePoints <= config.SecondPlacePoints || config.SecondPlacePoints <= config.ThirdPlacePoints {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Points must be in descending order (1st > 2nd > 3rd)"})
		return
	}

	userID := r.Context().Value("userID").(string)
	var err error

	if config.ID == "" {
		// Create new config
		config.ID = uuid.New().String()
		_, err = database.GetDB().Exec(`
			INSERT INTO ranking_points_config 
			(id, first_place_points, second_place_points, third_place_points, level, is_active, created_by)
			VALUES (?, ?, ?, ?, ?, TRUE, ?)`,
			config.ID, config.FirstPlacePoints, config.SecondPlacePoints, config.ThirdPlacePoints, config.Level, userID)
	} else {
		// Update existing config
		_, err = database.GetDB().Exec(`
			UPDATE ranking_points_config 
			SET first_place_points = ?, second_place_points = ?, third_place_points = ?, level = ?, updated_at = NOW()
			WHERE id = ?`,
			config.FirstPlacePoints, config.SecondPlacePoints, config.ThirdPlacePoints, config.Level, config.ID)
	}

	if err != nil {
		log.Printf("Database error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save configuration"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"config": config,
	})
}

// Delete configuration
func DeleteRankingPointsConfig(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Configuration ID is required"})
		return
	}

	// Check if config exists
	var exists bool
	err := database.GetDB().QueryRow(
		"SELECT EXISTS(SELECT 1 FROM ranking_points_config WHERE id = ?)",
		id,
	).Scan(&exists)

	if err != nil {
		log.Printf("Database error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	if !exists {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Configuration not found"})
		return
	}

	// Delete the configuration
	_, err = database.GetDB().Exec("DELETE FROM ranking_points_config WHERE id = ?", id)
	if err != nil {
		log.Printf("Database error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete configuration"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// Toggle configuration active status
func ToggleRankingPointsConfig(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Configuration ID is required"})
		return
	}

	var isActive bool
	err := database.GetDB().QueryRow(
		"SELECT is_active FROM ranking_points_config WHERE id = ?",
		id,
	).Scan(&isActive)

	if err != nil {
		log.Printf("Database error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	// Toggle the active status
	_, err = database.GetDB().Exec(
		"UPDATE ranking_points_config SET is_active = ?, updated_at = NOW() WHERE id = ?",
		!isActive, id,
	)

	if err != nil {
		log.Printf("Database error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update configuration"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"is_active": !isActive,
	})
}