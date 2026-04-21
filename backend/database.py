import os
from functools import lru_cache

from alembic import command
from alembic.config import Config
from sqlmodel import Session, create_engine
from sqlalchemy.engine import Engine


# PostgreSQL を既定とし、ローカル開発では環境変数で上書き可能とする
DEFAULT_DATABASE_URL = "postgresql://typing_app:typing_app_password@localhost:5432/typing_app"


def get_database_url(override: str | None = None) -> str:
    return override or os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)


@lru_cache(maxsize=None)
def get_engine(database_url: str) -> Engine:
    return create_engine(database_url)


def get_session(database_url: str) -> Session:
    return Session(get_engine(database_url))


def _build_alembic_config(database_url: str) -> Config:
    from pathlib import Path
    backend_dir = Path(__file__).resolve().parent
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))
    return config


def migrate_database(database_url: str) -> None:
    config = _build_alembic_config(database_url)
    command.upgrade(config, "head")  # 起動時に最新 revision まで適用する


def init_database(database_url: str) -> None:
    # 互換維持のため旧 API でも migration を実行する
    migrate_database(database_url)
