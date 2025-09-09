package jwt

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"time"
)

type QRPayload struct {
	VenueID    string    `json:"venue_id"`
	Expiry     time.Time `json:"expiry"`
	Salt       string    `json:"salt"`
}

func GenerateSecureQR(venueID string, validity time.Duration) (string, error) {
	// Generate random salt
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	payload := QRPayload{
		VenueID:    venueID,
		Expiry:     time.Now().Add(validity),
		Salt:       hex.EncodeToString(salt),
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	return string(jsonData), nil
}

func ValidateQR(data string) (bool, string) {
	var payload QRPayload
	if err := json.Unmarshal([]byte(data), &payload); err != nil {
		return false, ""
	}

	if time.Now().After(payload.Expiry) {
		return false, ""
	}

	return true, payload.VenueID
}