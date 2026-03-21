from dataclasses import dataclass


@dataclass(frozen=True)
class ListQuizzesQuery:
    eiken_level_codes: list[str] | None = None
    question_type_codes: list[str] | None = None


@dataclass(frozen=True)
class ListQuestionsQuery:
    eiken_level_codes: list[str] | None = None
    question_type_codes: list[str] | None = None
    include_inactive: bool = True


@dataclass(frozen=True)
class CreateQuestionCommand:
    eiken_level_code: str
    question_type: str
    english: str
    japanese: str


@dataclass(frozen=True)
class UpdateQuestionCommand:
    eiken_level_code: str | None = None
    question_type: str | None = None
    english: str | None = None
    japanese: str | None = None
    is_active: bool | None = None


@dataclass(frozen=True)
class RecordStudyResultCommand:
    mode: str
    total_questions: int
    correct_rate: int
    mistakes: int
    average_time: int
    created_at: str


@dataclass(frozen=True)
class QuizDto:
    id: int
    type: str
    eikenLevel: str
    english: str
    japanese: str


@dataclass(frozen=True)
class QuestionDto:
    id: int
    type: str
    eikenLevel: str
    english: str
    japanese: str
    isActive: bool


@dataclass(frozen=True)
class StudyResultDto:
    mode: str
    total_questions: int
    correct_rate: int
    mistakes: int
    average_time: int
    created_at: str


@dataclass(frozen=True)
class DailyStudySummaryDto:
    date: str
    sessions: int
    solvedProblems: int
