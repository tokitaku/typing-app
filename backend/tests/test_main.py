import sqlite3
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine

from backend.main import create_app
from backend.infrastructure.sqlmodel import models  # noqa: F401  # 旧 create_all スキーマを再現するため import する
from backend.presentation.api import _parse_csv_query


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


def test_post_question_rejects_invalid_master_code(client: TestClient) -> None:
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


def test_patch_question_rejects_invalid_master_code(client: TestClient) -> None:
    response = client.patch(
        "/questions/1",
        json={
            "question_type": "unknown",  # 未定義の問題種別コードを送る
        },
    )

    assert response.status_code == 422


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


# _parse_csv_query の境界ケース


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


# GET /questions フィルタ境界条件


def test_get_questions_filters_by_eiken_level(client: TestClient) -> None:
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


def test_get_questions_filters_by_question_type(client: TestClient) -> None:
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


def test_get_questions_excludes_inactive_when_flag_is_false(client: TestClient) -> None:
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


def test_get_questions_combined_eiken_and_type_filter(client: TestClient) -> None:
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


# 不正 master code に対する 422


def test_get_quizzes_returns_422_for_invalid_question_type(client: TestClient) -> None:
    response = client.get("/quizzes?question_types=invalid_type")

    assert response.status_code == 422  # 不正なマスタコード値を拒否するバリデーション仕様を検証（GET /quizzes）


def test_get_questions_returns_422_for_invalid_question_type(client: TestClient) -> None:
    response = client.get("/questions?question_types=invalid_type")

    assert response.status_code == 422  # 不正なマスタコード値を拒否するバリデーション仕様を検証（GET /questions）


# DELETE 存在しない ID → 404


def test_delete_question_returns_not_found_for_unknown_id(client: TestClient) -> None:
    response = client.delete("/questions/99999")

    assert response.status_code == 404  # 存在しないリソースへの操作を拒否するエラーハンドリング仕様を検証


# GET /study-results/latest データ未登録 → 404


def test_get_latest_study_result_returns_not_found_when_no_data(client: TestClient) -> None:
    response = client.get("/study-results/latest")

    assert response.status_code == 404  # データが存在しない場合のエラーハンドリング仕様を検証
