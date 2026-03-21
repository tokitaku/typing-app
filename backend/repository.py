from collections.abc import Iterable
from typing import Any

from sqlalchemy import func
from sqlmodel import select

from backend.database import get_session
from backend.models import StudyResultRecord, WordRecord


QuizRow = dict[str, Any]
StudyResultRow = dict[str, Any]
WordRow = dict[str, Any]


def seed_words(database_url: str, words: Iterable[WordRow]) -> None:
    with get_session(database_url) as session:
        existing_word = session.exec(select(WordRecord.id)).first()

        if existing_word is not None:
            return

        session.add_all([WordRecord.model_validate(word) for word in words])
        session.commit()


def list_words(database_url: str) -> list[WordRow]:
    with get_session(database_url) as session:
        words = session.exec(select(WordRecord).order_by(WordRecord.id)).all()

    return [word.model_dump(mode="json") for word in words]


def create_word(database_url: str, word: WordRow) -> WordRow:
    with get_session(database_url) as session:
        record = WordRecord.model_validate(word)
        session.add(record)
        session.commit()
        session.refresh(record)

    return record.model_dump(mode="json")


def update_word(database_url: str, word_id: int, updates: WordRow) -> WordRow | None:
    with get_session(database_url) as session:
        record = session.get(WordRecord, word_id)

        if record is None:
            return None

        for key, value in updates.items():
            setattr(record, key, value)

        session.add(record)
        session.commit()
        session.refresh(record)

    return record.model_dump(mode="json")


def deactivate_word(database_url: str, word_id: int) -> bool:
    updated = update_word(database_url, word_id, {"is_active": False})
    return updated is not None


def list_quizzes(database_url: str) -> list[QuizRow]:
    return [
        {
            "id": word["id"],
            "type": "word",
            "english": word["english"],
            "japanese": word["japanese"],
            "level": word["level"],
        }
        for word in list_words(database_url)
        if word["is_active"]
    ]


def insert_study_result(database_url: str, study_result: StudyResultRow) -> StudyResultRow:
    with get_session(database_url) as session:
        record = StudyResultRecord.model_validate(study_result)
        session.add(record)
        session.commit()
        session.refresh(record)

    return record.model_dump(exclude={"id"}, mode="json")


def get_latest_study_result(database_url: str) -> StudyResultRow | None:
    with get_session(database_url) as session:
        latest_result = session.exec(
            select(StudyResultRecord)
            .order_by(StudyResultRecord.created_at.desc(), StudyResultRecord.id.desc())
            .limit(1)
        ).first()

    return (
        latest_result.model_dump(exclude={"id"}, mode="json")
        if latest_result is not None
        else None
    )


def get_today_study_summary(database_url: str, target_date: str) -> dict[str, Any]:
    with get_session(database_url) as session:
        sessions, solved_problems = session.exec(
            select(
                func.count(StudyResultRecord.id),
                func.coalesce(func.sum(StudyResultRecord.total_questions), 0),
            ).where(StudyResultRecord.created_at.startswith(target_date))
        ).one()

    return {
        "date": target_date,
        "sessions": sessions,
        "solvedProblems": solved_problems,
    }
