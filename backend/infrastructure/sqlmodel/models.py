from datetime import datetime, timezone
from enum import Enum

from sqlmodel import Field, SQLModel


class StudyModeRecord(str, Enum):
    LEARN = "learn"  # 通常学習モードを表す
    REVIEW = "review"  # 復習モードを表す


class TypingQuestionRecord(SQLModel, table=True):
    __tablename__ = "typing_questions"

    id: int | None = Field(default=None, primary_key=True)
    english_text: str = Field(index=True)
    japanese_text: str
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TagRecord(SQLModel, table=True):
    __tablename__ = "tags"

    id: int | None = Field(default=None, primary_key=True)
    code: str = Field(index=True, unique=True)


class TypingQuestionTagRecord(SQLModel, table=True):
    __tablename__ = "typing_question_tags"

    question_id: int = Field(foreign_key="typing_questions.id", primary_key=True)
    tag_id: int = Field(foreign_key="tags.id", primary_key=True, index=True)


class StudyResultRecord(SQLModel, table=True):
    __tablename__ = "study_results"

    id: int | None = Field(default=None, primary_key=True)
    mode: StudyModeRecord
    total_questions: int
    correct_rate: int
    mistakes: int
    average_time: int
    created_at: datetime
