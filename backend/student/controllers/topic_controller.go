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
	if err != nil || level < 1 || level > 5 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid level"})
		return
	}

	var topicText string
	var prepMaterialsJSON []byte
	
	err = database.GetDB().QueryRow(`
		SELECT topic_text, prep_materials 
		FROM gd_topics 
		WHERE level = ? 
		ORDER BY RAND() 
		LIMIT 1`,
		level,
	).Scan(&topicText, &prepMaterialsJSON)

	if err != nil {
		if err == sql.ErrNoRows {
			// Return a default topic if none found
			defaultTopic := map[string]interface{}{
				"topic_text": "Discuss the impact of technology on modern education",
				"prep_materials": map[string]interface{}{
					"key_points": "",
					"references": "",
					"discussion_angles": "",
				},
				"level": level,
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
		"level":      level,
	}
	
	if len(prepMaterialsJSON) > 0 {
		var prepMaterials map[string]interface{}
		if err := json.Unmarshal(prepMaterialsJSON, &prepMaterials); err == nil {
			response["prep_materials"] = prepMaterials
		} else {
			response["prep_materials"] = map[string]interface{}{
				"key_points": "",
				"references": "",
				"discussion_angles": "",
			}
		}
	} else {
		response["prep_materials"] = map[string]interface{}{
			"key_points": "",
			"references": "",
			"discussion_angles": "",
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func assignTopicToSession(sessionID string, level int) error {
    var topicID string
    err := database.GetDB().QueryRow(`
        SELECT id FROM gd_topics 
        WHERE level = ? AND is_active = TRUE 
        ORDER BY RAND() LIMIT 1
    `, level).Scan(&topicID)
    
    if err != nil {
        return err
    }
    
    _, err = database.GetDB().Exec(`
        UPDATE gd_sessions SET topic_id = ? WHERE id = ?
    `, topicID, sessionID)
    
    return err
}

func GetSessionTopic(w http.ResponseWriter, r *http.Request) {
    sessionID := r.URL.Query().Get("session_id")
    if sessionID == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Session ID is required"})
        return
    }

    var (
        topicText      string
        prepMaterialsJSON []byte
        level          int
    )
    
    err := database.GetDB().QueryRow(`
        SELECT t.topic_text, t.prep_materials, t.level
        FROM gd_sessions s
        JOIN gd_topics t ON s.topic_id = t.id
        WHERE s.id = ?
    `, sessionID).Scan(&topicText, &prepMaterialsJSON, &level)

    if err != nil {
        if err == sql.ErrNoRows {
            // Fallback to random topic by level
            var sessionLevel int
            err := database.GetDB().QueryRow(`
                SELECT level FROM gd_sessions WHERE id = ?
            `, sessionID).Scan(&sessionLevel)
            
            if err != nil {
                w.WriteHeader(http.StatusInternalServerError)
                json.NewEncoder(w).Encode(map[string]string{"error": "Failed to get session level"})
                return
            }
            
            // Get random topic for the session level
            err = database.GetDB().QueryRow(`
                SELECT topic_text, prep_materials, level 
                FROM gd_topics 
                WHERE level = ? AND is_active = TRUE 
                ORDER BY RAND() LIMIT 1
            `, sessionLevel).Scan(&topicText, &prepMaterialsJSON, &level)
            
            if err != nil {
                // Ultimate fallback
                topicText = "Discuss the impact of technology on modern education"
                prepMaterialsJSON = []byte("{}")
                level = sessionLevel
            }
        } else {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
            return
        }
    }

    response := map[string]interface{}{
        "topic_text": topicText,
        "level":      level,
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