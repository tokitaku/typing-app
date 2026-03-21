from collections.abc import Iterable  # 初期データ投入の反復入力に使う
from datetime import datetime, timezone  # 更新日時の再設定に使う
from enum import Enum  # Enum 値の文字列化に使う
from typing import Any  # 辞書ベースの row 型に使う

from sqlalchemy import func, inspect, text  # 日次集計と互換移行に使う
from sqlmodel import Session, select  # SQLModel のクエリ実行に使う

from backend.database import get_session  # DB セッション取得に使う
from backend.models import (
    EikenLevelRecord,  # 英検級マスタ
    QuestionTypeCode,  # 問題種別 enum
    QuestionTypeRecord,  # 問題種別マスタ
    StudyResultRecord,  # 学習結果テーブル
    TypingQuestionRecord,  # 問題本体テーブル
)


QuizRow = dict[str, Any]  # 出題API向けの返却形
StudyResultRow = dict[str, Any]  # 学習結果の返却形
QuestionRow = dict[str, Any]  # 問題管理API向けの返却形
MasterRow = dict[str, Any]  # マスタ投入用の入力形


def seed_eiken_levels(database_url: str, levels: Iterable[MasterRow]) -> None:
    with get_session(database_url) as session:
        existing = session.exec(select(EikenLevelRecord.id)).first()  # 既存投入済みか確認する

        if existing is not None:
            return  # 既にデータがあれば何もしない

        session.add_all([EikenLevelRecord.model_validate(level) for level in levels])  # マスタを一括投入する
        session.commit()  # 永続化する


def seed_question_types(database_url: str, question_types: Iterable[MasterRow]) -> None:
    with get_session(database_url) as session:
        existing = session.exec(select(QuestionTypeRecord.id)).first()  # 既存投入済みか確認する

        if existing is not None:
            return  # 既にデータがあれば何もしない

        session.add_all(
            [QuestionTypeRecord.model_validate(question_type) for question_type in question_types]
        )  # 種別マスタを一括投入する
        session.commit()  # 永続化する


def _enum_to_value(value: Any) -> str:
    if isinstance(value, Enum):
        return str(value.value)  # Enum は生の値へ変換する

    return str(value)  # それ以外は文字列化する


def _resolve_eiken_level_id(session: Session, code: str) -> int:
    record = session.exec(
        select(EikenLevelRecord).where(EikenLevelRecord.code == code)
    ).first()  # 級コードからマスタを引く

    if record is None:
        raise ValueError(f"Unknown eiken level code: {code}")  # 不正コードは明示的に失敗させる

    return int(record.id)  # 外部キー用の ID を返す


def _resolve_question_type_id(session: Session, code: str) -> int:
    record = session.exec(
        select(QuestionTypeRecord).where(QuestionTypeRecord.code == QuestionTypeCode(code))
    ).first()  # 種別コードからマスタを引く

    if record is None:
        raise ValueError(f"Unknown question type code: {code}")  # 不正コードは明示的に失敗させる

    return int(record.id)  # 外部キー用の ID を返す


def _build_question_response(
    record: TypingQuestionRecord,
    eiken_level_code: str,
    question_type_code: str,
) -> QuestionRow:
    return {
        "id": record.id,  # 問題IDを返す
        "type": question_type_code,  # word / sentence を返す
        "eikenLevel": eiken_level_code,  # 英検級コードを返す
        "english": record.english_text,  # 英文を返す
        "japanese": record.japanese_text,  # 日本語訳を返す
        "isActive": record.is_active,  # 管理用に有効フラグを返す
    }


def seed_typing_questions(database_url: str, questions: Iterable[QuestionRow]) -> None:
    with get_session(database_url) as session:
        records: list[TypingQuestionRecord] = []

        for question in questions:
            existing = session.exec(
                select(TypingQuestionRecord.id).where(
                    TypingQuestionRecord.eiken_level_id
                    == _resolve_eiken_level_id(session, question["eiken_level_code"]),
                    TypingQuestionRecord.question_type_id
                    == _resolve_question_type_id(session, question["question_type"]),
                    TypingQuestionRecord.english_text == question["english"],
                    TypingQuestionRecord.japanese_text == question["japanese"],
                )
            ).first()  # 同一内容の問題が既にあるか確認する

            if existing is not None:
                continue  # 重複する初期問題は追加しない

            records.append(
                TypingQuestionRecord(
                    eiken_level_id=_resolve_eiken_level_id(session, question["eiken_level_code"]),  # 級コードを FK に変換する
                    question_type_id=_resolve_question_type_id(session, question["question_type"]),  # 種別コードを FK に変換する
                    english_text=question["english"],  # 英文を保存する
                    japanese_text=question["japanese"],  # 日本語訳を保存する
                    is_active=question.get("is_active", True),  # 未指定時は有効にする
                )
            )

        if records:
            session.add_all(records)  # 初期問題を一括投入する
            session.commit()  # 永続化する


