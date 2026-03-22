import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import NoReturn

from fastapi import FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware

from backend.application.dtos import (
    CreateQuestionCommand,
    ListQuestionsQuery,
    RecordStudyResultCommand,
    UpdateQuestionCommand,
)
from backend.application.usecases import (
    create_question,
    deactivate_question,
    get_latest_study_result,
    get_today_study_summary,
    list_questions,
    list_tags,
    record_study_result,
    update_question,
)
from backend.database import get_database_url
from backend.infrastructure.sqlmodel.bootstrap import bootstrap_database
from backend.infrastructure.sqlmodel.repositories import (
    SqlModelQuestionRepository,
    SqlModelStudyResultRepository,
)
from backend.presentation.schemas import (
    DailyStudySummaryResponse,
    QuestionCreate,
    QuestionListResponse,
    QuestionResponse,
    QuestionUpdate,
    StudyResultRequest,
    TagListResponse,
)

DEFAULT_CORS_ORIGIN = "http://localhost:3000"


def _parse_csv_query(value: str | None) -> list[str] | None:
    if value is None:
        return None  # 未指定ならフィルタを掛けない

    parsed_values = [item.strip() for item in value.split(",") if item.strip()]
    return parsed_values if parsed_values else None  # 空配列ならフィルタなし扱いにする


def _resolve_cors_origins(value: str | None = None) -> list[str]:
    configured_value = value if value is not None else os.getenv("BACKEND_CORS_ORIGINS")
    parsed_origins = _parse_csv_query(configured_value)
    return parsed_origins or [DEFAULT_CORS_ORIGIN]  # 空文字や未指定時は既定の localhost を許可する


def _handle_invalid_master_code(error: ValueError) -> NoReturn:
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error


def create_app(database_url: str | None = None) -> FastAPI:
    resolved_database_url = get_database_url(database_url)
    question_repository = SqlModelQuestionRepository(resolved_database_url)
    study_result_repository = SqlModelStudyResultRepository(resolved_database_url)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        bootstrap_database(resolved_database_url)  # アプリ起動時に DB を初期化・投入する
        yield

    app = FastAPI(title="Typing App API", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_resolve_cors_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}  # ヘルスチェック結果を返す

    @app.get("/tags", response_model=TagListResponse)
    def get_tags() -> TagListResponse:
        tags = list_tags(question_repository)
        return TagListResponse(tags=tags)  # 登録済みタグ一覧を返す

    @app.get("/questions", response_model=QuestionListResponse)
    def get_questions(
        question_types: str | None = Query(default=None),
        tags: str | None = Query(default=None),
        include_inactive: bool = Query(default=True),
    ) -> QuestionListResponse:
        try:
            questions = list_questions(
                question_repository,
                ListQuestionsQuery(
                    question_type_codes=_parse_csv_query(question_types),
                    tag_codes=_parse_csv_query(tags),
                    include_inactive=include_inactive,
                ),
            )
        except ValueError as error:
            _handle_invalid_master_code(error)

        return QuestionListResponse(questions=[QuestionResponse(**question.__dict__) for question in questions])

    @app.post("/questions", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
    def post_question(question: QuestionCreate) -> QuestionResponse:
        try:
            saved_question = create_question(
                question_repository,
                CreateQuestionCommand(**question.model_dump()),
            )
        except ValueError as error:
            _handle_invalid_master_code(error)

        return QuestionResponse(**saved_question.__dict__)

    @app.patch("/questions/{question_id}", response_model=QuestionResponse)
    def patch_question(question_id: int, question: QuestionUpdate) -> QuestionResponse:
        try:
            saved_question = update_question(
                question_repository,
                question_id,
                UpdateQuestionCommand(**question.model_dump(exclude_unset=True, exclude_none=True)),
            )
        except ValueError as error:
            _handle_invalid_master_code(error)

        if saved_question is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

        return QuestionResponse(**saved_question.__dict__)

    @app.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_question(question_id: int) -> Response:
        if not deactivate_question(question_repository, question_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @app.post("/study-results", response_model=StudyResultRequest, status_code=status.HTTP_201_CREATED)
    def post_study_result(study_result: StudyResultRequest) -> StudyResultRequest:
        saved_result = record_study_result(
            study_result_repository,
            RecordStudyResultCommand(**study_result.model_dump()),
        )
        return StudyResultRequest(**saved_result.__dict__)

    @app.get("/study-results/latest", response_model=StudyResultRequest)
    def get_latest_result() -> StudyResultRequest:
        latest_result = get_latest_study_result(study_result_repository)

        if latest_result is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

        return StudyResultRequest(**latest_result.__dict__)

    @app.get("/study-results/summary/today", response_model=DailyStudySummaryResponse)
    def get_today_summary() -> DailyStudySummaryResponse:
        today = datetime.now(timezone.utc).date().isoformat()
        summary = get_today_study_summary(study_result_repository, today)
        return DailyStudySummaryResponse(**summary.__dict__)

    return app
