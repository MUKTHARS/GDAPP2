// routes/admin_routes.go
package routes

import (
	"fmt"
	"gd/admin/controllers"
	"gd/admin/middleware"
	"log"
	"net/http"
)

var baseurl = "/api/gd/admin"

func StudentLogin(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Student login reached")
}


func SetupAdminRoutes() *http.ServeMux {
	router := http.NewServeMux()

	// Auth routes
	router.Handle(baseurl+"/login", http.HandlerFunc(controllers.AdminLogin))
	// QR route
	router.Handle(baseurl+"/qr", middleware.AdminOnly(http.HandlerFunc(controllers.GenerateQR)))
	// Session routes
	router.Handle(baseurl+"/sessions/bulk", middleware.AdminOnly(http.HandlerFunc(controllers.CreateBulkSessions)))

	// Venue routes - single handler for both GET and POST
router.Handle(baseurl+"/venues/delete", middleware.AdminOnly(
    http.HandlerFunc(controllers.DeleteVenue),
))

// Update the venues route to handle DELETE method
router.Handle(baseurl+"/venues", middleware.AdminOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    switch r.Method {
    case http.MethodGet:
        controllers.GetVenues(w, r)
    case http.MethodPost:
        controllers.CreateVenue(w, r)
    case http.MethodPut:
        controllers.UpdateVenue(w, r)
    case http.MethodDelete:
        controllers.DeleteVenue(w, r)
    default:
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    }
})))

	router.Handle(baseurl+"/venues/", middleware.AdminOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut {
			controllers.UpdateVenue(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})))

	// router.Handle("/admin/rules", middleware.AdminOnly(
	// http.HandlerFunc(controllers.UpdateSessionRules)))

	router.Handle(baseurl+"/analytics/qualifications", middleware.AdminOnly(
		http.HandlerFunc(controllers.GetQualificationRates)))

	router.Handle(baseurl+"/sessions", middleware.AdminOnly(
		http.HandlerFunc(controllers.GetSessions)))
	router.Handle(baseurl+"/questions", middleware.AdminOnly(
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
	router.Handle(baseurl+"/topics", middleware.AdminOnly(
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
	router.Handle(baseurl+"/ranking-points", middleware.AdminOnly(
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

	router.Handle(baseurl+"/ranking-points/toggle", middleware.AdminOnly(
		http.HandlerFunc(controllers.ToggleRankingPointsConfig),
	))
	router.Handle(baseurl+"/bookings", middleware.AdminOnly(
		http.HandlerFunc(controllers.GetStudentBookings)))
	router.Handle(baseurl+"/rules", middleware.AdminOnly(
		http.HandlerFunc(controllers.UpdateSessionRules)))
	log.Println(baseurl+"Venue routes setup complete")
	router.Handle(baseurl+"/qr/manage", middleware.AdminOnly(
		http.HandlerFunc(controllers.GetVenueQRCodes)))
	router.Handle(baseurl+"/qr/deactivate", middleware.AdminOnly(
		http.HandlerFunc(controllers.DeactivateQR)))
	router.Handle(baseurl+"/students/booking", middleware.AdminOnly(
		http.HandlerFunc(controllers.GetStudentBookingDetails)))
	router.Handle(baseurl+"/results/top", middleware.AdminOnly(
		http.HandlerFunc(controllers.GetTopParticipants)))
	router.Handle(baseurl+"/feedbacks", middleware.AdminOnly(
		http.HandlerFunc(controllers.GetSessionFeedbacks)))
	return router

}
