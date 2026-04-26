# Интеграция: Go-бэкенд ↔ Python-агент

| Сервис | Репо / папка | Порт | Технология |
|---|---|---|---|
| **Go-бэкенд** | https://github.com/jodzhio/monorepo | `:8080` | Go + net/http |
| **Python LLM-агент** | [hr_agent/](hr_agent/) (этот репо) | `:5000` | Flask + GigaChat |

Бэкенд **уже умеет** ходить к Python-агенту через `PythonAgentClient` (см. `llm/python_client.go` в его репо). Эндпоинты в [hr_agent/api_example.py](hr_agent/api_example.py) **специально подогнаны** под этот контракт.

## Как запустить вместе

### 1. Python-агент

```bash
git clone https://github.com/aaamhas/Shorthack67
cd Shorthack67
pip install -r hr_agent/requirements.txt
cp hr_agent/.env.example hr_agent/.env
# впиши GIGACHAT_AUTH_KEY в hr_agent/.env

PYTHONIOENCODING=utf-8 python -m hr_agent.api_example
# → http://localhost:5000
```

### 2. Go-бэкенд

В отдельном терминале / на другой машине:

```bash
git clone https://github.com/jodzhio/monorepo
cd monorepo
go mod download
go run main.go
# → http://localhost:8080
```

В `config.yaml` бэкенда уже стоит `llm_agent_url: http://localhost:5000` — он сразу найдёт Python-агента.

### 3. Проверка

```bash
# Создать кандидата (Go внутри сходит к Python за вопросами)
curl -X POST http://localhost:8080/api/candidates \
  -H "Content-Type: application/json" \
  -d "{\"position\":\"backend_go\",\"grade\":\"Middle\",\"about\":\"Go developer 3 years\",\"education\":\"MGTU\"}"

# В ответе: session_id, candidate_id, первые вопросы

# Ответить на вопрос
curl -X POST http://localhost:8080/api/dialog/{session_id}/next \
  -H "Content-Type: application/json" \
  -d "{\"question_id\":1,\"answer_text\":\"Делал сервис на Go...\"}"

# Финальный скоринг (после всех ответов)
curl http://localhost:8080/api/candidates/{candidate_id}/score
```

## Контракт между Go и Python

Бэкенд дёргает у Python 2 эндпоинта.

### `POST /api/questions`

**Запрос (от Go):**
```json
{"position": "backend_go", "grade": "Middle"}
```

**Ответ (от Python):**
```json
{
  "questions": [
    {"id": 1, "text": "Расскажите о вашем последнем production-проекте..."},
    {"id": 2, "text": "Какой у вас уровень английского по шкале A1-C2?"}
  ]
}
```

> Python поддерживает и **расширенный формат** `{"profile": {...}, "n": 6}` — если бэкендер захочет передавать полный профиль (с резюме), вопросы будут лучше.

### `POST /api/score`

**Запрос (от Go):**
```json
{
  "candidate": {
    "candidate_id": "cand_123",
    "position": "backend_go",
    "grade": "Middle",
    "about": "Backend developer 3 years",
    "education": "MGTU",
    "resume_url": ""
  },
  "answers": [
    {"QuestionID": 1, "QuestionText": "Расскажите про опыт", "AnswerText": "..."},
    {"QuestionID": 2, "QuestionText": "Английский", "AnswerText": "B2"}
  ]
}
```

**Ответ (от Python — Go-совместимый):**
```json
{
  "score": 0.72,
  "score_percent": 72,
  "verdict": "recommend_to_interview",
  "recommendation": "Кандидат закрывает большинство требований...",
  "traits": {
    "positive": ["Опыт с Python и FastAPI", "Работа с PostgreSQL"],
    "negative": ["Не работал с AWS"]
  },
  "rejection_timer_days": 0,
  "rejection_message_template": "",
  "status": "approved",
  "extra": {
    "candidateName": "...",
    "summary": "...",
    "extractedFacts": {
      "englishLevel": "B2",
      "salaryExpectation": "250к",
      "workFormat": null,
      "noticePeriod": null,
      "willingToTravel": null,
      "githubLinks": []
    },
    "requirementsMatch": [...],
    "interviewQuestions": [...]
  }
}
```

**Поле `extra`** — расширенные данные, не описанные в Go ScoreResponse. Go их проигнорирует при парсинге, но фронт может вытаскивать через прокси-эндпоинт и показывать в HR-панели.

**Логика verdict/status:**
- `score >= 0.45` → `verdict: "recommend_to_interview"`, `status: "approved"`, `rejection_timer_days: 0`
- `score < 0.45` → `verdict: "soft_reject_timer"`, `status: "pending_rejection"`, `rejection_timer_days: 14`

## Замечания бэкендеру по текущему контракту

1. **Go шлёт только `position+grade`** в `/api/questions`. Без резюме вопросы получаются типовые. Чтобы вопросы стали тейлорнутыми — модифицируй `python_client.go` и шли полный кандидат:
   ```json
   {"profile": {"name": "...", "position": "...", "grade": "...", "about": "...", "education": "...", "resume": "..."}}
   ```
   Python это уже принимает.

2. **`GetQuestions` зовётся на каждый next/answer** — это дёргает GigaChat снова и снова. Для стабильности кешируй вопросы в `Session.Questions` после первого вызова и больше не зови LLM.

3. **`resume_url`** — это URL, а не текст. Сейчас Python подставляет URL вместо текста резюме (плохо для оценки). Правильно: бэкенд сам качает файл по URL и передаёт **текст** в payload.

## Архитектура

```
┌──────────┐         ┌─────────────────┐         ┌──────────┐
│ Frontend │ ──HTTP→ │ Go backend      │ ──HTTP→ │ Python   │
│ (React)  │         │ :8080           │         │ Flask    │
│          │ ←JSON── │ session storage │ ←JSON── │ :5000    │
└──────────┘         └─────────────────┘         └──────────┘
                                                       │
                                                       ↓
                                                 ┌──────────┐
                                                 │ GigaChat │
                                                 │ API      │
                                                 └──────────┘
```

## Mock-режим

В `hr_agent/.env` поставь `USE_MOCK=true` — Python вернёт заготовленные JSON без реального GigaChat. Удобно для разработки фронта и Go-бэкенда без ключа Sber.
