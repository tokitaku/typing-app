from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True)
class ListQuestionsQuery:
    tag_codes: list[str] | None = None
    include_inactive: bool = True


@dataclass(frozen=True)
class CreateQuestionCommand:
    english: str
    japanese: str
    tags: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class UpdateQuestionCommand:
    english: str | None = None
    japanese: str | None = None
    is_active: bool | None = None
    tags: list[str] | None = None


@dataclass(frozen=True)
class RecordStudyResultCommand:
    mode: str
    total_questions: int
    correct_rate: int
    mistakes: int
    average_time: int


@dataclass(frozen=True)
class QuestionDto:
    id: int
    english: str
    japanese: str
    isActive: bool
    tags: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class StudyResultDto:
    mode: str
    total_questions: int
    correct_rate: int
    mistakes: int
    average_time: int
    created_at: datetime


@dataclass(frozen=True)
class DailyStudySummaryDto:
    date: str
    sessions: int
    solvedProblems: int
