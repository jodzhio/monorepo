// internal/llm/python_client.go
package llm

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/jodzhio/monorepo/models"
)

// PythonAgentClient - клиент для Python LLM агента
type PythonAgentClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewPythonAgentClient(baseURL string) *PythonAgentClient {
	return &PythonAgentClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Python API request/response структуры
type QuestionsRequest struct {
	Position string `json:"position"`
	Grade    string `json:"grade"`
}

type QuestionsResponse struct {
	Questions []models.Question `json:"questions"`
}

type ScoreRequest struct {
	Candidate models.Candidate `json:"candidate"`
	Answers   []models.Answer  `json:"answers"`
}

// GetQuestions реализует интерфейс Agent
func (c *PythonAgentClient) GetQuestions(position, grade string) []models.Question {
	reqBody := QuestionsRequest{
		Position: position,
		Grade:    grade,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		fmt.Printf("Error marshaling request: %v\n", err)
		return getFallbackQuestions()
	}

	resp, err := c.httpClient.Post(
		c.baseURL+"/api/questions",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		fmt.Printf("Error calling Python agent: %v\n", err)
		return getFallbackQuestions()
	}
	defer resp.Body.Close()

	var questionsResp QuestionsResponse
	if err := json.NewDecoder(resp.Body).Decode(&questionsResp); err != nil {
		fmt.Printf("Error decoding response: %v\n", err)
		return getFallbackQuestions()
	}

	if len(questionsResp.Questions) == 0 {
		return getFallbackQuestions()
	}

	return questionsResp.Questions
}

// CalculateScore реализует интерфейс Agent
func (c *PythonAgentClient) CalculateScore(candidate models.Candidate, answers []models.Answer) models.ScoreResponse {
	reqBody := ScoreRequest{
		Candidate: candidate,
		Answers:   answers,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		fmt.Printf("Error marshaling request: %v\n", err)
		return getFallbackScore()
	}

	resp, err := c.httpClient.Post(
		c.baseURL+"/api/score",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		fmt.Printf("Error calling Python agent: %v\n", err)
		return getFallbackScore()
	}
	defer resp.Body.Close()

	var scoreResp models.ScoreResponse
	if err := json.NewDecoder(resp.Body).Decode(&scoreResp); err != nil {
		fmt.Printf("Error decoding response: %v\n", err)
		return getFallbackScore()
	}

	return scoreResp
}

// Fallback функции на случай недоступности Python агента
func getFallbackQuestions() []models.Question {
	return []models.Question{
		{ID: 1, Text: "Расскажите о вашем опыте работы с Go."},
		{ID: 2, Text: "Какие проекты вы реализовали?"},
		{ID: 3, Text: "Почему вы хотите работать у нас?"},
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
		RejectionMessageTemplate: "Мы вернемся к вам с решением.",
		Status:                   "pending_rejection",
		Traits: models.Traits{
			Positive: []string{"Прошел техническое интервью"},
			Negative: []string{"Ожидает оценки LLM"},
		},
	}
}
