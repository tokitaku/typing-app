import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from backend.application.tests.fakes import FakeQuestionRepository, FakeStudyResultRepository
from backend.domain.entities import Question
from backend.domain.value_objects import QuestionText, TagCollection
from backend.infrastructure.sqlmodel.bootstrap import INITIAL_QUESTIONS
from backend.main import create_app


def _build_seed_questions() -> list[Question]:
    return [
        Question(
            id=index,
            english=QuestionText(seed["english"]),
            japanese=QuestionText(seed["japanese"]),
            is_active=bool(seed.get("is_active", True)),
            tags=TagCollection(seed.get("tags", [])),
        )
        for index, seed in enumerate(INITIAL_QUESTIONS, start=1)
    ]  # 初期投入データを in-memory repository 用のエンティティ一覧へ変換する


@pytest.fixture
def client() -> TestClient:
    question_repository = FakeQuestionRepository(_build_seed_questions())
    study_result_repository = FakeStudyResultRepository()

    with patch("backend.presentation.api.bootstrap_database"):
        with patch(
            "backend.presentation.api.SqlModelQuestionRepository",
            side_effect=lambda _database_url: question_repository,
        ):
            with patch(
                "backend.presentation.api.SqlModelStudyResultRepository",
                side_effect=lambda _database_url: study_result_repository,
            ):
                with TestClient(create_app()) as test_client:
                    yield test_client  # API テスト全体を in-memory repository で動かし、実 DB 接続を避ける
