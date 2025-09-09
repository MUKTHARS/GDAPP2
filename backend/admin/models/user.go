package models

type AdminUser struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
}

// Temporary shared model (commented for multi-user)
/*
type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"` // 'admin'|'staff'|'student'
}
*/