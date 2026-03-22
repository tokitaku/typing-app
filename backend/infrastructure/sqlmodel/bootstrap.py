from collections.abc import Iterable
from typing import TypedDict

from sqlalchemy import inspect, text
from sqlmodel import select

from backend.database import migrate_database
from backend.domain.entities import Question, QuestionType
from backend.infrastructure.sqlmodel.models import (
    EikenLevelRecord,
    QuestionTypeRecord,
    QuestionTypeRecordCode,
)
from backend.infrastructure.sqlmodel.repositories import SqlModelQuestionRepository
from backend.database import get_session


class EikenLevelSeed(TypedDict):
    code: str
    name: str
    sort_order: int


class QuestionTypeSeed(TypedDict):
    code: QuestionTypeRecordCode
    name: str


class TypingQuestionSeedRequired(TypedDict):
    eiken_level_code: str
    question_type: str
    english: str
    japanese: str


class TypingQuestionSeed(TypingQuestionSeedRequired, total=False):
    is_active: bool
    tags: list[str]


EIKEN_LEVELS: list[EikenLevelSeed] = [
    {"code": "5", "name": "英検5級", "sort_order": 1},
    {"code": "4", "name": "英検4級", "sort_order": 2},
    {"code": "3", "name": "英検3級", "sort_order": 3},
    {"code": "pre2", "name": "英検準2級", "sort_order": 4},
    {"code": "2", "name": "英検2級", "sort_order": 5},
    {"code": "pre1", "name": "英検準1級", "sort_order": 6},
    {"code": "1", "name": "英検1級", "sort_order": 7},
]

QUESTION_TYPES: list[QuestionTypeSeed] = [
    {"code": QuestionTypeRecordCode.WORD, "name": "英単語"},
    {"code": QuestionTypeRecordCode.SENTENCE, "name": "英文章"},
]

INITIAL_QUESTIONS: list[TypingQuestionSeed] = [
    {"eiken_level_code": "5", "question_type": "word", "english": "apple", "japanese": "りんご", "tags": ["word"]},
    {"eiken_level_code": "5", "question_type": "word", "english": "library", "japanese": "図書館", "tags": ["word"]},
    {"eiken_level_code": "4", "question_type": "word", "english": "beautiful", "japanese": "美しい", "tags": ["word"]},
    {"eiken_level_code": "4", "question_type": "word", "english": "schedule", "japanese": "予定", "tags": ["word"]},
    {"eiken_level_code": "3", "question_type": "word", "english": "environment", "japanese": "環境", "tags": ["word"]},
    {"eiken_level_code": "2", "question_type": "word", "english": "confidence", "japanese": "自信", "tags": ["word"]},
    {"eiken_level_code": "5", "question_type": "sentence", "english": "I drink coffee every morning.", "japanese": "私は毎朝コーヒーを飲みます。", "tags": ["sentence"]},
    {"eiken_level_code": "4", "question_type": "sentence", "english": "She studies English after dinner.", "japanese": "彼女は夕食後に英語を勉強します。", "tags": ["sentence"]},
    {"eiken_level_code": "3", "question_type": "sentence", "english": "We need to finish this report today.", "japanese": "私たちは今日このレポートを終える必要があります。", "tags": ["sentence"]},
    {"eiken_level_code": "pre2", "question_type": "sentence", "english": "The train was delayed because of the rain.", "japanese": "雨のため電車が遅れました。", "tags": ["sentence"]},
    {"eiken_level_code": "2", "question_type": "sentence", "english": "Learning a language takes patience and repetition.", "japanese": "言語学習には忍耐と反復が必要です。", "tags": ["sentence"]},
]


def seed_eiken_levels(database_url: str, levels: Iterable[EikenLevelSeed]) -> None:
    with get_session(database_url) as session:
        existing = session.exec(select(EikenLevelRecord.id)).first()

        if existing is not None:
            return  # 既存データがあれば再投入しない

        session.add_all([EikenLevelRecord.model_validate(level) for level in levels])
        session.commit()


def seed_question_types(database_url: str, question_types: Iterable[QuestionTypeSeed]) -> None:
    with get_session(database_url) as session:
        existing = session.exec(select(QuestionTypeRecord.id)).first()

        if existing is not None:
            return  # 既存データがあれば再投入しない

        session.add_all([QuestionTypeRecord.model_validate(question_type) for question_type in question_types])
        session.commit()


def seed_typing_questions(database_url: str, questions: Iterable[TypingQuestionSeed]) -> None:
    repository = SqlModelQuestionRepository(database_url)

    for question in questions:
        existing_questions = repository.list_questions(
            eiken_level_codes=[str(question["eiken_level_code"])],
            question_type_codes=None,
            include_inactive=True,
        )
        if any(
            existing_question.question_type.value == str(question["question_type"])
            and existing_question.english == str(question["english"])
            and existing_question.japanese == str(question["japanese"])
            for existing_question in existing_questions
        ):
            continue  # 同一内容の初期問題は追加しない

        repository.create(
            question=Question(
                id=None,
                eiken_level_code=str(question["eiken_level_code"]),
                question_type=QuestionType(str(question["question_type"])),
                english=str(question["english"]),
                japanese=str(question["japanese"]),
                is_active=bool(question.get("is_active", True)),
                tags=tuple(str(tag) for tag in question.get("tags", [])),
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

    legacy_level_map = {1: "5", 2: "4", 3: "3"}

    for english, japanese, level, is_active in rows:
        eiken_level_code = legacy_level_map.get(int(level), "3")
        existing_questions = repository.list_questions(
            eiken_level_codes=[eiken_level_code],
            question_type_codes=None,
            include_inactive=True,
        )
        if any(
            question.question_type.value == "word"
            and question.english == english
            and question.japanese == japanese
            for question in existing_questions
        ):
            continue  # 既に移行済みの問題は重複させない

        repository.create(
            question=Question(
                id=None,
                eiken_level_code=eiken_level_code,
                question_type=QuestionType.WORD,
                english=english,
                japanese=japanese,
                is_active=bool(is_active),
                tags=("word",),
            )
        )


def bootstrap_database(database_url: str) -> None:
    migrate_database(database_url)  # 先に migration を適用してテーブルを最新化する
    seed_eiken_levels(database_url, EIKEN_LEVELS)  # 英検級マスタを投入する
    seed_question_types(database_url, QUESTION_TYPES)  # 問題種別マスタを投入する
    migrate_legacy_words(database_url)  # 旧 words テーブルがあれば移行する
    seed_typing_questions(database_url, INITIAL_QUESTIONS)  # 初期問題を投入する
