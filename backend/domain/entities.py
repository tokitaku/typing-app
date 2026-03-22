from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class StudyMode(str, Enum):
    LEARN = "learn"  # 通常学習モードを表す
    REVIEW = "review"  # 復習モードを表す


@dataclass(frozen=True)
class Question:
    id: int | None
    english: str
    japanese: str
    is_active: bool = True
    tags: tuple[str, ...] = ()


@dataclass(frozen=True)
class StudyResult:
    mode: StudyMode
    total_questions: int
    correct_rate: int
    mistakes: int
    average_time: int
    created_at: datetime


@dataclass(frozen=True)
class DailyStudySummary:
    date: str
    sessions: int
    solved_problems: int
