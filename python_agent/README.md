# HR-агент на GigaChat

Python LLM-агент: анализирует кандидатов на технические вакансии, ведёт
диалог-интервью и выдаёт структурированный JSON для HR-панели.

Часть монорепозитория ([../README.md](../README.md)): фронтенд → Go-бэкенд →
этот агент.

## Quick start

```bash
cd python_agent
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r hr_agent/requirements.txt

cp hr_agent/.env.example hr_agent/.env
# впишите GIGACHAT_AUTH_KEY и поставьте USE_MOCK=false
# либо оставьте USE_MOCK=true — агент будет отвечать заглушками без сети

# HTTP-сервер для Go-бэкенда (на :5000)
PYTHONIOENCODING=utf-8 python -m hr_agent.api_example

# Прогон 3 сценариев на разных профилях (без сервера)
PYTHONIOENCODING=utf-8 python -m hr_agent.test_agent

# Ручной чат — ты в роли кандидата
PYTHONIOENCODING=utf-8 python -m hr_agent.interactive
```

> На Windows везде нужен `PYTHONIOENCODING=utf-8` перед командой — иначе
> кириллица в stdout ломается.

## Конфигурация

Все настройки — через `hr_agent/.env`:

| Переменная           | По умолчанию          | Назначение                          |
|----------------------|-----------------------|--------------------------------------|
| `GIGACHAT_AUTH_KEY`  | —                     | Base64 `client_id:client_secret`     |
| `GIGACHAT_SCOPE`     | `GIGACHAT_API_PERS`   | `_PERS` / `_B2B` / `_CORP`           |
| `GIGACHAT_MODEL`     | `GigaChat`            | `GigaChat` / `GigaChat-Pro` / `-Max` |
| `USE_MOCK`           | `true` если ключа нет | Отвечать заглушками без сети         |

## Контракт с Go-бэкендом

Go вызывает у агента:

| Метод | Путь                       | Назначение                              |
|-------|----------------------------|------------------------------------------|
| POST  | `/api/interview/start`     | Анализ анкеты + первый вопрос           |
| POST  | `/api/interview/next`      | Следующий вопрос или завершение         |
| POST  | `/api/score`               | Финальный скоринг по списку Q&A         |
| GET   | `/api/health`              | Liveness + флаг `use_mock`              |

`/api/interview/next` принимает `dialogue` либо строкой, либо списком
реплик `[{role, content}]` (так присылает Go) — конвертация делается в
`api_example.py:_dialogue_to_text`.

## Документация

- [hr_agent/README.md](hr_agent/README.md) — публичные функции агента, парсинг резюме, mock-режим
- [INTEGRATION.md](INTEGRATION.md) — контракт между Go-бэкендом и Python-агентом (для бэкендера)

## Что внутри [hr_agent/](hr_agent/)

- 5 публичных функций для бэкенда (3 для итеративного чата + 2 для batch)
- Парсинг резюме PDF / DOCX / TXT
- Авто-извлечение полей анкеты из резюме через LLM
- Готовый Flask-сервер с эндпоинтами в формате Go-бэкенда
- Mock-режим — работает без API-ключа GigaChat
