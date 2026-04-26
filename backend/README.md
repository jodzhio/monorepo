# Backend (Go)

REST API сервер на чистом `net/http`. Принимает запросы фронтенда, держит
состояние сессий и проксирует разговор в Python-агента.

## Структура

```
backend/
├── main.go            # entrypoint: читает конфиг, поднимает сервер
├── config/            # парсинг config.yaml + переменные окружения
├── handlers/          # HTTP-хендлеры (POST /candidates, /dialog/..., /score)
├── llm/
│   ├── python_client.go  # HTTP-клиент для Python-агента
│   └── agent.go          # MockAgent для офлайн-разработки
├── models/            # все DTO (request/response + внутренние)
├── storage/           # in-memory storage с sync.RWMutex
├── utils/             # генерация ID, парсинг URL
├── go.mod / go.sum
└── config.yaml        # дефолтная конфигурация
```

## Запуск

### 1. Установка

Требуется Go 1.22+ (`go.mod` объявляет 1.25, но реально хватает 1.22).

```bash
cd backend
go mod download
```

### 2. Конфигурация

Дефолты в `config.yaml`:

```yaml
server_host: "0.0.0.0"
server_port: 8000
llm_agent_url: "http://localhost:5000"
```

Любое поле можно перекрыть переменной окружения:

| Переменная          | Назначение                          |
|---------------------|--------------------------------------|
| `SERVER_HOST`       | Адрес для bind                       |
| `SERVER_PORT`       | Порт                                 |
| `PYTHON_AGENT_URL`  | URL запущенного python_agent (Flask) |

### 3. Запуск

```bash
go run .
# 2026/04/26 16:00:00 Go server starting on 0.0.0.0:8000
# 2026/04/26 16:00:00 Connected to Python agent at: http://localhost:5000
```

Или собрать бинарь:

```bash
go build -o bin/server .
./bin/server
```

### 4. Smoke-test

```bash
curl -X POST http://localhost:8000/api/candidates \
  -H 'Content-Type: application/json' \
  -d '{
    "position": "Go-разработчик",
    "grade": "Middle",
    "about": "3 года писал на Go, занимался высокими нагрузками",
    "education": "МГТУ, 2022",
    "resume_url": "https://example.com/cv.pdf"
  }'
```

Должен вернуться `201 Created` с `session_id` и первым вопросом.

## Деплой в Docker (опционально)

Минимальный Dockerfile:

```dockerfile
FROM golang:1.22-alpine AS build
WORKDIR /src
COPY . .
RUN go build -o /out/server .

FROM alpine:3.20
COPY --from=build /out/server /server
COPY config.yaml /config.yaml
EXPOSE 8000
CMD ["/server"]
```

```bash
docker build -t ai-recruiter-backend .
docker run --rm -p 8000:8000 \
  -e PYTHON_AGENT_URL=http://host.docker.internal:5000 \
  ai-recruiter-backend
```

## Решения, которые стоит знать

- **In-memory storage.** Состояние теряется при рестарте. Для продакшна
  замените `storage.Storage` на реализацию поверх Redis/Postgres — интерфейс,
  используемый из `handlers`, ограничен пятью методами.

- **Финальный скоринг считается асинхронно.** В `PostAnswerHandler` при
  `is_finished=true` сессия переводится в статус `analyzing` и
  `computeFinalScore` запускается в горутине. Фронт опрашивает
  `/candidates/{id}/score` до получения `200 OK`. Так клиент не висит
  на медленном вызове GigaChat.

- **CORS** включён для `*` в `main.go:withCORS` — это ОК для хакатона, но в
  продакшене должен быть ограничен реальным origin фронта.

- **MockAgent** в `llm/agent.go` — резерв для разработки без Python-агента.
  Подменить можно одной строкой в `main.go`:
  ```go
  // llmAgent := llm.NewPythonAgentClient(cfg.LLMAgentURL)
  llmAgent := llm.NewMockAgent()
  ```
  (потребует поправить `handlers.NewHandler`, чтобы принимал интерфейс `llm.Agent`,
  а не конкретный `*PythonAgentClient`).
