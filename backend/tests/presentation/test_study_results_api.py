from datetime import datetime, timezone


def test_post_study_result_persists_payload(client) -> None:
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


def test_post_study_result_rejects_invalid_payload(client) -> None:
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


def test_today_summary_aggregates_saved_results(client) -> None:
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


def test_get_latest_study_result_returns_not_found_when_no_data(client) -> None:
    response = client.get("/study-results/latest")

    assert response.status_code == 404  # データが存在しない場合のエラーハンドリング仕様を検証
