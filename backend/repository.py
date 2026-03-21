from collections.abc import Iterable
from typing import Any

from sqlalchemy import func
from sqlmodel import select

from backend.database import get_session
from backend.models import ProblemRecord, StudyResultRecord


ProblemRow = dict[str, Any]
StudyResultRow = dict[str, Any]


def seed_problems(database_url: str, problems: Iterable[ProblemRow]) -> None:
    with get_session(database_url) as session:
        existing_problem = session.exec(select(ProblemRecord.id)).first()

        if existing_problem is not None:
            return

        session.add_all([ProblemRecord.model_validate(problem) for problem in problems])
        session.commit()


def list_problems(database_url: str) -> list[ProblemRow]:
    with get_session(database_url) as session:
        problems = session.exec(select(ProblemRecord).order_by(ProblemRecord.id)).all()

    return [problem.model_dump(mode="json") for problem in problems]


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
