// internal/handlers/handlers.go
package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/jodzhio/monorepo/llm"
	"github.com/jodzhio/monorepo/models"
	"github.com/jodzhio/monorepo/storage"
	"github.com/jodzhio/monorepo/utils"
)

type Handler struct {
	storage  *storage.Storage
	llmAgent *llm.PythonAgentClient
}

func NewHandler(storage *storage.Storage, llmAgent *llm.PythonAgentClient) *Handler {
	return &Handler{
		storage:  storage,
		llmAgent: llmAgent,
	}
}

// CreateCandidateHandler POST /api/candidates
func (h *Handler) CreateCandidateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.CandidateCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Валидация
	if req.Position == "" || req.Grade == "" || req.About == "" {
		http.Error(w, "Missing required fields: position, grade, about", http.StatusBadRequest)
		return
	}

	// Генерация ID
	candidateID := req.CandidateID
	if candidateID == "" {
		candidateID = utils.GenerateID("cand")
	}

	// Создаем кандидата
	candidate := &models.Candidate{
		CandidateID: candidateID,
		Position:    req.Position,
		Grade:       req.Grade,
		About:       req.About,
		Education:   req.Education,
		ResumeURL:   req.ResumeURL,
		CreatedAt:   time.Now(),
	}

	if err := h.storage.CreateCandidate(candidate); err != nil {
		http.Error(w, err.Error(), http.StatusConflict)
		return
	}

	// Запускаем интервью в Python агенте
	startResp, err := h.llmAgent.StartInterview(*candidate)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to start interview: %v", err), http.StatusInternalServerError)
		return
	}

	// Создаем сессию
	sessionID := utils.GenerateID("sess")
	session := &models.Session{
		SessionID:          sessionID,
		CandidateID:        candidateID,
		CurrentQuestionIdx: 0,
		Answers:            []models.Answer{},
		Dialogue: []models.DialogueTurn{
			{Role: "hr", Content: startResp.Greeting},
			{Role: "hr", Content: startResp.FirstQuestion},
		},
		SessionContext: startResp.SessionContext,
		Status:         "in_progress",
		CreatedAt:      time.Now(),
	}

	if err := h.storage.CreateSession(session); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Формируем ответ (совместимый с OpenAPI)
	response := models.DialogStartResponse{
		SessionID: sessionID,
		Status:    "in_progress",
		Questions: []models.QuestionItem{
			{ID: 1, Text: startResp.FirstQuestion},
		},
		MaxQuestions: 0, // неизвестно, будет определяться динамически
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// GetNextQuestionHandler GET /api/dialog/{session_id}/next
func (h *Handler) GetNextQuestionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	sessionID := utils.ExtractSessionID(r.URL.Path)
	if sessionID == "" {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	session, err := h.storage.GetSession(sessionID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	if session.Status != "in_progress" {
		response := models.DialogQuestionResponse{
			IsLast: true,
			Status: session.Status,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Если диалог пустой или закончился
	if len(session.Dialogue) == 0 {
		response := models.DialogQuestionResponse{
			IsLast: true,
			Status: "completed",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Берем последний вопрос из диалога
	lastTurn := session.Dialogue[len(session.Dialogue)-1]

	response := models.DialogQuestionResponse{
		QuestionID: session.CurrentQuestionIdx + 1,
		Text:       lastTurn.Content,
		IsLast:     false,
		Status:     session.Status,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// PostAnswerHandler POST /api/dialog/{session_id}/answer
func (h *Handler) PostAnswerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	sessionID := utils.ExtractSessionID(r.URL.Path)
	if sessionID == "" {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	var req models.AnswerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	session, err := h.storage.GetSession(sessionID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	if session.Status != "in_progress" {
		http.Error(w, "Session is already completed", http.StatusBadRequest)
		return
	}

	// Получаем кандидата
	candidate, err := h.storage.GetCandidate(session.CandidateID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// Добавляем ответ кандидата в диалог
	session.Dialogue = append(session.Dialogue, models.DialogueTurn{
		Role:    "candidate",
		Content: req.AnswerText,
	})

	// Сохраняем ответ в историю
	answer := models.Answer{
		QuestionID:   req.QuestionID,
		QuestionText: session.Dialogue[len(session.Dialogue)-2].Content, // предыдущий вопрос
		AnswerText:   req.AnswerText,
		AnsweredAt:   time.Now(),
	}
	session.Answers = append(session.Answers, answer)

	// Запрашиваем следующий вопрос у агента
	nextResp, err := h.llmAgent.NextQuestion(*candidate, session.Dialogue, session.SessionContext)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get next question: %v", err), http.StatusInternalServerError)
		return
	}

	// Обновляем контекст сессии
	session.SessionContext = nextResp.SessionContext

	// Проверяем, завершено ли интервью
	if nextResp.IsFinished {
		session.Status = "completed"
		if nextResp.FinalReport != nil {
			session.Score = *nextResp.FinalReport
		}

		if err := h.storage.UpdateSession(session); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		response := models.DialogQuestionResponse{
			IsLast: true,
			Status: "completed",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Добавляем следующий вопрос от HR в диалог
	session.Dialogue = append(session.Dialogue, models.DialogueTurn{
		Role:    "hr",
		Content: nextResp.Question,
	})
	session.CurrentQuestionIdx++

	if err := h.storage.UpdateSession(session); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Возвращаем следующий вопрос
	response := models.DialogQuestionResponse{
		QuestionID: session.CurrentQuestionIdx + 1,
		Text:       nextResp.Question,
		IsLast:     false,
		Status:     session.Status,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// GetScoreHandler GET /api/candidates/{candidate_id}/score
func (h *Handler) GetScoreHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	candidateID := utils.ExtractCandidateID(r.URL.Path)
	if candidateID == "" {
		http.Error(w, "Invalid candidate ID", http.StatusBadRequest)
		return
	}

	_, err := h.storage.GetCandidate(candidateID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	session, err := h.storage.GetSessionByCandidateID(candidateID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	if session.Status == "in_progress" {
		w.WriteHeader(http.StatusAccepted)
		response := map[string]interface{}{
			"status":  "analyzing",
			"message": "Interview is still in progress",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	if session.Status == "completed" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(session.Score)
		return
	}

	w.WriteHeader(http.StatusAccepted)
	response := map[string]interface{}{
		"status":  "analyzing",
		"message": "Score is being calculated",
	}
	json.NewEncoder(w).Encode(response)
}
