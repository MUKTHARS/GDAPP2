package middleware

import (
	"context"
	"encoding/json"
	"gd/student/utils"
	"log"
	"net/http"
	"strings"
)

func StudentOnly(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        log.Println("StudentOnly middleware - incoming request:", r.URL.Path)
        
        authHeader := r.Header.Get("Authorization")
        if authHeader == "" {
            log.Println("No authorization header found")
            w.WriteHeader(http.StatusUnauthorized)
            json.NewEncoder(w).Encode(map[string]string{"error": "Authorization header required"})
            return
        }

        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        if tokenString == authHeader {
            log.Println("Invalid token format - Bearer prefix missing")
            w.WriteHeader(http.StatusUnauthorized)
            json.NewEncoder(w).Encode(map[string]string{"error": "Bearer token required"})
            return
        }

        log.Println("Verifying token...")
        claims, err := jwt.VerifyStudentToken(tokenString)
        if err != nil {
            log.Printf("Token verification failed: %v", err)
            w.WriteHeader(http.StatusForbidden)
            json.NewEncoder(w).Encode(map[string]string{"error": "Invalid token", "details": err.Error()})
            return
        }

        if claims.Role != "student" {
            log.Printf("Invalid role: %s", claims.Role)
            w.WriteHeader(http.StatusForbidden)
            json.NewEncoder(w).Encode(map[string]string{"error": "Insufficient privileges"})
            return
        }

        log.Printf("Token valid for student %s, level %d", claims.UserID, claims.Level)
        
        // Add debug log
        log.Printf("Setting context values - studentID: %s, studentLevel: %d", claims.UserID, claims.Level)
        
        ctx := context.WithValue(r.Context(), "studentID", claims.UserID)
        ctx = context.WithValue(ctx, "studentLevel", claims.Level)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
