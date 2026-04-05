import pytest
from fastapi.testclient import TestClient

from backend.application.tests.fakes import FakeQuestionRepository, FakeStudyResultRepository
from backend.presentation.api import create_app


def _make_app(**kwargs):
    return create_app(
        question_repository=FakeQuestionRepository([]),
        study_result_repository=FakeStudyResultRepository(),
        **kwargs,
    )


def test_health_returns_ok(client) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_app_calls_on_startup_callback() -> None:
    calls: list[str] = []

    def fake_on_startup() -> None:
        calls.append("called")  # lifespan が on_startup を呼び出すことを記録する

    with TestClient(_make_app(on_startup=fake_on_startup)):
        pass  # 起動と終了だけ行い、on_startup が呼ばれることを確認する

    assert calls == ["called"]


def test_create_app_skips_startup_when_no_callback_given() -> None:
    # on_startup を渡さない場合は startup 時に何もせず正常に起動することを確認する
    with TestClient(_make_app()):
        pass


def test_create_app_allows_default_cors_origin_when_env_is_unset(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("BACKEND_CORS_ORIGINS", raising=False)  # 既定値フォールバック動作を見るため環境変数を外す

    app = _make_app()

    cors_middleware = next(middleware for middleware in app.user_middleware if middleware.cls.__name__ == "CORSMiddleware")
    assert cors_middleware.kwargs["allow_origins"] == ["http://localhost:3000"]


def test_create_app_allows_single_cors_origin_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BACKEND_CORS_ORIGINS", "http://localhost:3001")  # 単一 origin 指定を再現する

    app = _make_app()

    cors_middleware = next(middleware for middleware in app.user_middleware if middleware.cls.__name__ == "CORSMiddleware")
    assert cors_middleware.kwargs["allow_origins"] == ["http://localhost:3001"]


def test_create_app_allows_multiple_cors_origins_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "BACKEND_CORS_ORIGINS",
        "http://localhost:3001, http://localhost:3002 ,",  # 空要素や前後空白を含む入力を正規化対象として与える
    )

    app = _make_app()

    cors_middleware = next(middleware for middleware in app.user_middleware if middleware.cls.__name__ == "CORSMiddleware")
    assert cors_middleware.kwargs["allow_origins"] == ["http://localhost:3001", "http://localhost:3002"]


def test_create_app_falls_back_to_default_cors_origin_when_env_is_blank(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BACKEND_CORS_ORIGINS", "  ,  ")  # 実質空文字の設定でも既定値へ戻す

    app = _make_app()

    cors_middleware = next(middleware for middleware in app.user_middleware if middleware.cls.__name__ == "CORSMiddleware")
    assert cors_middleware.kwargs["allow_origins"] == ["http://localhost:3000"]
