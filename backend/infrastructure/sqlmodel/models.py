from datetime import datetime, timezone
from enum import Enum

from sqlmodel import Field, SQLModel


class StudyModeRecord(str, Enum):
    LEARN = "learn"  # 通常学習モードを表す
    REVIEW = "review"  # 復習モードを表す


class QuestionTypeRecordCode(str, Enum):
    WORD = "word"  # 単語問題を表す
    SENTENCE = "sentence"  # 短文問題を表す


class EikenLevelRecord(SQLModel, table=True):
    __tablename__ = "eiken_levels"

    id: int | None = Field(default=None, primary_key=True)
    code: str = Field(index=True)
    name: str
    sort_order: int = Field(index=True)


class QuestionTypeRecord(SQLModel, table=True):
    __tablename__ = "question_types"

    id: int | None = Field(default=None, primary_key=True)
    code: QuestionTypeRecordCode = Field(index=True)
    name: str


class TypingQuestionRecord(SQLModel, table=True):
    __tablename__ = "typing_questions"

    id: int | None = Field(default=None, primary_key=True)
    eiken_level_id: int = Field(foreign_key="eiken_levels.id", index=True)
    question_type_id: int = Field(foreign_key="question_types.id", index=True)
    english_text: str = Field(index=True)
    japanese_text: str
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StudyResultRecord(SQLModel, table=True):
    __tablename__ = "study_results"

    id: int | None = Field(default=None, primary_key=True)
    mode: StudyModeRecord
    total_questions: int
    correct_rate: int
    mistakes: int
    average_time: int
    created_at: str
