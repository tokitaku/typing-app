from fastapi.testclient import TestClient

from backend.main import PROBLEMS, app


client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_problems_returns_expected_shape() -> None:
    response = client.get("/problems")

    assert response.status_code == 200

    body = response.json()
    assert "problems" in body
    assert len(body["problems"]) == len(PROBLEMS)
    assert {problem["type"] for problem in body["problems"]} == {"word", "sentence"}
    assert all(
        {"id", "type", "english", "japanese", "level"} <= set(problem.keys())
        for problem in body["problems"]
    )
