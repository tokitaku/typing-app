from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from backend.domain.tag_rules import normalize_tags


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

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, value: list[str]) -> list[str]:
        return list(normalize_tags(value))  # 業務ルールに沿ってタグを正規化しつつ重複を排除する


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

    @field_validator("tags")
    @classmethod
    def validate_optional_tags(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None  # 未指定時は既存値維持のためそのまま通す

        return list(normalize_tags(value))  # 指定された場合だけタグ一覧を正規化する


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


class StudyResultRequest(BaseModel):
    mode: Literal["learn", "review"]
    total_questions: int = Field(ge=1)
    correct_rate: int = Field(ge=0, le=100)
    mistakes: int = Field(ge=0)
    average_time: int = Field(ge=0)
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def validate_created_at(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            return value.replace(tzinfo=timezone.utc)  # タイムゾーン未指定は UTC として扱う

        return value.astimezone(timezone.utc)  # 内部では UTC に正規化して扱う


class DailyStudySummaryResponse(BaseModel):
    date: str
    sessions: int
    solvedProblems: int
