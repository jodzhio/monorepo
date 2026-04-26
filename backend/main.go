package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/jodzhio/monorepo/backend/config"
	"github.com/jodzhio/monorepo/backend/handlers"
	"github.com/jodzhio/monorepo/backend/llm"
	"github.com/jodzhio/monorepo/backend/storage"
)

func main() {
	cfg := config.Load()
	addr := fmt.Sprintf("%s:%d", cfg.ServerHost, cfg.ServerPort)

	store := storage.NewStorage()
	llmAgent := llm.NewPythonAgentClient(cfg.LLMAgentURL)
	handler := handlers.NewHandler(store, llmAgent)

	mux := http.NewServeMux()
	registerRoutes(mux, handler)

	log.Printf("Go server starting on %s", addr)
	log.Printf("Connected to Python agent at: %s", cfg.LLMAgentURL)

	if err := http.ListenAndServe(addr, withCORS(mux)); err != nil {
		log.Fatal(err)
	}
}

func registerRoutes(mux *http.ServeMux, handler *handlers.Handler) {
	mux.HandleFunc("/api/candidates", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handler.CreateCandidateHandler(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})

	mux.HandleFunc("/api/candidates/", handler.GetScoreHandler)

	mux.HandleFunc("/api/dialog/", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handler.GetNextQuestionHandler(w, r)
		case http.MethodPost:
			handler.PostAnswerHandler(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
}

// withCORS открывает доступ для фронтенда при локальной разработке.
// В проде стоит ограничить Origin до реального домена UI.
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
