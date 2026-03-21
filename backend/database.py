import os
import sqlite3
from pathlib import Path


DEFAULT_DATABASE_URL = "sqlite:///./backend/app.db"
SQLITE_URL_PREFIX = "sqlite:///"

SCHEMA = """
CREATE TABLE IF NOT EXISTS problems (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('word', 'sentence')),
    english TEXT NOT NULL,
    japanese TEXT NOT NULL,
    level INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS study_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mode TEXT NOT NULL CHECK(mode IN ('learn', 'review')),
    total_questions INTEGER NOT NULL,
    correct_rate INTEGER NOT NULL,
    mistakes INTEGER NOT NULL,
    average_time INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_results_created_at
ON study_results(created_at);
"""


def get_database_url(override: str | None = None) -> str:
    return override or os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)


def resolve_sqlite_path(database_url: str) -> Path:
    if not database_url.startswith(SQLITE_URL_PREFIX):
        raise ValueError("Only sqlite DATABASE_URL values are supported.")

    relative_path = database_url.removeprefix(SQLITE_URL_PREFIX)
    return Path(relative_path).resolve()


def get_connection(database_url: str) -> sqlite3.Connection:
    database_path = resolve_sqlite_path(database_url)
    database_path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    return connection


def init_database(database_url: str) -> None:
    with get_connection(database_url) as connection:
        connection.executescript(SCHEMA)
