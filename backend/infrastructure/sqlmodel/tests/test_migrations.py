from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.pool import NullPool

from backend.database import get_database_url


EXPECTED_TABLES = {
    "study_results",
    "tags",
    "typing_question_tags",
    "typing_questions",
}


def _build_alembic_config(database_url: str) -> Config:
    backend_dir = Path(__file__).resolve().parents[3]
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))
    return config


def _build_isolated_database_url(database_url: str, database_name: str) -> str:
    url = make_url(database_url)
    isolated_url: URL = url.set(database=database_name, query={})
    return isolated_url.render_as_string(hide_password=False)


def test_build_alembic_config_accepts_percent_encoded_database_url() -> None:
    database_url = (
        "postgresql://typing_app:typing_app_password@127.0.0.1:5432/typing_app"
        "?options=-csearch_path%3Dtest_migrations_schema"
    )

    config = _build_alembic_config(database_url)

    assert config.get_main_option("sqlalchemy.url") == database_url


@pytest.fixture
def isolated_database() -> Iterator[str]:
    admin_database_url = get_database_url()
    database_name = f"test_migrations_{uuid4().hex}"
    admin_engine = create_engine(admin_database_url, poolclass=NullPool, isolation_level="AUTOCOMMIT")

    with admin_engine.connect() as connection:
        connection.execute(text(f'CREATE DATABASE "{database_name}"'))  # 一時 database を作り migration 対象を完全分離する

    try:
        yield _build_isolated_database_url(admin_database_url, database_name)
    finally:
        with admin_engine.connect() as connection:
            connection.execute(
                text(
                    """
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = :database_name AND pid <> pg_backend_pid()
                    """
                ),
                {"database_name": database_name},
            )  # Alembic が掴んだ接続を落としてから database を削除する
            connection.execute(text(f'DROP DATABASE IF EXISTS "{database_name}"'))
        admin_engine.dispose()


def test_migrations_can_upgrade_and_downgrade_roundtrip(isolated_database: str) -> None:
    database_url = isolated_database
    config = _build_alembic_config(database_url)
    migration_engine = create_engine(database_url, poolclass=NullPool)

    with migration_engine.connect() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")

    upgraded_engine = create_engine(database_url, poolclass=NullPool)
    upgraded_inspector = inspect(upgraded_engine)
    assert EXPECTED_TABLES.issubset(set(upgraded_inspector.get_table_names()))
    upgraded_engine.dispose()

    with migration_engine.connect() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, "base")

    downgraded_engine = create_engine(database_url, poolclass=NullPool)
    downgraded_inspector = inspect(downgraded_engine)
    remaining_tables = set(downgraded_inspector.get_table_names())
    assert EXPECTED_TABLES.isdisjoint(remaining_tables)
    downgraded_engine.dispose()
    migration_engine.dispose()
