import sqlite3

from sqlmodel import SQLModel, create_engine

from backend.database import migrate_database
from backend.domain.entities import QuestionType
from backend.infrastructure.sqlmodel import models  # noqa: F401  # 旧 create_all スキーマを再現するため import する
from backend.infrastructure.sqlmodel.bootstrap import bootstrap_database
from backend.infrastructure.sqlmodel.repositories import SqlModelQuestionRepository


def test_bootstrap_database_migrates_legacy_words_into_questions(tmp_path) -> None:
    database_path = tmp_path / "legacy.db"
    connection = sqlite3.connect(database_path)
    connection.execute(
        """
        CREATE TABLE words (
            id INTEGER PRIMARY KEY,
            english TEXT NOT NULL,
            japanese TEXT NOT NULL,
            level INTEGER NOT NULL,
            is_active BOOLEAN NOT NULL
        )
        """
    )
    connection.execute(
        """
        INSERT INTO words (id, english, japanese, level, is_active)
        VALUES (1, 'legacy-word', '旧データ', 2, 1)
        """
    )
    connection.commit()
    connection.close()

    database_url = f"sqlite:///{database_path}"

    bootstrap_database(database_url)

    repository = SqlModelQuestionRepository(database_url)
    questions = repository.list_questions(
        eiken_level_codes=["4"],
        question_type_codes=[QuestionType.WORD],
        include_inactive=True,
    )

    assert any(
        question.english == "legacy-word" and question.japanese == "旧データ"
        for question in questions
    )


def test_migrate_database_applies_alembic_migrations(tmp_path) -> None:
    database_path = tmp_path / "migrated.db"
    database_url = f"sqlite:///{database_path}"

    migrate_database(database_url)

    connection = sqlite3.connect(database_path)
    tables = {
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"  # 作成済みテーブル一覧を取得する
        ).fetchall()
    }
    connection.close()

    assert {
        "alembic_version",
        "eiken_levels",
        "question_types",
        "typing_questions",
        "study_results",
    } <= tables


def test_migrate_database_stamps_existing_schema_without_recreating_tables(tmp_path) -> None:
    database_path = tmp_path / "existing.db"
    database_url = f"sqlite:///{database_path}"
    SQLModel.metadata.create_all(create_engine(database_url))  # 旧実装の create_all だけ済んだ DB を再現する

    migrate_database(database_url)

    connection = sqlite3.connect(database_path)
    tables = {
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"  # テーブル一覧から stamp 結果を検証する
        ).fetchall()
    }
    connection.close()

    assert "alembic_version" in tables
