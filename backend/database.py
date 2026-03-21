import os
from functools import lru_cache
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.engine import Engine


DEFAULT_DATABASE_URL = "sqlite:///./backend/app.db"
SQLITE_URL_PREFIXES = ("sqlite:///", "sqlite:////")


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


def init_database(database_url: str) -> None:
    SQLModel.metadata.create_all(get_engine(database_url))
