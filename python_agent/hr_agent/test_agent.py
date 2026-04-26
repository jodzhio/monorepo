"""Прогон полного сценария на 3 разных кандидатах.

Запуск:
    python -m hr_agent.test_agent

В mock-режиме (USE_MOCK=true) гоняется без реального GigaChat.
"""
from __future__ import annotations

import json
from pathlib import Path

from . import start_interview, next_question, evaluate_candidate


EXAMPLES_DIR = Path(__file__).parent / "examples"


# Заготовленные ответы кандидата на каждый вопрос интервью.
# В тестовом прогоне реального кандидата нет, поэтому фейковые реплики.
CANNED_ANSWERS = {
    "profile_1.json": [
        "Делал сервис доставки на FastAPI, нагрузка 5к RPS, команда 6 человек, я отвечал за модуль расчёта стоимости.",
        "Английский на уровне A2, но документацию читаю свободно.",
        "С AWS не работал, в проектах был Yandex Cloud — managed PostgreSQL и Kubernetes.",
        "Был инцидент с утечкой соединений к БД при пике трафика — нашёл через Prometheus, добавили алерт на пул.",
        "Да, готов пройти курс по AWS, мне это интересно.",
        "У меня есть pet-проект — async-логгер, лежит на GitHub.",
    ],
    "profile_2.json": [
        "Сейчас веду рекомендательный сервис в Яндекс.Маркете на Go, нагрузка 80к RPS, команда из 4 человек, я тимлид.",
        "Активно использую Kubernetes последние 3 года, есть опыт миграции с docker-compose.",
        "Английский B2 — участвую в международных созвонах, читаю спецификации gRPC и proto.",
        "Самый сложный кейс — переписывали legacy-сервис с Python на Go без даунтайма, заняло полгода.",
        "Опыт найма — провёл около 40 интервью за 2 года, помогал калибровать грейды в команде.",
        "Готова обсудить условия, интересна предметка ритейла.",
    ],
    "profile_3.json": [
        "В студии Pixel верстал лендинги, React использовал только в учебных проектах.",
        "С Redux не работал, понимаю useState и useEffect.",
        "Английский школьный, документацию читаю с переводчиком.",
        "Опыта работы с тестами нет, только смотрел туториалы.",
        "В команде из 2 человек был, в больших не работал.",
        "Готов учиться, интересно расти в frontend.",
    ],
}


def run_scenario(profile_filename: str) -> dict:
    profile_path = EXAMPLES_DIR / profile_filename
    profile = json.loads(profile_path.read_text(encoding="utf-8"))
    answers = CANNED_ANSWERS[profile_filename]

    print(f"\n{'=' * 70}")
    print(f"СЦЕНАРИЙ: {profile['name']} — {profile['grade']} {profile['position']}")
    print('=' * 70)

    # 1. Старт
    start = start_interview(profile)
    print(f"\n[Greeting] {start['greeting']}")
    print(f"[HR Q1] {start['first_question']}")

    dialogue = f"HR: {start['first_question']}\nКандидат: {answers[0]}\n"
    print(f"[Кандидат] {answers[0]}")
    ctx = start["session_context"]
    answer_idx = 1

    # 2. Цикл вопросов (с защитой от зацикливания)
    while not ctx.get("is_finished") and answer_idx < len(answers):
        step = next_question(profile, dialogue, ctx)
        ctx = step["session_context"]
        if step["is_finished"]:
            print(f"\n[Closing] {step.get('closing_message')}")
            break
        print(f"\n[HR Q{ctx['asked_count']}] {step['question']}")
        print(f"[Кандидат] {answers[answer_idx]}")
        dialogue += f"HR: {step['question']}\nКандидат: {answers[answer_idx]}\n"
        answer_idx += 1

    # 3. Финальная оценка
    print("\n--- ФИНАЛЬНАЯ ОЦЕНКА ---")
    result = evaluate_candidate(profile, dialogue)
    print(json.dumps(result, ensure_ascii=False, indent=2))

    # Жёсткие проверки контракта
    assert "score" in result, "missing 'score'"
    assert "scoreNormalized" in result, "missing 'scoreNormalized'"
    assert "status" in result, "missing 'status'"
    assert isinstance(result["score"], int), "'score' must be int"
    assert 0 <= result["score"] <= 100, "score out of range"
    assert 0.0 <= result["scoreNormalized"] <= 1.0, "scoreNormalized out of range"
    assert result["status"] in {"Recommended", "Maybe", "Not recommended"}, \
        f"unexpected status: {result['status']}"
    assert isinstance(result["strengths"], list)
    assert isinstance(result["risks"], list)
    assert isinstance(result["requirementsMatch"], list)
    assert "shouldInvite" in result["recommendation"]

    # Согласованность score / status
    sn = result["scoreNormalized"]
    if sn >= 0.75:
        expected = "Recommended"
    elif sn >= 0.45:
        expected = "Maybe"
    else:
        expected = "Not recommended"
    assert result["status"] == expected, \
        f"status {result['status']} не соответствует scoreNormalized {sn}"

    print(f"\n[OK] Все проверки пройдены для {profile['name']}")
    return result


def main() -> None:
    for filename in ["profile_1.json", "profile_2.json", "profile_3.json"]:
        run_scenario(filename)
    print(f"\n{'=' * 70}")
    print("ВСЕ ТЕСТЫ ПРОЙДЕНЫ")
    print('=' * 70)


if __name__ == "__main__":
    main()
