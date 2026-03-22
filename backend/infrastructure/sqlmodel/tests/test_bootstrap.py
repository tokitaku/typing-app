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
        "question_types",
        "tags",
        "typing_questions",
        "typing_question_tags",
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


def test_bootstrap_database_backfills_legacy_question_type_tags(tmp_path) -> None:
    database_path = tmp_path / "existing-with-data.db"
    database_url = f"sqlite:///{database_path}"
    connection = sqlite3.connect(database_path)
    connection.execute("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)")
    connection.execute("INSERT INTO alembic_version (version_num) VALUES ('20260321_0001')")
    connection.execute(
        """
        CREATE TABLE question_types (
            id INTEGER PRIMARY KEY,
            code TEXT NOT NULL,
            name TEXT NOT NULL
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE study_results (
            id INTEGER PRIMARY KEY,
            mode TEXT NOT NULL,
            total_questions INTEGER NOT NULL,
            correct_rate INTEGER NOT NULL,
            mistakes INTEGER NOT NULL,
            average_time INTEGER NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE typing_questions (
            id INTEGER PRIMARY KEY,
            question_type_id INTEGER NOT NULL,
            english_text TEXT NOT NULL,
            japanese_text TEXT NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(question_type_id) REFERENCES question_types(id)
        )
        """
    )
    connection.execute(
        """
        INSERT INTO question_types (id, code, name)
        VALUES (1, 'WORD', '英単語')
        """
    )
    connection.execute(
        """
        INSERT INTO typing_questions (
            id, question_type_id, english_text, japanese_text, is_active, created_at, updated_at
        ) VALUES (
            1, 1, 'legacy-seeded', '旧投入', 1, '2026-03-22T00:00:00+00:00', '2026-03-22T00:00:00+00:00'
        )
        """
    )
    connection.commit()
    connection.close()

    migrate_database(database_url)

    repository = SqlModelQuestionRepository(database_url)
    questions = repository.list_questions(
        question_type_codes=[QuestionType.WORD],
        tag_codes=["WORD"],
        include_inactive=True,
    )

    assert any(question.english == "legacy-seeded" for question in questions)  # 既存 question_type データが移行時にタグへ backfill されることを検証
