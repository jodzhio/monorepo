"""Парсеры файлов резюме для HR-агента.

Поддержка: PDF, DOCX, DOC (как DOCX), TXT, MD.
Сканы/картинки — НЕ поддерживаются (нужен OCR, вне scope хакатона).
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional, Union


PathLike = Union[str, Path]


class ParseError(RuntimeError):
    pass


def parse_resume_file(path: PathLike) -> str:
    """Извлечь plain-text из файла резюме.

    Принимает .pdf / .docx / .txt / .md.
    Возвращает строку (может быть многострочной).
    Кидает ParseError если расширение не поддерживается или файл пустой/битый.
    """
    p = Path(path)
    if not p.exists():
        raise ParseError(f"Файл не найден: {p}")
    if not p.is_file():
        raise ParseError(f"Это не файл: {p}")

    ext = p.suffix.lower()

    if ext == ".pdf":
        text = _parse_pdf(p)
    elif ext in {".docx", ".doc"}:
        text = _parse_docx(p)
    elif ext in {".txt", ".md"}:
        text = p.read_text(encoding="utf-8", errors="replace")
    else:
        raise ParseError(
            f"Неподдерживаемый формат: {ext}. "
            f"Поддерживаются: .pdf, .docx, .txt, .md"
        )

    text = _clean(text)
    if not text:
        raise ParseError(
            f"Из файла {p.name} не удалось извлечь текст. "
            f"Возможно это скан/картинка — нужен OCR."
        )
    return text


def build_profile(
    name: str,
    position: str,
    grade: str,
    resume_file: PathLike,
    about: str = "",
    education: str = "",
) -> dict:
    """Собрать profile-словарь из формы кандидата + файла резюме.

    Это конвенс для бэкенда: на вход — поля формы и путь к загруженному файлу,
    на выход — готовый dict для start_interview/evaluate_candidate.
    """
    resume_text = parse_resume_file(resume_file)
    return {
        "name": name.strip(),
        "position": position.strip(),
        "grade": grade.strip(),
        "about": about.strip(),
        "education": education.strip(),
        "resume": resume_text,
    }


# ---------- PDF ----------

def _parse_pdf(path: Path) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise ParseError("Нужно установить pypdf: pip install pypdf") from exc

    try:
        reader = PdfReader(str(path))
    except Exception as exc:
        raise ParseError(f"Не удалось открыть PDF: {exc}") from exc

    pages_text = []
    for i, page in enumerate(reader.pages):
        try:
            pages_text.append(page.extract_text() or "")
        except Exception:
            pages_text.append("")
    return "\n".join(pages_text)


# ---------- DOCX ----------

def _parse_docx(path: Path) -> str:
    try:
        from docx import Document
    except ImportError as exc:
        raise ParseError("Нужно установить python-docx: pip install python-docx") from exc

    try:
        doc = Document(str(path))
    except Exception as exc:
        raise ParseError(f"Не удалось открыть DOCX: {exc}") from exc

    parts: list[str] = []
    for para in doc.paragraphs:
        if para.text.strip():
            parts.append(para.text)
    # Таблицы тоже захватываем — в резюме часто стек/опыт оформлен таблицей
    for table in doc.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells if c.text.strip()]
            if cells:
                parts.append(" | ".join(cells))
    return "\n".join(parts)


# ---------- Утилиты ----------

def _clean(text: str) -> str:
    """Убрать лишние пробелы и пустые строки, нормализовать переносы."""
    if not text:
        return ""
    lines = [line.rstrip() for line in text.splitlines()]
    cleaned: list[str] = []
    prev_blank = False
    for line in lines:
        is_blank = not line.strip()
        if is_blank and prev_blank:
            continue
        cleaned.append(line)
        prev_blank = is_blank
    return "\n".join(cleaned).strip()
