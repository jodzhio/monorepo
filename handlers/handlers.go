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

// Handler - основной обработчик с зависимостями
type Handler struct {
	storage  *storage.Storage
	llmAgent llm.Agent
}

// NewHandler создает новый обработчик
func NewHandler(storage *storage.Storage, llmAgent llm.Agent) *Handler {
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

	// Валидация обязательных полей
	if req.Position == "" || req.Grade == "" || req.About == "" {
		http.Error(w, "Missing required fields: position, grade, about", http.StatusBadRequest)
		return
	}

	// Генерация ID для кандидата
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

	// Получаем вопросы для кандидата
	questions := h.llmAgent.GetQuestions(req.Position, req.Grade)

	// Создаем сессию
	sessionID := utils.GenerateID("sess")
	session := &models.Session{
		SessionID:          sessionID,
		CandidateID:        candidateID,
		CurrentQuestionIdx: 0,
		Answers:            []models.Answer{},
		Status:             "in_progress",
		CreatedAt:          time.Now(),
	}

	if err := h.storage.CreateSession(session); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Формируем ответ с первым вопросом (или двумя первыми вопросами)
	questionItems := []models.QuestionItem{}
	if len(questions) > 0 {
		questionItems = append(questionItems, models.QuestionItem{
			ID:   questions[0].ID,
			Text: questions[0].Text,
		})
	}
	if len(questions) > 1 {
		questionItems = append(questionItems, models.QuestionItem{
			ID:   questions[1].ID,
			Text: questions[1].Text,
		})
	}

	response := models.DialogStartResponse{
		SessionID:    sessionID,
		Status:       "in_progress",
		Questions:    questionItems,
		MaxQuestions: len(questions),
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

	// Извлекаем session_id из URL
	sessionID := utils.ExtractSessionID(r.URL.Path)
	if sessionID == "" {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	// Получаем сессию
	session, err := h.storage.GetSession(sessionID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// Получаем вопросы для кандидата
	candidate, err := h.storage.GetCandidate(session.CandidateID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	questions := h.llmAgent.GetQuestions(candidate.Position, candidate.Grade)

	// Проверяем статус сессии
	if session.Status != "in_progress" {
		response := models.DialogQuestionResponse{
			IsLast: true,
			Status: session.Status,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Если все вопросы заданы
	if session.CurrentQuestionIdx >= len(questions) {
		response := models.DialogQuestionResponse{
			IsLast: true,
			Status: session.Status,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Возвращаем текущий вопрос
	currentQuestion := questions[session.CurrentQuestionIdx]
	response := models.DialogQuestionResponse{
		QuestionID: currentQuestion.ID,
		Text:       currentQuestion.Text,
		IsLast:     session.CurrentQuestionIdx == len(questions)-1,
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

	// Извлекаем session_id из URL
	sessionID := utils.ExtractSessionID(r.URL.Path)
	if sessionID == "" {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	// Парсим тело запроса
	var req models.AnswerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Получаем сессию
	session, err := h.storage.GetSession(sessionID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// Получаем вопросы
	candidate, err := h.storage.GetCandidate(session.CandidateID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	questions := h.llmAgent.GetQuestions(candidate.Position, candidate.Grade)

	// Проверяем, что сессия активна
	if session.Status != "in_progress" {
		http.Error(w, "Session is already completed", http.StatusBadRequest)
		return
	}

	// Проверяем, что вопрос существует
	if session.CurrentQuestionIdx >= len(questions) {
		http.Error(w, "All questions already answered", http.StatusBadRequest)
		return
	}

	// Проверяем соответствие question_id
	expectedQuestion := questions[session.CurrentQuestionIdx]
	if req.QuestionID != expectedQuestion.ID {
		http.Error(w, fmt.Sprintf("Invalid question_id. Expected %d, got %d",
			expectedQuestion.ID, req.QuestionID), http.StatusBadRequest)
		return
	}

	// Сохраняем ответ
	answer := models.Answer{
		QuestionID:   req.QuestionID,
		QuestionText: expectedQuestion.Text,
		AnswerText:   req.AnswerText,
		AnsweredAt:   time.Now(),
	}

	if err := h.storage.AddAnswerToSession(sessionID, answer); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Увеличиваем индекс вопроса
	session.CurrentQuestionIdx++

	// Проверяем, все ли вопросы отвечены
	if session.CurrentQuestionIdx >= len(questions) {
		// Все вопросы отвечены - завершаем сессию
		session.Status = "completed"

		// Рассчитываем скоринг
		score := h.llmAgent.CalculateScore(*candidate, session.Answers)
		session.Score = score

		if err := h.storage.UpdateSession(session); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Возвращаем ответ о завершении
		response := models.DialogQuestionResponse{
			IsLast: true,
			Status: "completed",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Обновляем сессию
	if err := h.storage.UpdateSession(session); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Возвращаем следующий вопрос
	nextQuestion := questions[session.CurrentQuestionIdx]
	response := models.DialogQuestionResponse{
		QuestionID: nextQuestion.ID,
		Text:       nextQuestion.Text,
		IsLast:     session.CurrentQuestionIdx == len(questions)-1,
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

	// Извлекаем candidate_id из URL
	candidateID := utils.ExtractCandidateID(r.URL.Path)
	if candidateID == "" {
		http.Error(w, "Invalid candidate ID", http.StatusBadRequest)
		return
	}

	// Проверяем существование кандидата
	_, err := h.storage.GetCandidate(candidateID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// Получаем сессию кандидата
	session, err := h.storage.GetSessionByCandidateID(candidateID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// Если сессия еще не завершена
	if session.Status == "in_progress" {
		w.WriteHeader(http.StatusAccepted)
		response := map[string]interface{}{
			"status":  "analyzing",
			"message": "Interview is still in progress",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// Если скоринг готов
	if session.Status == "completed" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(session.Score)
		return
	}

	// Если в процессе анализа
	w.WriteHeader(http.StatusAccepted)
	response := map[string]interface{}{
		"status":  "analyzing",
		"message": "Score is being calculated",
	}
	json.NewEncoder(w).Encode(response)
}
