from datetime import datetime, timedelta, timezone

from backend.database import migrate_database
from backend.domain.entities import StudyMode, StudyResult
from backend.infrastructure.sqlmodel.repositories import SqlModelStudyResultRepository


def test_get_latest_returns_latest_record_by_datetime(tmp_path) -> None:
    database_url = f"sqlite:///{tmp_path / 'study-results-latest.db'}"
    repository = SqlModelStudyResultRepository(database_url)
    migrate_database(database_url)  # テスト用 DB に最新 schema を適用する
    repository.save(
        StudyResult(
            mode=StudyMode.LEARN,
            total_questions=5,
            correct_rate=80,
            mistakes=1,
            average_time=1200,
            created_at=datetime(2026, 3, 21, 23, 30, tzinfo=timezone(timedelta(hours=9))),
        )
    )
    later_result = StudyResult(
        mode=StudyMode.REVIEW,
        total_questions=8,
        correct_rate=90,
        mistakes=0,
        average_time=900,
        created_at=datetime(2026, 3, 21, 15, 0, tzinfo=timezone.utc),
    )
    repository.save(later_result)

    latest = repository.get_latest()

    assert latest == StudyResult(
        mode=StudyMode.REVIEW,
        total_questions=8,
        correct_rate=90,
        mistakes=0,
        average_time=900,
        created_at=datetime(2026, 3, 21, 15, 0, tzinfo=timezone.utc),
    )  # 文字列順ではなく正しい日時順で最新 1 件が返ることを確認する


def test_get_today_summary_aggregates_records_by_utc_day(tmp_path) -> None:
    database_url = f"sqlite:///{tmp_path / 'study-results-summary.db'}"
    repository = SqlModelStudyResultRepository(database_url)
    migrate_database(database_url)  # テスト用 DB に最新 schema を適用する
    repository.save(
        StudyResult(
            mode=StudyMode.LEARN,
            total_questions=4,
            correct_rate=75,
            mistakes=1,
            average_time=1100,
            created_at=datetime(2026, 3, 22, 0, 30, tzinfo=timezone(timedelta(hours=9))),
        )
    )
    repository.save(
        StudyResult(
            mode=StudyMode.REVIEW,
            total_questions=6,
            correct_rate=100,
            mistakes=0,
            average_time=900,
            created_at=datetime(2026, 3, 21, 18, 0, tzinfo=timezone.utc),
        )
    )

    summary = repository.get_today_summary("2026-03-21")

    assert summary.sessions == 2
    assert summary.solved_problems == 10  # UTC 日付境界で集計し、文字列の prefix に依存しないことを確認する
