from typing import Protocol

from backend.domain.entities import DailyStudySummary, Question, QuestionPatch, StudyResult
from backend.domain.value_objects import QuestionId


class QuestionRepository(Protocol):
    def list_questions(
        self,
        *,
        tag_codes: list[str] | None = None,
        include_inactive: bool = True,
    ) -> list[Question]:
        ...

    def create(self, question: Question) -> Question:
        ...

    def update(self, question_id: QuestionId, patch: QuestionPatch) -> Question | None:
        ...

    def deactivate(self, question_id: QuestionId) -> bool:
        ...

    def list_tags(self) -> list[str]:
        ...


class StudyResultRepository(Protocol):
    def save(self, result: StudyResult) -> StudyResult:
        ...

    def get_latest(self) -> StudyResult | None:
        ...

    def get_today_summary(self, target_date: str) -> DailyStudySummary:
        ...
