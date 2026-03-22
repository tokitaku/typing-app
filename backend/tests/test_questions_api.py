from backend.presentation.api import _parse_csv_query


def test_post_question_creates_new_sentence_question(client) -> None:
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


def test_get_questions_returns_registered_questions(client) -> None:
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


def test_patch_question_updates_existing_question(client) -> None:
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


def test_patch_question_returns_not_found_for_unknown_id(client) -> None:
    response = client.patch("/questions/999", json={"english": "ghost"})

    assert response.status_code == 404


def test_post_question_rejects_invalid_master_code(client) -> None:
    response = client.post(
        "/questions",
        json={
            "eiken_level_code": "unknown",  # 未定義の英検級コードを送る
            "question_type": "word",  # 種別は有効値にして原因を絞る
            "english": "ghost",  # 正常な本文でマスターコード検証だけを見る
            "japanese": "ゴースト",  # 正常な本文でマスターコード検証だけを見る
        },
    )

    assert response.status_code == 422


def test_patch_question_rejects_invalid_master_code(client) -> None:
    response = client.patch(
        "/questions/1",
        json={
            "question_type": "unknown",  # 未定義の問題種別コードを送る
        },
    )

    assert response.status_code == 422


def test_post_question_rejects_whitespace_only_fields(client) -> None:
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


def test_patch_question_rejects_whitespace_only_fields(client) -> None:
    response = client.patch(
        "/questions/1",
        json={
            "english": "   ",
        },
    )

    assert response.status_code == 422


def test_delete_question_deactivates_existing_question(client) -> None:
    response = client.delete("/questions/1")

    assert response.status_code == 204

    questions_response = client.get("/questions")

    assert questions_response.status_code == 200
    assert questions_response.json()["questions"][0]["isActive"] is False


def test_parse_csv_query_returns_none_for_none() -> None:
    assert _parse_csv_query(None) is None  # クエリパラメータ未指定時はフィルタを適用しないため None を返すことを検証


def test_parse_csv_query_returns_none_for_empty_string() -> None:
    assert _parse_csv_query("") is None  # 空文字は有効な値ではないためフィルタなしと同等に扱う仕様を検証


def test_parse_csv_query_returns_none_for_only_commas() -> None:
    assert _parse_csv_query(",,") is None  # 区切り文字のみで有効な値がない場合はフィルタなしとして扱う仕様を検証


def test_parse_csv_query_strips_whitespace() -> None:
    assert _parse_csv_query(" 3 , 4 ") == ["3", "4"]  # ユーザー入力の利便性のため前後の空白を除去して正規化することを検証


def test_parse_csv_query_ignores_trailing_comma() -> None:
    assert _parse_csv_query("word,") == ["word"]  # 入力ミスによる末尾カンマを許容し空要素は無視する仕様を検証


def test_get_questions_filters_by_eiken_level(client) -> None:
    client.post(
        "/questions",
        json={
            "eiken_level_code": "5",
            "question_type": "word",
            "english": "dog",
            "japanese": "犬",
        },
    )
    client.post(
        "/questions",
        json={
            "eiken_level_code": "2",
            "question_type": "word",
            "english": "enterprise",
            "japanese": "企業",
        },
    )

    response = client.get("/questions?eiken_levels=5")

    assert response.status_code == 200
    body = response.json()
    assert all(q["eikenLevel"] == "5" for q in body["questions"])  # eiken_levels フィルタの仕様通り指定された級の問題のみが返却されることを検証


def test_get_questions_filters_by_question_type(client) -> None:
    client.post(
        "/questions",
        json={
            "eiken_level_code": "3",
            "question_type": "sentence",
            "english": "She reads books every night.",
            "japanese": "彼女は毎晩本を読む。",
        },
    )

    response = client.get("/questions?question_types=sentence")

    assert response.status_code == 200
    body = response.json()
    assert len(body["questions"]) > 0
    assert all(q["type"] == "sentence" for q in body["questions"])  # question_types フィルタの仕様通り指定された種別の問題のみが返却されることを検証


def test_get_questions_excludes_inactive_when_flag_is_false(client) -> None:
    created = client.post(
        "/questions",
        json={
            "eiken_level_code": "4",
            "question_type": "word",
            "english": "umbrella",
            "japanese": "傘",
        },
    )
    question_id = created.json()["id"]
    client.delete(f"/questions/{question_id}")  # include_inactive=false の動作検証のため事前に無効化された問題を用意する

    response = client.get("/questions?include_inactive=false")

    assert response.status_code == 200
    body = response.json()
    assert all(q["isActive"] is True for q in body["questions"])  # include_inactive=false の仕様通り有効な問題のみが返却されることを検証
    assert all(q["id"] != question_id for q in body["questions"])


def test_get_questions_combined_eiken_and_type_filter(client) -> None:
    client.post(
        "/questions",
        json={
            "eiken_level_code": "pre2",
            "question_type": "word",
            "english": "environment",
            "japanese": "環境",
        },
    )
    client.post(
        "/questions",
        json={
            "eiken_level_code": "pre2",
            "question_type": "sentence",
            "english": "We must protect the environment.",
            "japanese": "私たちは環境を守らなければならない。",
        },
    )

    response = client.get("/questions?eiken_levels=pre2&question_types=word")

    assert response.status_code == 200
    body = response.json()
    assert len(body["questions"]) > 0
    assert all(q["eikenLevel"] == "pre2" for q in body["questions"])  # 複合フィルタの仕様通り eiken_levels 条件を満たす問題のみが返却されることを検証
    assert all(q["type"] == "word" for q in body["questions"])  # 複合フィルタの仕様通り question_types 条件も同時に満たす問題のみが返却されることを検証


def test_get_questions_returns_422_for_invalid_question_type(client) -> None:
    response = client.get("/questions?question_types=invalid_type")

    assert response.status_code == 422  # 不正なマスタコード値を拒否するバリデーション仕様を検証（GET /questions）


def test_delete_question_returns_not_found_for_unknown_id(client) -> None:
    response = client.delete("/questions/99999")

    assert response.status_code == 404  # 存在しないリソースへの操作を拒否するエラーハンドリング仕様を検証
