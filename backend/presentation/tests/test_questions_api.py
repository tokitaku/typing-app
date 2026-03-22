def test_post_question_creates_new_question(client) -> None:
    payload = {
        "english": "I will call you after I get home.",
        "japanese": "家に着いたら電話します。",
        "tags": [" Speaking ", "speaking", "daily"],
    }

    response = client.post("/questions", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["english"] == payload["english"]
    assert body["japanese"] == payload["japanese"]
    assert body["isActive"] is True
    assert body["tags"] == ["speaking", "daily"]
    assert "eikenLevel" not in body
    assert "type" not in body


def test_get_questions_returns_registered_questions(client) -> None:
    created_response = client.post(
        "/questions",
        json={
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
        "english": "notebook",
        "japanese": "ノート",
        "isActive": True,
        "tags": [],
    }


def test_patch_question_updates_existing_question(client) -> None:
    created_response = client.post(
        "/questions",
        json={
            "english": "notebook",
            "japanese": "ノート",
        },
    )
    question_id = created_response.json()["id"]

    response = client.patch(
        f"/questions/{question_id}",
        json={
            "english": "I bought a new notebook yesterday.",
            "japanese": "昨日新しいノートを買いました。",
            "is_active": False,
            "tags": [" Diary ", "daily", "daily"],
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": question_id,
        "english": "I bought a new notebook yesterday.",
        "japanese": "昨日新しいノートを買いました。",
        "isActive": False,
        "tags": ["diary", "daily"],
    }


def test_patch_question_returns_not_found_for_unknown_id(client) -> None:
    response = client.patch("/questions/999", json={"english": "ghost"})

    assert response.status_code == 404


def test_post_question_rejects_whitespace_only_fields(client) -> None:
    response = client.post(
        "/questions",
        json={
            "english": "   ",
            "japanese": "\t",
        },
    )

    assert response.status_code == 422


def test_post_question_rejects_whitespace_only_tags(client) -> None:
    response = client.post(
        "/questions",
        json={
            "english": "topic",
            "japanese": "話題",
            "tags": ["   "],
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


def test_get_questions_filters_by_tags(client) -> None:
    client.post(
        "/questions",
        json={
            "english": "The proposal needs stronger evidence.",
            "japanese": "その提案にはより強い根拠が必要だ。",
            "tags": ["Essay", "Writing"],
        },
    )
    client.post(
        "/questions",
        json={
            "english": "The city expanded the subway network.",
            "japanese": "その都市は地下鉄網を拡張した。",
            "tags": ["Infrastructure"],
        },
    )

    response = client.get("/questions?tags=writing")

    assert response.status_code == 200
    body = response.json()
    assert len(body["questions"]) > 0
    assert all("writing" in q["tags"] for q in body["questions"])  # タグフィルタは一致するタグを持つ問題だけを返すことを検証


def test_get_questions_excludes_inactive_when_flag_is_false(client) -> None:
    created = client.post(
        "/questions",
        json={
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


def test_get_questions_treats_blank_tag_query_as_no_filter(client) -> None:
    response = client.get("/questions?tags=%20")

    assert response.status_code == 200  # 空白だけの tags クエリは _parse_csv_query で除去され、フィルタなしとして扱われることを検証
    assert len(response.json()["questions"]) > 0


def test_delete_question_returns_not_found_for_unknown_id(client) -> None:
    response = client.delete("/questions/99999")

    assert response.status_code == 404  # 存在しないリソースへの操作を拒否するエラーハンドリング仕様を検証


def test_get_tags_returns_seeded_tags_initially(client) -> None:
    response = client.get("/tags")

    assert response.status_code == 200
    body = response.json()
    assert "sentence" in body["tags"]  # 初期投入された問題種別タグが含まれることを検証
    assert "word" in body["tags"]


def test_get_tags_returns_tags_from_created_questions(client) -> None:
    client.post(
        "/questions",
        json={
            "english": "notebook",
            "japanese": "ノート",
            "tags": ["daily", "writing"],
        },
    )
    client.post(
        "/questions",
        json={
            "english": "I love programming.",
            "japanese": "私はプログラミングが好きです。",
            "tags": ["daily", "hobby"],
        },
    )

    response = client.get("/tags")

    assert response.status_code == 200
    body = response.json()
    assert "daily" in body["tags"]  # 作成した問題のタグが一覧に含まれることを検証
    assert "writing" in body["tags"]
    assert "hobby" in body["tags"]
    assert body["tags"] == sorted(body["tags"])  # タグがアルファベット順で返されることを検証


def test_get_tags_returns_normalized_tags(client) -> None:
    client.post(
        "/questions",
        json={
            "english": "apple",
            "japanese": "リンゴ",
            "tags": [" Business ", "WRITING"],
        },
    )

    response = client.get("/tags")

    assert response.status_code == 200
    body = response.json()
    assert "business" in body["tags"]  # 大文字・前後スペースは正規化されて保存されることを検証
    assert "writing" in body["tags"]
