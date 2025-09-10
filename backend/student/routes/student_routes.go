package routes

import (
	"gd/student/controllers"
   s "gd/admin/controllers"
	"gd/student/middleware"
	"net/http"
)

func SetupStudentRoutes() *http.ServeMux {
    router := http.NewServeMux()
    
    // Auth
    router.Handle("/student/login", http.HandlerFunc(controllers.StudentLogin))
    // Profile
    router.Handle("/student/profile", middleware.StudentOnly(
        http.HandlerFunc(controllers.GetStudentProfile)))
    // Session Management
    router.Handle("/student/sessions", middleware.StudentOnly(
        http.HandlerFunc(controllers.GetAvailableSessions)))
    router.Handle("/student/sessions/book", middleware.StudentOnly(
        http.HandlerFunc(controllers.BookVenue)))  // Add this line
    router.Handle("/student/sessions/join", middleware.StudentOnly(
        http.HandlerFunc(controllers.JoinSession)))
    router.Handle("/student/session", middleware.StudentOnly(
        http.HandlerFunc(controllers.GetSessionDetails)))
    router.Handle("/student/topic", 
    middleware.StudentOnly(http.HandlerFunc(controllers.GetTopicForLevel)))
    // Survey System
    router.Handle("/student/survey", middleware.StudentOnly(
        http.HandlerFunc(controllers.SubmitSurvey)))
    
    // Results
     router.Handle("/student/results", middleware.StudentOnly(
        http.HandlerFunc(controllers.GetResults)))
    router.Handle("/student/survey/start-question", middleware.StudentOnly(
    http.HandlerFunc(controllers.StartQuestionTimer)))
     router.Handle("/student/survey/check-timeout", middleware.StudentOnly(
    http.HandlerFunc(controllers.CheckQuestionTimeout)))
     router.Handle("/student/survey/apply-penalty", middleware.StudentOnly(
    http.HandlerFunc(controllers.ApplyQuestionPenalty)))
    router.Handle("/student/survey/start", middleware.StudentOnly(
    http.HandlerFunc(controllers.StartSurveyTimer)))
    router.Handle("/student/survey/timeout", middleware.StudentOnly(
    http.HandlerFunc(controllers.CheckSurveyTimeout)))
    router.Handle("/student/survey/penalties", middleware.StudentOnly(
    http.HandlerFunc(controllers.ApplySurveyPenalties)))
    router.Handle("/student/session/check", middleware.StudentOnly(
    http.HandlerFunc(controllers.CheckBooking)))
    router.Handle("/student/session/cancel", middleware.StudentOnly(
    http.HandlerFunc(controllers.CancelBooking)))
    router.Handle("/student/session/participants", middleware.StudentOnly(
    http.HandlerFunc(controllers.GetSessionParticipants)))
    router.Handle("/student/survey/completion", middleware.StudentOnly(
    http.HandlerFunc(controllers.CheckSurveyCompletion)))
    router.Handle("/student/survey/mark-completed", middleware.StudentOnly(
    http.HandlerFunc(controllers.MarkSurveyCompleted)))
    router.Handle("/student/feedback", middleware.StudentOnly(
    http.HandlerFunc(controllers.SubmitFeedback)))
    router.Handle("/student/session/rules", middleware.StudentOnly(
        http.HandlerFunc(s.GetSessionRules)))
router.Handle("/student/bookings/my", middleware.StudentOnly(
    http.HandlerFunc(controllers.GetUserBookings)))

router.Handle("/student/level/check", middleware.StudentOnly(
    http.HandlerFunc(controllers.CheckLevelProgression)))
    router.Handle("/student/feedback/get", middleware.StudentOnly(
    http.HandlerFunc(controllers.GetFeedback)))
     router.Handle("/student/questions", middleware.StudentOnly(
        http.HandlerFunc(controllers.GetQuestionsForStudent)))
    router.Handle("/student/session/status", middleware.StudentOnly(
    http.HandlerFunc(controllers.UpdateSessionStatus)))
    router.Handle("/student/session/ready", middleware.StudentOnly(
        http.HandlerFunc(controllers.UpdateReadyStatus)))
    router.Handle("/student/session/ready-status", middleware.StudentOnly(
        http.HandlerFunc(controllers.GetReadyStatus)))
    router.Handle("/student/session/check-all-ready", middleware.StudentOnly(
        http.HandlerFunc(controllers.CheckAllReady)))
    return router
}