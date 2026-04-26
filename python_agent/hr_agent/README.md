# HR-агент на GigaChat

Модуль AI-агента для X5 Tech: анализ кандидата → диалог → финальный JSON для HR-панели.

Поддерживает **два режима**: итеративный чат (вопросы адаптируются к ответам) и batch (список вопросов сразу + оценка по парам Q&A).

## Установка

```bash
pip install -r hr_agent/requirements.txt
cp hr_agent/.env.example hr_agent/.env
# отредактируй .env: вставь GIGACHAT_AUTH_KEY и поставь USE_MOCK=false
```

## Запуск

| Команда | Что делает |
|---|---|
| `python -m hr_agent.test_agent` | Прогон 3 сценариев (Middle / Senior / Junior) |
| `python -m hr_agent.interactive` | Ручной чат: ты в роли кандидата |
| `python -m hr_agent.interactive путь/к/cv.pdf` | То же, но с твоим резюме |
| `python -m hr_agent.api_example` | Запустить Flask-сервер для бэкенда |

> Везде на Windows нужен `PYTHONIOENCODING=utf-8` перед командой.

## Mock-режим

Если `USE_MOCK=true` (по умолчанию когда нет `GIGACHAT_AUTH_KEY`) — агент возвращает **заготовленные JSON-ответы**, не дёргает реальный GigaChat. Это для разработки бэкенда без ключа.

**ВАЖНО:** в моке финальный скоринг — это всегда заглушка с пометкой `MOCK-ответ`. Для настоящей оценки `USE_MOCK=false`.

## Публичные функции

```python
from hr_agent import (
    # Итеративный режим
    start_interview,        # анкета → приветствие + первый вопрос
    next_question,          # диалог → следующий вопрос или сигнал завершения
    evaluate_candidate,     # анкета + диалог → финальный JSON

    # Batch режим
    generate_questions,     # анкета → список из N вопросов
    dialogue_from_qa,       # [{question, answer}, ...] → строка диалога

    # Утилиты
    parse_resume_file,      # PDF/DOCX/TXT → текст
    extract_profile_from_resume,  # текст → {name, position, grade, about, education}
    build_profile,          # форма + файл → готовый profile-dict
)
```

## Кейсы для бэкенда

### Кейс 1 (рекомендуется): итеративный чат

```python
# Старт
start = start_interview(profile)
save_session(start["session_context"])
send_to_candidate(start["greeting"], start["first_question"])

# Каждый ответ кандидата
step = next_question(profile, dialogue, session_context)
if step["is_finished"]:
    show_closing(step["closing_message"])
else:
    send_to_candidate(step["question"])
    save_session(step["session_context"])

# Финал
result = evaluate_candidate(profile, dialogue)
if result["scoreNormalized"] < 0.45:
    schedule_rejection_email(candidate_id, delay_days=14)
```

### Кейс 2: batch (если нет state в сессии)

```python
# Получить вопросы списком
questions = generate_questions(profile, n=6)
show_form_with_questions(questions)

# После того как кандидат заполнил все ответы:
qa_pairs = [{"question": q, "answer": a} for q, a in zip(questions, answers)]
dialogue = dialogue_from_qa(qa_pairs)
result = evaluate_candidate(profile, dialogue)
```

## Парсинг резюме (PDF / DOCX / TXT / MD)

```python
from hr_agent import parse_resume_file, build_profile, extract_profile_from_resume

# Только текст из файла
resume_text = parse_resume_file("uploads/cv.pdf")

# Авто-извлечение полей анкеты для пред-заполнения формы
prefill = extract_profile_from_resume(resume_text)
# → {"name": "Иван Петров", "position": "Python-разработчик", "grade": "Middle", ...}

# Сразу собрать profile (поля формы + файл)
profile = build_profile(
    name="Иван", position="Python-разработчик", grade="Middle",
    resume_file="uploads/cv.pdf", about="...", education="...",
)
```

Поддержка: `.pdf`, `.docx`, `.txt`, `.md`. Сканы и PDF-картинки — нет (нужен OCR).

