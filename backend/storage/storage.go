package storage

import (
	"fmt"
	"sync"

	"github.com/jodzhio/monorepo/backend/models"
)

// Storage - структура для хранения всех данных с мьютексами
type Storage struct {
	mu                 sync.RWMutex
	candidates         map[string]*models.Candidate
	sessions           map[string]*models.Session
	candidateToSession map[string]string // candidate_id -> session_id
}

// NewStorage создает новое хранилище
func NewStorage() *Storage {
	return &Storage{
		candidates:         make(map[string]*models.Candidate),
		sessions:           make(map[string]*models.Session),
		candidateToSession: make(map[string]string),
	}
}

// CreateCandidate создает нового кандидата
func (s *Storage) CreateCandidate(candidate *models.Candidate) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.candidates[candidate.CandidateID]; exists {
		return fmt.Errorf("candidate with id %s already exists", candidate.CandidateID)
	}

	s.candidates[candidate.CandidateID] = candidate
	return nil
}

// GetCandidate получает кандидата по ID
func (s *Storage) GetCandidate(candidateID string) (*models.Candidate, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	candidate, exists := s.candidates[candidateID]
	if !exists {
		return nil, fmt.Errorf("candidate %s not found", candidateID)
	}
	return candidate, nil
}

// CreateSession создает новую сессию
func (s *Storage) CreateSession(session *models.Session) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.sessions[session.SessionID]; exists {
		return fmt.Errorf("session %s already exists", session.SessionID)
	}

	s.sessions[session.SessionID] = session
	s.candidateToSession[session.CandidateID] = session.SessionID
	return nil
}

// GetSession получает сессию по ID
func (s *Storage) GetSession(sessionID string) (*models.Session, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	session, exists := s.sessions[sessionID]
	if !exists {
		return nil, fmt.Errorf("session %s not found", sessionID)
	}
	return session, nil
}

// UpdateSession обновляет сессию
func (s *Storage) UpdateSession(session *models.Session) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.sessions[session.SessionID]; !exists {
		return fmt.Errorf("session %s not found", session.SessionID)
	}

	s.sessions[session.SessionID] = session
	return nil
}

// GetSessionByCandidateID получает сессию по ID кандидата
func (s *Storage) GetSessionByCandidateID(candidateID string) (*models.Session, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sessionID, exists := s.candidateToSession[candidateID]
	if !exists {
		return nil, fmt.Errorf("no session found for candidate %s", candidateID)
	}

	session, exists := s.sessions[sessionID]
	if !exists {
		return nil, fmt.Errorf("session %s not found", sessionID)
	}

	return session, nil
}

// AddAnswerToSession добавляет ответ к сессии
func (s *Storage) AddAnswerToSession(sessionID string, answer models.Answer) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	session, exists := s.sessions[sessionID]
	if !exists {
		return fmt.Errorf("session %s not found", sessionID)
	}

	session.Answers = append(session.Answers, answer)
	return nil
}
