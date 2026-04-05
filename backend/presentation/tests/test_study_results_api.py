from datetime import datetime, timezone


def test_post_study_result_persists_payload(client) -> None:
    payload = {
        "mode": "learn",
        "total_questions": 10,
        "correct_rate": 80,
        "mistakes": 3,
        "average_time": 1200,
    }

    response = client.post("/study-results", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["mode"] == "learn"
    assert body["total_questions"] == 10
    assert body["correct_rate"] == 80
    assert body["mistakes"] == 3
    assert body["average_time"] == 1200
    created_at = datetime.fromisoformat(body["created_at"].replace("Z", "+00:00"))
    assert created_at.utcoffset() is not None  # サーバー側で UTC タイムスタンプが付与されることを確認する
    assert created_at.utcoffset().total_seconds() == 0  # UTC であることを確認する

    latest_response = client.get("/study-results/latest")

    assert latest_response.status_code == 200
    assert latest_response.json()["mode"] == "learn"


def test_post_study_result_rejects_invalid_payload(client) -> None:
    payload = {
        "mode": "learn",
        "total_questions": 0,
        "correct_rate": 110,
        "mistakes": -1,
        "average_time": -5,
    }

    response = client.post("/study-results", json=payload)

    assert response.status_code == 422


def test_today_summary_aggregates_saved_results(client) -> None:
    client.post(
        "/study-results",
        json={
            "mode": "learn",
            "total_questions": 4,
            "correct_rate": 75,
            "mistakes": 2,
            "average_time": 1000,
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
        },
    )

    response = client.get("/study-results/summary/today")

    assert response.status_code == 200
    assert response.json() == {
        "date": datetime.now(timezone.utc).date().isoformat(),
        "sessions": 2,
        "solvedProblems": 10,
    }  # 昨日の除外はユースケース単体テストで検証するため、ここでは今日分の集計のみ確認する


def test_get_latest_study_result_returns_not_found_when_no_data(client) -> None:
    response = client.get("/study-results/latest")

    assert response.status_code == 404
