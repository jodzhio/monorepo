"""Клиент GigaChat API.

Получает access_token через Authorization key (живёт 30 минут),
автоматически обновляет токен при 401, делает retry с экспоненциальной задержкой.
В mock-режиме возвращает заготовленные JSON-ответы.
"""
from __future__ import annotations

import json
import re
import time
import uuid
from typing import Optional

import requests
import urllib3

from . import config

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class GigaChatError(RuntimeError):
    pass


class GigaChatClient:
    def __init__(
        self,
        auth_key: Optional[str] = None,
        scope: Optional[str] = None,
        model: Optional[str] = None,
        use_mock: Optional[bool] = None,
    ):
        self.auth_key = auth_key if auth_key is not None else config.GIGACHAT_AUTH_KEY
        self.scope = scope or config.GIGACHAT_SCOPE
        self.model = model or config.GIGACHAT_MODEL
        self.use_mock = config.USE_MOCK if use_mock is None else use_mock

        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0.0

        if not self.use_mock and not self.auth_key:
            raise GigaChatError(
                "GIGACHAT_AUTH_KEY не задан. Укажи ключ в .env или включи USE_MOCK=true."
            )

    def ask(
        self,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = config.DEFAULT_TEMPERATURE,
    ) -> str:
        """Отправить prompt и получить текст ответа модели."""
        if self.use_mock:
            return _mock_response(prompt, system)

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "stream": False,
        }

        return self._post_with_retry(payload)

    def _post_with_retry(self, payload: dict) -> str:
        last_error: Optional[Exception] = None
        for attempt in range(config.MAX_RETRIES):
            try:
                token = self._get_token()
                response = requests.post(
                    config.GIGACHAT_API_URL,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    verify=False,
                    timeout=config.REQUEST_TIMEOUT,
                )
                if response.status_code == 401:
                    self._access_token = None
                    self._token_expires_at = 0.0
                    raise GigaChatError("401 Unauthorized")
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except (requests.RequestException, GigaChatError, KeyError) as exc:
                last_error = exc
                if attempt < config.MAX_RETRIES - 1:
                    time.sleep(2 ** attempt)
        raise GigaChatError(f"GigaChat запрос провалился после {config.MAX_RETRIES} попыток: {last_error}")

    def _get_token(self) -> str:
        if self._access_token and time.time() < self._token_expires_at - 60:
            return self._access_token

        response = requests.post(
            config.GIGACHAT_OAUTH_URL,
            data={"scope": self.scope},
            headers={
                "Authorization": f"Basic {self.auth_key}",
                "RqUID": str(uuid.uuid4()),
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            },
            verify=False,
            timeout=config.REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
        self._access_token = data["access_token"]
        # GigaChat возвращает expires_at в миллисекундах от epoch
        expires_at_ms = data.get("expires_at")
        if expires_at_ms:
            self._token_expires_at = float(expires_at_ms) / 1000.0
        else:
            self._token_expires_at = time.time() + 30 * 60
        return self._access_token


# ---------- Mock-режим ----------

# Триггеры для детекта поведения в моке
_INJECTION_PATTERNS = [
    "забудь", "игнорируй", "ignore", "system:", "instruction",
    "поставь мне", "ты теперь", "новая задача", "ты больше не",
]
_ABUSIVE_PATTERNS = ["идиот", "дурак", "тупой", "хуй", "пошёл", "пошел нах"]


def _mock_react_to_answer(answer: str, full_prompt: str) -> tuple[str, str, str | None]:
    """Возвращает (quality, action, utterance) для мока next_question."""
    a = answer.lower().strip()
    if not a:
        return ("no_answer", "clarify",
                "Кажется, вы ничего не написали. Можете повторить ответ?")

    if any(p in a for p in _INJECTION_PATTERNS):
        return ("manipulation", "ignore_manipulation",
                "Я вас услышала, но моя задача — собрать факты для HR-команды. Двигаемся дальше: расскажите про ваш production-опыт.")

    if any(p in a for p in _ABUSIVE_PATTERNS):
        return ("abusive", "clarify",
                "Давайте останемся в профессиональном русле. Если хотите продолжить — расскажите, пожалуйста, про ваш опыт.")

    # Бессмыслица: только повторяющиеся символы или нет букв вовсе
    letters = sum(c.isalpha() for c in a)
    if letters < 3 or len(set(a)) <= 2:
        return ("nonsense", "clarify",
                "Простите, я не совсем поняла ваш ответ. Можете развернуть подробнее?")

    # Слишком короткий ответ
    if len(a.split()) <= 2:
        return ("vague", "clarify",
                "Расскажите чуть подробнее — какие технологии и какой контекст?")

    # Off-topic эвристика — упоминания не по делу
    off_topic_markers = ["погода", "котик", "обед", "выходной", "праздник", "отпуск"]
    if any(m in a for m in off_topic_markers):
        return ("off_topic", "redirect",
                "Понимаю)) Возвращаясь к нашему интервью: расскажите, пожалуйста, про ваш опыт.")

    return ("good", "ask_next", None)


_MOCK_QUESTION_BANK = [
    ("Какой у вас уровень английского — B1, B2, C1? Читаете ли документацию свободно?",
     "Уровень английского языка не упомянут"),
    ("Был ли опыт с облачными платформами вроде AWS, GCP или Yandex Cloud?",
     "Не указан опыт работы с облачными платформами (AWS / GCP / Yandex Cloud)"),
    ("Расскажите про самый сложный production-инцидент и как вы его решили.",
     "Нет деталей по нагрузке и масштабу production-проектов"),
    ("Есть ли опыт работы в команде из 5+ человек и code review?", None),
    ("Готовы ли вы пройти короткое обучение по недостающим технологиям перед стартом?", None),
]


def _mock_response(prompt: str, system: Optional[str]) -> str:
    """Грубый детектор по ключевым словам в prompt — какой prompt, такой и заготовленный ответ."""
    p = prompt.lower()

    if "проанализируй анкету" in p or "анализ анкеты" in p:
        return json.dumps({
            "gaps": [
                "Не указан опыт работы с облачными платформами (AWS / GCP / Yandex Cloud)",
                "Уровень английского языка не упомянут",
                "Нет деталей по нагрузке и масштабу production-проектов"
            ],
            "strong_points": [
                "Профильное техническое образование",
                "Указан конкретный стек: Python, FastAPI, PostgreSQL"
            ],
            "first_question": "Расскажите подробнее о последнем production-проекте: какая была нагрузка, размер команды и ваша зона ответственности?"
        }, ensure_ascii=False)

    if "ты — hr-интервьюер" in p or "проанализируй последний ответ кандидата" in p:
        # Анализируем ПОСЛЕДНЮЮ реплику кандидата
        candidate_lines = re.findall(r"Кандидат:\s*(.+)", prompt)
        last = candidate_lines[-1].strip() if candidate_lines else ""

        quality, action, utterance = _mock_react_to_answer(last, prompt)

        # Если ответ хороший — выдаём очередной вопрос из банка
        if action == "ask_next":
            asked_match = re.search(r"задано вопросов:\s*(\d+)", p)
            idx = int(asked_match.group(1)) - 1 if asked_match else 0
            idx = max(0, min(idx, len(_MOCK_QUESTION_BANK) - 1))
            question_text, covered = _MOCK_QUESTION_BANK[idx]
            utterance = utterance or question_text
            return json.dumps({
                "answer_quality": quality,
                "action": action,
                "next_utterance": utterance,
                "covered_gap": covered,
                "should_finish": False,
                "closing_message": None
            }, ensure_ascii=False)

        return json.dumps({
            "answer_quality": quality,
            "action": action,
            "next_utterance": utterance,
            "covered_gap": None,
            "should_finish": False,
            "closing_message": None
        }, ensure_ascii=False)

    if "сгенерируй ровно" in p and "вопросов для интервью" in p:
        return json.dumps({
            "questions": [
                "Расскажите о вашем последнем production-проекте: какая задача и какая нагрузка?",
                "Какой у вас уровень английского по шкале A1-C2?",
                "Назовите желаемую зарплатную вилку и предпочтительный формат работы.",
                "Когда вы готовы выйти на новое место и готовы ли к командировкам?",
                "Есть ли у вас pet-проекты, опенсорс или ссылки на GitHub?",
                "Почему вам интересна именно эта вакансия и куда хотите развиваться через 2-3 года?"
            ]
        }, ensure_ascii=False)

    if "извлеки ключевые поля" in p or "извлеки поля анкеты" in p:
        return json.dumps({
            "name": "Тестовый Кандидат",
            "position": "Python-разработчик",
            "grade": "Middle",
            "about": "Бэкенд-разработчик с опытом на FastAPI и PostgreSQL.",
            "education": "Технический ВУЗ"
        }, ensure_ascii=False)

    if "оцени кандидата" in p or "финальная оценка" in p or "scorenormalized" in p:
        # В мок-режиме извлекаем простые факты ТОЛЬКО из реплик кандидата
        # (строки после "Кандидат:"), чтобы не подхватывать формулировки HR.
        candidate_lines = "\n".join(re.findall(r"Кандидат:\s*(.+)", prompt))

        eng_match = re.search(r"\b([abAB][12]|[bB][12]|[cC][12])\b", candidate_lines)
        eng_level = eng_match.group(1).upper() if eng_match else None

        salary_match = re.search(r"(\d{2,3}[-–\s]*\d{0,3}\s*(?:к|тыс|000|k)\w*)", candidate_lines, re.IGNORECASE)
        salary = salary_match.group(1) if salary_match else None

        # Детект behaviorFlags из ответов кандидата
        behavior_flags: list[str] = []
        cl_lower = candidate_lines.lower()
        if any(p in cl_lower for p in _INJECTION_PATTERNS):
            behavior_flags.append("manipulation_attempt")
        if any(p in cl_lower for p in _ABUSIVE_PATTERNS):
            behavior_flags.append("abusive")
        nonsense_count = sum(
            1 for line in candidate_lines.split("\n")
            if line.strip() and (sum(c.isalpha() for c in line) < 3 or len(set(line.strip())) <= 2)
        )
        if nonsense_count >= 2:
            behavior_flags.append("nonsense")
        evasive_count = sum(
            1 for line in candidate_lines.split("\n")
            if 0 < len(line.strip().split()) <= 2
        )
        if evasive_count >= 3:
            behavior_flags.append("evasive_answers")

        if eng_level:
            eng_evidence = f"Кандидат назвал уровень {eng_level} в диалоге"
            eng_status = "found"
        else:
            eng_evidence = "Уровень не назван в диалоге"
            eng_status = "unclear"

        # Базовый mock-скор + штрафы за поведение
        score = 72
        risks = [
            "Не работал с AWS, только с Yandex Cloud",
            f"Английский: {eng_level or 'не назван'}",
        ]
        if "manipulation_attempt" in behavior_flags:
            score = min(score, 30)
            risks.insert(0, "Попытка манипулировать интервью — red flag")
        if "abusive" in behavior_flags:
            score = min(score, 20)
            risks.insert(0, "Использовал оскорбления в ответах")
        if "nonsense" in behavior_flags:
            score -= 20
            risks.insert(0, "Несколько ответов — бессмыслица")
        if "evasive_answers" in behavior_flags:
            score -= 15
            risks.insert(0, "Уклончивые / односложные ответы")
        score = max(0, min(score, 100))

        return json.dumps({
            "candidateName": "Mock Candidate",
            "role": "Middle Backend Developer",
            "score": score,
            "scoreNormalized": score / 100,
            "status": "Maybe",
            "summary": "MOCK-ответ. Чтобы получить настоящий скоринг — поставь USE_MOCK=false в .env.",
            "strengths": [
                "Опыт с Python и FastAPI",
                "Работа с PostgreSQL и Docker"
            ],
            "risks": risks,
            "behaviorFlags": behavior_flags,
            "requirementsMatch": [
                {"requirement": "Python", "status": "found", "evidence": "Указан в анкете"},
                {"requirement": "PostgreSQL", "status": "found", "evidence": "Указан в стеке"},
                {"requirement": "AWS", "status": "missing", "evidence": "Кандидат прямо сказал, что не работал"},
                {"requirement": "English B2+", "status": eng_status, "evidence": eng_evidence}
            ],
            "extractedFacts": {
                "englishLevel": eng_level,
                "salaryExpectation": salary,
                "workFormat": None,
                "noticePeriod": None,
                "willingToTravel": None,
                "githubLinks": []
            },
            "interviewQuestions": [
                "Расскажите о самом сложном инциденте на production и как вы его решали.",
                "Готовы ли вы пройти короткий курс по AWS перед стартом?"
            ],
            "recommendation": {
                "shouldInvite": True,
                "reason": "MOCK: кандидат закрывает большинство требований."
            }
        }, ensure_ascii=False)

    return "{}"