## Что агент обязательно спросит

В [config.py](config.py) есть `ALWAYS_ASK_TOPICS` — список тем, которые HR должен закрыть в любом интервью. Если темы НЕ освещены в резюме — агент гарантированно их спросит:

- Уровень английского по шкале A1–C2
- Самый сложный/показательный проект и роль кандидата в нём
- Желаемая зарплата и формат работы (офис/гибрид/удалёнка)
- Notice period и готовность к командировкам
- Pet-проекты, опенсорс, ссылки на GitHub/Habr
- Мотивация — почему компания, куда хочется развиваться

Меняй список под свою вакансию. `MAX_QUESTIONS = 8` чтобы они уместились + пара технических.

## Финальный JSON для HR-панели

```json
{
  "candidateName": "Ivan Petrov",
  "role": "Middle Python Developer",
  "score": 78,
  "scoreNormalized": 0.78,
  "status": "Recommended",
  "summary": "...",
  "strengths": [...],
  "risks": [...],
  "requirementsMatch": [
    {"requirement": "Python", "status": "found", "evidence": "..."},
    {"requirement": "AWS", "status": "missing", "evidence": "..."}
  ],
  "extractedFacts": {
    "englishLevel": "B2",
    "salaryExpectation": "250-300к net",
    "workFormat": "гибрид",
    "noticePeriod": "2 недели",
    "willingToTravel": true,
    "githubLinks": ["github.com/petrov"]
  },
  "interviewQuestions": [...],
  "recommendation": {"shouldInvite": true, "reason": "..."}
}
```

**`extractedFacts`** — структурированные факты, выцепленные из диалога. Бэкенд может класть их прямо в БД-колонки (зарплата, английский, notice period) без LLM.

**`status`** автоматически согласуется со `scoreNormalized` (пороги 0.75 / 0.45) даже если LLM вернул несогласованное значение — пост-обработка в `_normalize_evaluation`.

## Flask API (для бэкендера)

[api_example.py](api_example.py) — готовый Flask-сервер с эндпоинтами:

| Эндпоинт | Тело запроса | Ответ |
|---|---|---|
| `POST /api/interview/start` | `{profile}` | `{greeting, first_question, session_context}` |
| `POST /api/interview/next` | `{profile, dialogue, session_context}` | `{question, is_finished, ...}` |
| `POST /api/interview/evaluate` | `{profile, dialogue}` | финальный JSON |
| `POST /api/questions` | `{profile, n}` | `{questions: [...]}` |
| `POST /api/score` | `{profile, qa_pairs}` | финальный JSON |
| `POST /api/profile/extract` | `{resume_text}` | поля анкеты |
| `POST /api/profile/from_file` | multipart `file` | поля + текст резюме |

Запуск: `python -m hr_agent.api_example` → http://localhost:5000

Бэкендер может скопировать файл и допилить под свой стек (FastAPI/Django).

## Структура

```
hr_agent/
├── agent.py             # 5 публичных функций (3 для чата + 2 batch)
├── gigachat_client.py   # клиент GigaChat + mock
├── prompts.py           # все промпты (на русском, JSON-поля на английском)
├── parsers.py           # PDF/DOCX/TXT → текст
├── config.py            # настройки, .env, ALWAYS_ASK_TOPICS
├── api_example.py       # Flask-сервер (рефенс для бэкенда)
├── interactive.py       # ручной прогон интервью
├── test_agent.py        # 3 сценария с assert-проверками
├── examples/            # 3 профиля + диалог + output
├── requirements.txt
└── .env.example
```

## Настройка скоринга

В [config.py](config.py):
- `SCORE_RECOMMEND = 0.75` — порог "Recommended"
- `SCORE_REJECT = 0.45` — порог "Not recommended" (бэкенд отказывает на 2 недели)
- `MAX_QUESTIONS = 8` — после стольки вопросов диалог принудительно завершается
- `ALWAYS_ASK_TOPICS` — обязательный чек-лист тем для интервью
