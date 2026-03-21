from datetime import datetime, timezone

from sqlalchemy import func
from sqlmodel import select

from backend.database import get_session
from backend.domain.entities import DailyStudySummary, Question, QuestionType, StudyMode, StudyResult
from backend.infrastructure.sqlmodel.models import (
    EikenLevelRecord,
    QuestionTypeRecord,
    QuestionTypeRecordCode,
    StudyModeRecord,
    StudyResultRecord,
    TypingQuestionRecord,
)


class SqlModelQuestionRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url

    def _resolve_eiken_level_id(self, session, code: str) -> int:
        record = session.exec(
            select(EikenLevelRecord).where(EikenLevelRecord.code == code)
        ).first()  # 英検級コードをマスタ ID に変換する

        if record is None:
            raise ValueError(f"Unknown eiken level code: {code}")  # 未知の英検級は失敗させる

        return int(record.id)

    def _resolve_question_type_id(self, session, question_type: QuestionType) -> int:
        record = session.exec(
            select(QuestionTypeRecord).where(
                QuestionTypeRecord.code == QuestionTypeRecordCode(question_type.value)
            )
        ).first()  # 種別コードをマスタ ID に変換する

        if record is None:
            raise ValueError(f"Unknown question type code: {question_type.value}")  # 未知の種別は失敗させる

        return int(record.id)

    def _build_question(self, record: TypingQuestionRecord, eiken_level_code: str, question_type_code: str) -> Question:
        return Question(
            id=int(record.id),
            eiken_level_code=eiken_level_code,
            question_type=QuestionType(question_type_code),
            english=record.english_text,
            japanese=record.japanese_text,
            is_active=record.is_active,
        )  # ORM レコードをドメインエンティティへ変換する

    def list_questions(
        self,
        *,
        eiken_level_codes: list[str] | None = None,
        question_type_codes: list[QuestionType] | None = None,
        include_inactive: bool = True,
    ) -> list[Question]:
        with get_session(self.database_url) as session:
            statement = (
                select(TypingQuestionRecord, EikenLevelRecord.code, QuestionTypeRecord.code)
                .join(EikenLevelRecord, TypingQuestionRecord.eiken_level_id == EikenLevelRecord.id)
                .join(QuestionTypeRecord, TypingQuestionRecord.question_type_id == QuestionTypeRecord.id)
                .order_by(TypingQuestionRecord.id)
            )

            if not include_inactive:
                statement = statement.where(TypingQuestionRecord.is_active.is_(True))  # 無効問題を除外する

            if eiken_level_codes:
                statement = statement.where(EikenLevelRecord.code.in_(eiken_level_codes))  # 英検級で絞る

            if question_type_codes:
                normalized_codes = [
                    QuestionTypeRecordCode(question_type.value) for question_type in question_type_codes
                ]
                statement = statement.where(QuestionTypeRecord.code.in_(normalized_codes))  # 種別で絞る

            rows = session.exec(statement).all()

        return [
            self._build_question(record, eiken_level_code, question_type_code.value)
            for record, eiken_level_code, question_type_code in rows
        ]  # レコード一覧をエンティティ一覧へ変換する

    def create(self, question: Question) -> Question:
        with get_session(self.database_url) as session:
            record = TypingQuestionRecord(
                eiken_level_id=self._resolve_eiken_level_id(session, question.eiken_level_code),
                question_type_id=self._resolve_question_type_id(session, question.question_type),
                english_text=question.english,
                japanese_text=question.japanese,
                is_active=question.is_active,
            )
            session.add(record)
            session.commit()
            session.refresh(record)

            eiken_level = session.get(EikenLevelRecord, record.eiken_level_id)
            question_type = session.get(QuestionTypeRecord, record.question_type_id)

        return self._build_question(record, eiken_level.code, question_type.code.value)  # 保存済みエンティティを返す

    def update(self, question_id: int, updates: dict[str, object]) -> Question | None:
        with get_session(self.database_url) as session:
            record = session.get(TypingQuestionRecord, question_id)

            if record is None:
                return None  # 対象がなければ何もしない

            if "eiken_level_code" in updates:
                record.eiken_level_id = self._resolve_eiken_level_id(
                    session,
                    str(updates["eiken_level_code"]),
                )  # 英検級変更を反映する

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

            record.updated_at = datetime.now(timezone.utc)
            session.add(record)
            session.commit()
            session.refresh(record)

            eiken_level = session.get(EikenLevelRecord, record.eiken_level_id)
            question_type = session.get(QuestionTypeRecord, record.question_type_id)

        return self._build_question(record, eiken_level.code, question_type.code.value)  # 更新済みエンティティを返す

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
