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
    "tags",
    "typing_questions",
    "typing_question_tags",
    "study_results",
}
LEGACY_BASE_TABLES = {
    "question_types",
    "typing_questions",
    "study_results",
}


def _resolve_existing_schema_revision(engine: Engine) -> str | None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    if "alembic_version" in existing_tables:
        return None  # 既に Alembic 管理下なら追加の stamp は不要

    if not (MANAGED_TABLES <= existing_tables or LEGACY_BASE_TABLES <= existing_tables):
        return None  # 管理対象外の DB には触れない

    typing_question_columns = (
        {column["name"] for column in inspector.get_columns("typing_questions")}
        if "typing_questions" in existing_tables
        else set()
    )
    has_tags = {"tags", "typing_question_tags"} <= existing_tables
    has_legacy_question_type = "question_types" in existing_tables or "question_type_id" in typing_question_columns
    has_legacy_eiken = "eiken_levels" in existing_tables or "eiken_level_id" in typing_question_columns

    if has_legacy_eiken and has_tags:
        return "20260322_0002"  # tags 導入済みで eiken だけ残る DB は 0002 相当として扱う

    if has_legacy_eiken or has_legacy_question_type:
        return "20260321_0001" if not has_tags else "20260322_0003"  # 残留カラムに応じて最短 revision へ合わせる

    return "head"  # 現行 create_all 相当の DB だけ head へ stamp する


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
    engine = get_engine(database_url)
    existing_revision = _resolve_existing_schema_revision(engine)

    if existing_revision is not None:
        command.stamp(config, existing_revision)  # 既存スキーマに対応する revision へ合わせてから upgrade する

    command.upgrade(config, "head")  # 起動時に最新 revision まで適用する


def init_database(database_url: str) -> None:
    migrate_database(database_url)  # 互換維持のため旧 API でも migration を実行する
