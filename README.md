# AI Recruiter - Go бэкенд для HR агента

Бэкенд сервиса для проведения автоматизированных технических интервью с кандидатами.

## Быстрый старт

### Требования
- Go 1.22+
- Python 3.9+ (для LLM агента)

### Установка и запуск

```bash
# Клонирование репозитория
git clone https://github.com/jodzhio/monorepo.git
cd monorepo

# Установка зависимостей Go
go mod download

# Сборка
go build -o server ./cmd/server/main.go

# Запуск
./server

Конфигурация
Создайте config.yaml в корне проекта:

yaml
server_host: "localhost"
server_port: 8080
llm_agent_url: "http://localhost:5000"  # URL Python агента
Или используйте переменные окружения:

bash
export PYTHON_AGENT_URL=http://localhost:5000
