from backend.application.dtos import DailyStudySummaryDto, RecordStudyResultCommand, StudyResultDto
from backend.application.usecases import get_latest_study_result, get_today_study_summary, record_study_result
from backend.domain.entities import StudyMode
from backend.application.tests.fakes import FakeStudyResultRepository


def test_study_result_use_cases_record_and_summarize_results() -> None:
    repository = FakeStudyResultRepository()
    command = RecordStudyResultCommand(
        mode="learn",
        total_questions=10,
        correct_rate=90,
        mistakes=1,
        average_time=1200,
        created_at="2026-03-21T08:00:00+00:00",
    )

    saved = record_study_result(repository, command)
    summary = get_today_study_summary(repository, "2026-03-21")

    assert saved == StudyResultDto(
        mode=StudyMode.LEARN.value,
        total_questions=10,
        correct_rate=90,
        mistakes=1,
        average_time=1200,
        created_at="2026-03-21T08:00:00+00:00",
    )
    assert summary == DailyStudySummaryDto(
        date="2026-03-21",
        sessions=1,
        solvedProblems=10,
    )


def test_get_latest_study_result_returns_none_when_empty() -> None:
    repository = FakeStudyResultRepository()

    result = get_latest_study_result(repository)

    assert result is None  # 空データ時の仕様通り、学習履歴が存在しない場合は None を返すことを検証
