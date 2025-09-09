// Create a new controller file for student topic access
// C:\xampp\htdocs\GDAPPC\backend\student\controllers\topic_controller.go
package controllers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"gd/database"
)

func GetTopicForLevel(w http.ResponseWriter, r *http.Request) {
	levelStr := r.URL.Query().Get("level")
	if levelStr == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Level is required"})
		return
	}

	level, err := strconv.Atoi(levelStr)
	if err != nil || level < 1 || level > 3 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid level"})
		return
	}

	var topicText string
	var prepMaterialsJSON []byte
	
	err = database.GetDB().QueryRow(`
		SELECT topic_text, prep_materials 
		FROM gd_topics 
		WHERE level = ? AND is_active = TRUE 
		ORDER BY RAND() 
		LIMIT 1`,
		level,
	).Scan(&topicText, &prepMaterialsJSON)

	if err != nil {
		if err == sql.ErrNoRows {
			// Return a default topic if none found
			defaultTopic := map[string]interface{}{
				"topic_text": "Discuss the impact of technology on modern education",
				"prep_materials": map[string]string{},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(defaultTopic)
			return
		}
		log.Printf("Error fetching topic: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch topic"})
		return
	}

	response := map[string]interface{}{
		"topic_text": topicText,
	}
	
	if len(prepMaterialsJSON) > 0 {
		var prepMaterials map[string]interface{}
		if err := json.Unmarshal(prepMaterialsJSON, &prepMaterials); err == nil {
			response["prep_materials"] = prepMaterials
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}