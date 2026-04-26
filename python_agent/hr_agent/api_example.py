"""Пример Flask-обёртки HR-агента для бэкендера.

Это РЕФЕРЕНС, а не продакшн. Бэкенд может скопировать и допилить под свой стек.

Запуск:
    pip install flask
    PYTHONIOENCODING=utf-8 python -m hr_agent.api_example
    # сервер на http://localhost:5000

Эндпоинты:

  ИТЕРАТИВНЫЙ режим (рекомендуется — вопросы адаптивные):
    POST /api/interview/start    {profile} → {greeting, first_question, session_context}
    POST /api/interview/next     {profile, dialogue, session_context} → {question, ..., is_finished}
    POST /api/interview/evaluate {profile, dialogue} → финальный JSON со скорингом

  BATCH режим (вопросы сразу списком):
    POST /api/questions          {profile, n?}      → {questions: [...]}
    POST /api/score              {profile, qa_pairs} → финальный JSON со скорингом

  Утилиты:
    POST /api/profile/extract    {resume_text}     → {name, position, grade, about, education}
    POST /api/profile/from_file  multipart файл    → {name, position, grade, about, education, resume}
"""
from __future__ import annotations

import tempfile
from pathlib import Path

try:
    from flask import Flask, request, jsonify
except ImportError:
    raise SystemExit("Установи Flask: pip install flask")

from . import (
    start_interview,
    next_question,
    evaluate_candidate,
    extract_profile_from_resume,
    generate_questions,
    dialogue_from_qa,
    parse_resume_file,
    ParseError,
)


app = Flask(__name__)


# ---------- Итеративный режим ----------

@app.post("/api/interview/start")
def api_interview_start():
    data = request.get_json(force=True)
    profile = data.get("profile") or data
    return jsonify(start_interview(_normalize_profile(profile)))


@app.post("/api/interview/next")
def api_interview_next():
    data = request.get_json(force=True)
    return jsonify(next_question(
        profile=_normalize_profile(data["profile"]),
        dialogue=_dialogue_to_text(data["dialogue"]),
        session_context=data.get("session_context") or {},
    ))


@app.post("/api/interview/evaluate")
def api_interview_evaluate():
    data = request.get_json(force=True)
    return jsonify(evaluate_candidate(
        profile=_normalize_profile(data["profile"]),
        dialogue=_dialogue_to_text(data["dialogue"]),
    ))


def _dialogue_to_text(dialogue) -> str:
    """Принять диалог в любом формате и вернуть строку для prompt'ов.

    Поддерживает:
      - готовая строка (просто возвращаем);
      - список реплик [{role, content}] от Go-бэкенда;
      - список реплик [{role, text}] (debug-формат).
    """
    if isinstance(dialogue, str):
        return dialogue
    if not dialogue:
        return ""
    lines = []
    for turn in dialogue:
        role = str(turn.get("role", "")).lower()
        content = turn.get("content") or turn.get("text") or ""
        speaker = "HR" if role in {"hr", "assistant", "interviewer"} else "Кандидат"
        if content:
            lines.append(f"{speaker}: {content}")
    return "\n".join(lines) + ("\n" if lines else "")


def _normalize_profile(profile: dict) -> dict:
    """Подмазать поля профиля, которые приходят из Go: candidate_id вместо name,
    resume_url вместо resume."""
    if not profile:
        return {}
    out = dict(profile)
    out.setdefault("name", profile.get("candidate_id") or "Кандидат")
    out.setdefault("resume", profile.get("resume_url") or profile.get("about", ""))
    return out


# ---------- Batch режим (совместим с Go-бэкендом из backend/) ----------

@app.post("/api/questions")
def api_questions():
    """Сгенерировать список вопросов.

    Принимает ЛЮБОЙ из двух форматов:
    1. Go-бэкенд: {"position": "backend_go", "grade": "Middle"}
    2. Полный профиль: {"profile": {...}, "n": 6}

    Возвращает: {"questions": [{"id": 1, "text": "..."}, ...]}
    """
    data = request.get_json(force=True)

    if "profile" in data:
        profile = data["profile"]
    else:
        # Go-бэкенд шлёт только position/grade — синтезируем минимальный профиль
        profile = {
            "name": data.get("candidate_id", ""),
            "position": data.get("position", ""),
            "grade": data.get("grade", ""),
            "about": data.get("about", ""),
            "education": data.get("education", ""),
            "resume": data.get("resume", ""),
        }

    n = int(data.get("n", 6))
    questions = generate_questions(profile, n=n)

    # Формат для Go: [{id, text}], id с 1
    items = [{"id": i, "text": q} for i, q in enumerate(questions, start=1)]
    return jsonify({"questions": items})


