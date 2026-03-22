from dataclasses import dataclass
from enum import Enum


class StudyMode(str, Enum):
    LEARN = "learn"  # 通常学習モードを表す
    REVIEW = "review"  # 復習モードを表す


class QuestionType(str, Enum):
    WORD = "word"  # 単語問題を表す
    SENTENCE = "sentence"  # 短文問題を表す


@dataclass(frozen=True)
class Question:
    id: int | None
    eiken_level_code: str
    question_type: QuestionType
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
    created_at: str


@dataclass(frozen=True)
class DailyStudySummary:
    date: str
    sessions: int
    solved_problems: int
