"""HR-агент на GigaChat для оценки технических кандидатов."""
from .agent import (
    start_interview,
    next_question,
    evaluate_candidate,
    extract_profile_from_resume,
    generate_questions,
    dialogue_from_qa,
    set_client,
)
from .gigachat_client import GigaChatClient, GigaChatError
from .parsers import parse_resume_file, build_profile, ParseError

__all__ = [
    "start_interview",
    "next_question",
    "evaluate_candidate",
    "extract_profile_from_resume",
    "generate_questions",
    "dialogue_from_qa",
    "set_client",
    "GigaChatClient",
    "GigaChatError",
    "parse_resume_file",
    "build_profile",
    "ParseError",
]