@app.post("/api/score")
def api_score():
    """Финальный скоринг.

    Принимает ЛЮБОЙ из двух форматов:
    1. Go-бэкенд: {
         "candidate": {"candidate_id", "position", "grade", "about", "education", "resume_url"},
         "answers":   [{"QuestionID", "QuestionText", "AnswerText", "AnsweredAt"}]
       }
    2. Простой:  {"profile": {...}, "qa_pairs": [{"question", "answer"}]}

    Возвращает Go-совместимый ScoreResponse:
        {score, score_percent, verdict, recommendation, traits, status,
         rejection_timer_days, rejection_message_template}
    """
    data = request.get_json(force=True)

    raw_candidate = data.get("candidate") or data.get("profile") or {}
    raw_answers = data.get("answers") or data.get("qa_pairs") or []

    profile = _candidate_to_profile(raw_candidate)
    dialogue = _answers_to_dialogue(raw_answers)

    if not profile.get("position"):
        return jsonify({"error": "missing position"}), 400

    internal = evaluate_candidate(profile, dialogue)
    return jsonify(_to_go_score_response(internal))


# ---------- Адаптеры между форматами ----------

def _candidate_to_profile(candidate: dict) -> dict:
    """Привести Go-кандидата к internal profile."""
    return {
        "name": candidate.get("name") or candidate.get("candidate_id") or "Кандидат",
        "position": candidate.get("position", ""),
        "grade": candidate.get("grade", ""),
        "about": candidate.get("about", ""),
        "education": candidate.get("education", ""),
        # Go хранит resume_url, реальный текст обычно подтягивается отдельно
        "resume": candidate.get("resume") or candidate.get("resume_url") or candidate.get("about", ""),
    }


def _answers_to_dialogue(answers: list[dict]) -> str:
    """Принять и Go-формат (QuestionText/AnswerText), и простой (question/answer)."""
    lines = []
    for a in answers:
        q = a.get("QuestionText") or a.get("question_text") or a.get("question") or ""
        ans = a.get("AnswerText") or a.get("answer_text") or a.get("answer") or ""
        if q:
            lines.append(f"HR: {q}")
        if ans:
            lines.append(f"Кандидат: {ans}")
    return "\n".join(lines) + "\n"


def _to_go_score_response(internal: dict) -> dict:
    """Конвертировать наш internal eval в формат Go ScoreResponse."""
    score_norm = float(internal.get("scoreNormalized", 0.0))
    score_percent = int(internal.get("score", round(score_norm * 100)))

    if score_norm >= 0.45:
        verdict = "recommend_to_interview"
        status = "approved"
        rejection_days = 0
        rejection_msg = ""
    else:
        verdict = "soft_reject_timer"
        status = "pending_rejection"
        rejection_days = 14
        rejection_msg = (
            "К сожалению, ваши навыки не полностью соответствуют требованиям позиции. "
            "Мы вернёмся к вашей кандидатуре через 2 недели."
        )

    rec = internal.get("recommendation") or {}
    recommendation_text = rec.get("reason") or internal.get("summary", "")

    return {
        "score": round(score_norm, 2),
        "score_percent": score_percent,
        "verdict": verdict,
        "recommendation": recommendation_text,
        "traits": {
            "positive": internal.get("strengths") or [],
            "negative": internal.get("risks") or [],
        },
        "rejection_timer_days": rejection_days,
        "rejection_message_template": rejection_msg,
        "status": status,
        # Дополнительно — наши расширенные поля, Go их проигнорирует, но они полезны для UI
        "extra": {
            "candidateName": internal.get("candidateName"),
            "role": internal.get("role"),
            "summary": internal.get("summary"),
            "requirementsMatch": internal.get("requirementsMatch"),
            "extractedFacts": internal.get("extractedFacts"),
            "interviewQuestions": internal.get("interviewQuestions"),
        },
    }


# ---------- Утилиты для работы с резюме ----------

@app.post("/api/profile/extract")
def api_profile_extract():
    """Из текста резюме вытащить поля анкеты для пред-заполнения формы."""
    data = request.get_json(force=True)
    return jsonify(extract_profile_from_resume(data["resume_text"]))


@app.post("/api/profile/from_file")
def api_profile_from_file():
    """Принять файл резюме (PDF/DOCX/TXT), распарсить и извлечь поля."""
    if "file" not in request.files:
        return jsonify({"error": "no file"}), 400
    upload = request.files["file"]
    suffix = Path(upload.filename or "").suffix or ".bin"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        upload.save(tmp.name)
        tmp_path = tmp.name
    try:
        resume_text = parse_resume_file(tmp_path)
    except ParseError as exc:
        return jsonify({"error": str(exc)}), 400
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    extracted = extract_profile_from_resume(resume_text)
    extracted["resume"] = resume_text
    return jsonify(extracted)


@app.get("/api/health")
def api_health():
    from . import config
    return jsonify({"ok": True, "use_mock": config.USE_MOCK})


if __name__ == "__main__":
    app.run(host="localhost", port=5000, debug=True)
