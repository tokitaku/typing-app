from fastapi.testclient import TestClient
import pytest

from backend.presentation import api
from backend.presentation.api import create_app


def test_health_returns_ok(client) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_app_bootstraps_database_on_startup(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    database_url = f"sqlite:///{tmp_path / 'startup.db'}"
    bootstrapped_urls: list[str] = []

    def fake_bootstrap_database(received_database_url: str) -> None:
        bootstrapped_urls.append(received_database_url)  # lifespan が解決済み DB URL を受け取ることを記録する

    monkeypatch.setattr(api, "bootstrap_database", fake_bootstrap_database)

    with TestClient(create_app(database_url)):
        pass  # 起動と終了だけ行い、lifespan から bootstrap が呼ばれることを確認する

    assert bootstrapped_urls == [database_url]


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
