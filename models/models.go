package models

import "time"

// Request/Response models (API)
type CandidateCreateRequest struct {
	CandidateID string `json:"candidate_id,omitempty"`
	Position    string `json:"position"` // "backend_go" и т.д.
	Grade       string `json:"grade"`
	About       string `json:"about"`
	Education   string `json:"education"`
	ResumeURL   string `json:"resume_url,omitempty"`
}

type AnswerRequest struct {
	QuestionID int    `json:"question_id"`
	AnswerText string `json:"answer_text"`
}

type DialogStartResponse struct {
	SessionID    string         `json:"session_id"`
	Status       string         `json:"status"` // "in_progress", "analyzing", "completed"
	Questions    []QuestionItem `json:"questions"`
	MaxQuestions int            `json:"max_questions"`
}

type DialogQuestionResponse struct {
	QuestionID int    `json:"question_id,omitempty"`
	Text       string `json:"text,omitempty"`
	IsLast     bool   `json:"is_last"`
	Status     string `json:"status"` // "in_progress", "analyzing", "completed"
}

type ScoreResponse struct {
	Score                    float64 `json:"score"`
	ScorePercent             int     `json:"score_percent"`
	Verdict                  string  `json:"verdict"` // "recommend_to_interview", "soft_reject_timer"
	Recommendation           string  `json:"recommendation"`
	Traits                   Traits  `json:"traits"`
	RejectionTimerDays       *int    `json:"rejection_timer_days,omitempty"`
	RejectionMessageTemplate string  `json:"rejection_message_template,omitempty"`
	Status                   string  `json:"status"` // "approved", "pending_rejection"
}

type Traits struct {
	Positive []string `json:"positive"`
	Negative []string `json:"negative"`
}

type QuestionItem struct {
	ID   int    `json:"id"`
	Text string `json:"text"`
}

// Internal storage models
type Candidate struct {
	CandidateID string    `json:"candidate_id"`
	Position    string    `json:"position"`
	Grade       string    `json:"grade"`
	About       string    `json:"about"`
	Education   string    `json:"education"`
	ResumeURL   string    `json:"resume_url"`
	CreatedAt   time.Time `json:"created_at"`
}

type Session struct {
	SessionID          string
	CandidateID        string
	CurrentQuestionIdx int
	Answers            []Answer
	Status             string // "in_progress", "analyzing", "completed"
	Score              ScoreResponse
	CreatedAt          time.Time
}

type Answer struct {
	QuestionID   int
	QuestionText string
	AnswerText   string
	AnsweredAt   time.Time
}

type Question struct {
	ID   int
	Text string
}
