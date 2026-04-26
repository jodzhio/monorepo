# Shorthack67 — HR-агент на GigaChat

Python LLM-агент для X5 Tech (хакатон): анализирует кандидатов на технические вакансии, ведёт диалог-интервью и выдаёт структурированный JSON для HR-панели.

Бэкенд (Go) живёт в отдельном репозитории: https://github.com/jodzhio/monorepo

## Quick start

```bash
pip install -r hr_agent/requirements.txt
cp hr_agent/.env.example hr_agent/.env
# вставь GIGACHAT_AUTH_KEY в hr_agent/.env и поставь USE_MOCK=false

# Прогон 3 сценариев на разных профилях
python -m hr_agent.test_agent

# Ручной чат — ты в роли кандидата
python -m hr_agent.interactive

# HTTP-сервер для бэкенда (на :5000)
python -m hr_agent.api_example
```

> На Windows везде нужен `PYTHONIOENCODING=utf-8` перед командой.

## Документация

- [hr_agent/README.md](hr_agent/README.md) — публичные функции агента, парсинг резюме, mock-режим
- [INTEGRATION.md](INTEGRATION.md) — контракт между Go-бэкендом и Python-агентом (для бэкендера)

## Что внутри [hr_agent/](hr_agent/)

- 5 публичных функций для бэкенда (3 для итеративного чата + 2 для batch)
- Парсинг резюме PDF / DOCX / TXT
- Авто-извлечение полей анкеты из резюме через LLM
- Готовый Flask-сервер с эндпоинтами в формате Go-бэкенда
- Mock-режим — работает без API-ключа GigaChat
