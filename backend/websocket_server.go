package main

import (
	// "encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Session struct {
	PrepStartTime    time.Time
	DiscussionStartTime time.Time
	PrepDuration     int
	DiscussionDuration int
	Clients      map[*websocket.Conn]bool
	Mutex        sync.Mutex
	CurrentPhase string
}

var sessions = make(map[string]*Session)

type Message struct {
	Type         string `json:"type"`
	TimeRemaining int    `json:"timeRemaining,omitempty"`
	ClientTime   int64  `json:"clientTime,omitempty"`
	Phase        string `json:"phase,omitempty"`
	Duration     int    `json:"duration,omitempty"`
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Path[len("/ws/gd-session/"):]
	if sessionID == "" {
		http.Error(w, "Session ID required", http.StatusBadRequest)
		return
	}

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer ws.Close()

	// Get or create session
	session, exists := sessions[sessionID]
	if !exists {
		// In real implementation, fetch session details from database
		session = &Session{
			PrepDuration:     120, // 2 minutes default prep
			DiscussionDuration: 300, // 5 minutes default discussion
			Clients:   make(map[*websocket.Conn]bool),
			CurrentPhase: "prep",
		}
		sessions[sessionID] = session
	}

	// Add client to session
	session.Mutex.Lock()
	session.Clients[ws] = true
	session.Mutex.Unlock()

	// Calculate current time remaining based on phase
	var timeRemaining int
	now := time.Now()
	
	if session.CurrentPhase == "prep" && !session.PrepStartTime.IsZero() {
		elapsed := now.Sub(session.PrepStartTime)
		timeRemaining = int(session.PrepDuration - int(elapsed.Seconds()))
	} else if session.CurrentPhase == "discussion" && !session.DiscussionStartTime.IsZero() {
		elapsed := now.Sub(session.DiscussionStartTime)
		timeRemaining = int(session.DiscussionDuration - int(elapsed.Seconds()))
	} else {
		// Default to full duration if not started
		if session.CurrentPhase == "prep" {
			timeRemaining = session.PrepDuration
		} else {
			timeRemaining = session.DiscussionDuration
		}
	}

	if timeRemaining < 0 {
		timeRemaining = 0
	}

	// Send initial time to client
	initialMsg := Message{
		Type:         "time_update",
		TimeRemaining: timeRemaining,
		Phase:        session.CurrentPhase,
	}
	ws.WriteJSON(initialMsg)

	// Handle messages from client
	for {
		var msg Message
		err := ws.ReadJSON(&msg)
		if err != nil {
			log.Printf("Read error: %v", err)
			break
		}

		switch msg.Type {
		case "sync_time":
			// Client requesting time sync
			var remaining int
			now := time.Now()
			
			if session.CurrentPhase == "prep" && !session.PrepStartTime.IsZero() {
				elapsed := now.Sub(session.PrepStartTime)
				remaining = int(session.PrepDuration - int(elapsed.Seconds()))
			} else if session.CurrentPhase == "discussion" && !session.DiscussionStartTime.IsZero() {
				elapsed := now.Sub(session.DiscussionStartTime)
				remaining = int(session.DiscussionDuration - int(elapsed.Seconds()))
			} else {
				if session.CurrentPhase == "prep" {
					remaining = session.PrepDuration
				} else {
					remaining = session.DiscussionDuration
				}
			}

			if remaining < 0 {
				remaining = 0
			}

			response := Message{
				Type:         "time_update",
				TimeRemaining: remaining,
				Phase:        session.CurrentPhase,
			}
			ws.WriteJSON(response)

		case "timer_start":
			// Client starting a timer for a specific phase
			if msg.Phase == "prep" {
				session.PrepStartTime = time.Now()
				session.CurrentPhase = "prep"
			} else if msg.Phase == "discussion" {
				session.DiscussionStartTime = time.Now()
				session.CurrentPhase = "discussion"
			}

		case "time_update":
			// Client sending time update
			broadcastToSession(sessionID, Message{
				Type:         "time_update",
				TimeRemaining: msg.TimeRemaining,
				Phase:        msg.Phase,
			})

		case "timer_complete":
			// Timer completed on client
			if msg.Phase == "prep" {
				// Transition to discussion phase
				session.CurrentPhase = "discussion"
				session.DiscussionStartTime = time.Now()
			}
			
			broadcastToSession(sessionID, Message{
				Type: "phase_change",
				Phase: session.CurrentPhase,
			})
		}
	}

	// Remove client from session
	session.Mutex.Lock()
	delete(session.Clients, ws)
	session.Mutex.Unlock()
}

func broadcastToSession(sessionID string, msg Message) {
	session, exists := sessions[sessionID]
	if !exists {
		return
	}

	session.Mutex.Lock()
	defer session.Mutex.Unlock()

	for client := range session.Clients {
		err := client.WriteJSON(msg)
		if err != nil {
			log.Printf("Broadcast error: %v", err)
			client.Close()
			delete(session.Clients, client)
		}
	}
}