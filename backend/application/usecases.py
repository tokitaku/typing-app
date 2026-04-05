from collections.abc import Callable
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
from backend.domain.entities import DailyStudySummary, Question, QuestionPatch, StudyMode, StudyResult
from backend.domain.repositories import QuestionRepository, StudyResultRepository
from backend.domain.tag_rules import normalize_tags
from backend.domain.value_objects import (
    AverageTime,
    CorrectRate,
    MistakeCount,
    QuestionId,
    QuestionText,
    TagCollection,
    TotalQuestions,
)


def _parse_tag_codes(codes: list[str] | None) -> list[str] | None:
    if not codes:
        return None  # 未指定時はフィルタなしとして扱う

    normalized_codes = list(normalize_tags(codes))
    return normalized_codes if normalized_codes else None  # 空配列相当ならフィルタなしとして扱う


def _to_question_dto(question: Question) -> QuestionDto:
    return QuestionDto(
        id=question.id.value,
        english=question.english.value,
        japanese=question.japanese.value,
        isActive=question.is_active,
        tags=list(question.tags.value),
    )  # 管理用 DTO へ詰め替える


def _to_study_result_dto(result: StudyResult) -> StudyResultDto:
    return StudyResultDto(
        mode=result.mode.value,
        total_questions=result.total_questions.value,
        correct_rate=result.correct_rate.value,
        mistakes=result.mistakes.value,
        average_time=result.average_time.value,
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
        tag_codes=_parse_tag_codes(query.tag_codes),
        include_inactive=query.include_inactive,
    )
    return [_to_question_dto(question) for question in questions]  # 管理画面向け DTO 一覧を返す


def create_question(repository: QuestionRepository, command: CreateQuestionCommand) -> QuestionDto:
    saved_question = repository.create(
        Question(
            id=None,
            english=QuestionText(command.english),
            japanese=QuestionText(command.japanese),
            is_active=True,
            tags=TagCollection(command.tags),
        )
    )
    return _to_question_dto(saved_question)  # 保存結果を DTO にして返す


def update_question(
    repository: QuestionRepository,
    question_id: int,
    command: UpdateQuestionCommand,
) -> QuestionDto | None:
    patch = QuestionPatch(
        english=QuestionText(command.english) if command.english is not None else None,  # 検証・正規化してから詰める
        japanese=QuestionText(command.japanese) if command.japanese is not None else None,  # 検証・正規化してから詰める
        is_active=command.is_active,
        tags=TagCollection(command.tags) if command.tags is not None else None,  # 正規化済みタプルを格納する
    )
    saved_question = repository.update(QuestionId(question_id), patch)  # int を QuestionId に変換して渡す
    return _to_question_dto(saved_question) if saved_question is not None else None  # 対象があれば DTO を返す


def deactivate_question(repository: QuestionRepository, question_id: int) -> bool:
    return repository.deactivate(question_id)  # 論理削除を委譲する


def list_tags(repository: QuestionRepository) -> list[str]:
    return repository.list_tags()  # 登録済みタグコードをアルファベット順・重複なしで返す


def record_study_result(
    repository: StudyResultRepository,
    command: RecordStudyResultCommand,
    *,
    now_fn: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
) -> StudyResultDto:
    created_at = now_fn().astimezone(timezone.utc)  # now_fn の注入値を UTC に正規化する
    saved_result = repository.save(
        StudyResult(
            mode=StudyMode(command.mode),
            total_questions=TotalQuestions(command.total_questions),
            correct_rate=CorrectRate(command.correct_rate),
            mistakes=MistakeCount(command.mistakes),
            average_time=AverageTime(command.average_time),
            created_at=created_at,
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
