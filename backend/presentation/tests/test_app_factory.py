from fastapi.testclient import TestClient
import pytest
from unittest.mock import patch

from backend.presentation import api
from backend.presentation.api import create_app


def test_health_returns_ok(client) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_app_bootstraps_database_on_startup(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    bootstrapped_urls: list[str] = []

    def fake_bootstrap_database(received_database_url: str) -> None:
        bootstrapped_urls.append(received_database_url)  # lifespan が解決済み DB URL を受け取ることを記録する

    monkeypatch.setattr(api, "bootstrap_database", fake_bootstrap_database)

    # create_app() は環境変数の DATABASE_URL を使うが、bootstrap がモックされているため DB 接続は発生しない
    with TestClient(create_app()):
        pass  # 起動と終了だけ行い、lifespan から bootstrap が呼ばれることを確認する

    # 既定の DATABASE_URL が bootstrap に渡されることを確認
    assert len(bootstrapped_urls) == 1
    assert "postgresql://" in bootstrapped_urls[0]


def test_create_app_allows_default_cors_origin_when_env_is_unset(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("BACKEND_CORS_ORIGINS", raising=False)  # 既定値フォールバック動作を見るため環境変数を外す

    # bootstrap_database をモックして DB 接続を回避
    with patch("backend.presentation.api.bootstrap_database"):
        app = create_app()

    cors_middleware = next(middleware for middleware in app.user_middleware if middleware.cls.__name__ == "CORSMiddleware")

    assert cors_middleware.kwargs["allow_origins"] == ["http://localhost:3000"]


def test_create_app_allows_single_cors_origin_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BACKEND_CORS_ORIGINS", "http://localhost:3001")  # 単一 origin 指定を再現する

    # bootstrap_database をモックして DB 接続を回避
    with patch("backend.presentation.api.bootstrap_database"):
        app = create_app()

    cors_middleware = next(middleware for middleware in app.user_middleware if middleware.cls.__name__ == "CORSMiddleware")

    assert cors_middleware.kwargs["allow_origins"] == ["http://localhost:3001"]


def test_create_app_allows_multiple_cors_origins_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "BACKEND_CORS_ORIGINS",
        "http://localhost:3001, http://localhost:3002 ,",  # 空要素や前後空白を含む入力を正規化対象として与える
    )

    # bootstrap_database をモックして DB 接続を回避
    with patch("backend.presentation.api.bootstrap_database"):
        app = create_app()

    cors_middleware = next(middleware for middleware in app.user_middleware if middleware.cls.__name__ == "CORSMiddleware")

    assert cors_middleware.kwargs["allow_origins"] == ["http://localhost:3001", "http://localhost:3002"]


def test_create_app_falls_back_to_default_cors_origin_when_env_is_blank(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BACKEND_CORS_ORIGINS", "  ,  ")  # 実質空文字の設定でも既定値へ戻す

    # bootstrap_database をモックして DB 接続を回避
    with patch("backend.presentation.api.bootstrap_database"):
        app = create_app()

    cors_middleware = next(middleware for middleware in app.user_middleware if middleware.cls.__name__ == "CORSMiddleware")

    assert cors_middleware.kwargs["allow_origins"] == ["http://localhost:3000"]
