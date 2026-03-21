from collections.abc import Iterable
from typing import Any

from backend.database import get_connection


ProblemRow = dict[str, Any]
StudyResultRow = dict[str, Any]


def seed_problems(database_url: str, problems: Iterable[ProblemRow]) -> None:
    with get_connection(database_url) as connection:
        existing_count = connection.execute(
            "SELECT COUNT(1) AS count FROM problems"
        ).fetchone()["count"]

        if existing_count > 0:
            return

        connection.executemany(
            """
            INSERT INTO problems (id, type, english, japanese, level)
            VALUES (:id, :type, :english, :japanese, :level)
            """,
            list(problems),
        )


def list_problems(database_url: str) -> list[ProblemRow]:
    with get_connection(database_url) as connection:
        rows = connection.execute(
            """
            SELECT id, type, english, japanese, level
            FROM problems
            ORDER BY id ASC
            """
        ).fetchall()

    return [dict(row) for row in rows]


def insert_study_result(database_url: str, study_result: StudyResultRow) -> StudyResultRow:
    with get_connection(database_url) as connection:
        connection.execute(
            """
            INSERT INTO study_results (
                mode,
                total_questions,
                correct_rate,
                mistakes,
                average_time,
                created_at
            )
            VALUES (
                :mode,
                :total_questions,
                :correct_rate,
                :mistakes,
                :average_time,
                :created_at
            )
            """,
            study_result,
        )

    return study_result


def get_latest_study_result(database_url: str) -> StudyResultRow | None:
    with get_connection(database_url) as connection:
        row = connection.execute(
            """
            SELECT
                mode,
                total_questions,
                correct_rate,
                mistakes,
                average_time,
                created_at
            FROM study_results
            ORDER BY datetime(created_at) DESC, id DESC
            LIMIT 1
            """
        ).fetchone()

    return dict(row) if row is not None else None


def get_today_study_summary(database_url: str, target_date: str) -> dict[str, Any]:
    with get_connection(database_url) as connection:
        row = connection.execute(
            """
            SELECT
                COUNT(1) AS sessions,
                COALESCE(SUM(total_questions), 0) AS solvedProblems
            FROM study_results
            WHERE created_at LIKE ?
            """,
            (f"{target_date}%",),
        ).fetchone()

    return {
        "date": target_date,
        "sessions": row["sessions"],
        "solvedProblems": row["solvedProblems"],
    }
