// routes/admin_routes.go
package routes

import (
	"gd/admin/controllers"
	"gd/admin/middleware"
	"log"

	// "strings"
	// "log"
	"net/http"
)

var baseurl = "/api/gd"

func SetupAdminRoutes() *http.ServeMux {
	router := http.NewServeMux()

	// Auth routes
	router.Handle("/admin/login", http.HandlerFunc(controllers.AdminLogin))

	// QR routes
	router.Handle("/admin/qr", middleware.AdminOnly(http.HandlerFunc(controllers.GenerateQR)))

	// Session routes
	router.Handle("/admin/sessions/bulk", middleware.AdminOnly(http.HandlerFunc(controllers.CreateBulkSessions)))

	// Venue routes - single handler for both GET and POST
	router.Handle("/admin/venues", middleware.AdminOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			controllers.GetVenues(w, r)
		case http.MethodPost:
			controllers.CreateVenue(w, r)
		case http.MethodPut:
			controllers.UpdateVenue(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})))

	router.Handle("/admin/venues/", middleware.AdminOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut {
			controllers.UpdateVenue(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})))

	// router.Handle("/admin/rules", middleware.AdminOnly(
	// http.HandlerFunc(controllers.UpdateSessionRules)))

	router.Handle("/admin/analytics/qualifications", middleware.AdminOnly(
		http.HandlerFunc(controllers.GetQualificationRates)))

	router.Handle("/admin/sessions", middleware.AdminOnly(
		http.HandlerFunc(controllers.GetSessions)))
	router.Handle("/admin/questions", middleware.AdminOnly(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodGet:
				controllers.GetQuestions(w, r)
			case http.MethodPost:
				controllers.CreateQuestion(w, r)
			case http.MethodPut:
				controllers.UpdateQuestion(w, r)
			case http.MethodDelete:
				controllers.DeleteQuestion(w, r)
			default:
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		}),
	))
	router.Handle("/admin/topics", middleware.AdminOnly(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodGet:
				controllers.GetTopics(w, r)
			case http.MethodPost:
				controllers.CreateTopic(w, r)
			case http.MethodPut:
				controllers.UpdateTopic(w, r)
			case http.MethodDelete:
				controllers.DeleteTopic(w, r)
			default:
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		}),
	))
	router.Handle("/admin/ranking-points", middleware.AdminOnly(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodGet:
				controllers.GetRankingPointsConfig(w, r)
			case http.MethodPost:
				controllers.UpdateRankingPointsConfig(w, r)
			case http.MethodDelete:
				controllers.DeleteRankingPointsConfig(w, r)
			default:
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		}),
	))

	router.Handle("/admin/ranking-points/toggle", middleware.AdminOnly(
		http.HandlerFunc(controllers.ToggleRankingPointsConfig),
	))
	router.Handle("/admin/bookings", middleware.AdminOnly(
		http.HandlerFunc(controllers.GetStudentBookings)))
	router.Handle("/admin/rules", middleware.AdminOnly(
		http.HandlerFunc(controllers.UpdateSessionRules)))
	log.Println("Venue routes setup complete")
	router.Handle("/admin/qr/manage", middleware.AdminOnly(
		http.HandlerFunc(controllers.GetVenueQRCodes)))
	router.Handle("/admin/qr/deactivate", middleware.AdminOnly(
		http.HandlerFunc(controllers.DeactivateQR)))
	router.Handle("/admin/students/booking", middleware.AdminOnly(
		http.HandlerFunc(controllers.GetStudentBookingDetails)))
	router.Handle("/admin/results/top", middleware.AdminOnly(
		http.HandlerFunc(controllers.GetTopParticipants)))
	router.Handle("/admin/feedbacks", middleware.AdminOnly(
		http.HandlerFunc(controllers.GetSessionFeedbacks)))
	return router

}
