package main

import (
	"gd/admin/middleware"
	"gd/admin/routes"
	"gd/database"
	studentRoutes "gd/student/routes"
	"log"
	"net/http"
	"os"
)

func main() {
	if err := database.Initialize(); err != nil {
		log.Fatal("Database initialization failed:", err)
	}
	defer database.GetDB().Close()

	// Parent mux
	mainMux := http.NewServeMux()

	// Admin routes
	adminRouter := routes.SetupAdminRoutes()
	mainMux.Handle("/api/gd/admin/", middleware.EnableCORS(adminRouter))

	// Student routes
	studentRouter := studentRoutes.SetupStudentRoutes()
	mainMux.Handle("/api/gd/student/", middleware.EnableCORS(studentRouter))

	// Default root
	mainMux.Handle("/", middleware.EnableCORS(http.NotFoundHandler()))

	// Get port
	port := os.Getenv("PORT")
	if port == "" {
		port = "8090"
	}

	log.Printf("Server starting on :%s...", port)
	log.Fatal(http.ListenAndServe(":"+port, mainMux))
}


// package main

// import (
// 	"gd/admin/middleware"
// 	"gd/admin/routes"
// 	"gd/database"
// 	studentRoutes "gd/student/routes"
// 	"log"
// 	"net/http"
// 	"os"
// )

// func main() {

// 	if err := database.Initialize(); err != nil {
// 		log.Fatal("Database initialization failed:", err)
// 	}
// 	defer database.GetDB().Close()

// 	adminRouter := routes.SetupAdminRoutes()
// 	// Start server with CORS middleware
// 	http.Handle("/api/gd/", middleware.EnableCORS(adminRouter))
// 	http.Handle("/", middleware.EnableCORS(adminRouter))
// 	// Student Side
// 	studentRouter := studentRoutes.SetupStudentRoutes()
// 	http.Handle("/api/gd/", middleware.EnableCORS(studentRouter))
// 	// Get port from environment or use default
// 	port := os.Getenv("PORT")
// 	if port == "" {
// 		port = "8090"
// 	}

// 	log.Printf("Server starting on :%s...", port)
// 	log.Fatal(http.ListenAndServe(":"+port, nil))
// }
