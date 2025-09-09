package controllers

import (
	"encoding/json"
	"net/http"
)

func GetQualificationRates(w http.ResponseWriter, r *http.Request) {
	data := map[string]interface{}{
		"cs":   65.2,
		"ece":  58.7,
		"mech": 72.1,
	}
	json.NewEncoder(w).Encode(data)
}

