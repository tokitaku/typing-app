from collections.abc import Iterable
from typing import TypedDict

from sqlalchemy import inspect, text
from sqlmodel import select

from backend.database import get_session
from backend.database import migrate_database
from backend.domain.entities import Question
from backend.domain.tag_rules import normalize_tags
from backend.infrastructure.sqlmodel.repositories import SqlModelQuestionRepository


class TypingQuestionSeedRequired(TypedDict):
    english: str
    japanese: str


class TypingQuestionSeed(TypingQuestionSeedRequired, total=False):
    is_active: bool
    tags: list[str]


INITIAL_QUESTIONS: list[TypingQuestionSeed] = [
    {"english": "apple", "japanese": "りんご", "tags": ["word"]},
    {"english": "library", "japanese": "図書館", "tags": ["word"]},
    {"english": "beautiful", "japanese": "美しい", "tags": ["word"]},
    {"english": "schedule", "japanese": "予定", "tags": ["word"]},
    {"english": "environment", "japanese": "環境", "tags": ["word"]},
    {"english": "confidence", "japanese": "自信", "tags": ["word"]},
    {"english": "I drink coffee every morning.", "japanese": "私は毎朝コーヒーを飲みます。", "tags": ["sentence"]},
    {"english": "She studies English after dinner.", "japanese": "彼女は夕食後に英語を勉強します。", "tags": ["sentence"]},
    {"english": "We need to finish this report today.", "japanese": "私たちは今日このレポートを終える必要があります。", "tags": ["sentence"]},
    {"english": "The train was delayed because of the rain.", "japanese": "雨のため電車が遅れました。", "tags": ["sentence"]},
    {"english": "Learning a language takes patience and repetition.", "japanese": "言語学習には忍耐と反復が必要です。", "tags": ["sentence"]},
]


def seed_typing_questions(database_url: str, questions: Iterable[TypingQuestionSeed]) -> None:
    repository = SqlModelQuestionRepository(database_url)
    existing_questions = repository.list_questions(include_inactive=True)
    existing_pairs = {(q.english, q.japanese) for q in existing_questions}

    for question in questions:
        if (str(question["english"]), str(question["japanese"])) in existing_pairs:
            continue  # 同一内容の初期問題は追加しない

        repository.create(
            question=Question(
                id=None,
                english=str(question["english"]),
                japanese=str(question["japanese"]),
                is_active=bool(question.get("is_active", True)),
                tags=normalize_tags(question.get("tags", [])),
            )
        )


def migrate_legacy_words(database_url: str) -> None:
    repository = SqlModelQuestionRepository(database_url)

    with get_session(database_url) as session:
        inspector = inspect(session.get_bind())

        if not inspector.has_table("words"):
            return  # 旧 words テーブルがなければ移行不要

        rows = session.execute(
            text(
                """
                SELECT english, japanese, level, is_active
                FROM words
                """
            )
        ).all()

    if not rows:
        return  # 移行対象がなければ何もしない

    existing_questions = repository.list_questions(include_inactive=True)
    existing_pairs = {(q.english, q.japanese) for q in existing_questions}

    for english, japanese, level, is_active in rows:
        if (english, japanese) in existing_pairs:
            continue  # 既に移行済みの問題は重複させない

        repository.create(
            question=Question(
                id=None,
                english=english,
                japanese=japanese,
                is_active=bool(is_active),
                tags=normalize_tags(("word",)),
            )
        )


def bootstrap_database(database_url: str) -> None:
    migrate_database(database_url)  # 先に migration を適用してテーブルを最新化する
    migrate_legacy_words(database_url)  # 旧 words テーブルがあれば移行する
    seed_typing_questions(database_url, INITIAL_QUESTIONS)  # 初期問題を投入する
