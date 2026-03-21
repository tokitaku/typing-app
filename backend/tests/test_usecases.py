from backend.application.dtos import (
    DailyStudySummaryDto,
    ListQuizzesQuery,
    QuizDto,
    RecordStudyResultCommand,
    StudyResultDto,
)
from backend.application.usecases import (
    get_today_study_summary,
    list_quizzes,
    record_study_result,
)
from backend.domain.entities import DailyStudySummary, Question, QuestionType, StudyMode


class FakeQuestionRepository:
    def __init__(self, questions: list[Question]) -> None:
        self.questions = questions

    def list_questions(
        self,
        *,
        eiken_level_codes: list[str] | None = None,
        question_type_codes: list[QuestionType] | None = None,
        include_inactive: bool = True,
    ) -> list[Question]:
        filtered = self.questions

        if not include_inactive:
            filtered = [question for question in filtered if question.is_active]  # 有効問題だけに絞る

        if eiken_level_codes:
            filtered = [
                question for question in filtered if question.eiken_level_code in eiken_level_codes
            ]  # 英検級で絞る

        if question_type_codes:
            filtered = [
                question for question in filtered if question.question_type in question_type_codes
            ]  # 問題種別で絞る

        return filtered


class FakeStudyResultRepository:
    def __init__(self) -> None:
        self.saved_results: list[StudyResultDto] = []

    def save(self, result: StudyResultDto) -> StudyResultDto:
        self.saved_results.append(result)  # 保存された結果をそのまま記録する
        return result

    def get_latest(self) -> StudyResultDto | None:
        return self.saved_results[-1] if self.saved_results else None  # 最後の要素を最新として返す

    def get_today_summary(self, target_date: str) -> DailyStudySummary:
        solved_problems = sum(
            result.total_questions
            for result in self.saved_results
            if result.created_at.startswith(target_date)
        )
        sessions = sum(
            1 for result in self.saved_results if result.created_at.startswith(target_date)
        )
        return DailyStudySummary(
            date=target_date,
            sessions=sessions,
            solved_problems=solved_problems,
        )  # 当日分だけを集計して返す


def test_list_quizzes_use_case_excludes_inactive_questions() -> None:
    repository = FakeQuestionRepository(
        [
            Question(
                id=1,
                eiken_level_code="5",
                question_type=QuestionType.WORD,
                english="apple",
                japanese="りんご",
                is_active=True,
            ),
            Question(
                id=2,
                eiken_level_code="5",
                question_type=QuestionType.SENTENCE,
                english="I read every day.",
                japanese="私は毎日読書します。",
                is_active=False,
            ),
        ]
    )

    quizzes = list_quizzes(
        repository,
        ListQuizzesQuery(eiken_level_codes=["5"], question_type_codes=["word", "sentence"]),
    )

    assert quizzes == [QuizDto(id=1, type="word", eikenLevel="5", english="apple", japanese="りんご")]


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
