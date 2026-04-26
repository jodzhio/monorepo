package utils

import (
	"fmt"
	"strings"
	"time"
)

// GenerateID генерирует простой ID на основе времени
func GenerateID(prefix string) string {
	return fmt.Sprintf("%s_%d", prefix, time.Now().UnixNano())
}

// ExtractSessionID извлекает session_id из URL
// Ожидаем формат: /api/dialog/{session_id}/next или /api/dialog/{session_id}/answer
func ExtractSessionID(path string) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	for i, part := range parts {
		if part == "dialog" && i+1 < len(parts) {
			return parts[i+1]
		}
	}
	return ""
}

// ExtractCandidateID извлекает candidate_id из URL
// Ожидаем формат: /api/candidates/{candidate_id}/score
func ExtractCandidateID(path string) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	for i, part := range parts {
		if part == "candidates" && i+1 < len(parts) {
			return parts[i+1]
		}
	}
	return ""
}
