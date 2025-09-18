package controllers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"gd/database"

	"github.com/google/uuid"
)

type Topic struct {
	ID           string                 `json:"id"`
	Level        int                    `json:"level"`
	TopicText    string                 `json:"topic_text"`
	PrepMaterials map[string]interface{} `json:"prep_materials"`
	IsActive     bool                   `json:"is_active"`
}

func GetTopics(w http.ResponseWriter, r *http.Request) {
	level := r.URL.Query().Get("level")
	
	var query string
	var args []interface{}
	
	if level != "" {
		query = "SELECT id, level, topic_text, prep_materials, is_active FROM gd_topics WHERE level = ? ORDER BY level, created_at DESC"
		levelInt, err := strconv.Atoi(level)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid level"})
			return
		}
		args = []interface{}{levelInt}
	} else {
		query = "SELECT id, level, topic_text, prep_materials, is_active FROM gd_topics ORDER BY level, created_at DESC"
	}

	rows, err := database.GetDB().Query(query, args...)
	if err != nil {
		log.Printf("Error fetching topics: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch topics"})
		return
	}
	defer rows.Close()

	var topics []Topic
	for rows.Next() {
		var topic Topic
		var prepMaterialsJSON []byte
		
		if err := rows.Scan(&topic.ID, &topic.Level, &topic.TopicText, &prepMaterialsJSON, &topic.IsActive); err != nil {
			log.Printf("Error scanning topic: %v", err)
			continue
		}
		
		if len(prepMaterialsJSON) > 0 {
			if err := json.Unmarshal(prepMaterialsJSON, &topic.PrepMaterials); err != nil {
				log.Printf("Error parsing prep materials: %v", err)
				topic.PrepMaterials = make(map[string]interface{})
			}
		} else {
			topic.PrepMaterials = make(map[string]interface{})
		}
		
		topics = append(topics, topic)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(topics)
}

func CreateTopic(w http.ResponseWriter, r *http.Request) {
	var topic Topic
	if err := json.NewDecoder(r.Body).Decode(&topic); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request data"})
		return
	}

	if topic.Level < 1 || topic.Level > 5 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Level must be between 1 and 5"})
		return
	}

	if topic.TopicText == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Topic text is required"})
		return
	}

	topic.ID = uuid.New().String()
	
	// Ensure prep_materials is never nil
	if topic.PrepMaterials == nil {
		topic.PrepMaterials = make(map[string]interface{})
	}
	
	prepMaterialsJSON, err := json.Marshal(topic.PrepMaterials)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to process preparation materials"})
		return
	}

	_, err = database.GetDB().Exec(`
		INSERT INTO gd_topics (id, level, topic_text, prep_materials, is_active)
		VALUES (?, ?, ?, ?, TRUE)`,
		topic.ID, topic.Level, topic.TopicText, prepMaterialsJSON,
	)

	if err != nil {
		log.Printf("Error creating topic: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create topic"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(topic)
}

func UpdateTopic(w http.ResponseWriter, r *http.Request) {
	var topic Topic
	if err := json.NewDecoder(r.Body).Decode(&topic); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request data"})
		return
	}

	if topic.ID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Topic ID is required"})
		return
	}

	// Ensure prep_materials is never nil
	if topic.PrepMaterials == nil {
		topic.PrepMaterials = make(map[string]interface{})
	}
	
	prepMaterialsJSON, err := json.Marshal(topic.PrepMaterials)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to process preparation materials"})
		return
	}

	_, err = database.GetDB().Exec(`
		UPDATE gd_topics 
		SET level = ?, topic_text = ?, prep_materials = ?
		WHERE id = ?`,
		topic.Level, topic.TopicText, prepMaterialsJSON, topic.ID,
	)

	if err != nil {
		log.Printf("Error updating topic: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update topic"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Topic updated successfully"})
}

func DeleteTopic(w http.ResponseWriter, r *http.Request) {
	topicID := r.URL.Query().Get("id")
	if topicID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Topic ID is required"})
		return
	}

	_, err := database.GetDB().Exec("DELETE FROM gd_topics WHERE id = ?", topicID)
	if err != nil {
		log.Printf("Error deleting topic: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete topic"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Topic deleted successfully"})
}