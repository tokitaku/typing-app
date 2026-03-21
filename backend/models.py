from enum import Enum

from sqlmodel import Field, SQLModel


class StudyMode(str, Enum):
    LEARN = "learn"
    REVIEW = "review"


class WordRecord(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    english: str
    japanese: str
    level: int
    is_active: bool = True


class StudyResultRecord(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    mode: StudyMode
    total_questions: int
    correct_rate: int
    mistakes: int
    average_time: int
    created_at: str
