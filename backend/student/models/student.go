package models

import "time"

type Student struct {
	ID         string `json:"id"`
	Email      string `json:"email"`
	Name       string `json:"name"`
	Department string `json:"department"`
	Year       int    `json:"year"`
	PhotoURL   string `json:"photo_url"`
	Level      int    `json:"level"`
}

type Session struct {
	ID           string    `json:"id"`
	Venue        string    `json:"venue"`
	Topic        string    `json:"topic"`
	StartTime    time.Time `json:"start_time"`
	PrepTime     int       `json:"prep_time"`
	Discussion   int       `json:"discussion"`
	Participants []Student `json:"participants"`
}

type SurveyResponse struct {
	QuestionNumber int    `json:"question_number"`
	FirstPlace     string `json:"first_place"`
	SecondPlace    string `json:"second_place"`
	ThirdPlace     string `json:"third_place"`
}

type Result struct {
	Qualified bool `json:"qualified"`
	NextLevel int  `json:"next_level"`
	Scores    struct {
		Leadership    float64 `json:"leadership"`
		Communication float64 `json:"communication"`
		Teamwork      float64 `json:"teamwork"`
	} `json:"scores"`
	Feedback string `json:"feedback"`
}

