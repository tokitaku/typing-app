import sqlite3
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine

from backend.main import create_app
from backend.infrastructure.sqlmodel import models  # noqa: F401  # 旧 create_all スキーマを再現するため import する


@pytest.fixture
def client(tmp_path) -> TestClient:
    database_url = f"sqlite:///{tmp_path / 'test.db'}"

    with TestClient(create_app(database_url)) as test_client:
        yield test_client


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_quizzes_returns_expected_shape(client: TestClient) -> None:
    response = client.get("/quizzes")

    assert response.status_code == 200

    body = response.json()
    assert "quizzes" in body
    assert len(body["quizzes"]) > 0
    assert {quiz["type"] for quiz in body["quizzes"]} == {"word", "sentence"}
    assert all(
        {"id", "type", "english", "japanese", "eikenLevel"} <= set(quiz.keys())
        for quiz in body["quizzes"]
    )


def test_quizzes_can_filter_by_eiken_level_and_question_type(client: TestClient) -> None:
    response = client.get("/quizzes?eiken_levels=3&question_types=word")

    assert response.status_code == 200
    body = response.json()
    assert len(body["quizzes"]) > 0
    assert all(quiz["eikenLevel"] == "3" for quiz in body["quizzes"])
    assert all(quiz["type"] == "word" for quiz in body["quizzes"])


def test_quizzes_can_filter_sentence_only(client: TestClient) -> None:
    response = client.get("/quizzes?question_types=sentence")

    assert response.status_code == 200
    body = response.json()
    assert len(body["quizzes"]) > 0
    assert all(quiz["type"] == "sentence" for quiz in body["quizzes"])
    assert all("eikenLevel" in quiz for quiz in body["quizzes"])


def test_post_question_creates_new_sentence_question(client: TestClient) -> None:
    payload = {
        "eiken_level_code": "pre2",
        "question_type": "sentence",
        "english": "I will call you after I get home.",
        "japanese": "家に着いたら電話します。",
    }

    response = client.post("/questions", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "sentence"
    assert body["eikenLevel"] == "pre2"
    assert body["english"] == payload["english"]
    assert body["japanese"] == payload["japanese"]
    assert body["isActive"] is True


def test_get_questions_returns_registered_questions(client: TestClient) -> None:
    created_response = client.post(
        "/questions",
        json={
            "eiken_level_code": "2",
            "question_type": "word",
            "english": "notebook",
            "japanese": "ノート",
        },
    )
    created_id = created_response.json()["id"]

    response = client.get("/questions")

    assert response.status_code == 200
    body = response.json()
    assert "questions" in body
    assert any(question["id"] == created_id for question in body["questions"])
    assert body["questions"][-1] == {
        "id": created_id,
        "type": "word",
        "eikenLevel": "2",
        "english": "notebook",
        "japanese": "ノート",
        "isActive": True,
    }


def test_patch_question_updates_existing_question(client: TestClient) -> None:
    created_response = client.post(
        "/questions",
        json={
            "eiken_level_code": "4",
            "question_type": "word",
            "english": "notebook",
            "japanese": "ノート",
        },
    )
    question_id = created_response.json()["id"]

    response = client.patch(
        f"/questions/{question_id}",
        json={
            "eiken_level_code": "3",
            "question_type": "sentence",
            "english": "I bought a new notebook yesterday.",
            "japanese": "昨日新しいノートを買いました。",
            "is_active": False,
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": question_id,
        "type": "sentence",
        "eikenLevel": "3",
        "english": "I bought a new notebook yesterday.",
        "japanese": "昨日新しいノートを買いました。",
        "isActive": False,
    }


def test_patch_question_returns_not_found_for_unknown_id(client: TestClient) -> None:
    response = client.patch("/questions/999", json={"english": "ghost"})

    assert response.status_code == 404


def test_post_question_rejects_whitespace_only_fields(client: TestClient) -> None:
    response = client.post(
        "/questions",
        json={
            "eiken_level_code": "3",
            "question_type": "word",
            "english": "   ",
            "japanese": "\t",
        },
    )

    assert response.status_code == 422


def test_patch_question_rejects_whitespace_only_fields(client: TestClient) -> None:
    response = client.patch(
        "/questions/1",
        json={
            "english": "   ",
        },
    )

    assert response.status_code == 422


def test_delete_question_deactivates_existing_question(client: TestClient) -> None:
    response = client.delete("/questions/1")

    assert response.status_code == 204

    questions_response = client.get("/questions")

    assert questions_response.status_code == 200
    assert questions_response.json()["questions"][0]["isActive"] is False


def test_quizzes_uses_active_questions_only(client: TestClient) -> None:
    client.delete("/questions/1")

    response = client.get("/quizzes")

    assert response.status_code == 200
    body = response.json()
    assert {quiz["type"] for quiz in body["quizzes"]} == {"word", "sentence"}
    assert all(quiz["id"] != 1 for quiz in body["quizzes"])


def test_create_app_migrates_legacy_words_into_questions(tmp_path) -> None:
    database_path = tmp_path / "legacy.db"
    connection = sqlite3.connect(database_path)
    connection.execute(
        """
        CREATE TABLE words (
            id INTEGER PRIMARY KEY,
            english TEXT NOT NULL,
            japanese TEXT NOT NULL,
            level INTEGER NOT NULL,
            is_active BOOLEAN NOT NULL
        )
        """
    )
    connection.execute(
        """
        INSERT INTO words (id, english, japanese, level, is_active)
        VALUES (1, 'legacy-word', '旧データ', 2, 1)
        """
    )
    connection.commit()
    connection.close()

    database_url = f"sqlite:///{database_path}"

    with TestClient(create_app(database_url)) as migrated_client:
        response = migrated_client.get("/quizzes?question_types=word")

    assert response.status_code == 200
    body = response.json()
    assert any(
        quiz["english"] == "legacy-word" and quiz["eikenLevel"] == "4"
        for quiz in body["quizzes"]
    )


def test_create_app_applies_alembic_migrations(tmp_path) -> None:
    database_path = tmp_path / "migrated.db"
    database_url = f"sqlite:///{database_path}"

    with TestClient(create_app(database_url)):
        pass  # アプリ起動時の lifespan で migration 実行だけを確認する

    connection = sqlite3.connect(database_path)
    tables = {
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"  # 作成済みテーブル一覧を取得する
        ).fetchall()
    }
    connection.close()

    assert {
        "alembic_version",
        "eiken_levels",
        "question_types",
        "typing_questions",
        "study_results",
    } <= tables


def test_create_app_stamps_existing_schema_without_recreating_tables(tmp_path) -> None:
    database_path = tmp_path / "existing.db"
    database_url = f"sqlite:///{database_path}"
    SQLModel.metadata.create_all(create_engine(database_url))  # 旧実装の create_all だけ済んだ DB を再現する

    with TestClient(create_app(database_url)):
        pass  # Alembic 導入後も既存 DB で起動できることを確認する

    connection = sqlite3.connect(database_path)
    tables = {
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"  # テーブル一覧から stamp 結果を検証する
        ).fetchall()
    }
    connection.close()

    assert "alembic_version" in tables


