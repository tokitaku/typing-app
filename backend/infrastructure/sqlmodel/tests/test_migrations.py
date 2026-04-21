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
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def _build_schema_scoped_url(database_url: str, schema_name: str) -> str:
    url = make_url(database_url)
    existing_options = url.query.get("options")
    search_path_option = f"-csearch_path={schema_name}"
    merged_options = f"{existing_options} {search_path_option}" if existing_options else search_path_option
    scoped_url: URL = url.update_query_dict({"options": merged_options})
    return str(scoped_url)


@pytest.fixture
def isolated_database() -> Iterator[tuple[str, str]]:
    database_url = get_database_url()
    schema_name = f"test_migrations_{uuid4().hex}"
    admin_engine = create_engine(database_url, poolclass=NullPool)

    with admin_engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema_name}"'))  # 一時 schema を分けて既存テーブル汚染を避ける

    try:
        yield _build_schema_scoped_url(database_url, schema_name), schema_name
    finally:
        with admin_engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE'))  # migration 副作用を schema ごと掃除する
        admin_engine.dispose()


def test_migrations_can_upgrade_and_downgrade_roundtrip(isolated_database: tuple[str, str]) -> None:
    database_url, schema_name = isolated_database
    config = _build_alembic_config(database_url)

    command.upgrade(config, "head")

    upgraded_engine = create_engine(database_url, poolclass=NullPool)
    upgraded_inspector = inspect(upgraded_engine)
    assert EXPECTED_TABLES.issubset(set(upgraded_inspector.get_table_names(schema=schema_name)))
    upgraded_engine.dispose()

    command.downgrade(config, "base")

    downgraded_engine = create_engine(database_url, poolclass=NullPool)
    downgraded_inspector = inspect(downgraded_engine)
    remaining_tables = set(downgraded_inspector.get_table_names(schema=schema_name))
    assert EXPECTED_TABLES.isdisjoint(remaining_tables)
    downgraded_engine.dispose()
