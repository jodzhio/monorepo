package llm

import (
	"strings"

	"github.com/jodzhio/monorepo/models"
)

// Agent определяет интерфейс для LLM агента
type Agent interface {
	// GetQuestions возвращает вопросы для кандидата
	GetQuestions(position, grade string) []models.Question
	// CalculateScore рассчитывает скоринг на основе ответов
	CalculateScore(candidate models.Candidate, answers []models.Answer) models.ScoreResponse
}

// MockAgent - заглушка для тестирования
type MockAgent struct{}

func NewMockAgent() *MockAgent {
	return &MockAgent{}
}

// GetQuestions возвращает список вопросов для указанной позиции
func (m *MockAgent) GetQuestions(position, grade string) []models.Question {
	// Для упрощения используем одинаковые вопросы для всех позиций
	questions := []models.Question{
		{ID: 1, Text: "Расскажите о вашем опыте работы с конкурентностью в Go (горутины, каналы, мьютексы)."},
		{ID: 2, Text: "Как вы отлаживаете проблемы с производительностью в Go-приложениях?"},
		{ID: 3, Text: "Какие паттерны проектирования вы часто используете в Go и почему?"},
		{ID: 4, Text: "Приведите пример сложной задачи, которую вы решили с помощью Go."},
		{ID: 5, Text: "Как вы тестируете код на Go? Какие инструменты и подходы используете?"},
	}
	return questions
}

// CalculateScore имитирует работу нейросети для оценки ответов кандидата
func (m *MockAgent) CalculateScore(candidate models.Candidate, answers []models.Answer) models.ScoreResponse {
	// Ключевые слова для позитивной оценки
	positiveKeywords := []string{
		"каналы", "канал", "goroutine", "горутина",
		"mutex", "мьютекс", "waitgroup", "конкурентность",
		"benchmark", "бенчмарк", "профилирование", "pprof",
		"тестирование", "testing", "mock", "таблица",
		"паттерн", "фабрика", "стратегия", "синглтон",
		"контейнер", "docker", "микросервис",
	}

	// Ключевые слова для негативной оценки
	negativeKeywords := []string{
		"не знаю", "затрудняюсь", "не использовал",
		"не работал", "не сталкивался", "сложно сказать",
	}

	var totalScore float64
	positiveTraits := []string{}
	negativeTraits := []string{}

	// Оцениваем каждый ответ
	for _, answer := range answers {
		answerLower := strings.ToLower(answer.AnswerText)
		answerScore := 0.5 // базовый нейтральный score

		// Проверяем позитивные ключевые слова
		positiveMatches := 0
		for _, keyword := range positiveKeywords {
			if strings.Contains(answerLower, keyword) {
				positiveMatches++
			}
		}

		// Проверяем негативные ключевые слова
		negativeMatches := 0
		for _, keyword := range negativeKeywords {
			if strings.Contains(answerLower, keyword) {
				negativeMatches++
			}
		}

		// Корректируем score
		if positiveMatches > 0 {
			answerScore += float64(positiveMatches) * 0.1
			if answerScore > 1.0 {
				answerScore = 1.0
			}
		}

		if negativeMatches > 0 {
			answerScore -= float64(negativeMatches) * 0.15
			if answerScore < 0.0 {
				answerScore = 0.0
			}
		}

		// Добавляем позитивные черты на основе ключевых слов
		if strings.Contains(answerLower, "канал") || strings.Contains(answerLower, "goroutine") {
			positiveTraits = appendUnique(positiveTraits, "Опыт работы с конкурентностью")
		}
		if strings.Contains(answerLower, "тестирование") || strings.Contains(answerLower, "testing") {
			positiveTraits = appendUnique(positiveTraits, "Внимание к тестированию")
		}
		if strings.Contains(answerLower, "паттерн") {
			positiveTraits = appendUnique(positiveTraits, "Знание паттернов проектирования")
		}

		// Добавляем негативные черты
		if negativeMatches > 1 {
			negativeTraits = appendUnique(negativeTraits, "Недостаток практического опыта")
		}

		totalScore += answerScore
	}

	// Финальный score (среднее арифметическое)
	finalScore := totalScore / float64(len(answers))
	scorePercent := int(finalScore * 100)

	// Формируем вердикт
	var verdict, status, recommendation string
	var rejectionDays *int
	var rejectionMessage string

	if finalScore >= 0.45 {
		verdict = "recommend_to_interview"
		status = "approved"
		days := 0
		rejectionDays = &days
		rejectionMessage = ""
		recommendation = generateRecommendation(finalScore, true)
	} else {
		verdict = "soft_reject_timer"
		status = "pending_rejection"
		days := 14
		rejectionDays = &days
		rejectionMessage = "К сожалению, ваши навыки не полностью соответствуют требованиям позиции. " +
			"Мы рассмотрим вашу кандидатуру в течение двух недель и свяжемся при появлении подходящей вакансии."
		recommendation = generateRecommendation(finalScore, false)
	}

	// Добавляем стандартные черты, если их недостаточно
	if len(positiveTraits) == 0 {
		positiveTraits = append(positiveTraits, "Базовое понимание Go")
	}
	if len(negativeTraits) == 0 && finalScore < 0.6 {
		negativeTraits = append(negativeTraits, "Требуется углубление знаний")
	}

	return models.ScoreResponse{
		Score:          finalScore,
		ScorePercent:   scorePercent,
		Verdict:        verdict,
		Recommendation: recommendation,
		Traits: models.Traits{
			Positive: positiveTraits,
			Negative: negativeTraits,
		},
		RejectionTimerDays:       rejectionDays,
		RejectionMessageTemplate: rejectionMessage,
		Status:                   status,
	}
}

func appendUnique(slice []string, item string) []string {
	for _, existing := range slice {
		if existing == item {
			return slice
		}
	}
	return append(slice, item)
}

func generateRecommendation(score float64, approved bool) string {
	if approved {
		if score >= 0.7 {
			return "Кандидат показывает отличные знания Go. Рекомендуем пригласить на техническое интервью."
		} else if score >= 0.55 {
			return "Кандидат демонстрирует хорошие базовые знания. Можно рассматривать для junior/middle позиции."
		} else {
			return "Кандидат имеет потенциал, но требует дополнительного обучения. Рекомендуем рассмотреть стажировку."
		}
	} else {
		return "Кандидату не хватает необходимых технических навыков. Рекомендуем отложить до следующего найма."
	}
}
