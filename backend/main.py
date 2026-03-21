from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Literal

from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from backend.database import get_database_url, init_database
from backend.repository import (
    create_word,
    deactivate_word,
    get_latest_study_result,
    get_today_study_summary,
    insert_study_result,
    list_quizzes,
    list_words,
    seed_words,
    update_word,
)


class Quiz(BaseModel):
    id: int
    type: Literal["word"]
    english: str
    japanese: str
    level: int = Field(ge=1, le=3)


class QuizListResponse(BaseModel):
    quizzes: list[Quiz]


class WordBase(BaseModel):
    english: str = Field(min_length=1)
    japanese: str = Field(min_length=1)
    level: int = Field(ge=1, le=3)


class WordCreate(WordBase):
    pass


class WordUpdate(BaseModel):
    english: str | None = Field(default=None, min_length=1)
    japanese: str | None = Field(default=None, min_length=1)
    level: int | None = Field(default=None, ge=1, le=3)
    is_active: bool | None = None


class WordResponse(WordBase):
    id: int
    is_active: bool


class WordListResponse(BaseModel):
    words: list[WordResponse]


class StudyResult(BaseModel):
    mode: Literal["learn", "review"]
    total_questions: int = Field(ge=1)
    correct_rate: int = Field(ge=0, le=100)
    mistakes: int = Field(ge=0)
    average_time: int = Field(ge=0)
    created_at: str

    @field_validator("created_at")
    @classmethod
    def validate_created_at(cls, value: str) -> str:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
        return value


class DailyStudySummary(BaseModel):
    date: str
    sessions: int
    solvedProblems: int


WORDS = [
    WordResponse(id=1, english="apple", japanese="りんご", level=1, is_active=True),
    WordResponse(id=2, english="library", japanese="図書館", level=1, is_active=True),
    WordResponse(id=3, english="beautiful", japanese="美しい", level=2, is_active=True),
    WordResponse(id=4, english="schedule", japanese="予定", level=2, is_active=True),
    WordResponse(id=5, english="environment", japanese="環境", level=3, is_active=True),
    WordResponse(id=6, english="important", japanese="重要な", level=1, is_active=True),
    WordResponse(id=7, english="keyboard", japanese="キーボード", level=1, is_active=True),
    WordResponse(id=8, english="teacher", japanese="先生", level=1, is_active=True),
    WordResponse(id=9, english="student", japanese="生徒", level=1, is_active=True),
    WordResponse(id=10, english="morning", japanese="朝", level=1, is_active=True),
    WordResponse(id=11, english="country", japanese="国", level=1, is_active=True),
    WordResponse(id=12, english="science", japanese="科学", level=2, is_active=True),
    WordResponse(id=13, english="picture", japanese="写真", level=1, is_active=True),
    WordResponse(id=14, english="weather", japanese="天気", level=1, is_active=True),
    WordResponse(id=15, english="holiday", japanese="休日", level=1, is_active=True),
    WordResponse(id=16, english="question", japanese="質問", level=1, is_active=True),
    WordResponse(id=17, english="answer", japanese="答え", level=1, is_active=True),
    WordResponse(id=18, english="practice", japanese="練習", level=1, is_active=True),
    WordResponse(id=19, english="because", japanese="なぜなら", level=2, is_active=True),
    WordResponse(id=20, english="through", japanese="通り抜けて", level=2, is_active=True),
    WordResponse(id=21, english="enough", japanese="十分な", level=2, is_active=True),
    WordResponse(id=22, english="thought", japanese="考え", level=2, is_active=True),
    WordResponse(id=23, english="special", japanese="特別な", level=2, is_active=True),
    WordResponse(id=24, english="language", japanese="言語", level=2, is_active=True),
    WordResponse(id=25, english="business", japanese="仕事", level=2, is_active=True),
    WordResponse(id=26, english="exercise", japanese="運動", level=2, is_active=True),
    WordResponse(id=27, english="development", japanese="開発", level=3, is_active=True),
    WordResponse(id=28, english="knowledge", japanese="知識", level=3, is_active=True),
    WordResponse(id=29, english="confidence", japanese="自信", level=3, is_active=True),
    WordResponse(id=30, english="responsible", japanese="責任がある", level=3, is_active=True),
]


def create_app(database_url: str | None = None) -> FastAPI:
    resolved_database_url = get_database_url(database_url)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        init_database(resolved_database_url)
        seed_words(
            resolved_database_url,
            [word.model_dump() for word in WORDS],
        )
        yield

    app = FastAPI(title="Typing App API", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/words", response_model=WordListResponse)
    def get_words() -> WordListResponse:
        return WordListResponse(words=[WordResponse(**word) for word in list_words(resolved_database_url)])

    @app.post("/words", response_model=WordResponse, status_code=status.HTTP_201_CREATED)
    def post_word(word: WordCreate) -> WordResponse:
        saved_word = create_word(
            resolved_database_url,
            {**word.model_dump(), "is_active": True},
        )
        return WordResponse(**saved_word)

    @app.patch("/words/{word_id}", response_model=WordResponse)
    def patch_word(word_id: int, word: WordUpdate) -> WordResponse:
        saved_word = update_word(
            resolved_database_url,
            word_id,
            word.model_dump(exclude_unset=True, exclude_none=True),
        )

        if saved_word is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

        return WordResponse(**saved_word)

    @app.delete("/words/{word_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_word(word_id: int) -> Response:
        if not deactivate_word(resolved_database_url, word_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @app.get("/quizzes", response_model=QuizListResponse)
    def get_quizzes() -> QuizListResponse:
        return QuizListResponse(
            quizzes=[Quiz(**quiz) for quiz in list_quizzes(resolved_database_url)]
        )

    @app.post(
        "/study-results",
        response_model=StudyResult,
        status_code=status.HTTP_201_CREATED,
    )
    def create_study_result(study_result: StudyResult) -> StudyResult:
        saved_result = insert_study_result(
            resolved_database_url,
            study_result.model_dump(),
        )
        return StudyResult(**saved_result)

    @app.get("/study-results/latest", response_model=StudyResult)
    def fetch_latest_study_result() -> StudyResult:
        latest_result = get_latest_study_result(resolved_database_url)

        if latest_result is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

        return StudyResult(**latest_result)

    @app.get("/study-results/summary/today", response_model=DailyStudySummary)
    def fetch_today_study_summary() -> DailyStudySummary:
        today = datetime.now(timezone.utc).date().isoformat()
        return DailyStudySummary(**get_today_study_summary(resolved_database_url, today))

    return app


app = create_app()
