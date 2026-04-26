"""Конфигурация HR-агента. Все настройки читаются из .env."""
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass


def _bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


GIGACHAT_AUTH_KEY: str = os.getenv("GIGACHAT_AUTH_KEY", "")
GIGACHAT_SCOPE: str = os.getenv("GIGACHAT_SCOPE", "GIGACHAT_API_PERS")
GIGACHAT_MODEL: str = os.getenv("GIGACHAT_MODEL", "GigaChat")

GIGACHAT_OAUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"
GIGACHAT_API_URL = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions"

USE_MOCK: bool = _bool(os.getenv("USE_MOCK"), default=not bool(GIGACHAT_AUTH_KEY))

DEFAULT_TEMPERATURE = 0.2
REQUEST_TIMEOUT = 30
MAX_RETRIES = 3

MAX_QUESTIONS = 8
MIN_QUESTIONS = 5
# Сколько раз HR может переспросить, если кандидат ответил расплывчато / бредом
MAX_CLARIFICATIONS_PER_QUESTION = 1

SCORE_RECOMMEND = 0.75
SCORE_REJECT = 0.45

# Темы, которые HR должен закрыть в любом интервью.
# Если темы НЕ закрыты в резюме — агент добавит их в gaps и обязательно спросит.
# Личные данные (ФИО, контакты, релокация) и стек тех — это поля формы, не интервью.
ALWAYS_ASK_TOPICS = [
    "Уровень английского по шкале A1/A2/B1/B2/C1/C2",
    "Самый сложный или показательный проект из опыта и роль кандидата в нём",
    "Желаемая зарплатная вилка и предпочтительный формат работы (офис/гибрид/удалёнка)",
    "Notice period (когда готов выйти) и готовность к командировкам",
    "Pet-проекты, опенсорс или ссылки на GitHub/Habr",
    "Мотивация — почему интересна именно эта вакансия и куда хочется развиваться",
]
