from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from backend.domain.value_objects import (
    AverageTime,
    CorrectRate,
    MistakeCount,
    QuestionText,
    TagCollection,
    TotalQuestions,
)


class StudyMode(str, Enum):
    LEARN = "learn"  # 通常学習モードを表す
    REVIEW = "review"  # 復習モードを表す


@dataclass(frozen=True)
class Question:
    id: int | None
    english: QuestionText
    japanese: QuestionText
    is_active: bool = True
    tags: TagCollection = field(default_factory=TagCollection)


@dataclass(frozen=True)
class StudyResult:
    mode: StudyMode
    total_questions: TotalQuestions
    correct_rate: CorrectRate
    mistakes: MistakeCount
    average_time: AverageTime
    created_at: datetime


@dataclass(frozen=True)
class DailyStudySummary:
    date: str
    sessions: int
    solved_problems: int
