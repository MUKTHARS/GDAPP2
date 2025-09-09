package jwt

import (
	// "log"
	"log"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var secret = []byte(os.Getenv("JWT_SECRET_STUDENT"))

type StudentClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	Level  int    `json:"level"`
	jwt.RegisteredClaims
}


func GenerateStudentToken(id string, level int) (string, error) {
    claims := &StudentClaims{
        UserID: id,
        Role:   "student",
        Level:  level,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            NotBefore: jwt.NewNumericDate(time.Now()),
            Issuer:    "gd-app",
        },
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    tokenString, err := token.SignedString(secret)
    if err != nil {
        return "", err
    }
    
    log.Printf("Generated token for user %s (level %d)", id, level)
    return tokenString, nil
}

func VerifyStudentToken(tokenString string) (*StudentClaims, error) {
    if tokenString == "" {
        return nil, jwt.ErrInvalidKey
    }

    // Add debug log
    log.Printf("Verifying token: %s", tokenString)

    token, err := jwt.ParseWithClaims(tokenString, &StudentClaims{}, func(t *jwt.Token) (interface{}, error) {
        // Verify the signing method
        if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
            log.Printf("Unexpected signing method: %v", t.Header["alg"])
            return nil, jwt.ErrSignatureInvalid
        }
        return secret, nil
    })
    
    if err != nil {
        log.Printf("Token verification error: %v", err)
        return nil, err
    }
    
    if claims, ok := token.Claims.(*StudentClaims); ok && token.Valid {
        log.Printf("Token valid for user: %s, role: %s", claims.UserID, claims.Role)
        return claims, nil
    }
    
    log.Println("Invalid token claims")
    return nil, jwt.ErrInvalidKey
}


func init() {
    secretStr := os.Getenv("JWT_SECRET_STUDENT")
    if secretStr == "" {
        secretStr = "password123" // Fallback for development
        log.Println("WARNING: Using default JWT secret - configure JWT_SECRET_STUDENT for production")
    }
    secret = []byte(secretStr)
    log.Printf("JWT secret initialized (length: %d)", len(secret))
}


