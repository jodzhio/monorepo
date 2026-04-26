"""Интерактивный прогон интервью — ты в роли кандидата.

Запуск:
    PYTHONIOENCODING=utf-8 python -m hr_agent.interactive
    PYTHONIOENCODING=utf-8 python -m hr_agent.interactive examples/profile_2.json
    PYTHONIOENCODING=utf-8 python -m hr_agent.interactive путь/к/резюме.pdf
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from . import (
    start_interview,
    next_question,
    evaluate_candidate,
    extract_profile_from_resume,
    parse_resume_file,
    ParseError,
)


EXAMPLES_DIR = Path(__file__).parent / "examples"


RESUME_EXTS = {".pdf", ".docx", ".doc", ".txt", ".md"}


def choose_profile() -> dict:
    if len(sys.argv) > 1:
        path = Path(sys.argv[1])
        if not path.is_absolute() and not path.exists():
            path = Path(__file__).parent / path
        if path.suffix.lower() == ".json":
            return json.loads(path.read_text(encoding="utf-8"))
        if path.suffix.lower() in RESUME_EXTS:
            return profile_from_resume_file(path)
        raise SystemExit(f"Не понимаю формат файла: {path.suffix}")

    profiles = sorted(EXAMPLES_DIR.glob("profile_*.json"))
    print("Выбери анкету кандидата:")
    for i, p in enumerate(profiles, 1):
        data = json.loads(p.read_text(encoding="utf-8"))
        print(f"  {i}. {data['name']} — {data['grade']} {data['position']}  ({p.name})")
    print(f"  {len(profiles)+1}. Заполнить свою анкету вручную")
    print(f"  {len(profiles)+2}. Загрузить резюме из файла (PDF/DOCX/TXT)")

    while True:
        choice = input("\nНомер: ").strip()
        if choice.isdigit():
            n = int(choice)
            if 1 <= n <= len(profiles):
                return json.loads(profiles[n-1].read_text(encoding="utf-8"))
            if n == len(profiles) + 1:
                return manual_profile()
            if n == len(profiles) + 2:
                return profile_from_resume_file(prompt_resume_path())
        print("Не понял, введи число.")


def prompt_resume_path() -> Path:
    while True:
        raw = input("Путь к файлу резюме (PDF/DOCX/TXT): ").strip().strip('"')
        if not raw:
            continue
        path = Path(raw)
        if path.exists() and path.is_file():
            return path
        print(f"Файл не найден: {path}. Попробуй ещё раз.")


def profile_from_resume_file(path: Path) -> dict:
    print(f"\n[Извлекаю текст из {path.name}...]")
    try:
        resume_text = parse_resume_file(path)
    except ParseError as exc:
        raise SystemExit(f"Ошибка парсинга: {exc}")
    print(f"[OK] Извлечено {len(resume_text)} символов")

    print("[Авто-извлекаю поля анкеты из резюме...]\n")
    try:
        extracted = extract_profile_from_resume(resume_text)
    except Exception as exc:
        print(f"[!] Не удалось авто-извлечь поля: {exc}")
        extracted = {"name": "", "position": "", "grade": "", "about": "", "education": ""}

    print("Проверь и при необходимости поправь (Enter — оставить как есть):\n")
    return {
        "name":      _ask_with_default("Имя и фамилия", extracted["name"]) or "Кандидат",
        "position":  _ask_with_default("Позиция", extracted["position"]) or "Разработчик",
        "grade":     _ask_with_default("Грейд (Junior/Middle/Senior)", extracted["grade"]) or "Middle",
        "about":     _ask_with_default("О себе", extracted["about"]),
        "education": _ask_with_default("Образование", extracted["education"]),
        "resume":    resume_text,
    }


def _ask_with_default(label: str, default: str) -> str:
    if default:
        prompt = f"{label} [{default}]: "
    else:
        prompt = f"{label}: "
    answer = input(prompt).strip()
    return answer or default


def manual_profile() -> dict:
    print("\nЗаполни анкету (Enter — пропустить поле):\n")
    return {
        "name":      input("Имя и фамилия: ").strip() or "Тестовый Кандидат",
        "position":  input("Позиция (например, Python-разработчик): ").strip() or "Разработчик",
        "grade":     input("Грейд (Junior/Middle/Senior): ").strip() or "Middle",
        "about":     input("О себе (1-2 предложения): ").strip(),
        "education": input("Образование: ").strip(),
        "resume":    input("Резюме (можно коротко): ").strip(),
    }


def read_answer() -> str:
    print("Ты: ", end="", flush=True)
    line = input().strip()
    return line


def main() -> None:
    profile = choose_profile()

    print("\n" + "=" * 70)
    print(f"ИНТЕРВЬЮ: {profile['name']} — {profile['grade']} {profile['position']}")
    print("=" * 70 + "\n")

    print("[Анализирую анкету и готовлю первый вопрос...]\n")
    start = start_interview(profile)

    print(f"HR: {start['greeting']}\n")
    print(f"HR: {start['first_question']}\n")

    answer = read_answer()
    if not answer:
        print("Пустой ответ, выхожу.")
        return

    dialogue = f"HR: {start['first_question']}\nКандидат: {answer}\n"
    ctx = start["session_context"]

    while not ctx.get("is_finished"):
        print("\n[Думаю над следующим вопросом...]\n")
        step = next_question(profile, dialogue, ctx)
        ctx = step["session_context"]

        if step["is_finished"]:
            print(f"HR: {step.get('closing_message')}\n")
            break

        print(f"HR: {step['question']}\n")
        answer = read_answer()
        if not answer:
            answer = "(нет ответа)"
        dialogue += f"HR: {step['question']}\nКандидат: {answer}\n"

    print("\n" + "=" * 70)
    print("ФИНАЛЬНАЯ ОЦЕНКА (это то, что увидит HR в панели):")
    print("=" * 70 + "\n")

    print("[Считаю финальный скоринг...]\n")
    result = evaluate_candidate(profile, dialogue)
    print(json.dumps(result, ensure_ascii=False, indent=2))

    print("\n" + "=" * 70)
    sn = result["scoreNormalized"]
    if sn >= 0.75:
        verdict = "РЕКОМЕНДОВАН — приглашаем"
    elif sn >= 0.45:
        verdict = "MAYBE — на усмотрение HR"
    else:
        verdict = "ОТКЛОНЁН — повторное приглашение через 2 недели"
    print(f"Итог: {verdict} (score: {result['score']}/100)")
    print("=" * 70)


if __name__ == "__main__":
    main()
