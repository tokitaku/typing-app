from datetime import datetime, timezone

from backend.application.dtos import DailyStudySummaryDto, RecordStudyResultCommand, StudyResultDto
from backend.application.usecases import get_latest_study_result, get_today_study_summary, record_study_result
from backend.domain.entities import StudyMode
from backend.application.tests.fakes import FakeStudyResultRepository

FIXED_UTC = datetime(2026, 3, 21, 8, 0, tzinfo=timezone.utc)


def _make_command(**overrides: object) -> RecordStudyResultCommand:
    defaults = dict(mode="learn", total_questions=10, correct_rate=90, mistakes=1, average_time=1200)
    return RecordStudyResultCommand(**{**defaults, **overrides})


def test_study_result_use_cases_record_and_summarize_results() -> None:
    repository = FakeStudyResultRepository()
    command = _make_command()

    saved = record_study_result(repository, command, now_fn=lambda: FIXED_UTC)
    summary = get_today_study_summary(repository, "2026-03-21")

    assert saved == StudyResultDto(
        mode=StudyMode.LEARN.value,
        total_questions=10,
        correct_rate=90,
        mistakes=1,
        average_time=1200,
        created_at=FIXED_UTC,
    )
    assert summary == DailyStudySummaryDto(date="2026-03-21", sessions=1, solvedProblems=10)


def test_record_study_result_excludes_yesterday_from_today_summary() -> None:
    repository = FakeStudyResultRepository()
    today = FIXED_UTC
    yesterday = datetime(2026, 3, 20, 8, 0, tzinfo=timezone.utc)
    command = _make_command(total_questions=5, correct_rate=80)

    record_study_result(repository, command, now_fn=lambda: today)
    record_study_result(repository, command, now_fn=lambda: yesterday)
    summary = get_today_study_summary(repository, "2026-03-21")

    assert summary.sessions == 1
    assert summary.solvedProblems == 5


def test_get_latest_study_result_returns_none_when_empty() -> None:
    repository = FakeStudyResultRepository()

    result = get_latest_study_result(repository)

    assert result is None
