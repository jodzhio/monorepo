// cmd/server/main.go
package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/jodzhio/monorepo/config"
	"github.com/jodzhio/monorepo/handlers"
	"github.com/jodzhio/monorepo/llm"
	"github.com/jodzhio/monorepo/storage"
)

func main() {
	// Загружаем конфиг
	cfg := config.Load()

	// Формируем адрес сервера
	addr := fmt.Sprintf("%s:%d", cfg.ServerHost, cfg.ServerPort)

	// Используем URL агента из конфига
	pythonAgentURL := cfg.LLMAgentURL
	log.Printf("Using Python agent URL: %s", pythonAgentURL)

	// Инициализация зависимостей
	store := storage.NewStorage()

	// Используем Python агент
	llmAgent := llm.NewPythonAgentClient(pythonAgentURL)

	// Для отладки можно использовать мок:
	// llmAgent := llm.NewMockAgent()

	handler := handlers.NewHandler(store, llmAgent)

	// Регистрация маршрутов
	setupRoutes(handler)

	// Запуск сервера
	log.Printf("Go server starting on %s", addr)
	log.Printf("Connected to Python agent at: %s", pythonAgentURL)

	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatal(err)
	}
}

func setupRoutes(handler *handlers.Handler) {
	// POST /api/candidates
	http.HandleFunc("/api/candidates", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handler.CreateCandidateHandler(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// GET /api/candidates/{candidate_id}/score
	http.HandleFunc("/api/candidates/", handler.GetScoreHandler)

	// GET /api/dialog/{session_id}/next
	http.HandleFunc("/api/dialog/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handler.GetNextQuestionHandler(w, r)
		} else if r.Method == http.MethodPost {
			handler.PostAnswerHandler(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
}
