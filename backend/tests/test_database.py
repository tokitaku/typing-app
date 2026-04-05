import pytest

from backend.database import DEFAULT_DATABASE_URL, get_database_url


def test_get_database_url_returns_default_when_env_unset(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)

    assert get_database_url() == DEFAULT_DATABASE_URL


def test_get_database_url_returns_env_value_when_set(monkeypatch: pytest.MonkeyPatch) -> None:
    custom_url = "postgresql://user:pass@host:5432/db"
    monkeypatch.setenv("DATABASE_URL", custom_url)

    assert get_database_url() == custom_url


def test_get_database_url_override_takes_precedence_over_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql://env:env@host:5432/env_db")
    override_url = "postgresql://override:override@host:5432/override_db"

    assert get_database_url(override=override_url) == override_url


def test_get_database_url_default_contains_postgresql_scheme() -> None:
    assert DEFAULT_DATABASE_URL.startswith("postgresql://")
