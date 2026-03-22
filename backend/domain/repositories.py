from typing import Protocol

from backend.domain.entities import DailyStudySummary, Question, QuestionType, StudyResult


class QuestionRepository(Protocol):
    def list_questions(
        self,
        *,
        question_type_codes: list[QuestionType] | None = None,
        tag_codes: list[str] | None = None,
        include_inactive: bool = True,
    ) -> list[Question]:
        ...

    def create(self, question: Question) -> Question:
        ...

    def update(self, question_id: int, updates: dict[str, object]) -> Question | None:
        ...

    def deactivate(self, question_id: int) -> bool:
        ...


class StudyResultRepository(Protocol):
    def save(self, result: StudyResult) -> StudyResult:
        ...

    def get_latest(self) -> StudyResult | None:
        ...

    def get_today_summary(self, target_date: str) -> DailyStudySummary:
        ...
