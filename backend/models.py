from enum import Enum

from sqlmodel import Field, SQLModel


class ProblemType(str, Enum):
    WORD = "word"
    SENTENCE = "sentence"


class StudyMode(str, Enum):
    LEARN = "learn"
    REVIEW = "review"


class ProblemRecord(SQLModel, table=True):
    id: int = Field(primary_key=True)
    type: ProblemType
    english: str
    japanese: str
    level: int


class StudyResultRecord(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    mode: StudyMode
    total_questions: int
    correct_rate: int
    mistakes: int
    average_time: int
    created_at: str
