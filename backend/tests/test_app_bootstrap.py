import sqlite3

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine

from backend.main import create_app
from backend.infrastructure.sqlmodel import models  # noqa: F401  # 旧 create_all スキーマを再現するため import する


def test_health_returns_ok(client) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_app_allows_default_cors_origin_when_env_is_unset(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("BACKEND_CORS_ORIGINS", raising=False)  # 既定値フォールバック動作を見るため環境変数を外す

    app = create_app("sqlite://")  # DB 初期化は不要なのでメモリ URL でアプリ定義だけ組み立てる

    cors_middleware = next(middleware for middleware in app.user_middleware if middleware.cls.__name__ == "CORSMiddleware")

    assert cors_middleware.kwargs["allow_origins"] == ["http://localhost:3000"]


def test_create_app_allows_single_cors_origin_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BACKEND_CORS_ORIGINS", "http://localhost:3001")  # 単一 origin 指定を再現する

    app = create_app("sqlite://")  # 起動前の middleware 設定だけを確認する

    cors_middleware = next(middleware for middleware in app.user_middleware if middleware.cls.__name__ == "CORSMiddleware")

    assert cors_middleware.kwargs["allow_origins"] == ["http://localhost:3001"]


def test_create_app_allows_multiple_cors_origins_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "BACKEND_CORS_ORIGINS",
        "http://localhost:3001, http://localhost:3002 ,",  # 空要素や前後空白を含む入力を正規化対象として与える
    )

    app = create_app("sqlite://")  # 設定解決結果だけを検証する

    cors_middleware = next(middleware for middleware in app.user_middleware if middleware.cls.__name__ == "CORSMiddleware")

    assert cors_middleware.kwargs["allow_origins"] == ["http://localhost:3001", "http://localhost:3002"]


def test_create_app_falls_back_to_default_cors_origin_when_env_is_blank(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BACKEND_CORS_ORIGINS", "  ,  ")  # 実質空文字の設定でも既定値へ戻す

    app = create_app("sqlite://")  # 空入力時のフォールバックだけを確認する

    cors_middleware = next(middleware for middleware in app.user_middleware if middleware.cls.__name__ == "CORSMiddleware")

    assert cors_middleware.kwargs["allow_origins"] == ["http://localhost:3000"]


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
