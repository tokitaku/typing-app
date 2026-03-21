import os
from functools import lru_cache
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlmodel import Session, create_engine
from sqlalchemy import inspect
from sqlalchemy.engine import Engine


DEFAULT_DATABASE_URL = "sqlite:///./backend/app.db"
SQLITE_URL_PREFIXES = ("sqlite:///", "sqlite:////")
MANAGED_TABLES = {
    "eiken_levels",
    "question_types",
    "typing_questions",
    "study_results",
}


def get_database_url(override: str | None = None) -> str:
    return override or os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)


def ensure_sqlite_directory(database_url: str) -> None:
    if not database_url.startswith(SQLITE_URL_PREFIXES):
        return

    if database_url.startswith("sqlite:////"):
        database_path = Path(database_url.removeprefix("sqlite:///"))
    else:
        database_path = Path(database_url.removeprefix("sqlite:///")).resolve()

    database_path.parent.mkdir(parents=True, exist_ok=True)


@lru_cache(maxsize=None)
def get_engine(database_url: str) -> Engine:
    ensure_sqlite_directory(database_url)
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite:") else {}
    return create_engine(database_url, connect_args=connect_args)


def get_session(database_url: str) -> Session:
    return Session(get_engine(database_url))


def _build_alembic_config(database_url: str) -> Config:
    backend_dir = Path(__file__).resolve().parent
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def migrate_database(database_url: str) -> None:
    ensure_sqlite_directory(database_url)
    config = _build_alembic_config(database_url)
    existing_tables = set(inspect(get_engine(database_url)).get_table_names())

    if "alembic_version" not in existing_tables and MANAGED_TABLES <= existing_tables:
        command.stamp(config, "head")  # 旧 create_all で作られた既存 DB を現行 revision として登録する

    command.upgrade(config, "head")  # 起動時に最新 revision まで適用する


def init_database(database_url: str) -> None:
    migrate_database(database_url)  # 互換維持のため旧 API でも migration を実行する