def migrate_legacy_words(database_url: str) -> None:
    with get_session(database_url) as session:
        engine = session.get_bind()  # 現在の接続先エンジンを取得する
        inspector = inspect(engine)

        if not inspector.has_table("words"):
            return  # 旧テーブルが無ければ移行は不要

        rows = session.exec(
            text(
                """
                SELECT english, japanese, level, is_active
                FROM words
                """
            )
        ).all()  # 旧単語データを取得する

        if not rows:
            return  # 旧データが無ければ何もしない

        legacy_level_map = {
            1: "5",
            2: "4",
            3: "3",
        }
        records: list[TypingQuestionRecord] = []

        for english, japanese, level, is_active in rows:
            eiken_level_code = legacy_level_map.get(int(level), "3")  # 旧レベルを英検級へ読み替える
            eiken_level_id = _resolve_eiken_level_id(session, eiken_level_code)
            question_type_id = _resolve_question_type_id(session, "word")
            existing = session.exec(
                select(TypingQuestionRecord.id).where(
                    TypingQuestionRecord.eiken_level_id == eiken_level_id,
                    TypingQuestionRecord.question_type_id == question_type_id,
                    TypingQuestionRecord.english_text == english,
                    TypingQuestionRecord.japanese_text == japanese,
                )
            ).first()  # 既に移行済みなら重複させない

            if existing is not None:
                continue

            records.append(
                TypingQuestionRecord(
                    eiken_level_id=eiken_level_id,
                    question_type_id=question_type_id,
                    english_text=english,
                    japanese_text=japanese,
                    is_active=bool(is_active),
                )
            )

        if records:
            session.add_all(records)  # 旧単語を新問題テーブルへ移行する
            session.commit()  # 永続化する


def list_questions(
    database_url: str,
    eiken_level_codes: list[str] | None = None,
    question_type_codes: list[str] | None = None,
    include_inactive: bool = True,
) -> list[QuestionRow]:
    with get_session(database_url) as session:
        statement = (
            select(
                TypingQuestionRecord,
                EikenLevelRecord.code,
                QuestionTypeRecord.code,
            )
            .join(EikenLevelRecord, TypingQuestionRecord.eiken_level_id == EikenLevelRecord.id)  # 英検級を join する
            .join(QuestionTypeRecord, TypingQuestionRecord.question_type_id == QuestionTypeRecord.id)  # 種別を join する
            .order_by(TypingQuestionRecord.id)  # 作成順で安定させる
        )

        if not include_inactive:
            statement = statement.where(TypingQuestionRecord.is_active.is_(True))  # 有効問題だけに絞る

        if eiken_level_codes:
            statement = statement.where(EikenLevelRecord.code.in_(eiken_level_codes))  # 英検級で絞る

        if question_type_codes:
            normalized_codes = [QuestionTypeCode(code) for code in question_type_codes]  # Enum に変換する
            statement = statement.where(QuestionTypeRecord.code.in_(normalized_codes))  # 種別で絞る

        rows = session.exec(statement).all()  # 問題とマスタコードをまとめて取得する

    return [
        _build_question_response(
            record,
            _enum_to_value(eiken_level_code),
            _enum_to_value(question_type_code),
        )
        for record, eiken_level_code, question_type_code in rows
    ]  # API 向けの形へ整形して返す


def create_question(database_url: str, question: QuestionRow) -> QuestionRow:
    with get_session(database_url) as session:
        record = TypingQuestionRecord(
            eiken_level_id=_resolve_eiken_level_id(session, question["eiken_level_code"]),  # 級コードを FK に変換する
            question_type_id=_resolve_question_type_id(session, question["question_type"]),  # 種別コードを FK に変換する
            english_text=question["english"],  # 英文を保存する
            japanese_text=question["japanese"],  # 日本語訳を保存する
            is_active=question.get("is_active", True),  # 未指定時は有効にする
        )
        session.add(record)  # レコードを追加する
        session.commit()  # 永続化する
        session.refresh(record)  # 採番済み状態を再取得する

        eiken_level = session.get(EikenLevelRecord, record.eiken_level_id)  # 級マスタを取り直す
        question_type = session.get(QuestionTypeRecord, record.question_type_id)  # 種別マスタを取り直す

    return _build_question_response(
        record,
        eiken_level.code,
        _enum_to_value(question_type.code),
    )  # API 向けの形で返す


