from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class QuestionBase(BaseModel):
    english: str = Field(min_length=1)
    japanese: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list)

    @field_validator("english", "japanese")
    @classmethod
    def validate_non_empty_text(cls, value: str) -> str:
        normalized_value = value.strip()

        if normalized_value == "":
            raise ValueError("must not be blank")  # 空文字は拒否する

        return normalized_value


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    english: str | None = Field(default=None, min_length=1)
    japanese: str | None = Field(default=None, min_length=1)
    is_active: bool | None = None
    tags: list[str] | None = None

    @field_validator("english", "japanese")
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
    english: str
    japanese: str
    isActive: bool
    tags: list[str]


class QuestionListResponse(BaseModel):
    questions: list[QuestionResponse]


class TagListResponse(BaseModel):
    tags: list[str]


class StudyResultBase(BaseModel):
    mode: Literal["learn", "review"]
    total_questions: int = Field(ge=1)
    correct_rate: int = Field(ge=0, le=100)
    mistakes: int = Field(ge=0)
    average_time: int = Field(ge=0)


class StudyResultCreate(StudyResultBase):
    pass  # created_at はサーバー側で生成するため入力に含めない


class StudyResultResponse(StudyResultBase):
    created_at: datetime  # サーバー側で付与された UTC タイムスタンプ


class DailyStudySummaryResponse(BaseModel):
    date: str
    sessions: int
    solvedProblems: int
