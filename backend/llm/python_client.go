package llm

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/jodzhio/monorepo/backend/models"
)

type PythonAgentClient struct {
	baseURL    string
	httpClient *http.Client
}

// Request/Response структуры для API агента
type StartInterviewRequest struct {
	Profile models.Candidate `json:"profile"`
}

type StartInterviewResponse struct {
	Greeting       string                 `json:"greeting"`
	FirstQuestion  string                 `json:"first_question"`
	SessionContext map[string]interface{} `json:"session_context"`
}

type NextQuestionRequest struct {
	Profile        models.Candidate       `json:"profile"`
	Dialogue       []models.DialogueTurn  `json:"dialogue"`
	SessionContext map[string]interface{} `json:"session_context"`
}

type NextQuestionResponse struct {
	Question       string                 `json:"question"`
	SessionContext map[string]interface{} `json:"session_context"`
	IsFinished     bool                   `json:"is_finished"`
	FinalReport    *models.ScoreResponse  `json:"final_report,omitempty"`
}

type EvaluateRequest struct {
	Profile  models.Candidate      `json:"profile"`
	Dialogue []models.DialogueTurn `json:"dialogue"`
}

type QuestionsRequest struct {
	Profile models.Candidate `json:"profile"`
	N       int              `json:"n"`
}

type QuestionsResponse struct {
	Questions []string `json:"questions"`
}

type ScoreRequest struct {
	Profile models.Candidate `json:"profile"`
	QAPairs []models.QAPair  `json:"qa_pairs"`
}

func NewPythonAgentClient(baseURL string) *PythonAgentClient {
	return &PythonAgentClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *PythonAgentClient) BaseURL() string {
	return c.baseURL
}

// GetQuestions - использует batch режим /api/questions
func (c *PythonAgentClient) GetQuestions(position, grade string) []models.Question {
	profile := models.Candidate{
		Position: position,
		Grade:    grade,
	}

	reqBody := QuestionsRequest{
		Profile: profile,
		N:       5,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		fmt.Printf("Error marshaling questions request: %v\n", err)
		return getFallbackQuestions()
	}

	resp, err := c.httpClient.Post(
		c.baseURL+"/api/questions",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		fmt.Printf("Error calling /api/questions: %v\n", err)
		return getFallbackQuestions()
	}
	defer resp.Body.Close()

	var questionsResp QuestionsResponse
	if err := json.NewDecoder(resp.Body).Decode(&questionsResp); err != nil {
		fmt.Printf("Error decoding questions response: %v\n", err)
		return getFallbackQuestions()
	}

	questions := make([]models.Question, len(questionsResp.Questions))
	for i, text := range questionsResp.Questions {
		questions[i] = models.Question{
			ID:   i + 1,
			Text: text,
		}
	}

	if len(questions) == 0 {
		return getFallbackQuestions()
	}

	return questions
}

// CalculateScore - использует batch режим /api/score
func (c *PythonAgentClient) CalculateScore(candidate models.Candidate, answers []models.Answer) models.ScoreResponse {
	qaPairs := make([]models.QAPair, len(answers))
	for i, ans := range answers {
		qaPairs[i] = models.QAPair{
			Question: ans.QuestionText,
			Answer:   ans.AnswerText,
		}
	}

	reqBody := ScoreRequest{
		Profile: candidate,
		QAPairs: qaPairs,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		fmt.Printf("Error marshaling score request: %v\n", err)
		return getFallbackScore()
	}

	resp, err := c.httpClient.Post(
		c.baseURL+"/api/score",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		fmt.Printf("Error calling /api/score: %v\n", err)
		return getFallbackScore()
	}
	defer resp.Body.Close()

	var scoreResp models.ScoreResponse
	if err := json.NewDecoder(resp.Body).Decode(&scoreResp); err != nil {
		fmt.Printf("Error decoding score response: %v\n", err)
		return getFallbackScore()
	}

	return scoreResp
}

// StartInterview - вызывает /api/interview/start
func (c *PythonAgentClient) StartInterview(profile models.Candidate) (*StartInterviewResponse, error) {
	reqBody := StartInterviewRequest{Profile: profile}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal error: %w", err)
	}

	resp, err := c.httpClient.Post(
		c.baseURL+"/api/interview/start",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, fmt.Errorf("http error: %w", err)
	}
	defer resp.Body.Close()

	var startResp StartInterviewResponse
	if err := json.NewDecoder(resp.Body).Decode(&startResp); err != nil {
		return nil, fmt.Errorf("decode error: %w", err)
	}

	return &startResp, nil
}

// NextQuestion - вызывает /api/interview/next
func (c *PythonAgentClient) NextQuestion(profile models.Candidate, dialogue []models.DialogueTurn, sessionContext map[string]interface{}) (*NextQuestionResponse, error) {
	reqBody := NextQuestionRequest{
		Profile:        profile,
		Dialogue:       dialogue,
		SessionContext: sessionContext,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal error: %w", err)
	}

	resp, err := c.httpClient.Post(
		c.baseURL+"/api/interview/next",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, fmt.Errorf("http error: %w", err)
	}
	defer resp.Body.Close()

	var nextResp NextQuestionResponse
	if err := json.NewDecoder(resp.Body).Decode(&nextResp); err != nil {
		return nil, fmt.Errorf("decode error: %w", err)
	}

	return &nextResp, nil
}

// Evaluate - вызывает /api/interview/evaluate
func (c *PythonAgentClient) Evaluate(profile models.Candidate, dialogue []models.DialogueTurn) (*models.ScoreResponse, error) {
	reqBody := EvaluateRequest{
		Profile:  profile,
		Dialogue: dialogue,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal error: %w", err)
	}

	resp, err := c.httpClient.Post(
		c.baseURL+"/api/interview/evaluate",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, fmt.Errorf("http error: %w", err)
	}
	defer resp.Body.Close()

	var scoreResp models.ScoreResponse
	if err := json.NewDecoder(resp.Body).Decode(&scoreResp); err != nil {
		return nil, fmt.Errorf("decode error: %w", err)
	}

	return &scoreResp, nil
}

// HealthCheck - проверяет доступность агента
func (c *PythonAgentClient) HealthCheck() bool {
	resp, err := c.httpClient.Get(c.baseURL + "/api/health")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

// Fallback функции
func getFallbackQuestions() []models.Question {
	return []models.Question{
		{ID: 1, Text: "Расскажите о вашем опыте работы с Go."},
		{ID: 2, Text: "Какие проекты вы реализовали на Go?"},
		{ID: 3, Text: "Как вы тестируете код на Go?"},
		{ID: 4, Text: "Что такое горутины и как они работают?"},
		{ID: 5, Text: "Почему вы хотите работать у нас?"},
	}
}

func getFallbackScore() models.ScoreResponse {
	days := 14
	return models.ScoreResponse{
		Score:                    0.5,
		ScorePercent:             50,
		Verdict:                  "soft_reject_timer",
		Recommendation:           "Система временно недоступна, решение будет принято позже.",
		RejectionTimerDays:       &days,
		RejectionMessageTemplate: "Мы вернемся к вам с решением в течение двух недель.",
		Status:                   "pending_rejection",
		Traits: models.Traits{
			Positive: []string{"Участвовал в интервью"},
			Negative: []string{"Ожидает оценки LLM"},
		},
	}
}
