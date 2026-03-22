def test_quizzes_returns_expected_shape(client) -> None:
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


def test_quizzes_can_filter_by_eiken_level_and_question_type(client) -> None:
    response = client.get("/quizzes?eiken_levels=3&question_types=word")

    assert response.status_code == 200
    body = response.json()
    assert len(body["quizzes"]) > 0
    assert all(quiz["eikenLevel"] == "3" for quiz in body["quizzes"])
    assert all(quiz["type"] == "word" for quiz in body["quizzes"])


def test_quizzes_can_filter_sentence_only(client) -> None:
    response = client.get("/quizzes?question_types=sentence")

    assert response.status_code == 200
    body = response.json()
    assert len(body["quizzes"]) > 0
    assert all(quiz["type"] == "sentence" for quiz in body["quizzes"])
    assert all("eikenLevel" in quiz for quiz in body["quizzes"])


def test_quizzes_can_filter_by_tag(client) -> None:
    client.post(
        "/questions",
        json={
            "eiken_level_code": "1",
            "question_type": "sentence",
            "english": "The committee reached a consensus.",
            "japanese": "委員会は合意に達した。",
            "tags": ["Debate", "Formal"],
        },
    )
    client.post(
        "/questions",
        json={
            "eiken_level_code": "1",
            "question_type": "sentence",
            "english": "The device consumes little power.",
            "japanese": "その装置は消費電力が少ない。",
            "tags": ["Technology"],
        },
    )

    response = client.get("/quizzes?tags=formal")

    assert response.status_code == 200
    body = response.json()
    assert len(body["quizzes"]) > 0
    assert all("formal" in quiz["tags"] for quiz in body["quizzes"])  # 出題 API でもタグフィルタとタグ返却が有効であることを検証


def test_quizzes_uses_active_questions_only(client) -> None:
    client.delete("/questions/1")

    response = client.get("/quizzes")

    assert response.status_code == 200
    body = response.json()
    assert {quiz["type"] for quiz in body["quizzes"]} == {"word", "sentence"}
    assert all(quiz["id"] != 1 for quiz in body["quizzes"])


def test_get_quizzes_returns_422_for_invalid_question_type(client) -> None:
    response = client.get("/quizzes?question_types=invalid_type")

    assert response.status_code == 422  # 不正なマスタコード値を拒否するバリデーション仕様を検証（GET /quizzes）
