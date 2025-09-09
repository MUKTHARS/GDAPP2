// middleware/auth.go
package middleware

import (
	"context"
	"encoding/json"
	"gd/admin/utils"
	"log"
	"net/http"
	"strings"
)

func AdminOnly(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Get Authorization header
        authHeader := r.Header.Get("Authorization")
        if authHeader == "" {
            log.Println("Authorization header is required")
            w.WriteHeader(http.StatusUnauthorized)
            json.NewEncoder(w).Encode(map[string]string{"error": "Authorization header is required"})
            return
        }

        // Check if it's Bearer token
        splitToken := strings.Split(authHeader, "Bearer ")
        if len(splitToken) != 2 {
            log.Println("Invalid token format")
            w.WriteHeader(http.StatusUnauthorized)
            json.NewEncoder(w).Encode(map[string]string{"error": "Invalid token format"})
            return
        }

        token := splitToken[1]
        claims, err := jwt.VerifyToken(token)
        if err != nil {
            log.Printf("Token verification failed: %v", err)
            w.WriteHeader(http.StatusUnauthorized)
            json.NewEncoder(w).Encode(map[string]string{"error": "Invalid token"})
            return
        }
        
        if claims.Role != "admin" {
            log.Printf("Unauthorized role: %s", claims.Role)
            w.WriteHeader(http.StatusForbidden)
            json.NewEncoder(w).Encode(map[string]string{"error": "Insufficient permissions"})
            return
        }
        
        // Add user ID to context for downstream handlers
        ctx := context.WithValue(r.Context(), "userID", claims.UserID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}