from datetime import datetime, timezone

from sqlalchemy import delete, func
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from backend.database import get_session
from backend.domain.entities import DailyStudySummary, Question, QuestionType, StudyMode, StudyResult
from backend.domain.tag_rules import normalize_tags
from backend.infrastructure.sqlmodel.models import (
    TagRecord,
    QuestionTypeRecord,
    QuestionTypeRecordCode,
    StudyModeRecord,
    StudyResultRecord,
    TypingQuestionRecord,
    TypingQuestionTagRecord,
)


class SqlModelQuestionRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url

    def _resolve_question_type_id(self, session, question_type: QuestionType) -> int:
        record = session.exec(
            select(QuestionTypeRecord).where(
                QuestionTypeRecord.code == QuestionTypeRecordCode(question_type.value)
            )
        ).first()  # 種別コードをマスタ ID に変換する

        if record is None:
            raise ValueError(f"Unknown question type code: {question_type.value}")  # 未知の種別は失敗させる

        return int(record.id)

    def _resolve_tag_ids(self, session, tags: tuple[str, ...]) -> list[int]:
        tag_ids: list[int] = []

        for tag in tags:
            record = session.exec(select(TagRecord).where(TagRecord.code == tag)).first()

            if record is None:
                try:
                    with session.begin_nested():
                        record = TagRecord(code=tag)
                        session.add(record)
                        session.flush()  # unique 制約競合があれば savepoint 単位で巻き戻す
                except IntegrityError:
                    record = session.exec(select(TagRecord).where(TagRecord.code == tag)).first()

                if record is None:
                    raise ValueError(f"Failed to resolve tag code: {tag}")  # 取得不能な場合は不整合として扱う

            tag_ids.append(int(record.id))

        return tag_ids

    def _replace_question_tags(self, session, question_id: int, tags: tuple[str, ...]) -> None:
        normalized_tags = normalize_tags(tags)
        session.exec(
            delete(TypingQuestionTagRecord).where(TypingQuestionTagRecord.question_id == question_id)
        )  # 既存タグ関連を一度外してから現在値へ全置換する

        for tag_id in self._resolve_tag_ids(session, normalized_tags):
            session.add(TypingQuestionTagRecord(question_id=question_id, tag_id=tag_id))

    def _load_tags_by_question_id(self, session, question_ids: list[int]) -> dict[int, tuple[str, ...]]:
        if not question_ids:
            return {}

        rows = session.exec(
            select(TypingQuestionTagRecord.question_id, TagRecord.code)
            .join(TagRecord, TypingQuestionTagRecord.tag_id == TagRecord.id)
            .where(TypingQuestionTagRecord.question_id.in_(question_ids))
            .order_by(TypingQuestionTagRecord.question_id, TypingQuestionTagRecord.tag_id)
        ).all()

        tags_by_question_id: dict[int, list[str]] = {question_id: [] for question_id in question_ids}

        for question_id, tag_code in rows:
            tags_by_question_id[int(question_id)].append(str(tag_code))

        return {
            question_id: tuple(tag_codes) for question_id, tag_codes in tags_by_question_id.items()
        }  # 問題ごとのタグ一覧を組み立てて返す

    def _build_question(
        self,
        record: TypingQuestionRecord,
        question_type_code: str,
        tags: tuple[str, ...],
    ) -> Question:
        return Question(
            id=int(record.id),
            question_type=QuestionType(question_type_code),
            english=record.english_text,
            japanese=record.japanese_text,
            is_active=record.is_active,
            tags=tags,
        )  # ORM レコードをドメインエンティティへ変換する

    def list_questions(
        self,
        *,
        question_type_codes: list[QuestionType] | None = None,
        tag_codes: list[str] | None = None,
        include_inactive: bool = True,
    ) -> list[Question]:
        with get_session(self.database_url) as session:
            statement = (
                select(TypingQuestionRecord, QuestionTypeRecord.code)
                .join(QuestionTypeRecord, TypingQuestionRecord.question_type_id == QuestionTypeRecord.id)
                .order_by(TypingQuestionRecord.id)
            )

            if not include_inactive:
                statement = statement.where(TypingQuestionRecord.is_active.is_(True))  # 無効問題を除外する

            if question_type_codes:
                normalized_codes = [
                    QuestionTypeRecordCode(question_type.value) for question_type in question_type_codes
                ]
                statement = statement.where(QuestionTypeRecord.code.in_(normalized_codes))  # 種別で絞る

            if tag_codes:
                normalized_tag_codes = list(normalize_tags(tag_codes))
                tagged_question_ids = (
                    select(TypingQuestionTagRecord.question_id)
                    .join(TagRecord, TypingQuestionTagRecord.tag_id == TagRecord.id)
                    .where(TagRecord.code.in_(normalized_tag_codes))
                )
                statement = statement.where(TypingQuestionRecord.id.in_(tagged_question_ids))  # タグを 1 件以上持つ問題だけに絞る

            rows = session.exec(statement).all()
            question_ids = [int(record.id) for record, _ in rows]
            tags_by_question_id = self._load_tags_by_question_id(session, question_ids)

        return [
            self._build_question(
                record,
                question_type_code.value,
                tags_by_question_id.get(int(record.id), ()),
            )
            for record, question_type_code in rows
        ]  # レコード一覧をエンティティ一覧へ変換する

    def create(self, question: Question) -> Question:
        with get_session(self.database_url) as session:
            record = TypingQuestionRecord(
                question_type_id=self._resolve_question_type_id(session, question.question_type),
                english_text=question.english,
                japanese_text=question.japanese,
                is_active=question.is_active,
            )
            session.add(record)
            session.flush()  # 中間テーブル作成前に question_id を確定させる
            self._replace_question_tags(session, int(record.id), question.tags)
            session.commit()
            session.refresh(record)

            question_type = session.get(QuestionTypeRecord, record.question_type_id)
            tags_by_question_id = self._load_tags_by_question_id(session, [int(record.id)])

        return self._build_question(
            record,
            question_type.code.value,
            tags_by_question_id.get(int(record.id), ()),
        )  # 保存済みエンティティを返す

    def update(self, question_id: int, updates: dict[str, object]) -> Question | None:
        with get_session(self.database_url) as session:
            record = session.get(TypingQuestionRecord, question_id)

            if record is None:
                return None  # 対象がなければ何もしない

            if "question_type" in updates:
                record.question_type_id = self._resolve_question_type_id(
                    session,
                    updates["question_type"],
                )  # 問題種別変更を反映する

            if "english" in updates:
                record.english_text = str(updates["english"])  # 英文変更を反映する

            if "japanese" in updates:
                record.japanese_text = str(updates["japanese"])  # 日本語訳変更を反映する

            if "is_active" in updates:
                record.is_active = bool(updates["is_active"])  # 有効フラグ変更を反映する

            if "tags" in updates:
                self._replace_question_tags(session, question_id, tuple(updates["tags"]))  # タグ変更を反映する

            record.updated_at = datetime.now(timezone.utc)
            session.add(record)
            session.commit()
            session.refresh(record)

            question_type = session.get(QuestionTypeRecord, record.question_type_id)
            tags_by_question_id = self._load_tags_by_question_id(session, [int(record.id)])

        return self._build_question(
            record,
            question_type.code.value,
            tags_by_question_id.get(int(record.id), ()),
        )  # 更新済みエンティティを返す

    def deactivate(self, question_id: int) -> bool:
        return self.update(question_id, {"is_active": False}) is not None  # 論理削除として無効化する


class SqlModelStudyResultRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url

    def _build_study_result(self, record: StudyResultRecord) -> StudyResult:
        return StudyResult(
            mode=StudyMode(record.mode.value),
            total_questions=record.total_questions,
            correct_rate=record.correct_rate,
            mistakes=record.mistakes,
            average_time=record.average_time,
            created_at=record.created_at,
        )  # ORM レコードをドメインエンティティへ変換する

    def save(self, result: StudyResult) -> StudyResult:
        with get_session(self.database_url) as session:
            record = StudyResultRecord(
                mode=StudyModeRecord(result.mode.value),
                total_questions=result.total_questions,
                correct_rate=result.correct_rate,
                mistakes=result.mistakes,
                average_time=result.average_time,
                created_at=result.created_at,
            )
            session.add(record)
            session.commit()
            session.refresh(record)

        return self._build_study_result(record)  # 保存済み学習結果を返す

    def get_latest(self) -> StudyResult | None:
        with get_session(self.database_url) as session:
            latest_result = session.exec(
                select(StudyResultRecord)
                .order_by(StudyResultRecord.created_at.desc(), StudyResultRecord.id.desc())
                .limit(1)
            ).first()

        return self._build_study_result(latest_result) if latest_result is not None else None  # 最新結果があれば返す

    def get_today_summary(self, target_date: str) -> DailyStudySummary:
        with get_session(self.database_url) as session:
            sessions, solved_problems = session.exec(
                select(
                    func.count(StudyResultRecord.id),
                    func.coalesce(func.sum(StudyResultRecord.total_questions), 0),
                ).where(StudyResultRecord.created_at.startswith(target_date))
            ).one()

        return DailyStudySummary(
            date=target_date,
            sessions=int(sessions),
            solved_problems=int(solved_problems),
        )  # 当日集計結果をドメインエンティティとして返す
