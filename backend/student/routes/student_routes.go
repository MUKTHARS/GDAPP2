package routes

import (
	"fmt"
	s "gd/admin/controllers"
	"gd/student/controllers"
	"gd/student/middleware"
	"net/http"
	"os"
	"path/filepath"
)

var baseurl = "/api/gd/student"

func StudentLogin(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Student login reached")
}

func SetupStudentRoutes() *http.ServeMux {
	router := http.NewServeMux()

	// Serve static files (uploads)
	uploadsDir := filepath.Join(getProjectRoot(), "uploads")
	router.Handle(baseurl+"/uploads/", http.StripPrefix("/uploads/", 
		http.FileServer(http.Dir(uploadsDir))))
	// Auth
	router.Handle(baseurl+"/login", http.HandlerFunc(controllers.StudentLogin))
	// Profile
	router.Handle(baseurl+"/profile", middleware.StudentOnly(
		http.HandlerFunc(controllers.GetStudentProfile)))
	// Session Management
	router.Handle(baseurl+"/sessions", middleware.StudentOnly(
		http.HandlerFunc(controllers.GetAvailableSessions)))
	router.Handle(baseurl+"/sessions/book", middleware.StudentOnly(
		http.HandlerFunc(controllers.BookVenue))) // Add this line
	router.Handle(baseurl+"/sessions/join", middleware.StudentOnly(
		http.HandlerFunc(controllers.JoinSession)))
	router.Handle(baseurl+"/session", middleware.StudentOnly(
		http.HandlerFunc(controllers.GetSessionDetails)))
	router.Handle(baseurl+"/topic",
		middleware.StudentOnly(http.HandlerFunc(controllers.GetTopicForLevel)))
	// Survey System
	router.Handle(baseurl+"/survey", middleware.StudentOnly(
		http.HandlerFunc(controllers.SubmitSurvey)))

	// Results
	router.Handle(baseurl+"/results", middleware.StudentOnly(
		http.HandlerFunc(controllers.GetResults)))
	router.Handle(baseurl+"/survey/start-question", middleware.StudentOnly(
		http.HandlerFunc(controllers.StartQuestionTimer)))
	router.Handle(baseurl+"/survey/check-timeout", middleware.StudentOnly(
		http.HandlerFunc(controllers.CheckQuestionTimeout)))
	router.Handle(baseurl+"/survey/apply-penalty", middleware.StudentOnly(
		http.HandlerFunc(controllers.ApplyQuestionPenalty)))
	router.Handle(baseurl+"/survey/start", middleware.StudentOnly(
		http.HandlerFunc(controllers.StartSurveyTimer)))
	router.Handle(baseurl+"/survey/timeout", middleware.StudentOnly(
		http.HandlerFunc(controllers.CheckSurveyTimeout)))
	router.Handle(baseurl+"/survey/penalties", middleware.StudentOnly(
		http.HandlerFunc(controllers.ApplySurveyPenalties)))
	router.Handle(baseurl+"/session/check", middleware.StudentOnly(
		http.HandlerFunc(controllers.CheckBooking)))
	router.Handle(baseurl+"/session/cancel", middleware.StudentOnly(
		http.HandlerFunc(controllers.CancelBooking)))
	router.Handle(baseurl+"/session/participants", middleware.StudentOnly(
		http.HandlerFunc(controllers.GetSessionParticipants)))
	router.Handle(baseurl+"/survey/completion", middleware.StudentOnly(
		http.HandlerFunc(controllers.CheckSurveyCompletion)))
	router.Handle(baseurl+"/survey/mark-completed", middleware.StudentOnly(
		http.HandlerFunc(controllers.MarkSurveyCompleted)))
	router.Handle(baseurl+"/feedback", middleware.StudentOnly(
		http.HandlerFunc(controllers.SubmitFeedback)))
	router.Handle(baseurl+"/session/rules", middleware.StudentOnly(
		http.HandlerFunc(s.GetSessionRules)))
	router.Handle(baseurl+"/bookings/my", middleware.StudentOnly(
		http.HandlerFunc(controllers.GetUserBookings)))

	router.Handle(baseurl+"/level/check", middleware.StudentOnly(
		http.HandlerFunc(controllers.CheckLevelProgression)))
	router.Handle(baseurl+"/feedback/get", middleware.StudentOnly(
		http.HandlerFunc(controllers.GetFeedback)))
	router.Handle(baseurl+"/questions", middleware.StudentOnly(
		http.HandlerFunc(controllers.GetQuestionsForStudent)))
	router.Handle(baseurl+"/session/status", middleware.StudentOnly(
		http.HandlerFunc(controllers.UpdateSessionStatus)))
	router.Handle(baseurl+"/session/ready", middleware.StudentOnly(
		http.HandlerFunc(controllers.UpdateReadyStatus)))
	router.Handle(baseurl+"/session/ready-status", middleware.StudentOnly(
		http.HandlerFunc(controllers.GetReadyStatus)))
	router.Handle(baseurl+"/session-history", middleware.StudentOnly(
		http.HandlerFunc(controllers.GetStudentSessionHistory)))

		
	router.Handle("/student/venues", middleware.StudentOnly(http.HandlerFunc(controllers.GetVenuesForStudent)))
	// Use the correct middleware and function name
	router.Handle(baseurl+"/level-progression", middleware.StudentOnly(
		http.HandlerFunc(controllers.CheckLevelProgression)))
	router.Handle(baseurl+"/venues", middleware.StudentOnly(
    http.HandlerFunc(controllers.GetVenuesForStudent)))
	router.Handle(baseurl+"/session/check-all-ready", middleware.StudentOnly(
		http.HandlerFunc(controllers.CheckAllReady)))
	
	return router
}

func getProjectRoot() string {
	wd, _ := os.Getwd()
	return filepath.Dir(filepath.Dir(wd)) 
}