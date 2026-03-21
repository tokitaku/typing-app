from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from backend.main import create_app


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
    assert len(body["quizzes"]) == 42
    assert {quiz["type"] for quiz in body["quizzes"]} == {"word", "sentence"}
    assert all(
        {"id", "type", "english", "japanese", "level"} <= set(quiz.keys())
        for quiz in body["quizzes"]
    )


def test_post_word_creates_new_word(client: TestClient) -> None:
    payload = {
        "english": "notebook",
        "japanese": "ノート",
        "level": 2,
    }

    response = client.post("/words", json=payload)

    assert response.status_code == 201
    assert response.json() == {
        "id": 31,
        "english": "notebook",
        "japanese": "ノート",
        "level": 2,
        "is_active": True,
    }


def test_get_words_returns_registered_words(client: TestClient) -> None:
    client.post(
        "/words",
        json={
            "english": "notebook",
            "japanese": "ノート",
            "level": 2,
        },
    )

    response = client.get("/words")

    assert response.status_code == 200
    body = response.json()
    assert "words" in body
    assert len(body["words"]) == 31
    assert body["words"][-1] == {
        "id": 31,
        "english": "notebook",
        "japanese": "ノート",
        "level": 2,
        "is_active": True,
    }


def test_patch_word_updates_existing_word(client: TestClient) -> None:
    response = client.patch(
        "/words/1",
        json={
            "english": "apple pie",
            "japanese": "アップルパイ",
            "level": 3,
            "is_active": False,
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "english": "apple pie",
        "japanese": "アップルパイ",
        "level": 3,
        "is_active": False,
    }


def test_patch_word_returns_not_found_for_unknown_id(client: TestClient) -> None:
    response = client.patch("/words/999", json={"english": "ghost"})

    assert response.status_code == 404


def test_delete_word_deactivates_existing_word(client: TestClient) -> None:
    response = client.delete("/words/1")

    assert response.status_code == 204

    words_response = client.get("/words")

    assert words_response.status_code == 200
    assert words_response.json()["words"][0]["is_active"] is False


def test_quizzes_uses_active_words_only(client: TestClient) -> None:
    client.delete("/words/1")

    response = client.get("/quizzes")

    assert response.status_code == 200
    body = response.json()
    assert len(body["quizzes"]) == 41
    assert {quiz["type"] for quiz in body["quizzes"]} == {"word", "sentence"}
    assert all(quiz["id"] != 1 for quiz in body["quizzes"])


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
