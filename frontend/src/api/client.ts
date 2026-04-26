import type {
  AnswerRequest,
  CandidateCreateRequest,
  DialogQuestionResponse,
  DialogStartResponse,
  ScorePendingResponse,
  ScoreResponse,
  ScoreResult,
} from "../types/api";

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:8000/api";

const REQUEST_TIMEOUT_MS = 8000;

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<{ status: number; data: T }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: ctl.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });

    const text = await res.text();
    const data = (text ? JSON.parse(text) : null) as T;

    if (!res.ok && res.status !== 202) {
      throw new ApiError(`API ${res.status}: ${path}`, res.status);
    }
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

// POST /candidates — creates candidate and starts dialogue session.
export async function createCandidate(
  payload: CandidateCreateRequest,
): Promise<DialogStartResponse> {
  try {
    const { data } = await request<DialogStartResponse>("/candidates", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return data;
  } catch {
    // Hackathon fallback: if backend is unavailable, simulate a session so the
    // frontend flow can be demoed end-to-end.
    return mockCreateCandidate(payload);
  }
}

// GET /dialog/{session_id}/next — fetches next question or analyzing state.
export async function getNextQuestion(sessionId: string): Promise<DialogQuestionResponse> {
  try {
    const { data } = await request<DialogQuestionResponse>(
      `/dialog/${encodeURIComponent(sessionId)}/next`,
    );
    return data;
  } catch {
    return mockNextQuestion(sessionId);
  }
}

// POST /dialog/{session_id}/answer — submits the candidate's answer.
export async function postAnswer(
  sessionId: string,
  payload: AnswerRequest,
): Promise<DialogQuestionResponse> {
  try {
    const { data } = await request<DialogQuestionResponse>(
      `/dialog/${encodeURIComponent(sessionId)}/answer`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    return data;
  } catch {
    return mockPostAnswer(sessionId, payload);
  }
}

// GET /candidates/{candidate_id}/score — returns ready score (200) or analyzing (202).
export async function getScore(candidateId: string): Promise<ScoreResult> {
  try {
    const { status, data } = await request<ScoreResponse | ScorePendingResponse>(
      `/candidates/${encodeURIComponent(candidateId)}/score`,
    );
    if (status === 202) {
      return { kind: "pending", data: data as ScorePendingResponse };
    }
    return { kind: "ready", data: data as ScoreResponse };
  } catch {
    return mockGetScore(candidateId);
  }
}

// ─── Mock fallbacks ──────────────────────────────────────────────────────────
// These run only when the backend is unreachable. They mirror the contract so
// the UI stays demoable offline.

const mockState = new Map<
  string,
  { candidateId: string; askedIds: number[]; answers: { id: number; text: string }[]; max: number }
>();

const mockBank = [
  "Расскажите про самый сложный баг в продакшене, который вы исправляли. В чём была первопричина?",
  "Как вы работаете с конкурентностью в своём стеке? Поделитесь конкретным примером.",
  "Был ли опыт с PostgreSQL, Docker или CI/CD? Какая у вас была роль?",
  "Какая часть самого сложного проекта была лично за вами?",
  "Как вы обеспечиваете идемпотентность в API, которые проектируете?",
];

function mockCreateCandidate(payload: CandidateCreateRequest): DialogStartResponse {
  const sessionId = `mock_sess_${Math.random().toString(36).slice(2, 10)}`;
  const max = 5;
  mockState.set(sessionId, {
    candidateId: payload.candidate_id,
    askedIds: [1],
    answers: [],
    max,
  });
  return {
    session_id: sessionId,
    status: "in_progress",
    questions: [{ question_id: 1, text: mockBank[0] }],
    max_questions: max,
  };
}

function mockNextQuestion(sessionId: string): DialogQuestionResponse {
  const s = mockState.get(sessionId);
  if (!s) {
    return {
      session_id: sessionId,
      question_id: null,
      text: "",
      is_last: true,
      status: "analyzing",
    };
  }
  const lastId = s.askedIds[s.askedIds.length - 1] ?? 0;
  return {
    session_id: sessionId,
    question_id: lastId,
    text: mockBank[lastId - 1] ?? mockBank[0],
    is_last: false,
    status: "in_progress",
  };
}

function mockPostAnswer(sessionId: string, payload: AnswerRequest): DialogQuestionResponse {
  const s = mockState.get(sessionId);
  if (!s) {
    return {
      session_id: sessionId,
      question_id: null,
      text: "",
      is_last: true,
      status: "analyzing",
    };
  }
  s.answers.push({ id: payload.question_id, text: payload.answer });
  if (s.answers.length >= s.max) {
    return {
      session_id: sessionId,
      question_id: null,
      text: "",
      is_last: true,
      status: "analyzing",
    };
  }
  const nextId = s.askedIds.length + 1;
  s.askedIds.push(nextId);
  return {
    session_id: sessionId,
    question_id: nextId,
    text:
      mockBank[nextId - 1] ?? "Расскажите всё, что считаете важным для команды.",
    is_last: nextId === s.max,
    status: "in_progress",
  };
}

let mockScoreCallCount = 0;
function mockGetScore(candidateId: string): ScoreResult {
  // Simulate analyzing for the first call, then return a ready score.
  mockScoreCallCount += 1;
  if (mockScoreCallCount < 2) {
    return {
      kind: "pending",
      data: { status: "analyzing", message: "Scoring is not ready yet" },
    };
  }
  return {
    kind: "ready",
    data: {
      candidate_id: candidateId,
      score: 0.78,
      score_percent: 78,
      verdict: "recommend_to_interview",
      recommendation:
        "Сильный опыт в Go и реальная работа с конкурентностью. Рекомендуем пригласить на техническое интервью.",
      traits: {
        positive: [
          "Опыт под высокой нагрузкой",
          "Уверенно работает с примитивами синхронизации",
          "Аналитика по реальному багу — продемонстрирована",
        ],
        negative: ["Мало опыта с gRPC"],
      },
      rejection_timer_days: null,
      rejection_message_template: null,
      status: "approved",
    },
  };
}
