# Frontend (React + Vite)

UI для HR-панели и формы отклика кандидата. Часть монорепозитория
([../README.md](../README.md)).

## Стек

- React 19 + TypeScript
- Vite (dev-сервер + сборка)
- React Router 7
- Tailwind CSS 3
- Lucide React (иконки)

## Структура

```
frontend/
├── src/
│   ├── api/client.ts      # обёртка над fetch + mock-фолбэки на случай оффлайна
│   ├── types/api.ts       # TypeScript-типы под openapi.yaml
│   ├── pages/             # ApplyPage (кандидат), DashboardPage / Candidates… (HR)
│   ├── components/        # ApplicationForm, ChatScreen, ResultPage, ...
│   ├── context/           # глобальные сторы
│   └── data/              # моки HR-витрины
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## Запуск

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Доступные страницы:
- `/` — дашборд HR.
- `/candidates` — список кандидатов.
- `/candidates/:id` — карточка кандидата.
- `/apply` — форма отклика + AI-чат.

## Конфигурация

Один параметр — URL бэкенда. По умолчанию `http://localhost:8000/api`.

Переопределить через `frontend/.env`:

```
VITE_API_BASE_URL=https://my-backend.example.com/api
```

## Сборка для прод

```bash
npm run build
# артефакты → frontend/dist
npm run preview         # локальный smoke-test собранного бандла
```

`dist/` можно скармливать любому статик-хостингу (Vercel / Netlify / Nginx).
Не забудьте перенаправлять все 404 на `index.html` — иначе React Router
ломается на прямых ссылках типа `/candidates/abc`.

## Связь с бэкендом

Все запросы идут через `src/api/client.ts`. Если бэкенд недоступен,
клиент молча переключается на in-memory моки (`mockCreateCandidate` и
друзья) — это сделано специально, чтобы UI можно было показать
без подключения. На проде моки следует отключить (вырезать `try/catch`
и блок «mock fallbacks»).

Контракты в `src/types/api.ts` соответствуют `openapi.yaml`. При расхождении
со схемой исправлять в трёх местах сразу: openapi → backend/models → этот файл.
