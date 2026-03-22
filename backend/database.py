import os
from functools import lru_cache

from alembic import command
from alembic.config import Config
from sqlmodel import Session, create_engine
from sqlalchemy import inspect
from sqlalchemy.engine import Engine


# PostgreSQL を既定とし、ローカル開発では環境変数で上書き可能とする
DEFAULT_DATABASE_URL = "postgresql://typing_app:typing_app_password@localhost:5432/typing_app"
MANAGED_TABLES = {
    "question_types",
    "tags",
    "typing_questions",
    "typing_question_tags",
    "study_results",
}


def get_database_url(override: str | None = None) -> str:
    return override or os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)


@lru_cache(maxsize=None)
def get_engine(database_url: str) -> Engine:
    # PostgreSQL では connect_args は不要
    # SQLite の場合は後方互換性のため check_same_thread を設定
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite:") else {}
    return create_engine(database_url, connect_args=connect_args)


def get_session(database_url: str) -> Session:
    return Session(get_engine(database_url))


def _build_alembic_config(database_url: str) -> Config:
    from pathlib import Path
    backend_dir = Path(__file__).resolve().parent
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def migrate_database(database_url: str) -> None:
    config = _build_alembic_config(database_url)
    existing_tables = set(inspect(get_engine(database_url)).get_table_names())

    # 旧 create_all で作られた既存 DB を現行 revision として登録する
    if "alembic_version" not in existing_tables and MANAGED_TABLES <= existing_tables:
        command.stamp(config, "head")

    # 起動時に最新 revision まで適用する
    command.upgrade(config, "head")


def init_database(database_url: str) -> None:
    # 互換維持のため旧 API でも migration を実行する
    migrate_database(database_url)

