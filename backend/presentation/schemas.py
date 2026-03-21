from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class QuizResponse(BaseModel):
    id: int
    type: Literal["word", "sentence"]
    eikenLevel: str
    english: str
    japanese: str


class QuizListResponse(BaseModel):
    quizzes: list[QuizResponse]


class QuestionBase(BaseModel):
    eiken_level_code: str = Field(min_length=1)
    question_type: Literal["word", "sentence"]
    english: str = Field(min_length=1)
    japanese: str = Field(min_length=1)

    @field_validator("eiken_level_code", "english", "japanese")
    @classmethod
    def validate_non_empty_text(cls, value: str) -> str:
        normalized_value = value.strip()

        if normalized_value == "":
            raise ValueError("must not be blank")  # 空文字は拒否する

        return normalized_value


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    eiken_level_code: str | None = Field(default=None, min_length=1)
    question_type: Literal["word", "sentence"] | None = None
    english: str | None = Field(default=None, min_length=1)
    japanese: str | None = Field(default=None, min_length=1)
    is_active: bool | None = None

    @field_validator("eiken_level_code", "english", "japanese")
    @classmethod
    def validate_optional_non_empty_text(cls, value: str | None) -> str | None:
        if value is None:
            return None  # 未指定は許可する

        normalized_value = value.strip()

        if normalized_value == "":
            raise ValueError("must not be blank")  # 空白のみは拒否する

        return normalized_value


class QuestionResponse(BaseModel):
    id: int
    type: Literal["word", "sentence"]
    eikenLevel: str
    english: str
    japanese: str
    isActive: bool


class QuestionListResponse(BaseModel):
    questions: list[QuestionResponse]


class StudyResultRequest(BaseModel):
    mode: Literal["learn", "review"]
    total_questions: int = Field(ge=1)
    correct_rate: int = Field(ge=0, le=100)
    mistakes: int = Field(ge=0)
    average_time: int = Field(ge=0)
    created_at: str

    @field_validator("created_at")
    @classmethod
    def validate_created_at(cls, value: str) -> str:
        datetime.fromisoformat(value.replace("Z", "+00:00"))  # ISO 形式のみ許可する
        return value


class DailyStudySummaryResponse(BaseModel):
    date: str
    sessions: int
    solvedProblems: int
