from datetime import datetime, timezone

from backend.application.dtos import (
    CreateQuestionCommand,
    DailyStudySummaryDto,
    ListQuestionsQuery,
    QuestionDto,
    RecordStudyResultCommand,
    StudyResultDto,
    UpdateQuestionCommand,
)
from backend.domain.entities import DailyStudySummary, Question, QuestionType, StudyMode, StudyResult
from backend.domain.repositories import QuestionRepository, StudyResultRepository
from backend.domain.tag_rules import normalize_tags


def _normalize_created_at(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=timezone.utc)  # タイムゾーン未指定は UTC として扱う

    return value.astimezone(timezone.utc)  # 内部では UTC に正規化して扱う


def _parse_question_types(codes: list[str] | None) -> list[QuestionType] | None:
    if not codes:
        return None  # 未指定時はフィルタなしとして扱う

    return [QuestionType(code) for code in codes]  # 文字列入力を enum へ変換する


def _parse_tag_codes(codes: list[str] | None) -> list[str] | None:
    if not codes:
        return None  # 未指定時はフィルタなしとして扱う

    normalized_codes = list(normalize_tags(codes))
    return normalized_codes if normalized_codes else None  # 空配列相当ならフィルタなしとして扱う


def _to_question_dto(question: Question) -> QuestionDto:
    return QuestionDto(
        id=int(question.id),
        type=question.question_type.value,
        english=question.english,
        japanese=question.japanese,
        isActive=question.is_active,
        tags=list(question.tags),
    )  # 管理用 DTO へ詰め替える


def _to_study_result_dto(result: StudyResult) -> StudyResultDto:
    return StudyResultDto(
        mode=result.mode.value,
        total_questions=result.total_questions,
        correct_rate=result.correct_rate,
        mistakes=result.mistakes,
        average_time=result.average_time,
        created_at=result.created_at,
    )  # API 返却用 DTO へ詰め替える


def _to_summary_dto(summary: DailyStudySummary) -> DailyStudySummaryDto:
    return DailyStudySummaryDto(
        date=summary.date,
        sessions=summary.sessions,
        solvedProblems=summary.solved_problems,
    )  # 表示用 summary DTO へ詰め替える


def list_questions(repository: QuestionRepository, query: ListQuestionsQuery) -> list[QuestionDto]:
    questions = repository.list_questions(
        question_type_codes=_parse_question_types(query.question_type_codes),
        tag_codes=_parse_tag_codes(query.tag_codes),
        include_inactive=query.include_inactive,
    )
    return [_to_question_dto(question) for question in questions]  # 管理画面向け DTO 一覧を返す


def create_question(repository: QuestionRepository, command: CreateQuestionCommand) -> QuestionDto:
    saved_question = repository.create(
        Question(
            id=None,
            question_type=QuestionType(command.question_type),
            english=command.english,
            japanese=command.japanese,
            is_active=True,
            tags=normalize_tags(command.tags),
        )
    )
    return _to_question_dto(saved_question)  # 保存結果を DTO にして返す


def update_question(
    repository: QuestionRepository,
    question_id: int,
    command: UpdateQuestionCommand,
) -> QuestionDto | None:
    updates: dict[str, object] = {}

    if command.question_type is not None:
        updates["question_type"] = QuestionType(command.question_type)  # 種別を enum へ正規化する

    if command.english is not None:
        updates["english"] = command.english  # 英文の変更を詰める

    if command.japanese is not None:
        updates["japanese"] = command.japanese  # 日本語訳の変更を詰める

    if command.is_active is not None:
        updates["is_active"] = command.is_active  # 有効フラグ変更を詰める

    if command.tags is not None:
        updates["tags"] = normalize_tags(command.tags)  # タグ一覧を正規化して全置換する

    saved_question = repository.update(question_id, updates)
    return _to_question_dto(saved_question) if saved_question is not None else None  # 対象があれば DTO を返す


def deactivate_question(repository: QuestionRepository, question_id: int) -> bool:
    return repository.deactivate(question_id)  # 論理削除を委譲する


def record_study_result(
    repository: StudyResultRepository,
    command: RecordStudyResultCommand,
) -> StudyResultDto:
    normalized_created_at = _normalize_created_at(command.created_at)
    saved_result = repository.save(
        StudyResult(
            mode=StudyMode(command.mode),
            total_questions=command.total_questions,
            correct_rate=command.correct_rate,
            mistakes=command.mistakes,
            average_time=command.average_time,
            created_at=normalized_created_at,
        )
    )
    return _to_study_result_dto(saved_result)  # 保存結果を返す


def get_latest_study_result(repository: StudyResultRepository) -> StudyResultDto | None:
    latest_result = repository.get_latest()
    return _to_study_result_dto(latest_result) if latest_result is not None else None  # 最新結果があれば返す


def get_today_study_summary(
    repository: StudyResultRepository,
    target_date: str,
) -> DailyStudySummaryDto:
    return _to_summary_dto(repository.get_today_summary(target_date))  # 集計結果を DTO に変換して返す
