package main

import (
	"gd/admin/middleware"
	"gd/admin/routes"
   studentRoutes "gd/student/routes"
	"gd/database"
	"log"
	"net/http"
	"os"
)

func main() {
	// Initialize database
	if err := database.Initialize(); err != nil {
		log.Fatal("Database initialization failed:", err)
	}
	defer database.GetDB().Close()

	// Setup routes
	adminRouter := routes.SetupAdminRoutes()
	// Start server with CORS middleware
	http.Handle("/admin/", middleware.EnableCORS(adminRouter))
	http.Handle("/", middleware.EnableCORS(adminRouter))
	// Student Side
    studentRouter := studentRoutes.SetupStudentRoutes()
http.Handle("/student/", middleware.EnableCORS(studentRouter))
	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on :%s...", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