def update_question(database_url: str, question_id: int, updates: QuestionRow) -> QuestionRow | None:
    with get_session(database_url) as session:
        record = session.get(TypingQuestionRecord, question_id)  # 更新対象を取得する

        if record is None:
            return None  # 対象が無ければ None を返す

        if "eiken_level_code" in updates:
            record.eiken_level_id = _resolve_eiken_level_id(session, updates["eiken_level_code"])  # 級変更を反映する

        if "question_type" in updates:
            record.question_type_id = _resolve_question_type_id(session, updates["question_type"])  # 種別変更を反映する

        if "english" in updates:
            record.english_text = updates["english"]  # 英文変更を反映する

        if "japanese" in updates:
            record.japanese_text = updates["japanese"]  # 日本語訳変更を反映する

        if "is_active" in updates:
            record.is_active = updates["is_active"]  # 有効フラグ変更を反映する

        record.updated_at = datetime.now(timezone.utc)  # 更新日時を更新する

        session.add(record)  # 更新内容を保存対象に含める
        session.commit()  # 永続化する
        session.refresh(record)  # 最新状態を再取得する

        eiken_level = session.get(EikenLevelRecord, record.eiken_level_id)  # 級マスタを取り直す
        question_type = session.get(QuestionTypeRecord, record.question_type_id)  # 種別マスタを取り直す

    return _build_question_response(
        record,
        eiken_level.code,
        _enum_to_value(question_type.code),
    )  # API 向けの形で返す


def deactivate_question(database_url: str, question_id: int) -> bool:
    updated = update_question(database_url, question_id, {"is_active": False})  # 論理削除として無効化する
    return updated is not None  # 成功時だけ True を返す


def list_quizzes(
    database_url: str,
    eiken_level_codes: list[str] | None = None,
    question_type_codes: list[str] | None = None,
) -> list[QuizRow]:
    return [
        {
            "id": question["id"],  # 問題IDを返す
            "type": question["type"],  # 種別を返す
            "eikenLevel": question["eikenLevel"],  # 英検級コードを返す
            "english": question["english"],  # 英文を返す
            "japanese": question["japanese"],  # 日本語訳を返す
        }
        for question in list_questions(
            database_url,
            eiken_level_codes=eiken_level_codes,
            question_type_codes=question_type_codes,
            include_inactive=False,
        )
    ]  # 出題APIでは isActive を除いて返す


def insert_study_result(database_url: str, study_result: StudyResultRow) -> StudyResultRow:
    with get_session(database_url) as session:
        record = StudyResultRecord.model_validate(study_result)  # 学習結果をモデルへ変換する
        session.add(record)  # レコードを追加する
        session.commit()  # 永続化する
        session.refresh(record)  # 最新状態を再取得する

    return record.model_dump(exclude={"id"}, mode="json")  # 既存互換の形で返す


def get_latest_study_result(database_url: str) -> StudyResultRow | None:
    with get_session(database_url) as session:
        latest_result = session.exec(
            select(StudyResultRecord)
            .order_by(StudyResultRecord.created_at.desc(), StudyResultRecord.id.desc())  # 最新順に並べる
            .limit(1)  # 1件だけ取得する
        ).first()

    return (
        latest_result.model_dump(exclude={"id"}, mode="json")
        if latest_result is not None
        else None
    )  # 結果があれば返し、無ければ None を返す


def get_today_study_summary(database_url: str, target_date: str) -> dict[str, Any]:
    with get_session(database_url) as session:
        sessions, solved_problems = session.exec(
            select(
                func.count(StudyResultRecord.id),  # 当日のセッション数を集計する
                func.coalesce(func.sum(StudyResultRecord.total_questions), 0),  # 当日の出題数合計を集計する
            ).where(StudyResultRecord.created_at.startswith(target_date))
        ).one()

    return {
        "date": target_date,  # 集計対象日を返す
        "sessions": sessions,  # セッション数を返す
        "solvedProblems": solved_problems,  # 出題数合計を返す
    }