def test_post_study_result_persists_payload(client: TestClient) -> None:
    payload = {
        "mode": "learn",
        "total_questions": 10,
        "correct_rate": 80,
        "mistakes": 3,
        "average_time": 1200,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    response = client.post("/study-results", json=payload)

    assert response.status_code == 201
    assert response.json() == payload

    latest_response = client.get("/study-results/latest")

    assert latest_response.status_code == 200
    assert latest_response.json() == payload


def test_post_study_result_rejects_invalid_payload(client: TestClient) -> None:
    payload = {
        "mode": "learn",
        "total_questions": 0,
        "correct_rate": 110,
        "mistakes": -1,
        "average_time": -5,
        "created_at": "invalid-date",
    }

    response = client.post("/study-results", json=payload)

    assert response.status_code == 422


def test_today_summary_aggregates_saved_results(client: TestClient) -> None:
    today = datetime.now(timezone.utc).isoformat()
    yesterday = datetime(2025, 1, 1, tzinfo=timezone.utc).isoformat()
    client.post(
        "/study-results",
        json={
            "mode": "learn",
            "total_questions": 4,
            "correct_rate": 75,
            "mistakes": 2,
            "average_time": 1000,
            "created_at": today,
        },
    )
    client.post(
        "/study-results",
        json={
            "mode": "review",
            "total_questions": 6,
            "correct_rate": 100,
            "mistakes": 0,
            "average_time": 900,
            "created_at": today,
        },
    )
    client.post(
        "/study-results",
        json={
            "mode": "learn",
            "total_questions": 9,
            "correct_rate": 60,
            "mistakes": 4,
            "average_time": 1500,
            "created_at": yesterday,
        },
    )

    response = client.get("/study-results/summary/today")

    assert response.status_code == 200
    assert response.json() == {
        "date": datetime.now(timezone.utc).date().isoformat(),
        "sessions": 2,
        "solvedProblems": 10,
    }
