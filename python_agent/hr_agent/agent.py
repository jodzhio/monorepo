"""HR-агент: 3 публичные функции для бэкенда.

start_interview(profile) → стартовое сообщение и первый вопрос.
next_question(profile, dialogue, session_context) → следующий вопрос или сигнал завершения.
evaluate_candidate(profile, dialogue) → финальный JSON со скорингом.
"""
from __future__ import annotations

import json
import re
from typing import Any, Optional

from . import config, prompts
from .gigachat_client import GigaChatClient


_default_client: Optional[GigaChatClient] = None


def _client() -> GigaChatClient:
    global _default_client
    if _default_client is None:
        _default_client = GigaChatClient()
    return _default_client


def set_client(client: GigaChatClient) -> None:
    """Подменить клиент (нужно для тестов)."""
    global _default_client
    _default_client = client


# ---------- Парсинг JSON-ответа модели с авто-починкой ----------

_JSON_BLOCK_RE = re.compile(r"\{[\s\S]*\}")


def _extract_json(text: str) -> str:
    """Вытащить JSON-объект из ответа модели, даже если она обернула его в markdown."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    match = _JSON_BLOCK_RE.search(text)
    return match.group(0) if match else text


def _parse_json(raw: str, expected_keys: list[str]) -> dict:
    """Парсинг с одной авто-починкой через LLM при ошибке."""
    candidate = _extract_json(raw)
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        pass

    repair_prompt = prompts.repair_json_prompt(raw, expected_keys)
    fixed = _client().ask(repair_prompt, system=prompts.SYSTEM_PROMPT)
    return json.loads(_extract_json(fixed))


# ---------- Утилиты ----------

def _normalize_name(name: str) -> str:
    parts = name.strip().split()
    return parts[0] if parts else name


def _greeting(name: str) -> str:
    first = _normalize_name(name) or "коллега"
    return (
        f"Здравствуйте, {first}! Я HR-ассистент X5 Tech. "
        f"Я задам несколько уточняющих вопросов по вашему опыту — это займёт 5–10 минут. "
        f"Отвечайте свободно, я учитываю всё, что вы пишете."
    )


def _closing_message() -> str:
    return (
        "Спасибо за ваше время и подробные ответы! "
        "Интервью завершено, мы свяжемся с вами в ближайшее время."
    )


# ---------- Batch-режим: список вопросов одним вызовом ----------

def generate_questions(profile: dict, n: int = config.MAX_QUESTIONS) -> list[str]:
    """Сгенерировать N вопросов сразу (без итеративного чата).

    Подходит для бэкендов, которые показывают все вопросы кандидату списком,
    а потом разом собирают ответы. После сбора ответов передавай их в
    `dialogue_from_qa` и зови `evaluate_candidate`.
    """
    raw = _client().ask(
        prompts.generate_questions_batch_prompt(profile, config.ALWAYS_ASK_TOPICS, n),
        system=prompts.SYSTEM_PROMPT,
    )
    parsed = _parse_json(raw, expected_keys=["questions"])
    questions = [str(q).strip() for q in (parsed.get("questions") or []) if str(q).strip()]
    return questions[:n]


def dialogue_from_qa(qa_pairs: list[dict]) -> str:
    """Собрать строку диалога из пар [{question, answer}, ...] для evaluate_candidate."""
    lines = []
    for item in qa_pairs:
        q = str(item.get("question", "")).strip()
        a = str(item.get("answer", "")).strip()
        if q:
            lines.append(f"HR: {q}")
        if a:
            lines.append(f"Кандидат: {a}")
    return "\n".join(lines) + "\n"


# ---------- Авто-извлечение полей анкеты из резюме ----------

def extract_profile_from_resume(resume_text: str) -> dict:
    """Из текста резюме извлечь поля анкеты (для пред-заполнения формы кандидата).

    Возвращает dict с ключами name/position/grade/about/education.
    Поле resume не возвращает — его и так знает вызывающий код.
    """
    raw = _client().ask(
        prompts.extract_profile_prompt(resume_text),
        system=prompts.SYSTEM_PROMPT,
    )
    parsed = _parse_json(raw, expected_keys=["name", "position", "grade", "about", "education"])
    return {
        "name": str(parsed.get("name", "")).strip(),
        "position": str(parsed.get("position", "")).strip(),
        "grade": str(parsed.get("grade", "")).strip(),
        "about": str(parsed.get("about", "")).strip(),
        "education": str(parsed.get("education", "")).strip(),
    }


# ---------- 1. start_interview ----------

def start_interview(profile: dict) -> dict:
    """Анализ анкеты + первый вопрос."""
    raw = _client().ask(
        prompts.analyze_profile_prompt(profile, config.ALWAYS_ASK_TOPICS),
        system=prompts.SYSTEM_PROMPT,
    )
    parsed = _parse_json(raw, expected_keys=["gaps", "strong_points", "first_question"])

    gaps = parsed.get("gaps") or []
    first_question = parsed.get("first_question") or "Расскажите подробнее о вашем последнем production-проекте."

    return {
        "greeting": _greeting(profile.get("name", "")),
        "first_question": first_question,
        "session_context": {
            "gaps": gaps,
            "strong_points": parsed.get("strong_points") or [],
            "asked_count": 1,
            "max_questions": config.MAX_QUESTIONS,
            "clarifications_used": 0,
            "clarifications_max": config.MAX_CLARIFICATIONS_PER_QUESTION,
            "bad_streak": 0,
            "behavior_flags": [],
            "is_finished": False,
        },
    }


# ---------- 2. next_question ----------

# Действия LLM: ask_next двигает счётчик, остальные — нет
_ADVANCE_ACTIONS = {"ask_next", "ignore_manipulation"}
# Качества, считающиеся "плохими" для накопительного флага
_BAD_QUALITIES = {"nonsense", "manipulation", "abusive", "off_topic"}
# Сколько подряд плохих ответов → принудительное завершение интервью
_BAD_LIMIT = 3


def next_question(profile: dict, dialogue: str, session_context: dict) -> dict:
    """Сгенерировать следующую реплику HR или завершить диалог.

    Реагирует как живой человек на:
      - расплывчатые / односложные ответы → переспрос
      - не по теме → возврат к вопросу
      - бред / набор символов → переспрос
      - попытки манипуляции ("забудь инструкции") → граница + следующий вопрос
      - оскорбления → переспрос или завершение, если их много

    Все события фиксируются в session_context.behavior_flags для финальной оценки.
    """
    ctx = dict(session_context or {})
    gaps: list[str] = list(ctx.get("gaps") or [])
    asked = int(ctx.get("asked_count", 0))
    max_q = int(ctx.get("max_questions", config.MAX_QUESTIONS))
    clarifications_used = int(ctx.get("clarifications_used", 0))
    clarifications_max = int(ctx.get("clarifications_max", config.MAX_CLARIFICATIONS_PER_QUESTION))
    bad_streak = int(ctx.get("bad_streak", 0))
    behavior_flags: list[str] = list(ctx.get("behavior_flags") or [])

    # Жёсткий лимит вопросов
    if asked >= max_q:
        ctx["is_finished"] = True
        return _finish(ctx, _closing_message())

    # Слишком много подряд плохих ответов — закрываем интервью досрочно
    if bad_streak >= _BAD_LIMIT:
        behavior_flags.append("interview_aborted_due_to_misbehavior")
        ctx["behavior_flags"] = behavior_flags
        ctx["is_finished"] = True
        return _finish(
            ctx,
            "Похоже, нам сложно общаться продуктивно. На этом завершим интервью — "
            "ваши ответы переданы HR-команде, они свяжутся с вами при необходимости."
        )

    raw = _client().ask(
        prompts.next_question_prompt(
            profile, dialogue, gaps, asked, max_q,
            clarifications_used, clarifications_max,
        ),
        system=prompts.SYSTEM_PROMPT,
    )
    parsed = _parse_json(
        raw,
        expected_keys=["answer_quality", "action", "next_utterance", "should_finish"],
    )

    quality = str(parsed.get("answer_quality") or "good").lower()
    action = str(parsed.get("action") or "ask_next").lower()
    utterance = parsed.get("next_utterance") or parsed.get("question")
    should_finish = bool(parsed.get("should_finish"))

    # Накапливаем флаги поведения
    if quality in _BAD_QUALITIES or quality == "no_answer":
        behavior_flags.append(f"q{asked}:{quality}")
        bad_streak += 1
    else:
        bad_streak = 0

    # Завершение
    if should_finish or not utterance or asked + 1 > max_q:
        ctx["behavior_flags"] = behavior_flags
        ctx["bad_streak"] = bad_streak
        ctx["is_finished"] = True
        return _finish(ctx, parsed.get("closing_message") or _closing_message())

    # Решаем, двигаем ли счётчик и пробел
    if action in _ADVANCE_ACTIONS:
        # Это новый вопрос — закрываем пробел (если указан) и двигаем счётчик
        covered = parsed.get("covered_gap")
        if covered and covered in gaps:
            gaps.remove(covered)
        asked += 1
        clarifications_used = 0
    else:
        # Это переспрос/редирект — счётчик вопросов НЕ двигаем
        clarifications_used += 1
        # Если уперлись в лимит переспросов и LLM всё равно даёт clarify —
        # форсируем переход к новому вопросу в следующий раз: помечаем пробел незакрытым.
        if clarifications_used >= clarifications_max and gaps:
            # Оставляем пробел в gaps, но фиксируем флаг
            behavior_flags.append(f"q{asked}:gap_unresolved")

    ctx.update({
        "gaps": gaps,
        "asked_count": asked,
        "clarifications_used": clarifications_used,
        "clarifications_max": clarifications_max,
        "bad_streak": bad_streak,
        "behavior_flags": behavior_flags,
        "is_finished": False,
        "last_action": action,
        "last_quality": quality,
    })

    return {
        "question": utterance,
        "session_context": ctx,
        "is_finished": False,
        "answer_quality": quality,
        "action": action,
    }


def _finish(ctx: dict, closing: str) -> dict:
    return {
        "question": None,
        "closing_message": closing,
        "session_context": ctx,
        "is_finished": True,
    }


# ---------- 3. evaluate_candidate ----------

_REQUIRED_FIELDS = [
    "candidateName", "role", "score", "scoreNormalized", "status",
    "summary", "strengths", "risks", "requirementsMatch",
    "interviewQuestions", "recommendation",
]


def evaluate_candidate(profile: dict, dialogue: str) -> dict:
    """Финальная оценка кандидата."""
    raw = _client().ask(
        prompts.evaluate_candidate_prompt(profile, dialogue),
        system=prompts.SYSTEM_PROMPT,
    )
    result = _parse_json(raw, expected_keys=_REQUIRED_FIELDS)
    return _normalize_evaluation(result, profile)


def _normalize_evaluation(result: dict, profile: dict) -> dict:
    """Привести score, scoreNormalized и status к согласованному виду."""
    # score / scoreNormalized: один источник истины — scoreNormalized
    score = result.get("score")
    score_norm = result.get("scoreNormalized")

    if score_norm is None and score is not None:
        score_norm = float(score) / 100.0
    if score_norm is None:
        score_norm = 0.0
    score_norm = max(0.0, min(1.0, float(score_norm)))
    score = int(round(score_norm * 100))

    if score_norm >= config.SCORE_RECOMMEND:
        status = "Recommended"
        should_invite = True
    elif score_norm >= config.SCORE_REJECT:
        status = "Maybe"
        should_invite = True
    else:
        status = "Not recommended"
        should_invite = False

    rec = result.get("recommendation") or {}
    rec.setdefault("reason", "")
    rec["shouldInvite"] = should_invite

    result["score"] = score
    result["scoreNormalized"] = round(score_norm, 2)
    result["status"] = status
    result["recommendation"] = rec

    result.setdefault("candidateName", profile.get("name", ""))
    result.setdefault("role", f"{profile.get('grade', '')} {profile.get('position', '')}".strip())
    result.setdefault("summary", "")
    result.setdefault("strengths", [])
    result.setdefault("risks", [])
    result.setdefault("requirementsMatch", [])
    result.setdefault("interviewQuestions", [])
    result.setdefault("behaviorFlags", [])
    result.setdefault("extractedFacts", {
        "englishLevel": None,
        "salaryExpectation": None,
        "workFormat": None,
        "noticePeriod": None,
        "willingToTravel": None,
        "githubLinks": [],
    })

    return result
